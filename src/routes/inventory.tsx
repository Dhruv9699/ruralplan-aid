import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { StatusPill } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import { materialStatus } from "@/lib/ruralplan/engine";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Raw Materials & Inventory — RuralPlan" },
      {
        name: "description",
        content:
          "Track raw materials like mango, lemon, oil, salt, spices, jars and packaging with sufficient, low or insufficient status.",
      },
      { property: "og:title", content: "Raw Materials & Inventory — RuralPlan" },
      {
        property: "og:description",
        content: "See which raw materials are sufficient, low or insufficient for production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Material name cannot be empty").max(60),
  unit: z.string().trim().min(1, "Enter a unit"),
  currentQty: z.number().min(0, "Quantity cannot be negative"),
  requiredQty: z.number().min(0, "Required quantity cannot be negative"),
  minLevel: z.number().min(0, "Minimum level cannot be negative"),
});

function InventoryPage() {
  const { t } = useTranslation();
  const { materials, addMaterial, updateMaterial, removeMaterial } = useStore();
  const [form, setForm] = useState({
    name: "",
    unit: "kg",
    currentQty: "",
    requiredQty: "",
    minLevel: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const insufficient = materials.filter((m) => materialStatus(m).status === "red");

  const add = () => {
    const parsed = schema.safeParse({
      name: form.name,
      unit: form.unit,
      currentQty: Number(form.currentQty || 0),
      requiredQty: Number(form.requiredQty || 0),
      minLevel: Number(form.minLevel || 0),
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    void addMaterial(parsed.data)
      .then(() => {
        setForm({ name: "", unit: "kg", currentQty: "", requiredQty: "", minLevel: "" });
        toast.success(t("inventory.rawMaterialAdded"));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
  };

  return (
    <AppShell>
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.description")}
      />

      {insufficient.length > 0 && (
        <div className="mb-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {t("inventory.productionMayBeAffected")}{" "}
              {insufficient.map((m) => m.name.toLowerCase()).join(", ")}{" "}
              {insufficient.length === 1 ? t("inventory.isInsufficient") : t("inventory.areInsufficient")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("inventory.arrangeMoreMaterial")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {materials.map((m) => {
          const state = materialStatus(m);
          const pct = m.requiredQty > 0 ? Math.min(100, (m.currentQty / m.requiredQty) * 100) : 100;
          return (
            <article key={m.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{m.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("inventory.minimumLevel")} {m.minLevel} {m.unit}
                  </p>
                </div>
                <StatusPill level={state.status}>{state.label}</StatusPill>
              </div>
              <Progress value={pct} className="mt-4" />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label={`${t("inventory.current")} (${m.unit})`}>
                  <Input
                    type="number"
                    min={0}
                    value={m.currentQty}
                    onChange={(e) =>
                      void updateMaterial(m.id, { currentQty: Math.max(0, Number(e.target.value) || 0) }).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")))
                    }
                  />
                </Field>
                <Field label={`${t("inventory.required")} (${m.unit})`}>
                  <Input
                    type="number"
                    min={0}
                    value={m.requiredQty}
                    onChange={(e) =>
                      void updateMaterial(m.id, { requiredQty: Math.max(0, Number(e.target.value) || 0) }).catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")))
                    }
                  />
                </Field>
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  void removeMaterial(m.id)
                    .then(() => toast.success(t("inventory.materialRemoved")))
                    .catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
                }}
              >
                <Trash2 className="size-4 text-destructive" /> {t("common.remove")}
              </Button>
            </article>
          );
        })}
      </div>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">{t("inventory.addRawMaterial")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Field label={t("inventory.materialName")} error={errors["name"]}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("inventory.exampleMaterialName")}
              />
            </Field>
          </div>
          <Field label={t("inventory.unit")} error={errors["unit"]}>
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg" />
          </Field>
          <Field label={t("inventory.currentQuantity")} error={errors["currentQty"]}>
            <Input
              type="number"
              min={0}
              value={form.currentQty}
              onChange={(e) => set("currentQty", e.target.value)}
            />
          </Field>
          <Field label={t("inventory.requiredQuantity")} error={errors["requiredQty"]}>
            <Input
              type="number"
              min={0}
              value={form.requiredQty}
              onChange={(e) => set("requiredQty", e.target.value)}
            />
          </Field>
          <Field label={t("inventory.minimumLevel")} error={errors["minLevel"]}>
            <Input
              type="number"
              min={0}
              value={form.minLevel}
              onChange={(e) => set("minLevel", e.target.value)}
            />
          </Field>
        </div>
        <Button className="mt-4 h-12" onClick={add}>
          <Plus className="size-4" /> {t("inventory.addRawMaterial")}
        </Button>
      </section>
    </AppShell>
  );
}
