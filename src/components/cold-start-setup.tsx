import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/useTranslation";
import { calculateColdStartDemand, type ColdStartInput, type ColdStartEstimate } from "@/lib/ruralplan/engine";
import type { Product } from "@/lib/ruralplan/types";

interface ColdStartSetupProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ColdStartInput) => Promise<void>;
}

const schema = z.object({
  potentialCustomers: z.number().min(1, "Potential customers must be at least 1"),
  conversionRate: z.number().min(0, "Conversion rate cannot be negative").max(100, "Conversion rate cannot exceed 100"),
  avgPurchaseQuantity: z.number().positive("Average purchase quantity must be greater than 0"),
  purchaseFrequency: z.enum(["weekly", "monthly", "quarterly", "seasonal"]),
  isSeasonal: z.boolean(),
  seasonStartMonth: z.number().min(1).max(12).optional(),
  seasonEndMonth: z.number().min(1).max(12).optional(),
});

export function ColdStartSetup({ product, open, onOpenChange, onSave }: ColdStartSetupProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    potentialCustomers: "500",
    conversionRate: "8",
    avgPurchaseQuantity: "1.5",
    purchaseFrequency: "monthly" as const,
    isSeasonal: false,
    seasonStartMonth: "1",
    seasonEndMonth: "12",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [estimate, setEstimate] = useState<ColdStartEstimate | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Recalculate on change
    calculateEstimate();
  };

  const calculateEstimate = () => {
    const parsed = schema.safeParse({
      potentialCustomers: Number(form.potentialCustomers),
      conversionRate: Number(form.conversionRate),
      avgPurchaseQuantity: Number(form.avgPurchaseQuantity),
      purchaseFrequency: form.purchaseFrequency,
      isSeasonal: form.isSeasonal,
      seasonStartMonth: form.isSeasonal ? Number(form.seasonStartMonth) : undefined,
      seasonEndMonth: form.isSeasonal ? Number(form.seasonEndMonth) : undefined,
    });

    if (parsed.success) {
      setErrors({});
      const est = calculateColdStartDemand(parsed.data);
      setEstimate(est);
    } else {
      const errorMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errorMap[String(issue.path[0])] = issue.message;
      }
      setErrors(errorMap);
      setEstimate(null);
    }
  };

  const handleSave = async () => {
    const parsed = schema.safeParse({
      potentialCustomers: Number(form.potentialCustomers),
      conversionRate: Number(form.conversionRate),
      avgPurchaseQuantity: Number(form.avgPurchaseQuantity),
      purchaseFrequency: form.purchaseFrequency,
      isSeasonal: form.isSeasonal,
      seasonStartMonth: form.isSeasonal ? Number(form.seasonStartMonth) : undefined,
      seasonEndMonth: form.isSeasonal ? Number(form.seasonEndMonth) : undefined,
    });

    if (!parsed.success) {
      const errorMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errorMap[String(issue.path[0])] = issue.message;
      }
      setErrors(errorMap);
      toast.error("Please fix the highlighted fields");
      return;
    }

    try {
      await onSave(parsed.data);
      toast.success("Cold Start settings saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Up Initial Demand Estimate</DialogTitle>
          <DialogDescription>
            No sales history yet? Create an initial demand estimate based on market assumptions for {product.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Inputs Section */}
          <section className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
            <h3 className="font-display text-sm font-semibold">Market Assumptions</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Potential Customers" error={errors["potentialCustomers"]}>
                <Input
                  type="number"
                  min={1}
                  value={form.potentialCustomers}
                  onChange={(e) => set("potentialCustomers", e.target.value)}
                  placeholder="e.g. 500"
                />
              </Field>

              <Field label="Expected Conversion (%)" error={errors["conversionRate"]}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.conversionRate}
                  onChange={(e) => set("conversionRate", e.target.value)}
                  placeholder="e.g. 8"
                />
              </Field>

              <Field label={`Avg Purchase Quantity (${product.unit})`} error={errors["avgPurchaseQuantity"]}>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.avgPurchaseQuantity}
                  onChange={(e) => set("avgPurchaseQuantity", e.target.value)}
                  placeholder="e.g. 1.5"
                />
              </Field>

              <Field label="Purchase Frequency" error={errors["purchaseFrequency"]}>
                <Select value={form.purchaseFrequency} onValueChange={(v) => set("purchaseFrequency", v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Seasonal toggle */}
            <div className="flex items-center gap-3 rounded-lg bg-background p-3">
              <input
                type="checkbox"
                id="seasonal"
                checked={form.isSeasonal}
                onChange={(e) => set("isSeasonal", e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="seasonal" className="flex-1 cursor-pointer text-sm">
                This is a seasonal product
              </label>
            </div>

            {/* Seasonal fields */}
            {form.isSeasonal && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Season Starts (Month 1-12)" error={errors["seasonStartMonth"]}>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.seasonStartMonth}
                    onChange={(e) => set("seasonStartMonth", e.target.value)}
                  />
                </Field>
                <Field label="Season Ends (Month 1-12)" error={errors["seasonEndMonth"]}>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.seasonEndMonth}
                    onChange={(e) => set("seasonEndMonth", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </section>

          {/* Calculation Display */}
          {estimate && (
            <section className="space-y-3 rounded-lg border border-info/30 bg-info/10 p-4">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-info" />
                <h3 className="font-display text-sm font-semibold">Initial Demand Estimate</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Customers</span>
                  <span className="font-medium">{estimate.estimatedCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Demand</span>
                  <span className="font-semibold text-primary">
                    {estimate.estimate} {product.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Range</span>
                  <span className="font-medium">
                    {estimate.estimateLow}–{estimate.estimateHigh} {product.unit}
                  </span>
                </div>
              </div>

              <div className="border-t border-info/20 pt-3">
                <p className="text-xs text-muted-foreground">{estimate.explanation}</p>
              </div>

              <div className="mt-3 rounded-lg bg-background p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <div>
                    <p className="text-xs font-semibold">Recommended Pilot Batch</p>
                    <p className="text-sm font-medium">{estimate.pilotRecommendation} units</p>
                    <p className="mt-1 text-xs text-muted-foreground">{estimate.pilotExplanation}</p>
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <p className="font-semibold text-muted-foreground mb-1">Assumptions:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {estimate.assumptions.map((assumption, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="shrink-0">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-xs text-muted-foreground">
                  This is an initial estimate based on market assumptions. Start with a pilot batch, track actual sales,
                  and refine your estimates over time.
                </p>
              </div>
            </section>
          )}

          {/* Error display */}
          {Object.keys(errors).length > 0 && !estimate && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">Please fix the highlighted fields to see the estimate</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!estimate}>
            Save Initial Estimate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
