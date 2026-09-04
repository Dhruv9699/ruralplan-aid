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
import { useTranslation } from "@/i18n/useTranslation";
import { dailySales, estimateDemand, monthlySales, weeklySales } from "@/lib/ruralplan/engine";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Demand & Sales History — RuralPlan" },
      {
        name: "description",
        content:
          "Record past sales and see daily, weekly and monthly demand trends with an estimated demand based on previous sales data.",
      },
      { property: "og:title", content: "Demand & Sales History — RuralPlan" },
      {
        property: "og:description",
        content: "Track your sales and see the demand trend for each product.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { t } = useTranslation();
  const { products, sales, addSale, removeSale, settings } = useStore();
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
    void addSale(parsed.data)
      .then(() => {
        setForm((f) => ({ ...f, quantity: "" }));
        toast.success(t("sales.salesRecordAdded"));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
  };

  return (
    <AppShell>
      <PageHeader
        title={t("sales.title")}
        description={t("sales.description")}
        action={
          products.length > 0 ? (
            <Select value={activeProduct?.id ?? ""} onValueChange={setProductFilter}>
              <SelectTrigger className="h-12 min-w-52">
                <SelectValue placeholder={t("sales.selectProduct")} />
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
        <section className="mb-5 grid gap-4 sm:grid-cols-4">
          <StatCard
            label={t("sales.estimatedDemandNextMonth")}
            value={`${demand.estimate} ${activeProduct.unit}`}
            hint={`Range: ${demand.estimateLow}–${demand.estimateHigh} (${demand.confidence} ${t("sales.confidence")})`}
            icon={<TrendingUp className="size-4" />}
            tone={demand.confidence === "high" ? "success" : demand.confidence === "medium" ? "warning" : "destructive"}
          />
          <StatCard
            label={t("sales.trend")}
            value={`${demand.trendPercent > 0 ? "+" : ""}${demand.trendPercent}%`}
            hint={demand.trend === "increasing" ? t("sales.demandGrowing") : demand.trend === "decreasing" ? t("sales.demandDeclining") : t("sales.stableDemand")}
            icon={<TrendingUp className="size-4" />}
            tone={demand.trend === "increasing" ? "success" : demand.trend === "decreasing" ? "warning" : "default"}
          />
          <StatCard
            label={t("sales.dataPoints")}
            value={`${demand.monthsUsed} ${t("sales.months")}`}
            hint={`${demand.history.length} ${t("sales.totalMonthsAvailable")}`}
            icon={<TrendingUp className="size-4" />}
            tone="default"
          />
          <StatCard
            label={t("sales.method")}
            value={demand.confidence}
            hint={demand.method}
            icon={<TrendingUp className="size-4" />}
            tone="default"
          />
        </section>
      )}

      <section className="surface-card p-5">
        <h2 className="font-display text-lg font-semibold">{t("sales.addSalesRecord")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("sales.explanation")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          <Field label={t("sales.date")} error={errors["date"]}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label={t("sales.product")} error={errors["productId"]}>
            <Select
              value={form.productId || activeProduct?.id || ""}
              onValueChange={(v) => set("productId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.select")} />
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
          <Field label={t("sales.location")} error={errors["location"]}>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder={t("sales.locationHint")}
            />
          </Field>
          <Field label={t("sales.quantitySold")} error={errors["quantity"]}>
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button className="h-11 w-full" onClick={addRecord}>
              <Plus className="size-4" /> {t("common.add")}
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-5 surface-card p-5">
        <Tabs defaultValue="monthly">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">{t("sales.salesCharts")}</h2>
            <TabsList>
              <TabsTrigger value="daily">{t("sales.daily")}</TabsTrigger>
              <TabsTrigger value="weekly">{t("sales.weekly")}</TabsTrigger>
              <TabsTrigger value="monthly">{t("sales.monthly")}</TabsTrigger>
              <TabsTrigger value="trend">{t("sales.trend")}</TabsTrigger>
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
          {t("sales.calculatedWithMovingAverage")} {settings.safetyStockPercent}%.
        </p>
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">{t("sales.salesRecords")}</h2>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sales.date")}</TableHead>
                <TableHead>{t("sales.product")}</TableHead>
                <TableHead>{t("sales.location")}</TableHead>
                <TableHead className="text-right">{t("sales.quantitySold")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {t("sales.noSalesRecords")}
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
                        aria-label={t("sales.deleteRecord")}
                        onClick={() => {
                          void removeSale(s.id).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
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
