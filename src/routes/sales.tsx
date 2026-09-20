import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/ruralplan/store";
import { dailySales, estimateDemand, monthlySales, weeklySales } from "@/lib/ruralplan/engine";
import { requireAuth } from "@/lib/auth-utils";

export const Route = createFileRoute("/sales")({
  beforeLoad: async () => {
    await requireAuth();
  },
  head: () => ({
    meta: [
      { title: "Sales & Demand — RuralPlan" },
      {
        name: "description",
        content:
          "Record past sales and see daily, weekly and monthly demand trends with an estimated demand based on previous sales data.",
      },
      { property: "og:title", content: "Sales & Demand — RuralPlan" },
      {
        property: "og:description",
        content: "Track your sales and see the demand trend for each product.",
      },
    ],
  }),
  component: SalesPage,
});

const schema = z.object({
  date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()) && new Date(v) <= new Date(), {
    message: "Please enter a valid date that is not in the future",
  }),
  productId: z.string().min(1, "Select a product"),
  location: z.string().trim().min(2, "Please enter a location").max(60),
  quantity: z.number().positive("Quantity must be greater than 0"),
});

function SalesPage() {
  const { products, sales, addSale, removeSale, updateProduct, settings } = useStore();
  const [productFilter, setProductFilter] = useState("");
  const activeProduct = products.find((p) => p.id === productFilter) ?? products[0];

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    productId: "",
    location: "",
    quantity: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const productId = activeProduct?.id;
  const monthly = useMemo(() => monthlySales(sales, productId), [sales, productId]);
  const weekly = useMemo(() => weeklySales(sales, productId), [sales, productId]);
  const daily = useMemo(() => dailySales(sales, productId), [sales, productId]);
  const demand = useMemo(
    () => (productId ? estimateDemand(sales, productId) : null),
    [sales, productId],
  );

  const rows = useMemo(
    () =>
      sales
        .filter((s) => !productId || s.productId === productId)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30),
    [sales, productId],
  );

  const addRecord = () => {
    const parsed = schema.safeParse({
      date: form.date,
      productId: form.productId || activeProduct?.id || "",
      location: form.location,
      quantity: Number(form.quantity),
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    
    // Validate stock availability
    const product = products.find((p) => p.id === parsed.data.productId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    if (product.currentStock < parsed.data.quantity) {
      toast.error(
        `Insufficient stock! Available: ${product.currentStock} ${product.unit}, Requested: ${parsed.data.quantity} ${product.unit}`
      );
      return;
    }
    
    // Handle async operation
    (async () => {
      try {
        // 1. Record the sale
        await addSale(parsed.data);
        
        // 2. Decrease finished product stock
        const newStock = product.currentStock - parsed.data.quantity;
        await updateProduct(product.id, { currentStock: newStock });
        
        setForm((f) => ({ ...f, quantity: "" }));
        toast.success(
          `Sale recorded: ${parsed.data.quantity} ${product.unit} sold. New stock: ${newStock} ${product.unit}`
        );
      } catch (error) {
        console.error("Failed to add sale:", error);
        toast.error(error instanceof Error ? error.message : "Failed to add sale");
      }
    })();
  };

  return (
    <AppShell>
      <PageHeader
        title="Sales & Demand"
        description="Enter what you sold in the past. RuralPlan uses this to estimate demand for the coming month."
        action={
          products.length > 0 ? (
            <Select value={activeProduct?.id ?? ""} onValueChange={setProductFilter}>
              <SelectTrigger className="h-12 min-w-52">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {demand && activeProduct && (
        <section className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Estimated Demand (next month)"
            value={`${demand.estimate} ${activeProduct.unit}`}
            hint="Based on previous sales data"
            icon={<TrendingUp className="size-4" />}
            tone="info"
          />
          <StatCard
            label="Demand trend"
            value={`${demand.trendPercent > 0 ? "+" : ""}${demand.trendPercent}%`}
            hint="Compared with three months ago"
            tone={demand.trendPercent >= 0 ? "success" : "warning"}
          />
          <StatCard label="Method" value={demand.method} hint="Simple and transparent, not AI prediction" />
        </section>
      )}

      <section className="surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Add a sales record</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          <Field label="Date" error={errors["date"]}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Product" error={errors["productId"]}>
            <Select
              value={form.productId || activeProduct?.id || ""}
              onValueChange={(v) => set("productId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" error={errors["location"]}>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Village / market"
            />
          </Field>
          <Field label="Quantity sold" error={errors["quantity"]}>
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button className="h-11 w-full" onClick={addRecord}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-5 surface-card p-5">
        <Tabs defaultValue="monthly">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Sales charts</h2>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="trend">Trend</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="daily" className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="quantity" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="weekly" className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="quantity" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="monthly" className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="quantity" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="trend" className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="quantity"
                  stroke="var(--color-chart-3)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        <p className="mt-3 text-xs text-muted-foreground">
          Estimated Demand is calculated with a simple moving average and trend from your own sales
          records. Safety stock used in planning: {settings.safetyStockPercent}%.
        </p>
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Sales records</h2>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No sales records yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => {
                const p = products.find((x) => x.id === s.productId);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{p?.name ?? "—"}</TableCell>
                    <TableCell>{s.location}</TableCell>
                    <TableCell className="text-right font-medium">
                      {s.quantity} {p?.unit ?? ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete record"
                        onClick={async () => {
                          try {
                            await removeSale(s.id);
                          } catch (error) {
                            toast.error("Failed to delete sale");
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </AppShell>
  );
}
