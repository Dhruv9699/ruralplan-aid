import type { Material, Product, Sale } from "./types";
import { estimateDemand, materialFor, materialStatus, analyzeResourceConstraints } from "./engine";
import { getWeather, weatherFactor } from "./weather";

export type AlertLevel = "red" | "yellow" | "green" | "blue" | "weather";

export interface AppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
}

export function buildAlerts(
  products: Product[],
  materials: Material[],
  sales: Sale[],
  safetyStockPercent: number,
  district: string,
  village: string,
): AppAlert[] {
  const alerts: AppAlert[] = [];

  // Material alerts
  for (const m of materials) {
    const { status } = materialStatus(m);
    if (status === "red") {
      alerts.push({
        id: `mat-${m.id}`,
        level: "red",
        title: "Raw material insufficient for planned production",
        detail: `${m.name}: ${m.currentQty} ${m.unit} available, ${m.requiredQty} ${m.unit} required. Production may be affected because ${m.name.toLowerCase()} is insufficient.`,
      });
    } else if (status === "yellow") {
      alerts.push({
        id: `mat-${m.id}`,
        level: "yellow",
        title: `${m.name} is low`,
        detail: `${m.currentQty} ${m.unit} left, minimum level is ${m.minLevel} ${m.unit}. Plan to replenish soon.`,
      });
    }
  }

  // Product/demand alerts
  for (const p of products) {
    const demand = estimateDemand(sales, p.id);
    const safety = Math.round((demand.estimate * safetyStockPercent) / 100);

    // Forecast confidence alert
    if (demand.confidence === "low") {
      alerts.push({
        id: `conf-${p.id}`,
        level: "yellow",
        title: `Low forecast confidence for ${p.name}`,
        detail: `${demand.explanation} Add more sales records to improve forecast accuracy.`,
      });
    }

    // Demand vs stock alert
    if (demand.estimate > p.currentStock) {
      alerts.push({
        id: `demand-${p.id}`,
        level: "yellow",
        title: `Expected demand is higher than current stock (${p.name})`,
        detail: `Estimated demand ${demand.estimate} ${p.unit} vs stock ${p.currentStock} ${p.unit}. Suggested production: ${Math.max(0, demand.estimate - p.currentStock + safety)} ${p.unit}.`,
      });
    }

    // Minimum stock alert
    if (p.currentStock <= p.minStock) {
      alerts.push({
        id: `min-${p.id}`,
        level: "yellow",
        title: `${p.name} stock is approaching minimum level`,
        detail: `Stock ${p.currentStock} ${p.unit}, minimum level ${p.minStock} ${p.unit}. Start production soon.`,
      });
    }

    // Demand trend alert
    if (demand.trend === "increasing" && Math.abs(demand.trendPercent) >= 10) {
      alerts.push({
        id: `trend-${p.id}`,
        level: "blue",
        title: `Demand has increased for ${p.name}`,
        detail: `Sales are about ${demand.trendPercent}% higher than earlier data. Based on sales history (${demand.monthsUsed} months). Consider increasing production.`,
      });
    }

    // Overproduction alert
    if (p.currentStock > demand.estimate * 1.3 && demand.estimate > 0) {
      alerts.push({
        id: `over-${p.id}`,
        level: "yellow",
        title: `Overproduction risk for ${p.name}`,
        detail: `Stock ${p.currentStock} ${p.unit} is well above the estimated demand of ${demand.estimate} ${p.unit}. Storage may become an issue.`,
      });
    }

    // Missing material inventory
    const mat = materialFor(materials, p.rawMaterial);
    if (!mat) {
      alerts.push({
        id: `nomat-${p.id}`,
        level: "yellow",
        title: `No inventory record for ${p.rawMaterial}`,
        detail: `Add ${p.rawMaterial} to your raw material list so the planner can check availability for ${p.name}.`,
      });
    }
  }

  // Cross-product resource alerts
  if (products.length > 1) {
    const productionPlans = new Map<string, number>();
    for (const p of products) {
      const demand = estimateDemand(sales, p.id);
      const safety = Math.round((demand.estimate * safetyStockPercent) / 100);
      const need = Math.max(0, demand.estimate - p.currentStock + safety);
      if (need > 0) productionPlans.set(p.id, need);
    }

    if (productionPlans.size > 0) {
      const resourcePlan = analyzeResourceConstraints(products, materials, productionPlans);
      for (const warning of resourcePlan.warnings) {
        alerts.push({
          id: `res-${warning.material}`,
          level: "red",
          title: `Resource constraint: ${warning.material} shortage`,
          detail: warning.suggestion,
        });
      }
    }
  }

  // Weather alert
  const weather = getWeather(district, village);
  const factor = weatherFactor(weather);
  if (factor.slowdown > 0) {
    alerts.push({
      id: "weather",
      level: "weather",
      title: factor.label,
      detail: weather.productionNote,
    });
  }

  // If no critical alerts, add a green alert
  if (!alerts.some((a) => a.level === "red" || a.level === "yellow")) {
    alerts.unshift({
      id: "ok",
      level: "green",
      title: "Current resources are sufficient for planned production",
      detail: "Stock levels, raw material and weather look fine for now.",
    });
  }

  return alerts;
}
