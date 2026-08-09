import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore } from "@/lib/ruralplan/store";
import { productionChartData } from "@/lib/ruralplan/engine";

export const Route = createFileRoute("/production-history")({
  head: () => ({
    meta: [
      { title: "Production History — RuralPlan" },
      {
        name: "description",
        content:
          "Compare planned production with actual production and sales for every batch you have made.",
      },
      { property: "og:title", content: "Production History — RuralPlan" },
      {
        property: "og:description",
        content: "Planned vs actual production and production vs sales for each batch.",
      },
    ],
  }),
  component: HistoryPage,
});

const schema = z.object({
  date: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Enter a valid date" }),
  productId: z.string().min(1, "Select a product"),
  planned: z.number().min(0, "Planned quantity cannot be negative"),
  actual: z.number().min(0, "Actual quantity cannot be negative"),
  sold: z.number().min(0, "Sold quantity cannot be negative"),
});

function HistoryPage() {
  const { products, production, addProduction, removeProduction } = useStore();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    productId: "",
    planned: "",
    actual: "",
    sold: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const chart = useMemo(() => productionChartData(production, products), [production, products]);

  const add = () => {
    const parsed = schema.safeParse({
      date: form.date,
      productId: form.productId || products[0]?.id || "",
      planned: Number(form.planned || 0),
      actual: Number(form.actual || 0),
      sold: Number(form.sold || 0),
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    addProduction(parsed.data);
    setForm((f) => ({ ...f, planned: "", actual: "", sold: "" }));
    toast.success("Production record added");
  };

  return (
    <AppShell>
      <PageHeader
        title="Production History"
        description="Record what you planned, what you actually produced and what you sold. This helps improve future planning."
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">Planned vs Actual Production</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">Production vs Sales</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Produced" stroke="var(--color-chart-1)" strokeWidth={3} />
                <Line type="monotone" dataKey="sold" name="Sold" stroke="var(--color-chart-3)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Add a production record</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          <Field label="Date" error={errors["date"]}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Product" error={errors["productId"]}>
            <Select value={form.productId || products[0]?.id || ""} onValueChange={(v) => set("productId", v)}>
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
          <Field label="Planned" error={errors["planned"]}>
            <Input type="number" min={0} value={form.planned} onChange={(e) => set("planned", e.target.value)} />
          </Field>
          <Field label="Actual produced" error={errors["actual"]}>
            <Input type="number" min={0} value={form.actual} onChange={(e) => set("actual", e.target.value)} />
          </Field>
          <Field label="Sold" error={errors["sold"]}>
            <Input type="number" min={0} value={form.sold} onChange={(e) => set("sold", e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button className="h-11 w-full" onClick={add}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">All records</h2>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Remaining stock</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {production.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No production records yet.
                  </TableCell>
                </TableRow>
              )}
              {production
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{products.find((p) => p.id === r.productId)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.planned}</TableCell>
                    <TableCell className="text-right">{r.actual}</TableCell>
                    <TableCell className="text-right">{r.sold}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Math.max(0, r.actual - r.sold)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete record"
                        onClick={() => removeProduction(r.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </AppShell>
  );
}
