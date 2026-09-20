import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CloudRain, CloudSun, Droplets, Sun, Thermometer } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { StatCard } from "@/components/stat-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { MAHARASHTRA_DISTRICTS, getWeather } from "@/lib/ruralplan/weather";
import { requireAuth } from "@/lib/auth-utils";

export const Route = createFileRoute("/weather")({
  beforeLoad: async () => {
    await requireAuth();
  },
  head: () => ({
    meta: [
      { title: "Weather — RuralPlan" },
      {
        name: "description",
        content:
          "Check temperature, rain probability and the next three days for your district, with simple production and storage advice.",
      },
      { property: "og:title", content: "Weather — RuralPlan" },
      {
        property: "og:description",
        content: "Weather information used as a supporting factor for production planning.",
      },
    ],
  }),
  component: WeatherPage,
});

function iconFor(condition: string) {
  if (condition.includes("Heavy")) return <CloudRain className="size-5 text-info" />;
  if (condition.includes("Rain")) return <CloudRain className="size-5 text-info" />;
  if (condition === "Sunny") return <Sun className="size-5 text-accent" />;
  if (condition === "Humid") return <Droplets className="size-5 text-info" />;
  return <CloudSun className="size-5 text-muted-foreground" />;
}

function WeatherPage() {
  const { settings, updateSettings } = useStore();
  const [district, setDistrict] = useState(settings.district);
  const [location, setLocation] = useState(settings.village);

  const report = useMemo(() => getWeather(district, location), [district, location]);

  return (
    <AppShell>
      <PageHeader
        title="Weather"
        description="Weather is used only as a supporting factor for production, storage and raw material planning. It does not predict demand."
      />

      <section className="surface-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="District">
            <Select
              value={district}
              onValueChange={(v) => {
                setDistrict(v);
                updateSettings({ district: v });
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Village / Location">
            <Input
              className="h-12"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                updateSettings({ village: e.target.value });
              }}
              placeholder="Village or town"
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Showing sample weather data for this prototype. A live weather service can be connected
          later without changing the rest of the app.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current temperature"
          value={`${report.today.tempC}°C`}
          hint={`${district}${location ? `, ${location}` : ""}`}
          icon={<Thermometer className="size-4" />}
        />
        <StatCard
          label="Rain probability"
          value={`${report.today.rainChance}%`}
          hint="Today"
          icon={<CloudRain className="size-4" />}
          tone={report.today.rainChance >= 60 ? "warning" : "info"}
        />
        <StatCard
          label="Condition"
          value={report.today.condition}
          hint={`Humidity ${report.today.humidity}%`}
          icon={iconFor(report.today.condition)}
        />
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {report.forecast.map((d) => (
          <article key={d.date} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-base font-semibold">{d.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </p>
              </div>
              {iconFor(d.condition)}
            </div>
            <p className="mt-3 text-sm">{d.condition}</p>
            <p className="text-sm text-muted-foreground">
              {d.tempC}°C · rain {d.rainChance}% · humidity {d.humidity}%
            </p>
          </article>
        ))}
      </section>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Production advice</h2>
        <p className="mt-2 text-sm text-muted-foreground">{report.productionNote}</p>
      </section>
    </AppShell>
  );
}
