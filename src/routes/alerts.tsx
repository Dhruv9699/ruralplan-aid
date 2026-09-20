import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { StatusPill } from "@/components/stat-card";
import { useStore } from "@/lib/ruralplan/store";
import { buildAlerts } from "@/lib/ruralplan/alerts";
import { requireAuth } from "@/lib/auth-utils";

export const Route = createFileRoute("/alerts")({
  beforeLoad: async () => {
    await requireAuth();
  },
  head: () => ({
    meta: [
      { title: "Production Alerts — RuralPlan" },
      {
        name: "description",
        content:
          "Clear alerts for raw material shortage, low stock, rising demand, overproduction risk and weather that affects production.",
      },
      { property: "og:title", content: "Production Alerts — RuralPlan" },
      {
        property: "og:description",
        content: "See everything that needs your attention before you start production.",
      },
    ],
  }),
  component: AlertsPage,
});

const LABEL: Record<string, string> = {
  red: "Urgent",
  yellow: "Attention",
  green: "All good",
  blue: "Information",
  weather: "Weather",
};

function AlertsPage() {
  const { products, materials, sales, settings } = useStore();
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

  return (
    <AppShell>
      <PageHeader
        title="Alerts"
        description="These alerts are generated from your products, stock levels, raw materials, sales history and weather."
      />
      <div className="space-y-3">
        {alerts.map((a) => (
          <article key={a.id} className="surface-card flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:gap-4">
            <StatusPill level={a.level === "weather" ? "weather" : a.level}>
              {LABEL[a.level] ?? a.level}
            </StatusPill>
            <div>
              <p className="font-display text-base font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
