import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { StatusPill } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import { computePlan, estimateDemand, materialFor, analyzeResourceConstraints } from "@/lib/ruralplan/engine";
import { getWeather, weatherFactor } from "@/lib/ruralplan/weather";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Production Planner — RuralPlan" },
      {
        name: "description",
        content:
          "Calculate the recommended production quantity from expected demand, current stock, safety stock, raw material, workers, capacity and weather.",
      },
      { property: "og:title", content: "Production Planner — RuralPlan" },
      {
        property: "og:description",
        content: "Find out how much to produce and how many production days you need.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planner,
});

const CONDITIONS = ["Clear weather", "Light rain expected", "Heavy rain expected", "High humidity"];
const SLOWDOWN: Record<string, number> = {
  "Clear weather": 0,
  "Light rain expected": 0.15,
  "Heavy rain expected": 0.3,
  "High humidity": 0.1,
};

function Planner() {
  const { t } = useTranslation();
  const { products, materials, sales, settings, addProduction, updateProduct, saveRecommendation } = useStore();
  const [productId, setProductId] = useState("");
  const product = products.find((p) => p.id === productId) ?? products[0];

  const autoWeather = useMemo(
    () => weatherFactor(getWeather(settings.district, settings.village)),
    [settings.district, settings.village],
  );

  const [form, setForm] = useState({
    currentStock: "0",
    expectedDemand: "0",
    capacityPerDay: "0",
    rawMaterialAvailable: "0",
    workers: "0",
    productionDays: "7",
    weather: autoWeather.label,
    safety: String(settings.safetyStockPercent),
  });

  // Prefill from the selected product's saved data
  useEffect(() => {
    if (!product) return;
    const demand = estimateDemand(sales, product.id).estimate;
    const mat = materialFor(materials, product.rawMaterial);
    setForm((f) => ({
      ...f,
      currentStock: String(product.currentStock),
      expectedDemand: String(demand),
      capacityPerDay: String(product.capacityPerDay),
      rawMaterialAvailable: String(mat?.currentQty ?? 0),
      workers: String(product.workers),
      weather: autoWeather.label,
      safety: String(settings.safetyStockPercent),
    }));
  }, [product, sales, materials, autoWeather.label, settings.safetyStockPercent]);

  if (!product) {
    return (
      <AppShell>
        <PageHeader title={t("planner.title")} description={t("planner.noProducts")} />
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {t("planner.noProductsDesc")}
        </div>
      </AppShell>
    );
  }

  const num = (v: string) => Math.max(0, Number(v) || 0);
  const plan = computePlan({
    product,
    currentStock: num(form.currentStock),
    expectedDemand: num(form.expectedDemand),
    capacityPerDay: num(form.capacityPerDay),
    rawMaterialAvailable: num(form.rawMaterialAvailable),
    workers: num(form.workers),
    productionDays: num(form.productionDays),
    weatherSlowdown: SLOWDOWN[form.weather] ?? 0,
    weatherLabel: form.weather,
    safetyStockPercent: num(form.safety),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const savePlan = async () => {
    try {
      await saveRecommendation({
        productId: product.id,
        expectedDemand: num(form.expectedDemand),
        currentStock: num(form.currentStock),
        safetyStock: plan.safetyStock,
        recommendedQuantity: plan.requiredProduction,
      });
      await addProduction({
        date: new Date().toISOString().slice(0, 10),
        productId: product.id,
        planned: plan.requiredProduction,
        actual: 0,
        sold: 0,
      });
      await updateProduct(product.id, { currentStock: num(form.currentStock) });
      toast.success(t("planner.savePlanToProduction"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={t("planner.title")}
        description={t("planner.description")}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">{t("planner.yourDetails")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t("planner.selectProduct")}>
                <Select value={product.id} onValueChange={setProductId}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
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
            </div>
            <Field label={`${t("planner.currentStock")} (${product.unit})`}>
              <Input type="number" min={0} value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} />
            </Field>
            <Field label={`${t("planner.expectedDemand")} (${product.unit})`} hint={t("planner.expectedDemandHint")}>
              <Input
                type="number"
                min={0}
                value={form.expectedDemand}
                onChange={(e) => set("expectedDemand", e.target.value)}
              />
            </Field>
            <Field label={`${t("planner.productionCapacityPerDay")} (${product.unit})`}>
              <Input
                type="number"
                min={0}
                value={form.capacityPerDay}
                onChange={(e) => set("capacityPerDay", e.target.value)}
              />
            </Field>
            <Field label={`${product.rawMaterial} ${t("planner.available")} (${product.rawUnit})`}>
              <Input
                type="number"
                min={0}
                value={form.rawMaterialAvailable}
                onChange={(e) => set("rawMaterialAvailable", e.target.value)}
              />
            </Field>
            <Field label={t("planner.numberOfWorkers")}>
              <Input type="number" min={0} value={form.workers} onChange={(e) => set("workers", e.target.value)} />
            </Field>
            <Field label={t("planner.productionDaysAvailable")}>
              <Input
                type="number"
                min={0}
                value={form.productionDays}
                onChange={(e) => set("productionDays", e.target.value)}
              />
            </Field>
            <Field label={t("planner.weatherCondition")} hint={t("planner.weatherConditionHint")}>
              <Select value={form.weather} onValueChange={(v) => set("weather", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("planner.safetyStock")} hint={t("planner.safetyStockHint")}>
              <Input type="number" min={0} max={100} value={form.safety} onChange={(e) => set("safety", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div className="surface-card overflow-hidden">
            <div className="hero-gradient p-6 text-sidebar-foreground">
              <p className="text-sm opacity-90">{t("planner.recommendedProduction")}</p>
              <p className="mt-1 font-display text-4xl font-semibold">
                {plan.requiredProduction} {product.unit}
              </p>
              <p className="mt-3 text-sm opacity-90">{plan.reason}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <Row label={t("planner.expectedDemand")} value={`${num(form.expectedDemand)} ${product.unit}`} />
              <Row label={t("planner.currentStock")} value={`${num(form.currentStock)} ${product.unit}`} />
              <Row label={t("planner.safetyStock")} value={`${plan.safetyStock} ${product.unit}`} />
              <Row label={t("common.required")} value={`${plan.requiredProduction} ${product.unit}`} />
              <Row
                label={t("planner.rawMaterialNeeded")}
                value={`${plan.rawRequirement} ${product.rawUnit} of ${product.rawMaterial}`}
              />
              <Row label={t("planner.dailyOutputUsed")} value={`${plan.effectiveDailyCapacity} ${product.unit}/day`} />
              <Row label={t("planner.productionDaysRequired")} value={`${plan.daysNeeded} day(s)`} />
              <Row label={t("planner.possibleNow")} value={`${plan.achievableProduction} ${product.unit}`} />
            </dl>
            <div className="border-t border-border p-5">
              <Button size="lg" className="h-12 w-full" onClick={savePlan}>
                {t("planner.savePlanToProduction")}
              </Button>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-display text-lg font-semibold">{t("planner.whyThisRecommendation")}</h2>
            <ul className="mt-3 space-y-3">
              {plan.warnings.map((w, i) => (
                <li key={`${w.title}-${i}`} className="flex gap-3">
                  <span className="mt-0.5">
                    {w.level === "green" ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : w.level === "red" ? (
                      <TriangleAlert className="size-4 text-destructive" />
                    ) : (
                      <Info className="size-4 text-warning" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{w.title}</p>
                    <p className="text-sm text-muted-foreground">{w.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.overproductionRisk && <StatusPill level="yellow">{t("planner.overproductionRisk")}</StatusPill>}
              {plan.shortageRisk && <StatusPill level="red">{t("planner.shortageRisk")}</StatusPill>}
              {!plan.overproductionRisk && !plan.shortageRisk && (
                <StatusPill level="green">{t("planner.noRisk")}</StatusPill>
              )}
            </div>
          </div>

          {products.length > 1 && <CrossProductResourcesCard products={products} materials={materials} sales={sales} settings={settings} />}
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

interface CrossProductResourcesProps {
  products: any[];
  materials: any[];
  sales: any[];
  settings: any;
}

function CrossProductResourcesCard({
  products,
  materials,
  sales,
  settings,
}: CrossProductResourcesProps) {
  const productionPlans = useMemo(() => {
    const plans = new Map<string, number>();
    for (const p of products) {
      const demand = estimateDemand(sales, p.id);
      const safety = Math.round((demand.estimate * settings.safetyStockPercent) / 100);
      const need = Math.max(0, demand.estimate - p.currentStock + safety);
      if (need > 0) plans.set(p.id, need);
    }
    return plans;
  }, [products, sales, settings.safetyStockPercent]);

  const resourceAnalysis = useMemo(
    () => analyzeResourceConstraints(products, materials, productionPlans),
    [products, materials, productionPlans],
  );

  if (!resourceAnalysis.hasShortfall) return null;

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="size-5 text-destructive" />
        <h2 className="font-display text-lg font-semibold">Cross-Product Resource Alert</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Your planned production across all products requires more raw materials than available.
      </p>
      <ul className="mt-3 space-y-2">
        {resourceAnalysis.warnings.map((w) => (
          <li key={w.material} className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">{w.material}</p>
              <p className="text-xs text-muted-foreground">{w.suggestion}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
