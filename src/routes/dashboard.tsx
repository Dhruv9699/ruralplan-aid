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
  const { products, materials, sales, settings } = useStore();
  const [selected, setSelected] = useState("");

  const product = products.find((p) => p.id === selected) ?? products[0];
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

  if (!product) {
    return (
      <AppShell>
        <PageHeader title="Dashboard" description="No products yet." />
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Add your first product to start planning production.
          </p>
          <Link to="/products" className="mt-4 inline-block">
            <Button size="lg">Add a product</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const demand = estimateDemand(sales, product.id);
  const mat = materialFor(materials, product.rawMaterial);
  const plan = computePlan({
    product,
    currentStock: product.currentStock,
    expectedDemand: demand.estimate,
    capacityPerDay: product.capacityPerDay,
    rawMaterialAvailable: mat?.currentQty ?? 0,
    workers: product.workers,
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
          <Select value={product.id} onValueChange={setSelected}>
            <SelectTrigger className="h-12 w-full min-w-52 sm:w-60">
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
        }
      />

      <section className="surface-card overflow-hidden">
        <div className="hero-gradient p-6 text-sidebar-foreground sm:p-8">
          <p className="text-sm font-medium opacity-90">Recommended Production · {product.name}</p>
          <p className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            {plan.requiredProduction} {product.unit}
          </p>
          <p className="mt-3 max-w-2xl text-sm opacity-90">{plan.reason}</p>
          <p className="mt-2 text-sm opacity-90">
            {matState.status === "green"
              ? "Available raw materials are sufficient."
              : `Raw material status: ${matState.label}.`}{" "}
            Estimated production time: {plan.daysNeeded} day(s) at {plan.effectiveDailyCapacity}{" "}
            {product.unit}/day.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusPill
              level={plan.statusLine.includes("blocked") ? "red" : plan.warnings.some((w) => w.level === "yellow") ? "yellow" : "green"}
            >
              {plan.statusLine}
            </StatusPill>
            <Link to="/planner">
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
          hint={products.map((p) => p.name).join(", ")}
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Current Stock"
          value={`${product.currentStock} ${product.unit}`}
          hint={`Minimum level ${product.minStock} ${product.unit}`}
          icon={<ShoppingBasket className="size-4" />}
          tone={product.currentStock <= product.minStock ? "warning" : "default"}
        />
        <StatCard
          label="Expected Demand"
          value={`${demand.estimate} ${product.unit}`}
          hint="Based on previous sales data"
          icon={<TrendingUp className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Recommended Production"
          value={`${plan.requiredProduction} ${product.unit}`}
          hint={`Includes ${plan.safetyStock} ${product.unit} safety stock`}
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
            {product.rawMaterial}: {mat ? `${mat.currentQty} ${mat.unit} available` : "not recorded"}
            {" · "}
            need about {plan.rawRequirement} {product.rawUnit}
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
            {settings.district}: {weather.today.condition}, {weather.today.tempC}°C · rain chance{" "}
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
          <ul className="mt-3 space-y-2.5">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.id} className="text-sm">
                <StatusPill level={a.level === "weather" ? "weather" : a.level}>
                  {a.level === "weather" ? "Weather" : a.level.toUpperCase()}
                </StatusPill>
                <span className="ml-2">{a.title}</span>
              </li>
            ))}
          </ul>
          <Link to="/alerts" className="mt-4 inline-block text-sm font-medium text-primary">
            View all alerts →
          </Link>
        </article>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {products.map((p) => {
          const d = estimateDemand(sales, p.id);
          const need = Math.max(
            0,
            d.estimate - p.currentStock + Math.round((d.estimate * settings.safetyStockPercent) / 100),
          );
          return (
            <article key={p.id} className="surface-card p-5">
              <h3 className="font-display text-base font-semibold">{p.name}</h3>
              <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Current stock</dt>
                  <dd className="font-medium text-foreground">
                    {p.currentStock} {p.unit}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Expected demand</dt>
                  <dd className="font-medium text-foreground">
                    {d.estimate} {p.unit}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Recommended production</dt>
                  <dd className="font-medium text-primary">
                    {need} {p.unit}
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
