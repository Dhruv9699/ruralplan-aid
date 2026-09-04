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
  const [y, m] = key.split("-").map(Number) as [number, number];
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
  estimateLow: number;
  estimateHigh: number;
  confidence: "high" | "medium" | "low";
  method: string;
  monthsUsed: number;
  trendPercent: number;
  trend: "increasing" | "stable" | "decreasing";
  history: MonthPoint[];
  explanation: string;
}

/**
 * Improved demand estimation with confidence levels and trend analysis.
 * 
 * Uses historical sales data to:
 * 1. Calculate 3-month moving average
 * 2. Detect trend direction and strength
 * 3. Estimate confidence based on data consistency
 * 4. Provide a range (low/estimate/high)
 * 5. Clearly explain the forecast method
 */
export function estimateDemand(sales: Sale[], productId: string): DemandEstimate {
  const history = monthlySales(sales, productId);
  
  if (history.length === 0) {
    return {
      estimate: 0,
      estimateLow: 0,
      estimateHigh: 0,
      confidence: "low",
      method: "No historical data available",
      monthsUsed: 0,
      trendPercent: 0,
      trend: "stable",
      history,
      explanation:
        "No sales data found. Please add sales records to get demand estimates. For now, use your expected quantity.",
    };
  }

  if (history.length === 1) {
    const qty = history[0].quantity;
    return {
      estimate: qty,
      estimateLow: Math.round(qty * 0.9),
      estimateHigh: Math.round(qty * 1.1),
      confidence: "low",
      method: "Single month data",
      monthsUsed: 1,
      trendPercent: 0,
      trend: "stable",
      history,
      explanation:
        `Only one month of data available (${qty} units). Estimate has low confidence. Add more sales data for better predictions.`,
    };
  }

  // Calculate 3-month moving average
  const last3 = history.slice(-3);
  const avg3 = last3.reduce((a, b) => a + b.quantity, 0) / last3.length;

  // Analyze trend over all available history
  const firstQty = history[0].quantity;
  const lastQty = history[history.length - 1].quantity;
  const trendPercent =
    firstQty > 0 ? Math.round(((lastQty - firstQty) / firstQty) * 100) : 0;

  // Determine trend direction
  let trend: "increasing" | "stable" | "decreasing" = "stable";
  if (trendPercent > 10) trend = "increasing";
  else if (trendPercent < -10) trend = "decreasing";

  // Calculate variance to assess consistency (confidence)
  const variance = last3.reduce((sum, m) => sum + Math.pow(m.quantity - avg3, 2), 0) / last3.length;
  const stdDev = Math.sqrt(variance);
  const coeffVariation = stdDev / avg3; // 0 = very consistent, >1 = highly variable

  let confidence: "high" | "medium" | "low" = "low";
  let explanation = "";

  if (history.length >= 6 && coeffVariation < 0.2) {
    confidence = "high";
    explanation = `Based on ${history.length} months of consistent sales data (${lastQty} units last month, average ${Math.round(avg3)} units). Demand is ${trend}.`;
  } else if (history.length >= 3 && coeffVariation < 0.4) {
    confidence = "medium";
    explanation = `Based on ${history.length} months of sales data (${lastQty} units last month). Pattern shows ${trend} trend.`;
  } else {
    confidence = "low";
    explanation = `Sales data is variable (${history.length} months available). Estimate: ~${Math.round(avg3)} units. Use with caution.`;
  }

  // Adjust estimate based on trend
  const trendMultiplier = 1 + trendPercent / 200;
  const estimate = Math.max(0, Math.round(avg3 * trendMultiplier));

  // Create confidence range
  const margin = Math.max(10, Math.round(estimate * 0.2)); // ±20% or minimum 10 units
  const estimateLow = Math.max(0, estimate - margin);
  const estimateHigh = estimate + margin;

  return {
    estimate,
    estimateLow,
    estimateHigh,
    confidence,
    method:
      history.length >= 3
        ? "3-month moving average with trend adjustment"
        : "Average of available months",
    monthsUsed: last3.length,
    trendPercent,
    trend,
    history,
    explanation,
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

/** ---------------- Cross-product resource planning ---------------- */

export interface ResourceRequirement {
  materialName: string;
  unit: string;
  totalRequired: number;
  availableQty: number;
  shortfall: number;
  affectedProducts: string[];
}

export interface CrossProductPlan {
  totalRequirements: Map<string, ResourceRequirement>;
  hasShortfall: boolean;
  warnings: Array<{
    material: string;
    required: number;
    available: number;
    shortfall: number;
    suggestion: string;
  }>;
}

/**
 * Analyze resource constraints across multiple product production plans.
 * 
 * For each product with planned production, calculate total raw material needs.
 * Compare against available inventory to detect cross-product conflicts.
 */
export function analyzeResourceConstraints(
  products: Product[],
  materials: Material[],
  productionPlans: Map<string, number>, // productId -> quantityToProduced
): CrossProductPlan {
  const requirements = new Map<string, ResourceRequirement>();
  const warnings: CrossProductPlan["warnings"] = [];

  // Calculate total material requirements
  for (const [productId, quantityNeeded] of productionPlans) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;

    const materialName = product.rawMaterial;
    const rawNeeded = Math.round(quantityNeeded * product.rawPerUnit * 100) / 100;

    if (!requirements.has(materialName)) {
      requirements.set(materialName, {
        materialName,
        unit: product.rawUnit,
        totalRequired: 0,
        availableQty: 0,
        shortfall: 0,
        affectedProducts: [],
      });
    }

    const req = requirements.get(materialName)!;
    req.totalRequired += rawNeeded;
    if (!req.affectedProducts.includes(product.name)) {
      req.affectedProducts.push(product.name);
    }
  }

  // Check against available inventory
  let hasShortfall = false;
  for (const [materialName, req] of requirements) {
    const inventory = materialFor(materials, materialName);
    if (inventory) {
      req.availableQty = inventory.currentQty;
      req.shortfall = Math.max(0, req.totalRequired - inventory.currentQty);
      if (req.shortfall > 0) {
        hasShortfall = true;
        warnings.push({
          material: materialName,
          required: Math.round(req.totalRequired * 100) / 100,
          available: inventory.currentQty,
          shortfall: Math.round(req.shortfall * 100) / 100,
          suggestion: `You need ${Math.round(req.totalRequired * 100) / 100} ${req.unit} of ${materialName} for planned production of ${req.affectedProducts.join(", ")} but only have ${inventory.currentQty} ${req.unit}. Consider reducing quantities or obtaining more ${materialName}.`,
        });
      }
    } else {
      warnings.push({
        material: materialName,
        required: Math.round(req.totalRequired * 100) / 100,
        available: 0,
        shortfall: Math.round(req.totalRequired * 100) / 100,
        suggestion: `${materialName} is not in your inventory records. Add it to track availability for ${req.affectedProducts.join(", ")}.`,
      });
    }
  }

  return {
    totalRequirements: requirements,
    hasShortfall,
    warnings,
  };
}

/** ---------------- Production scheduling ---------------- */

export interface ProductionSchedule {
  productId: string;
  productName: string;
  recommendedQty: number;
  recommendedStartDate: string;
  recommendedEndDate: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * Recommend a production period based on demand urgency and current inventory.
 * 
 * High priority: Demand > stock (urgent)
 * Medium priority: Stock below minimum
 * Low priority: Stock adequate but increasing
 */
export function scheduleProduction(
  products: Product[],
  demands: Map<string, DemandEstimate>,
  productionPlans: Map<string, number>, // productId -> recommendedQty
): ProductionSchedule[] {
  const schedules: ProductionSchedule[] = [];
  const today = new Date();

  for (const [productId, recommendedQty] of productionPlans) {
    const product = products.find((p) => p.id === productId);
    const demand = demands.get(productId);

    if (!product || !demand) continue;

    // Calculate priority based on inventory vs demand
    let priority: "high" | "medium" | "low" = "medium";
    let reasoning = "";

    if (product.currentStock < demand.estimate) {
      priority = "high";
      reasoning = `Stock (${product.currentStock}) is below expected demand (${demand.estimate}). Produce soon to avoid shortage.`;
    } else if (product.currentStock <= product.minStock) {
      priority = "medium";
      reasoning = `Stock is at or below minimum level (${product.minStock}). Replenish soon.`;
    } else if (demand.trend === "increasing") {
      priority = "medium";
      reasoning = `Demand is increasing (${Math.abs(demand.trendPercent)}% trend). Produce to maintain stock buffer.`;
    } else {
      priority = "low";
      reasoning = `Stock is adequate. Can schedule at convenience.`;
    }

    // Calculate production period
    const daysNeeded = product.capacityPerDay > 0 ? Math.ceil(recommendedQty / product.capacityPerDay) : 1;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (priority === "high" ? 0 : priority === "medium" ? 1 : 3));

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Math.max(0, daysNeeded - 1));

    schedules.push({
      productId,
      productName: product.name,
      recommendedQty,
      recommendedStartDate: startDate.toISOString().slice(0, 10),
      recommendedEndDate: endDate.toISOString().slice(0, 10),
      priority,
      reasoning,
    });
  }

  // Sort by priority
  schedules.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return schedules;
}


/** ============================================================================
 * COLD START DEMAND ESTIMATOR
 * For new entrepreneurs with no sales history
 * ============================================================================ */

export interface ColdStartInput {
  potentialCustomers: number;
  conversionRate: number; // 0-100
  avgPurchaseQuantity: number;
  purchaseFrequency: "weekly" | "monthly" | "quarterly" | "seasonal";
  isSeasonal: boolean;
  seasonStartMonth?: number; // 1-12
  seasonEndMonth?: number; // 1-12
}

export interface ColdStartEstimate {
  mode: "cold_start";
  estimatedCustomers: number;
  estimate: number; // Monthly demand
  estimateLow: number;
  estimateHigh: number;
  confidence: "low" | "initial";
  method: string;
  assumptions: string[];
  explanation: string;
  pilotRecommendation: number;
  pilotExplanation: string;
}

/**
 * Calculate initial demand estimate for new products (Cold Start mode)
 *
 * Formula:
 *   Estimated Customers = potential_customers × (conversion_rate / 100)
 *   Monthly Demand = estimated_customers × avg_purchase_quantity × frequency_multiplier
 *
 * Example:
 *   potential_customers = 500
 *   conversion_rate = 8% → 40 customers
 *   avg_purchase_quantity = 1.5 units
 *   frequency = monthly → multiplier = 1
 *   estimate = 40 × 1.5 × 1 = 60 units/month
 *
 * Range = ±25% to account for initial uncertainty
 */
export function calculateColdStartDemand(input: ColdStartInput): ColdStartEstimate {
  // Calculate estimated number of actual customers
  const estimatedCustomers = Math.round((input.potentialCustomers * input.conversionRate) / 100);

  // Frequency multiplier (to monthly)
  let frequencyMultiplier = 1;
  if (input.purchaseFrequency === "weekly") frequencyMultiplier = 4.33; // ~4-5 weeks per month
  else if (input.purchaseFrequency === "quarterly") frequencyMultiplier = 0.33;
  else if (input.purchaseFrequency === "seasonal") frequencyMultiplier = 1; // Handled separately
  // else "monthly" = 1

  // Base estimate
  const baseEstimate = estimatedCustomers * input.avgPurchaseQuantity * frequencyMultiplier;

  // For seasonal products, adjust estimate
  let estimate = baseEstimate;
  if (input.isSeasonal && input.seasonStartMonth && input.seasonEndMonth) {
    // During season: full estimate, outside season: reduced estimate
    const currentMonth = new Date().getMonth() + 1;
    const isInSeason =
      (input.seasonStartMonth <= input.seasonEndMonth &&
        currentMonth >= input.seasonStartMonth &&
        currentMonth <= input.seasonEndMonth) ||
      (input.seasonStartMonth > input.seasonEndMonth &&
        (currentMonth >= input.seasonStartMonth || currentMonth <= input.seasonEndMonth));

    estimate = isInSeason ? baseEstimate : Math.round(baseEstimate * 0.3); // Off-season: 30% of estimate
  }

  // Range: ±25% for initial uncertainty
  const margin = Math.round(estimate * 0.25);
  const estimateLow = Math.max(0, Math.round(estimate - margin));
  const estimateHigh = Math.round(estimate + margin);

  // Build assumptions list
  const assumptions: string[] = [
    `${input.potentialCustomers} potential customers in target market`,
    `${input.conversionRate}% expected conversion = ${estimatedCustomers} customers`,
    `${input.avgPurchaseQuantity} units per customer per transaction`,
    `Purchase frequency: ${input.purchaseFrequency}`,
  ];

  if (input.isSeasonal && input.seasonStartMonth && input.seasonEndMonth) {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    assumptions.push(
      `Seasonal: ${monthNames[input.seasonStartMonth - 1]} to ${monthNames[input.seasonEndMonth - 1]}`
    );
  }

  // Pilot recommendation: 1/3 to 1/2 of initial estimate
  const pilotRecommendation = Math.round(estimate * 0.4);

  return {
    mode: "cold_start",
    estimatedCustomers,
    estimate: Math.round(estimate),
    estimateLow,
    estimateHigh,
    confidence: "low",
    method: "Market-based estimation (Cold Start)",
    assumptions,
    explanation:
      `Based on ${estimatedCustomers} estimated customers (${input.potentialCustomers} × ${input.conversionRate}% conversion), ` +
      `purchasing ${input.avgPurchaseQuantity} units per transaction. ` +
      `Expected monthly demand: ${Math.round(estimate)} units. ` +
      `Confidence is low because this is initial estimation. Validate with pilot production and actual sales.`,
    pilotRecommendation,
    pilotExplanation:
      `Start with ${pilotRecommendation} units (${Math.round((pilotRecommendation / estimate) * 100)}% of estimate). ` +
      `Record actual sales from this pilot batch. Use real sales data to refine future demand estimates.`,
  };
}

/**
 * Determine which demand estimation mode to use
 * - Returns "normal" if sufficient sales history exists
 * - Returns "cold_start" if insufficient history
 * - Threshold: At least 3 months of sales data
 */
export function determineDemandMode(sales: Sale[], productId: string): "normal" | "cold_start" {
  const history = monthlySales(sales, productId);
  return history.length >= 3 ? "normal" : "cold_start";
}
