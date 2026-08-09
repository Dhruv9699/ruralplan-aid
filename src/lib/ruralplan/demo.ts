import type { RuralPlanData, Product, Sale, Material, ProductionRecord } from "./types";

const id = (p: string, n: number) => `${p}-${n}`;

export const demoProducts: Product[] = [
  {
    id: id("prod", 1),
    name: "Mango Pickle",
    rawMaterial: "Mango",
    unit: "jar",
    capacityPerDay: 100,
    minStock: 30,
    currentStock: 80,
    productionCost: 45,
    shelfLifeDays: 365,
    workers: 4,
    rawPerUnit: 0.6,
    rawUnit: "kg",
  },
  {
    id: id("prod", 2),
    name: "Lemon Pickle",
    rawMaterial: "Lemon",
    unit: "jar",
    capacityPerDay: 60,
    minStock: 25,
    currentStock: 50,
    productionCost: 38,
    shelfLifeDays: 300,
    workers: 3,
    rawPerUnit: 0.4,
    rawUnit: "kg",
  },
  {
    id: id("prod", 3),
    name: "Amla Pickle",
    rawMaterial: "Amla",
    unit: "jar",
    capacityPerDay: 45,
    minStock: 20,
    currentStock: 18,
    productionCost: 42,
    shelfLifeDays: 240,
    workers: 2,
    rawPerUnit: 0.5,
    rawUnit: "kg",
  },
];

function buildSales(): Sale[] {
  const locations = ["Nashik", "Pune", "Sangli", "Kolhapur", "Nagpur"];
  const base: Record<string, number> = {
    "prod-1": 100,
    "prod-2": 55,
    "prod-3": 30,
  };
  const out: Sale[] = [];
  let n = 0;
  const today = new Date();
  // 6 months of monthly-ish sales entries with a gentle upward trend
  for (let m = 5; m >= 0; m--) {
    for (const product of demoProducts) {
      const growth = 1 + (5 - m) * 0.09;
      const monthTotal = Math.round((base[product.id] ?? 0) * growth);
      // split month into 4 weekly records
      for (let w = 0; w < 4; w++) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 3 + w * 7);
        out.push({
          id: id("sale", ++n),
          date: d.toISOString().slice(0, 10),
          productId: product.id,
          location: locations[(n + w) % locations.length]!,
          quantity: Math.max(1, Math.round((monthTotal / 4) * (0.85 + ((n % 5) * 0.08)))),
        });
      }
    }
  }
  return out;
}

export const demoMaterials: Material[] = [
  { id: id("mat", 1), name: "Mango", unit: "kg", currentQty: 120, requiredQty: 90, minLevel: 40 },
  { id: id("mat", 2), name: "Lemon", unit: "kg", currentQty: 35, requiredQty: 30, minLevel: 20 },
  { id: id("mat", 3), name: "Amla", unit: "kg", currentQty: 12, requiredQty: 28, minLevel: 15 },
  { id: id("mat", 4), name: "Oil", unit: "litre", currentQty: 20, requiredQty: 15, minLevel: 10 },
  { id: id("mat", 5), name: "Salt", unit: "kg", currentQty: 25, requiredQty: 12, minLevel: 8 },
  { id: id("mat", 6), name: "Spices", unit: "kg", currentQty: 3, requiredQty: 5, minLevel: 4 },
  { id: id("mat", 7), name: "Jars", unit: "packet", currentQty: 180, requiredQty: 150, minLevel: 60 },
  {
    id: id("mat", 8),
    name: "Packaging material",
    unit: "packet",
    currentQty: 90,
    requiredQty: 100,
    minLevel: 50,
  },
];

function buildProduction(): ProductionRecord[] {
  const out: ProductionRecord[] = [];
  const today = new Date();
  let n = 0;
  for (let m = 4; m >= 0; m--) {
    for (const p of demoProducts) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 12);
      const planned = Math.round(p.capacityPerDay * (0.8 + (4 - m) * 0.05));
      const actual = Math.round(planned * (0.85 + ((n % 3) * 0.05)));
      const sold = Math.round(actual * (0.8 + ((n % 4) * 0.04)));
      out.push({
        id: id("run", ++n),
        date: d.toISOString().slice(0, 10),
        productId: p.id,
        planned,
        actual,
        sold,
      });
    }
  }
  return out;
}

export function createDemoData(): RuralPlanData {
  return {
    profile: null,
    products: demoProducts,
    sales: buildSales(),
    materials: demoMaterials,
    production: buildProduction(),
    settings: {
      safetyStockPercent: 10,
      planningDays: 30,
      district: "Nashik",
      village: "Ozar",
    },
  };
}

export function createEmptyData(): RuralPlanData {
  return {
    profile: null,
    products: [],
    sales: [],
    materials: [],
    production: [],
    settings: { safetyStockPercent: 10, planningDays: 30, district: "Nashik", village: "" },
  };
}
