import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
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
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, settings, signIn, signOut, updateSettings, loadDemoData, clearAllData } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [village, setVillage] = useState(profile?.village ?? settings.village);
  const [district, setDistrict] = useState(profile?.district ?? settings.district);
  const [safety, setSafety] = useState(String(settings.safetyStockPercent));

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      toast.error("Please enter your name");
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
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Settings" description="Your profile, planning defaults and demo data." />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Village / Location">
              <Input value={village} onChange={(e) => setVillage(e.target.value)} />
            </Field>
            <Field label="District">
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
            <Field label="State">
              <Input value={profile?.state ?? "Maharashtra"} readOnly />
            </Field>
            <Field label="Safety stock (%)" hint="Extra stock kept above expected demand">
              <Input
                type="number"
                min={0}
                max={100}
                value={safety}
                onChange={(e) => setSafety(e.target.value)}
              />
            </Field>
            <Button className="h-12" onClick={saveProfile}>
              Save settings
            </Button>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">Data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            RuralPlan stores your products, sales, raw materials and production records in your
            secure account. You can reload sample data or start with a clean account.
          </p>
          <div className="mt-4 grid gap-3">
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                void loadDemoData().then(() => toast.success("Demo data reloaded")).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load demo data"));
              }}
            >
              Reload demo data
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                void clearAllData().then(() => toast.success("All data cleared")).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to clear data"));
              }}
            >
              Delete all data and start fresh
            </Button>
            <Button
              variant="ghost"
              className="h-12"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
            >
              Log out
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
