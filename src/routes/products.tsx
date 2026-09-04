import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { ColdStartSetup } from "@/components/cold-start-setup";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import type { Product } from "@/lib/ruralplan/types";
import type { ColdStartInput } from "@/lib/ruralplan/engine";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — RuralPlan" },
      {
        name: "description",
        content:
          "Add, edit and delete any fruit or food product with its capacity, stock, shelf life and raw material requirement.",
      },
      { property: "og:title", content: "Products — RuralPlan" },
      {
        property: "og:description",
        content: "Manage the products you make and their production details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const UNITS = ["jar", "kg", "litre", "packet", "box", "bottle"];

const schema = z.object({
  name: z.string().trim().min(2, "Product name cannot be empty").max(60),
  rawMaterial: z.string().trim().min(2, "Enter the raw material or fruit name").max(60),
  unit: z.string().trim().min(1, "Select a unit"),
  rawUnit: z.string().trim().min(1, "Select a raw material unit"),
  capacityPerDay: z.number().positive("Production capacity must be greater than 0"),
  minStock: z.number().min(0, "Minimum stock cannot be negative"),
  currentStock: z.number().min(0, "Current stock cannot be negative"),
  productionCost: z.number().min(0, "Cost cannot be negative"),
  shelfLifeDays: z.number().positive("Shelf life must be greater than 0"),
  workers: z.number().min(1, "At least one worker is needed"),
  rawPerUnit: z.number().positive("Raw material per unit must be greater than 0"),
});

const blank = {
  name: "",
  rawMaterial: "",
  unit: "jar",
  rawUnit: "kg",
  capacityPerDay: "50",
  minStock: "20",
  currentStock: "0",
  productionCost: "0",
  shelfLifeDays: "180",
  workers: "2",
  rawPerUnit: "0.5",
};

type FormState = typeof blank;

function toForm(p: Product): FormState {
  return {
    name: p.name,
    rawMaterial: p.rawMaterial,
    unit: p.unit,
    rawUnit: p.rawUnit,
    capacityPerDay: String(p.capacityPerDay),
    minStock: String(p.minStock),
    currentStock: String(p.currentStock),
    productionCost: String(p.productionCost ?? 0),
    shelfLifeDays: String(p.shelfLifeDays),
    workers: String(p.workers),
    rawPerUnit: String(p.rawPerUnit),
  };
}

function ProductsPage() {
  const { t } = useTranslation();
  const { products, addProduct, updateProduct, removeProduct } = useStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coldStartOpen, setColdStartOpen] = useState(false);
  const [coldStartProduct, setColdStartProduct] = useState<Product | null>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setEditId(null);
    setForm(blank);
    setErrors({});
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm(toForm(p));
    setErrors({});
    setOpen(true);
  }

  async function save() {
    const parsed = schema.safeParse({
      name: form.name,
      rawMaterial: form.rawMaterial,
      unit: form.unit,
      rawUnit: form.rawUnit,
      capacityPerDay: Number(form.capacityPerDay),
      minStock: Number(form.minStock),
      currentStock: Number(form.currentStock),
      productionCost: Number(form.productionCost),
      shelfLifeDays: Number(form.shelfLifeDays),
      workers: Number(form.workers),
      rawPerUnit: Number(form.rawPerUnit),
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      toast.error(t("products.correctHighlightedFields"));
      return;
    }
    try {
      if (editId) {
        await updateProduct(editId, parsed.data);
        toast.success(t("products.productUpdated"));
      } else {
        await addProduct(parsed.data);
        toast.success(t("products.productAdded"));
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  async function handleColdStartSave(input: ColdStartInput) {
    if (!coldStartProduct) return;
    try {
      await updateProduct(coldStartProduct.id, {
        demandMode: "cold_start",
        potentialCustomers: input.potentialCustomers,
        conversionRate: input.conversionRate,
        purchaseFrequency: input.purchaseFrequency,
        avgPurchaseQuantity: input.avgPurchaseQuantity,
        isSeasonal: input.isSeasonal,
        seasonStartMonth: input.seasonStartMonth,
        seasonEndMonth: input.seasonEndMonth,
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to save Cold Start settings");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        action={
          <Button size="lg" className="h-12" onClick={openNew}>
            <Plus className="size-5" /> {t("products.addProduct")}
          </Button>
        }
      />

      {products.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {t("products.noProducts")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <article key={p.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("products.rawMaterialFruit")}: {p.rawMaterial} · {p.rawPerUnit} {p.rawUnit} per {p.unit}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label={t("common.edit")} onClick={() => openEdit(p)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Setup Cold Start"
                    title="Setup initial demand estimate"
                    onClick={() => {
                      setColdStartProduct(p);
                      setColdStartOpen(true);
                    }}
                  >
                    <TrendingUp className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("common.delete")}
                    onClick={() => {
                      void removeProduct(p.id)
                        .then(() => toast.success(t("products.productDeleted")))
                        .catch((error) => toast.error(error instanceof Error ? error.message : t("common.error")));
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <Detail label={t("products.currentStock")} value={`${p.currentStock} ${p.unit}`} />
                <Detail label={t("products.minimumStockLevel")} value={`${p.minStock} ${p.unit}`} />
                <Detail label={t("products.productionCapacityPerDay")} value={`${p.capacityPerDay} ${p.unit}`} />
                <Detail label={t("products.availableWorkers")} value={String(p.workers)} />
                <Detail label={t("products.shelfLifeDays")} value={`${p.shelfLifeDays} days`} />
                <Detail label={t("products.productionCost")} value={p.productionCost ? `₹${p.productionCost}` : "—"} />
              </dl>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t("products.editProductDialog") : t("products.addProductDialog")}</DialogTitle>
            <DialogDescription>
              {t("products.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("products.productName")} error={errors["name"]}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("products.exampleProductName")} />
            </Field>
            <Field label={t("products.rawMaterialFruit")} error={errors["rawMaterial"]}>
              <Input
                value={form.rawMaterial}
                onChange={(e) => set("rawMaterial", e.target.value)}
                placeholder={t("products.exampleRawMaterial")}
              />
            </Field>
            <Field label={t("products.unit")} error={errors["unit"]}>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("products.rawMaterialUnit")} error={errors["rawUnit"]}>
              <Select value={form.rawUnit} onValueChange={(v) => set("rawUnit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("products.productionCapacityPerDay")} error={errors["capacityPerDay"]}>
              <Input
                type="number"
                min={0}
                value={form.capacityPerDay}
                onChange={(e) => set("capacityPerDay", e.target.value)}
              />
            </Field>
            <Field label={t("products.minimumStockLevel")} error={errors["minStock"]}>
              <Input type="number" min={0} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
            </Field>
            <Field label={t("products.currentStock")} error={errors["currentStock"]}>
              <Input
                type="number"
                min={0}
                value={form.currentStock}
                onChange={(e) => set("currentStock", e.target.value)}
              />
            </Field>
            <Field
              label={t("products.productionCost")}
              error={errors["productionCost"]}
              hint={t("products.productionCostHint")}
            >
              <Input
                type="number"
                min={0}
                value={form.productionCost}
                onChange={(e) => set("productionCost", e.target.value)}
              />
            </Field>
            <Field label={t("products.shelfLifeDays")} error={errors["shelfLifeDays"]}>
              <Input
                type="number"
                min={0}
                value={form.shelfLifeDays}
                onChange={(e) => set("shelfLifeDays", e.target.value)}
              />
            </Field>
            <Field label={t("products.availableWorkers")} error={errors["workers"]}>
              <Input type="number" min={0} value={form.workers} onChange={(e) => set("workers", e.target.value)} />
            </Field>
            <Field
              label={t("products.rawMaterialPerUnit")}
              error={errors["rawPerUnit"]}
              hint={t("products.rawMaterialPerUnitHint")}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.rawPerUnit}
                onChange={(e) => set("rawPerUnit", e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save}>{editId ? t("products.saveBtnText") : t("products.addProduct")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {coldStartProduct && (
        <ColdStartSetup
          product={coldStartProduct}
          open={coldStartOpen}
          onOpenChange={setColdStartOpen}
          onSave={handleColdStartSave}
        />
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
