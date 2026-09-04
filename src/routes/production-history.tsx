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
import { useTranslation } from "@/i18n/useTranslation";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { t } = useTranslation();
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
    void addProduction(parsed.data)
      .then(() => {
        setForm((f) => ({ ...f, planned: "", actual: "", sold: "" }));
        toast.success(t("common.success"));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
  };

  return (
    <AppShell>
      <PageHeader
        title={t("productionHistory.title")}
        description={t("productionHistory.description")}
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
                <Bar dataKey="planned" name={t("productionHistory.planned")} fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name={t("productionHistory.actual")} fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
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
                <Line type="monotone" dataKey="actual" name={t("productionHistory.actual")} stroke="var(--color-chart-1)" strokeWidth={3} />
                <Line type="monotone" dataKey="sold" name={t("productionHistory.sold")} stroke="var(--color-chart-3)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Add a production record</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          <Field label={t("productionHistory.date")} error={errors["date"]}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label={t("productionHistory.product")} error={errors["productId"]}>
            <Select value={form.productId || products[0]?.id || ""} onValueChange={(v) => set("productId", v)}>
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
          <Field label={t("productionHistory.planned")} error={errors["planned"]}>
            <Input type="number" min={0} value={form.planned} onChange={(e) => set("planned", e.target.value)} />
          </Field>
          <Field label={t("productionHistory.actual")} error={errors["actual"]}>
            <Input type="number" min={0} value={form.actual} onChange={(e) => set("actual", e.target.value)} />
          </Field>
          <Field label={t("productionHistory.sold")} error={errors["sold"]}>
            <Input type="number" min={0} value={form.sold} onChange={(e) => set("sold", e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button className="h-11 w-full" onClick={add}>
              <Plus className="size-4" /> {t("common.add")}
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
                <TableHead>{t("productionHistory.date")}</TableHead>
                <TableHead>{t("productionHistory.product")}</TableHead>
                <TableHead className="text-right">{t("productionHistory.planned")}</TableHead>
                <TableHead className="text-right">{t("productionHistory.actual")}</TableHead>
                <TableHead className="text-right">{t("productionHistory.sold")}</TableHead>
                <TableHead className="text-right">{t("productionHistory.remaining")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {production.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    {t("productionHistory.noRecords")}
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
                        onClick={() => {
                          void removeProduction(r.id).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
                        }}
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
