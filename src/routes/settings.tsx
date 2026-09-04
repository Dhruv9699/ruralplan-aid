import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import { MAHARASHTRA_DISTRICTS } from "@/lib/ruralplan/weather";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RuralPlan" },
      {
        name: "description",
        content:
          "Update your profile, district, safety stock percentage, and reset or reload the demo data used in RuralPlan.",
      },
      { property: "og:title", content: "Settings — RuralPlan" },
      {
        property: "og:description",
        content: "Manage your profile, planning settings and demo data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { profile, settings, signIn, signOut, updateSettings, loadDemoData, clearAllData } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [village, setVillage] = useState(profile?.village ?? settings.village);
  const [district, setDistrict] = useState(profile?.district ?? settings.district);
  const [safety, setSafety] = useState(String(settings.safetyStockPercent));

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      toast.error(t("common.error"));
      return;
    }
    try {
      await signIn({
      name: name.trim(),
      email: profile?.email ?? "demo@ruralplan.in",
      village: village.trim(),
      district,
      state: profile?.state ?? "Maharashtra",
      });
      const pct = Math.min(100, Math.max(0, Number(safety) || 0));
      await updateSettings({ village: village.trim(), district, safetyStockPercent: pct });
      toast.success(t("settings.settingsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  return (
    <AppShell>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">{t("settings.profile")}</h2>
          <div className="mt-4 grid gap-4">
            <Field label={t("settings.name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.yourName")} />
            </Field>
            <Field label={t("settings.villageLocation")}>
              <Input value={village} onChange={(e) => setVillage(e.target.value)} />
            </Field>
            <Field label={t("settings.district")}>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger>
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
            <Field label={t("settings.state")}>
              <Input value={profile?.state ?? "Maharashtra"} readOnly />
            </Field>
            <Field label={t("settings.safetyStockPercent")} hint={t("settings.safetyStockHint")}>
              <Input
                type="number"
                min={0}
                max={100}
                value={safety}
                onChange={(e) => setSafety(e.target.value)}
              />
            </Field>
            <Button className="h-12" onClick={saveProfile}>
              {t("settings.saveSettings")}
            </Button>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">{t("settings.data")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("settings.ruralPlanStores")}
          </p>
          <div className="mt-4 grid gap-3">
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                void loadDemoData().then(() => toast.success(t("settings.demoDataReloaded"))).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
              }}
            >
              {t("settings.reloadDemoData")}
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                void clearAllData().then(() => toast.success(t("settings.allDataCleared"))).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
              }}
            >
              {t("settings.deleteAllData")}
            </Button>
            <Button
              variant="ghost"
              className="h-12"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
            >
              {t("common.logout")}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
