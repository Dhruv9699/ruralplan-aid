import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CloudSun,
  Package,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatCard, StatusPill } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { computePlan, estimateDemand, materialFor, materialStatus } from "@/lib/ruralplan/engine";
import { buildAlerts } from "@/lib/ruralplan/alerts";
import { getWeather, weatherFactor } from "@/lib/ruralplan/weather";
import { requireAuth } from "@/lib/auth-utils";
import { FIXED_PICKLE_NAMES, getDefaultPickleName } from "@/lib/ruralplan/constants";
import type { Product } from "@/lib/ruralplan/types";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    await requireAuth();
  },
  head: () => ({
    meta: [
      { title: "Dashboard — RuralPlan" },
      {
        name: "description",
        content:
          "See stock, expected demand, recommended production, raw material status, weather and production alerts in one place.",
      },
      { property: "og:title", content: "Dashboard — RuralPlan" },
      {
        property: "og:description",
        content: "Your production planning overview: stock, demand, recommendation and alerts.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { products, materials, sales, settings, loadDemoData } = useStore();
  
  // Selected pickle name (not product ID) - works even with no business data
  const [selectedPickleName, setSelectedPickleName] = useState<string>(getDefaultPickleName());
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Find product data for selected pickle (may be null if no business data)
  const productData = products.find((p) => p.name === selectedPickleName);
  
  // Create a virtual product structure for the selected pickle
  // This allows calculations to work even with zero/no data
  const virtualProduct: Product = productData || {
    id: `virtual-${selectedPickleName}`,
    userId: "",
    name: selectedPickleName,
    rawMaterial: selectedPickleName.split(" ")[0], // e.g., "Mango" from "Mango Pickle"
    unit: "jar",
    capacityPerDay: 0,
    minStock: 0,
    currentStock: 0,
    productionCost: 0,
    shelfLifeDays: 30,
    workers: 0,
    rawPerUnit: 0,
    rawUnit: "kg",
  };

  const weather = useMemo(
    () => getWeather(settings.district, settings.village),
    [settings.district, settings.village],
  );
  const factor = weatherFactor(weather);

  const alerts = useMemo(
    () =>
      buildAlerts(
        products,
        materials,
        sales,
        settings.safetyStockPercent,
        settings.district,
        settings.village,
      ),
    [products, materials, sales, settings],
  );

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      await loadDemoData();
    } catch (error) {
      console.error("Failed to load demo data:", error);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Calculate demand and plan even with zero data
  const demand = productData ? estimateDemand(sales, productData.id) : { estimate: 0, trend: 0 };
  const mat = materialFor(materials, virtualProduct.rawMaterial);
  const plan = computePlan({
    product: virtualProduct,
    currentStock: virtualProduct.currentStock,
    expectedDemand: demand.estimate,
    capacityPerDay: virtualProduct.capacityPerDay || 50, // Default capacity for calculation
    rawMaterialAvailable: mat?.currentQty ?? 0,
    workers: virtualProduct.workers || 2, // Default workers for calculation
    productionDays: 7,
    weatherSlowdown: factor.slowdown,
    weatherLabel: factor.label,
    safetyStockPercent: settings.safetyStockPercent,
  });
  const matState = mat ? materialStatus(mat) : { status: "red" as const, label: "Not recorded" };

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="RuralPlan helps rural entrepreneurs decide what, when, and how much to produce using their sales history, demand estimates, inventory, available resources, production capacity, and weather information."
        action={
          <div className="flex items-center gap-3">
            {products.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadDemoData}
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? "Loading..." : "Load Pickle Products"}
              </Button>
            )}
            <Select value={selectedPickleName} onValueChange={setSelectedPickleName}>
              <SelectTrigger className="h-12 w-full min-w-52 sm:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIXED_PICKLE_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <section className="surface-card overflow-hidden">
        <div className="hero-gradient p-6 text-sidebar-foreground sm:p-8">
          <p className="text-sm font-medium opacity-90">Recommended Production · {selectedPickleName}</p>
          <p className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            {plan.requiredProduction} {virtualProduct.unit}
          </p>
          <p className="mt-3 max-w-2xl text-sm opacity-90">{plan.reason}</p>
          <p className="mt-2 text-sm opacity-90">
            {matState.status === "green"
              ? "You have sufficient raw materials to produce"
              : `Raw Material Status: ${matState.label}.`}{" "}
            Estimated production time: {plan.daysNeeded} {plan.daysNeeded === 1 ? "day" : "days"} at {plan.effectiveDailyCapacity}{" "}
            {virtualProduct.unit}/day.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusPill
              level={plan.statusLine.includes("blocked") ? "red" : plan.warnings.some((w) => w.level === "yellow") ? "yellow" : "green"}
            >
              {plan.statusLine}
            </StatusPill>
            <Link to="/planner" search={{ product: selectedPickleName }}>
              <Button variant="secondary" size="sm">
                Open Production Planner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Products"
          value={products.length}
          hint={products.length > 0 ? products.map((p) => p.name).join(", ") : "No alerts. Everything looks good!"}
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Current Stock"
          value={`${virtualProduct.currentStock} ${virtualProduct.unit}`}
          hint={`Minimum ${virtualProduct.minStock} ${virtualProduct.unit}`}
          icon={<ShoppingBasket className="size-4" />}
          tone={virtualProduct.currentStock <= virtualProduct.minStock ? "warning" : "default"}
        />
        <StatCard
          label="Expected Demand"
          value={`${demand.estimate} ${virtualProduct.unit}`}
          hint="Based on previous sales data"
          icon={<TrendingUp className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Recommended Production"
          value={`${plan.requiredProduction} ${virtualProduct.unit}`}
          hint={`Calculation ${plan.safetyStock} ${virtualProduct.unit} Safety stock`}
          icon={<Sparkles className="size-4" />}
          tone="success"
        />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Raw Material Status</h2>
            <Boxes className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {virtualProduct.rawMaterial}: {mat ? `${mat.currentQty} ${mat.unit} Available` : "not recorded"}
            {" · "}
            Required {plan.rawRequirement} {virtualProduct.rawUnit}
          </p>
          <div className="mt-3">
            <StatusPill level={matState.status}>{matState.label}</StatusPill>
          </div>
          <Link to="/inventory" className="mt-4 inline-block text-sm font-medium text-primary">
            Manage raw materials →
          </Link>
        </article>

        <article className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Weather</h2>
            <CloudSun className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm">
            {settings.district}: {weather.today.condition}, {weather.today.tempC}°C · Rain chance{" "}
            {weather.today.rainChance}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{weather.productionNote}</p>
          <Link to="/weather" className="mt-4 inline-block text-sm font-medium text-primary">
            See 3-day forecast →
          </Link>
        </article>

        <article className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Production Alerts</h2>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </div>
          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No alerts. Everything looks good!</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {alerts.slice(0, 4).map((a) => (
                <li key={a.id} className="text-sm">
                  <StatusPill level={a.level === "weather" ? "weather" : a.level}>
                    {a.level === "weather" ? "Weather" : a.level.toUpperCase()}
                  </StatusPill>
                  <span className="ml-2">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
          {alerts.length > 4 && (
            <p className="mt-3 text-xs text-muted-foreground">+{alerts.length - 4} more alerts</p>
          )}
        </article>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {FIXED_PICKLE_NAMES.map((pickleName) => {
          const p = products.find((prod) => prod.name === pickleName);
          const d = p ? estimateDemand(sales, p.id) : { estimate: 0, trend: 0 };
          const need = p
            ? Math.max(
                0,
                d.estimate - p.currentStock + Math.round((d.estimate * settings.safetyStockPercent) / 100),
              )
            : 0;
          
          return (
            <article key={pickleName} className="surface-card p-5">
              <h3 className="font-display text-base font-semibold">{pickleName}</h3>
              <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Current Stock</dt>
                  <dd className="font-medium text-foreground">
                    {p?.currentStock ?? 0} {p?.unit ?? "jar"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Expected Demand</dt>
                  <dd className="font-medium text-foreground">
                    {d.estimate} {p?.unit ?? "jar"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Recommended Production</dt>
                  <dd className="font-medium text-primary">
                    {need} {p?.unit ?? "jar"}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
