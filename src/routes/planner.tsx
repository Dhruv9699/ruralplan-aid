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
import { computePlan, estimateDemand, materialFor } from "@/lib/ruralplan/engine";
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
        <PageHeader title="Production Planner" description="Add a product first." />
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          Go to the Products page and add a product to use the planner.
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
      toast.success("Production plan saved to production history");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save production plan");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Production Planner"
        description="Enter your current situation and get a clear recommended production quantity with the reason behind it."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Select product">
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
            <Field label={`Current stock (${product.unit})`}>
              <Input type="number" min={0} value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} />
            </Field>
            <Field label={`Expected demand (${product.unit})`} hint="Estimated from your sales history">
              <Input
                type="number"
                min={0}
                value={form.expectedDemand}
                onChange={(e) => set("expectedDemand", e.target.value)}
              />
            </Field>
            <Field label={`Production capacity per day (${product.unit})`}>
              <Input
                type="number"
                min={0}
                value={form.capacityPerDay}
                onChange={(e) => set("capacityPerDay", e.target.value)}
              />
            </Field>
            <Field label={`${product.rawMaterial} available (${product.rawUnit})`}>
              <Input
                type="number"
                min={0}
                value={form.rawMaterialAvailable}
                onChange={(e) => set("rawMaterialAvailable", e.target.value)}
              />
            </Field>
            <Field label="Number of workers">
              <Input type="number" min={0} value={form.workers} onChange={(e) => set("workers", e.target.value)} />
            </Field>
            <Field label="Production days available">
              <Input
                type="number"
                min={0}
                value={form.productionDays}
                onChange={(e) => set("productionDays", e.target.value)}
              />
            </Field>
            <Field label="Weather condition" hint="Affects daily output only, not demand">
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
            <Field label="Safety stock (%)">
              <Input type="number" min={0} max={100} value={form.safety} onChange={(e) => set("safety", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div className="surface-card overflow-hidden">
            <div className="hero-gradient p-6 text-sidebar-foreground">
              <p className="text-sm opacity-90">Recommended Production</p>
              <p className="mt-1 font-display text-4xl font-semibold">
                {plan.requiredProduction} {product.unit}
              </p>
              <p className="mt-3 text-sm opacity-90">{plan.reason}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <Row label="Expected demand" value={`${num(form.expectedDemand)} ${product.unit}`} />
              <Row label="Current stock" value={`${num(form.currentStock)} ${product.unit}`} />
              <Row label="Safety stock" value={`${plan.safetyStock} ${product.unit}`} />
              <Row label="Required" value={`${plan.requiredProduction} ${product.unit}`} />
              <Row
                label="Raw material needed"
                value={`${plan.rawRequirement} ${product.rawUnit} of ${product.rawMaterial}`}
              />
              <Row label="Daily output used" value={`${plan.effectiveDailyCapacity} ${product.unit}/day`} />
              <Row label="Production days required" value={`${plan.daysNeeded} day(s)`} />
              <Row label="Possible now" value={`${plan.achievableProduction} ${product.unit}`} />
            </dl>
            <div className="border-t border-border p-5">
              <Button size="lg" className="h-12 w-full" onClick={savePlan}>
                Save this plan to production history
              </Button>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-display text-lg font-semibold">Why this recommendation?</h2>
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
              {plan.overproductionRisk && <StatusPill level="yellow">Overproduction Risk</StatusPill>}
              {plan.shortageRisk && <StatusPill level="red">Shortage Risk</StatusPill>}
              {!plan.overproductionRisk && !plan.shortageRisk && (
                <StatusPill level="green">No overproduction or shortage risk</StatusPill>
              )}
            </div>
          </div>
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
