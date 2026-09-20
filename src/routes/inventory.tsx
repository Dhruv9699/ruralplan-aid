import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { materialStatus } from "@/lib/ruralplan/engine";
import { calculateMaterialRequirements, PRODUCT_RECIPES } from "@/lib/ruralplan/recipes";
import { requireAuth } from "@/lib/auth-utils";

export const Route = createFileRoute("/inventory")({
  beforeLoad: async () => {
    await requireAuth();
  },
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

interface MaterialUsage {
  productName: string;
  quantityPerUnit: number;
  unit: string;
  recommendedProduction: number;
  totalRequired: number;
}

function InventoryPage() {
  const { materials, products, addMaterial, updateMaterial, removeMaterial } = useStore();
  const [form, setForm] = useState({
    name: "",
    unit: "kg",
    currentQty: "",
    requiredQty: "0",
    minLevel: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Calculate material usage from recipes and suggested production quantities
  const materialUsageMap = useMemo(() => {
    const usageMap: Record<string, MaterialUsage[]> = {};

    products.forEach((product) => {
      // Use a simple production recommendation: current stock + 20% buffer
      const recommendedProduction = Math.ceil(product.minStock * 1.2);
      
      const requirements = calculateMaterialRequirements(product.name, recommendedProduction);
      
      requirements.forEach((req) => {
        const materialName = req.materialName.toLowerCase().trim();
        if (!usageMap[materialName]) {
          usageMap[materialName] = [];
        }
        usageMap[materialName].push({
          productName: product.name,
          quantityPerUnit: req.quantityPerUnit,
          unit: req.unit,
          recommendedProduction,
          totalRequired: req.totalRequired,
        });
      });
    });

    return usageMap;
  }, [products]);

  // Calculate total required quantity for each material
  const materialsWithCalculatedRequired = useMemo(() => {
    return materials.map((material) => {
      const materialKey = material.name.toLowerCase().trim();
      const usage = materialUsageMap[materialKey] || [];
      const calculatedRequired = usage.reduce((sum, u) => sum + u.totalRequired, 0);
      
      return {
        ...material,
        calculatedRequired,
        usage,
      };
    });
  }, [materials, materialUsageMap]);

  const insufficient = materialsWithCalculatedRequired.filter((m) => {
    const required = m.calculatedRequired > 0 ? m.calculatedRequired : m.requiredQty;
    return m.currentQty < required;
  });

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
    
    (async () => {
      try {
        await addMaterial(parsed.data);
        setForm({ name: "", unit: "kg", currentQty: "", requiredQty: "0", minLevel: "" });
        toast.success("Raw material added");
      } catch (error) {
        console.error("Failed to add material:", error);
        toast.error(error instanceof Error ? error.message : "Failed to add material");
      }
    })();
  };

  return (
    <AppShell>
      <PageHeader
        title="Raw Materials"
        description="Track your inventory and see which materials are needed for planned production."
      />

      {insufficient.length > 0 && (
        <div className="mb-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Production may be affected because{" "}
              {insufficient.map((m) => m.name.toLowerCase()).join(", ")}{" "}
              {insufficient.length === 1 ? "is" : "are"} insufficient.
            </p>
            <p className="text-sm text-muted-foreground">
              Arrange more material or plan a smaller batch.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {materialsWithCalculatedRequired.map((m) => {
          const requiredQty = m.calculatedRequired > 0 ? m.calculatedRequired : m.requiredQty;
          const state = materialStatus({ ...m, requiredQty });
          const pct = requiredQty > 0 ? Math.min(100, (m.currentQty / requiredQty) * 100) : 100;
          
          return (
            <article key={m.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">{m.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Minimum level {m.minLevel} {m.unit}
                  </p>
                </div>
                <StatusPill level={state.status}>{state.label}</StatusPill>
              </div>

              <Progress value={pct} className="mt-4" />

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-medium">{m.currentQty} {m.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Required</p>
                    <p className="font-medium">{requiredQty.toFixed(2)} {m.unit}</p>
                  </div>
                </div>

                {m.usage.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Used For:</p>
                    <div className="space-y-2">
                      {m.usage.map((usage, idx) => (
                        <div key={idx} className="text-xs bg-muted/50 rounded p-2">
                          <p className="font-medium">{usage.productName}</p>
                          <p className="text-muted-foreground">
                            {usage.quantityPerUnit} {usage.unit} per unit × {usage.recommendedProduction} units
                          </p>
                          <p className="font-medium text-primary">
                            = {usage.totalRequired.toFixed(2)} {usage.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Field label={`Update (${m.unit})`}>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={m.currentQty}
                    onChange={async (e) => {
                      try {
                        await updateMaterial(m.id, { currentQty: Math.max(0, Number(e.target.value) || 0) });
                      } catch (error) {
                        toast.error("Failed to update quantity");
                      }
                    }}
                  />
                </Field>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={async () => {
                    try {
                      await removeMaterial(m.id);
                      toast.success(`${m.name} removed`);
                    } catch (error) {
                      toast.error("Failed to remove material");
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" /> Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-semibold">Add a raw material</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <Field label="Material name" error={errors["name"]}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Mustard oil"
              />
            </Field>
          </div>
          <Field label="Unit" error={errors["unit"]}>
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg" />
          </Field>
          <Field label="Current quantity" error={errors["currentQty"]}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.currentQty}
              onChange={(e) => set("currentQty", e.target.value)}
            />
          </Field>
          <Field label="Minimum level" error={errors["minLevel"]}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.minLevel}
              onChange={(e) => set("minLevel", e.target.value)}
            />
          </Field>
        </div>
        <Button className="mt-4 h-12" onClick={add}>
          <Plus className="size-4" /> Add material
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Required quantities are calculated automatically based on recommended production levels.
        </p>
      </section>
    </AppShell>
  );
}
