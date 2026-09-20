import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Package, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { calculateMaterialRequirements, getRecipeForProduct } from "@/lib/ruralplan/recipes";
import { requireAuth } from "@/lib/auth-utils";
import { FIXED_PICKLE_NAMES, getDefaultPickleName } from "@/lib/ruralplan/constants";

export const Route = createFileRoute("/planner")({
  beforeLoad: async () => {
    await requireAuth();
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      product: (search.product as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Production Planner — RuralPlan" },
      {
        name: "description",
        content: "Plan pickle production, check raw material availability, and complete production batches.",
      },
      { property: "og:title", content: "Production Planner — RuralPlan" },
      {
        property: "og:description",
        content: "Select product, enter quantity, check materials, and mark production complete.",
      },
    ],
  }),
  component: Planner,
});

interface MaterialRequirement {
  materialName: string;
  quantityPerUnit: number;
  unit: string;
  totalRequired: number;
  available: number;
  shortage: number;
  surplus: number;
  sufficient: boolean;
}

function Planner() {
  const { products, materials, updateProduct, updateMaterial, addProduction, loadUserData } = useStore();
  const search = Route.useSearch();
  
  // Work with pickle names instead of product IDs - always show 5 fixed pickles
  const [selectedPickleName, setSelectedPickleName] = useState<string>(getDefaultPickleName());
  const [quantity, setQuantity] = useState<string>("100");
  const [isCompleting, setIsCompleting] = useState(false);

  // Find product data if it exists (may be null for new accounts)
  const productData = products.find((p) => p.name === selectedPickleName);

  // Pre-select product from URL search params (from "Use This Recipe" button)
  useEffect(() => {
    if (search.product) {
      const matchingPickle = FIXED_PICKLE_NAMES.find(
        (name) => name.toLowerCase() === search.product?.toLowerCase()
      );
      if (matchingPickle) {
        setSelectedPickleName(matchingPickle);
      }
    }
  }, [search.product]);

  // Calculate material requirements from recipe (works without product data)
  const materialRequirements: MaterialRequirement[] = calculateMaterialRequirements(
    selectedPickleName,
    Number(quantity) || 0
  ).map((req) => {
    // Find the material in inventory by name (case-insensitive)
    const material = materials.find(
      (m) => m.name.toLowerCase().trim() === req.materialName.toLowerCase().trim()
    );

    const available = material?.currentQty ?? 0;
    const shortage = Math.max(0, req.totalRequired - available);
    const surplus = Math.max(0, available - req.totalRequired);
    const sufficient = available >= req.totalRequired;

    return {
      ...req,
      available,
      shortage,
      surplus,
      sufficient,
    };
  });

  const allMaterialsSufficient = materialRequirements.length > 0 && materialRequirements.every((m) => m.sufficient);
  const hasInsufficientMaterials = materialRequirements.some((m) => !m.sufficient);

  const recipe = getRecipeForProduct(selectedPickleName);
  const productionQuantity = Number(quantity) || 0;

  const handleMarkComplete = async () => {
    if (!productData) {
      toast.error("Product not found in your account. Load demo data from Settings to continue.");
      return;
    }
    
    if (productionQuantity <= 0) {
      toast.error("Please enter a valid production quantity");
      return;
    }

    if (hasInsufficientMaterials) {
      toast.error("Cannot complete production: insufficient raw materials");
      return;
    }

    try {
      setIsCompleting(true);

      // 1. Deduct raw materials from inventory
      for (const req of materialRequirements) {
        const material = materials.find(
          (m) => m.name.toLowerCase().trim() === req.materialName.toLowerCase().trim()
        );
        if (material) {
          const newQty = Math.max(0, material.currentQty - req.totalRequired);
          console.log(`Updating material ${material.name}: ${material.currentQty} -> ${newQty}`);
          await updateMaterial(material.id, { currentQty: newQty });
        } else {
          console.warn(`Material not found in inventory: ${req.materialName}`);
        }
      }

      // 2. Increase finished product stock
      const newStock = productData.currentStock + productionQuantity;
      console.log(`Updating product stock: ${productData.currentStock} -> ${newStock}`);
      await updateProduct(productData.id, { currentStock: newStock });

      // 3. Record in production history
      console.log(`Adding production record: ${productionQuantity} ${productData.unit}`);
      await addProduction({
        date: new Date().toISOString().slice(0, 10),
        productId: productData.id,
        planned: productionQuantity,
        actual: productionQuantity,
        sold: 0,
      });

      // 4. Reload all user data to ensure UI is synchronized
      await loadUserData();

      toast.success(
        `Production complete! ${productionQuantity} ${productData.unit} of ${selectedPickleName} produced.`
      );

      // Reset form
      setQuantity("100");
    } catch (error) {
      console.error("Failed to complete production:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete production");
      
      // Reload data to ensure UI reflects actual state after error
      try {
        await loadUserData();
      } catch (reloadError) {
        console.error("Failed to reload data after error:", reloadError);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Production Planner"
        description="Select product, enter quantity, check materials, and mark production complete."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Step 1 & 2: Product Selection and Quantity */}
        <section className="surface-card p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold mb-4">1. Select Product</h2>
            <Field label="Which pickle do you want to produce?">
              <Select
                value={selectedPickleName}
                onValueChange={setSelectedPickleName}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {FIXED_PICKLE_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold mb-4">2. Enter Quantity</h2>
            <Field label={`How many jars do you want to produce?`}>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 text-lg"
              />
            </Field>
            <p className="mt-2 text-sm text-muted-foreground">
              Current stock: {productData?.currentStock ?? 0} {productData?.unit ?? "jar"}
            </p>
          </div>

          {recipe && productionQuantity > 0 && (
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recipe per jar:</h3>
              <ul className="space-y-1 text-sm">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      {ing.materialName}: {ing.quantityPerUnit} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Step 3 & 4: Material Requirements and Availability Check */}
        {productionQuantity > 0 && (
          <section className="surface-card p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold mb-4">3. Raw Material Requirements</h2>
              <p className="text-sm text-muted-foreground mb-4">
                For {productionQuantity} jars of {selectedPickleName}:
              </p>

              {materialRequirements.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                  <TriangleAlert className="size-5 shrink-0 text-warning" />
                  <p className="text-sm text-warning-foreground">
                    No recipe found for {selectedPickleName}. Add materials to continue.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${
                        req.sufficient
                          ? "border-success/30 bg-success/5"
                          : "border-destructive/30 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {req.sufficient ? (
                              <CheckCircle2 className="size-5 text-success" />
                            ) : (
                              <XCircle className="size-5 text-destructive" />
                            )}
                            <h3 className="font-semibold">{req.materialName}</h3>
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Required:</dt>
                            <dd className="font-medium">
                              {req.totalRequired} {req.unit}
                            </dd>
                            <dt className="text-muted-foreground">Available:</dt>
                            <dd className="font-medium">
                              {req.available} {req.unit}
                            </dd>
                            {req.sufficient ? (
                              <>
                                <dt className="text-muted-foreground">Surplus:</dt>
                                <dd className="font-medium text-success">
                                  +{req.surplus.toFixed(2)} {req.unit}
                                </dd>
                              </>
                            ) : (
                              <>
                                <dt className="text-muted-foreground">Shortage:</dt>
                                <dd className="font-medium text-destructive">
                                  -{req.shortage.toFixed(2)} {req.unit}
                                </dd>
                              </>
                            )}
                          </dl>
                        </div>
                        <div className="shrink-0">
                          {req.sufficient ? (
                            <span className="inline-flex items-center rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-success">
                              Sufficient
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive">
                              Insufficient
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Calculation: {productionQuantity} × {req.quantityPerUnit} = {req.totalRequired} {req.unit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 5: Production Action */}
            <div className="border-t border-border pt-5">
              <h2 className="font-display text-lg font-semibold mb-4">4. Complete Production</h2>

              {hasInsufficientMaterials ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Cannot complete production</p>
                    <p className="text-sm text-destructive/90 mt-1">
                      Insufficient raw materials. Please update your inventory or reduce the production quantity.
                    </p>
                  </div>
                </div>
              ) : allMaterialsSufficient ? (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4 mb-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <div>
                    <p className="text-sm font-semibold text-success">All materials available</p>
                    <p className="text-sm text-success/90 mt-1">
                      You have sufficient raw materials to produce {productionQuantity} {productData?.unit ?? "jar"}.
                    </p>
                  </div>
                </div>
              ) : null}

              <Button
                size="lg"
                className="h-14 w-full"
                onClick={handleMarkComplete}
                disabled={hasInsufficientMaterials || isCompleting || productionQuantity <= 0}
              >
                <Package className="size-5" />
                Mark Production Complete
              </Button>

              <p className="mt-3 text-xs text-muted-foreground text-center">
                This will deduct raw materials, increase finished stock by {productionQuantity} {productData?.unit ?? "jar"},
                and record the batch in production history.
              </p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
