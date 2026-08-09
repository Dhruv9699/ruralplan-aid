import type { Material, Product, ProductionRecord, Sale } from "./types";
import { computePlan, estimateDemand, materialFor, materialStatus } from "./engine";
import { getWeather, weatherFactor } from "./weather";

export interface AssistantContext {
  products: Product[];
  materials: Material[];
  sales: Sale[];
  production: ProductionRecord[];
  safetyStockPercent: number;
  district: string;
  village: string;
}

const FOOTER = "This recommendation is based on the data entered in your RuralPlan account.";

function planFor(ctx: AssistantContext, product: Product) {
  const demand = estimateDemand(ctx.sales, product.id);
  const mat = materialFor(ctx.materials, product.rawMaterial);
  const weather = getWeather(ctx.district, ctx.village);
  const factor = weatherFactor(weather);
  const result = computePlan({
    product,
    currentStock: product.currentStock,
    expectedDemand: demand.estimate,
    capacityPerDay: product.capacityPerDay,
    rawMaterialAvailable: mat?.currentQty ?? 0,
    workers: product.workers,
    productionDays: 7,
    weatherSlowdown: factor.slowdown,
    weatherLabel: factor.label,
    safetyStockPercent: ctx.safetyStockPercent,
  });
  return { demand, result, mat, weather, factor };
}

function pickProduct(ctx: AssistantContext, q: string): Product | undefined {
  const lower = q.toLowerCase();
  return ctx.products.find((p) => lower.includes(p.name.toLowerCase())) ?? ctx.products[0];
}

function numbersIn(q: string) {
  return (q.match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

export function assistantReply(question: string, ctx: AssistantContext): string {
  const q = question.toLowerCase().trim();
  if (!q) return "Please type a question about your production planning.";

  if (ctx.products.length === 0) {
    return "You have not added any products yet. Go to the Products page, add a product with its stock and capacity, and then I can help you plan production.";
  }

  const product = pickProduct(ctx, q)!;
  const nums = numbersIn(q);

  // "I have 50 jars and expected demand is 120"
  if (nums.length >= 2 && /(have|stock)/.test(q) && /(demand|need|order)/.test(q)) {
    const [stock, demand] = [nums[0]!, nums[1]!];
    const safety = Math.round((demand * ctx.safetyStockPercent) / 100);
    const required = Math.max(0, demand - stock + safety);
    const days = Math.ceil(required / Math.max(1, product.capacityPerDay));
    return `With ${stock} ${product.unit} in stock and an expected demand of ${demand} ${product.unit}, you need about ${required} ${product.unit} more (including ${ctx.safetyStockPercent}% safety stock = ${safety} ${product.unit}). At ${product.capacityPerDay} ${product.unit}/day this takes about ${days} production day(s). ${FOOTER}`;
  }

  // demand increase what-if
  if (/(increase|increases|higher|20%|10%|what happens)/.test(q) && /demand/.test(q)) {
    const pct = nums.find((n) => n > 0 && n <= 100) ?? 20;
    const { demand } = planFor(ctx, product);
    const newDemand = Math.round(demand.estimate * (1 + pct / 100));
    const required = Math.max(
      0,
      newDemand - product.currentStock + Math.round((newDemand * ctx.safetyStockPercent) / 100),
    );
    const days = Math.ceil(required / Math.max(1, product.capacityPerDay));
    return `If demand for ${product.name} increases by ${pct}%, estimated demand moves from ${demand.estimate} to ${newDemand} ${product.unit}. With ${product.currentStock} ${product.unit} in stock you would need about ${required} ${product.unit}, roughly ${days} production day(s) at ${product.capacityPerDay} ${product.unit}/day. ${FOOTER}`;
  }

  // raw material questions
  if (/(raw material|material|mango|lemon|amla|oil|salt|spice|jar|packaging)/.test(q)) {
    const { result, mat } = planFor(ctx, product);
    const low = ctx.materials.filter((m) => materialStatus(m).status !== "green");
    const lowText = low.length
      ? `Materials needing attention: ${low
          .map((m) => `${m.name} (${m.currentQty}/${m.requiredQty} ${m.unit})`)
          .join(", ")}.`
      : "All raw materials are currently sufficient.";
    if (/(don't|dont|not enough|insufficient|short)/.test(q)) {
      return `For ${product.name} you need about ${result.rawRequirement} ${product.rawUnit} of ${product.rawMaterial}; ${mat ? `${mat.currentQty} ${mat.unit}` : "0"} is recorded in your inventory. If material is short you can: produce a smaller batch now (about ${result.achievableProduction} ${product.unit} is possible with what you have), arrange more ${product.rawMaterial}, or shift part of the production to the next batch. ${lowText} ${FOOTER}`;
    }
    return `To produce the recommended ${result.requiredProduction} ${product.unit} of ${product.name}, you need about ${result.rawRequirement} ${product.rawUnit} of ${product.rawMaterial} (${product.rawPerUnit} ${product.rawUnit} per ${product.unit}). Available: ${mat ? `${mat.currentQty} ${mat.unit}` : "not recorded"}. ${lowText} ${FOOTER}`;
  }

  // weather / today or tomorrow
  if (/(weather|rain|today or tomorrow|when should i produce|when to produce)/.test(q)) {
    const { weather, factor } = planFor(ctx, product);
    return `Weather for ${ctx.district}: today ${weather.today.condition}, ${weather.today.tempC}°C, rain chance ${weather.today.rainChance}%. Tomorrow: ${weather.forecast[0]!.condition}, rain chance ${weather.forecast[0]!.rainChance}%. ${weather.productionNote} ${factor.slowdown > 0 ? "Because of this I plan a lower daily output than your full capacity." : "No weather-related slowdown expected."} Weather is used only as a production and storage factor, not to predict demand. ${FOOTER}`;
  }

  // low stock warning explanation
  if (/(low stock|low-stock|minimum|warning)/.test(q)) {
    const p = ctx.products.find((x) => x.currentStock <= x.minStock) ?? product;
    return `The low-stock warning for ${p.name} appears because current stock (${p.currentStock} ${p.unit}) is at or below your minimum stock level (${p.minStock} ${p.unit}). Keeping stock above this level protects you against sudden orders. ${FOOTER}`;
  }

  // avoid overproduction
  if (/(overproduction|avoid over|too much|waste)/.test(q)) {
    const { demand, result } = planFor(ctx, product);
    return `To avoid overproduction of ${product.name}: produce against estimated demand (${demand.estimate} ${product.unit}) instead of full capacity, keep safety stock at ${ctx.safetyStockPercent}%, split production into smaller batches, and remember the shelf life of ${product.shelfLifeDays} days. Right now your recommended quantity is ${result.requiredProduction} ${product.unit}${result.overproductionRisk ? ", and there is already an overproduction risk flagged" : ""}. ${FOOTER}`;
  }

  // why recommendation / explain report
  if (/(why|explain|report|reason)/.test(q)) {
    const { demand, result } = planFor(ctx, product);
    return `Recommended production for ${product.name} is ${result.requiredProduction} ${product.unit}. Reason: estimated demand ${demand.estimate} ${product.unit} (${demand.method}, based on previous sales data), current stock ${product.currentStock} ${product.unit}, safety stock ${result.safetyStock} ${product.unit}. Capacity ${result.effectiveDailyCapacity} ${product.unit}/day means about ${result.daysNeeded} production day(s). Status: ${result.statusLine}. ${FOOTER}`;
  }

  // how much / this week / default
  if (/(how much|how many|produce|production|plan|week|quantity)/.test(q)) {
    const { demand, result } = planFor(ctx, product);
    const extra = result.warnings
      .filter((w) => w.level !== "green")
      .map((w) => w.title)
      .slice(0, 2);
    return `For ${product.name}: expected demand is ${demand.estimate} ${product.unit} and your current stock is ${product.currentStock} ${product.unit}. Based on the current data you need approximately ${result.requiredProduction} ${product.unit} more, including ${ctx.safetyStockPercent}% safety stock. That is about ${result.daysNeeded} production day(s) at ${result.effectiveDailyCapacity} ${product.unit}/day.${extra.length ? ` Please note: ${extra.join("; ")}.` : ""} ${FOOTER}`;
  }

  return `I can help with production planning only - how much to produce, when to produce, raw material needs, stock warnings and overproduction or shortage risk. Try asking "How much should I produce this week?" or "How much raw material do I need?". ${FOOTER}`;
}

export const SUGGESTED_QUESTIONS = [
  "How much should I produce this week?",
  "Why is my recommended production what it is?",
  "How much raw material do I need?",
  "What happens if demand increases by 20%?",
  "Should I produce today or tomorrow?",
  "How can I avoid overproduction?",
];
