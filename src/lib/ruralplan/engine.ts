import type { Material, Product, ProductionRecord, Sale } from "./types";

/** ---------------- Demand estimation (simple, transparent) ---------------- */

export interface MonthPoint {
  month: string;
  quantity: number;
}

export function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function monthlySales(sales: Sale[], productId?: string): MonthPoint[] {
  const filtered = productId ? sales.filter((s) => s.productId === productId) : sales;
  const map = new Map<string, number>();
  for (const s of filtered) {
    const k = monthKey(s.date);
    map.set(k, (map.get(k) ?? 0) + s.quantity);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, quantity]) => ({ month: monthLabel(k), quantity }));
}

export function dailySales(sales: Sale[], productId?: string, limit = 14) {
  const filtered = productId ? sales.filter((s) => s.productId === productId) : sales;
  const map = new Map<string, number>();
  for (const s of filtered) map.set(s.date, (map.get(s.date) ?? 0) + s.quantity);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([date, quantity]) => ({
      date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      quantity,
    }));
}

export function weeklySales(sales: Sale[], productId?: string, limit = 10) {
  const filtered = productId ? sales.filter((s) => s.productId === productId) : sales;
  const map = new Map<string, number>();
  for (const s of filtered) {
    const d = new Date(s.date);
    const week = new Date(d);
    week.setDate(d.getDate() - d.getDay());
    const k = week.toISOString().slice(0, 10);
    map.set(k, (map.get(k) ?? 0) + s.quantity);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([k, quantity]) => ({
      week: new Date(k).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      quantity,
    }));
}

export interface DemandEstimate {
  estimate: number;
  method: string;
  monthsUsed: number;
  trendPercent: number;
  history: MonthPoint[];
}

/**
 * Estimated demand for the next month: 3-month moving average adjusted by the
 * recent trend. Deliberately simple and explainable - not "AI prediction".
 */
export function estimateDemand(sales: Sale[], productId: string): DemandEstimate {
  const history = monthlySales(sales, productId);
  if (history.length === 0) {
    return {
      estimate: 0,
      method: "No sales history yet",
      monthsUsed: 0,
      trendPercent: 0,
      history,
    };
  }
  const last = history.slice(-3);
  const avg = last.reduce((a, b) => a + b.quantity, 0) / last.length;
  const first = history[Math.max(0, history.length - 3)].quantity;
  const latest = history[history.length - 1].quantity;
  const trendPercent = first > 0 ? Math.round(((latest - first) / first) * 100) : 0;
  const estimate = Math.max(0, Math.round(avg * (1 + trendPercent / 200)));
  return {
    estimate,
    method: history.length >= 3 ? "3-month moving average with trend" : "Average of available months",
    monthsUsed: last.length,
    trendPercent,
    history,
  };
}

/** ---------------- Recommendation engine ---------------- */

export interface PlanInput {
  product: Product;
  currentStock: number;
  expectedDemand: number;
  capacityPerDay: number;
  rawMaterialAvailable: number; // in raw material unit
  workers: number;
  productionDays: number;
  weatherSlowdown: number; // 0 - 0.4
  weatherLabel: string;
  safetyStockPercent: number;
}

export type RiskLevel = "green" | "yellow" | "red" | "blue";

export interface PlanWarning {
  level: RiskLevel;
  title: string;
  detail: string;
}

export interface PlanResult {
  safetyStock: number;
  rawRequirement: number;
  requiredProduction: number;
  achievableProduction: number;
  effectiveDailyCapacity: number;
  daysNeeded: number;
  overproductionRisk: boolean;
  shortageRisk: boolean;
  statusLine: string;
  reason: string;
  warnings: PlanWarning[];
}

export function computePlan(input: PlanInput): PlanResult {
  const {
    currentStock,
    expectedDemand,
    capacityPerDay,
    rawMaterialAvailable,
    workers,
    productionDays,
    weatherSlowdown,
    weatherLabel,
    safetyStockPercent,
    product,
  } = input;

  const safetyStock = Math.round((expectedDemand * safetyStockPercent) / 100);
  const requiredProduction = Math.max(0, Math.round(expectedDemand - currentStock + safetyStock));

  const effectiveDailyCapacity = Math.max(
    0,
    Math.round(capacityPerDay * (1 - weatherSlowdown)),
  );
  const capacityLimit = effectiveDailyCapacity * Math.max(0, productionDays);
  const rawLimit =
    product.rawPerUnit > 0 ? Math.floor(rawMaterialAvailable / product.rawPerUnit) : requiredProduction;

  const achievableProduction = Math.max(
    0,
    Math.min(requiredProduction, capacityLimit, rawLimit),
  );
  const rawRequirement = Math.round(requiredProduction * product.rawPerUnit * 100) / 100;
  const daysNeeded =
    effectiveDailyCapacity > 0 ? Math.ceil(requiredProduction / effectiveDailyCapacity) : 0;

  const warnings: PlanWarning[] = [];

  if (requiredProduction === 0) {
    warnings.push({
      level: "green",
      title: "No new production needed right now",
      detail: `Your stock of ${currentStock} ${product.unit} already covers the expected demand of ${expectedDemand} ${product.unit}.`,
    });
  }

  if (rawLimit < requiredProduction) {
    warnings.push({
      level: "red",
      title: "Raw material insufficient for planned production",
      detail: `You need about ${rawRequirement} ${product.rawUnit} of ${product.rawMaterial} but only ${rawMaterialAvailable} ${product.rawUnit} is available. With this material you can make about ${rawLimit} ${product.unit}.`,
    });
  }

  if (capacityLimit < requiredProduction) {
    warnings.push({
      level: "yellow",
      title: "Production capacity is not enough",
      detail: `You need ${requiredProduction} ${product.unit} but your capacity is ${effectiveDailyCapacity} ${product.unit}/day for ${productionDays} day(s) (${capacityLimit} ${product.unit}). About ${daysNeeded} production day(s) are required.`,
    });
  }

  if (weatherSlowdown > 0) {
    warnings.push({
      level: "yellow",
      title: `Weather may slow production (${weatherLabel})`,
      detail: `Daily output is planned at ${effectiveDailyCapacity} ${product.unit}/day instead of ${capacityPerDay} ${product.unit}/day. Weather is used only as a production and storage factor, not as a demand forecast.`,
    });
  }

  if (workers < 1) {
    warnings.push({
      level: "red",
      title: "No workers available",
      detail: "Add at least one worker to run production.",
    });
  }

  const overproductionRisk = currentStock + requiredProduction > expectedDemand * 1.3;
  const shortageRisk = achievableProduction + currentStock < expectedDemand;

  if (overproductionRisk) {
    warnings.push({
      level: "yellow",
      title: "Overproduction risk",
      detail: `Stock plus planned production (${currentStock + requiredProduction} ${product.unit}) is well above the expected demand of ${expectedDemand} ${product.unit}. Consider producing in smaller batches.`,
    });
  }
  if (shortageRisk) {
    warnings.push({
      level: "red",
      title: "Shortage risk",
      detail: `Even after production you may reach only ${currentStock + achievableProduction} ${product.unit} against an expected demand of ${expectedDemand} ${product.unit}.`,
    });
  }
  if (!overproductionRisk && !shortageRisk && warnings.length === 0) {
    warnings.push({
      level: "green",
      title: "Current resources are sufficient for planned production",
      detail: "Raw material, workers and capacity can cover the recommended quantity.",
    });
  }

  const statusLine =
    warnings.some((w) => w.level === "red")
      ? "Production is blocked - please check the red warnings"
      : warnings.some((w) => w.level === "yellow")
        ? "Production can proceed with care"
        : "Production can proceed";

  const reason = `Demand is expected to be ${expectedDemand} ${product.unit}. You currently have ${currentStock} ${product.unit} in stock. With ${safetyStockPercent}% safety stock (${safetyStock} ${product.unit}), the system recommends producing ${requiredProduction} additional ${product.unit}.`;

  return {
    safetyStock,
    rawRequirement,
    requiredProduction,
    achievableProduction,
    effectiveDailyCapacity,
    daysNeeded,
    overproductionRisk,
    shortageRisk,
    statusLine,
    reason,
    warnings,
  };
}

/** ---------------- Materials ---------------- */

export type MaterialStatus = "green" | "yellow" | "red";

export function materialStatus(m: Material): { status: MaterialStatus; label: string } {
  if (m.currentQty < m.requiredQty) return { status: "red", label: "Insufficient" };
  if (m.currentQty <= m.minLevel) return { status: "yellow", label: "Low" };
  return { status: "green", label: "Sufficient" };
}

export function materialFor(materials: Material[], name: string) {
  return materials.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());
}

/** ---------------- Production history helpers ---------------- */

export function productionChartData(records: ProductionRecord[], products: Product[]) {
  return records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      label: `${new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
      product: products.find((p) => p.id === r.productId)?.name ?? "Product",
      planned: r.planned,
      actual: r.actual,
      sold: r.sold,
    }));
}
