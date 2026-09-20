export type Unit = "jar" | "kg" | "litre" | "packet" | "box" | "bottle";

export interface Product {
  id: string;
  userId: string; // Supabase user_id
  name: string;
  rawMaterial: string;
  unit: string;
  capacityPerDay: number;
  minStock: number;
  currentStock: number;
  productionCost?: number;
  shelfLifeDays: number;
  workers: number;
  rawPerUnit: number; // raw material needed per unit produced
  rawUnit: string;
}

export interface Sale {
  id: string;
  userId: string; // Supabase user_id
  date: string; // yyyy-mm-dd
  productId: string;
  location: string;
  quantity: number;
}

export interface Material {
  id: string;
  userId: string; // Supabase user_id
  name: string;
  unit: string;
  currentQty: number;
  requiredQty: number;
  minLevel: number;
}

export interface ProductionRecord {
  id: string;
  userId: string; // Supabase user_id
  date: string;
  productId: string;
  planned: number;
  actual: number;
  sold: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  village: string;
  district: string;
  state: string;
}

export interface AppSettings {
  safetyStockPercent: number;
  planningDays: number;
  district: string;
  village: string;
}

export interface RuralPlanData {
  profile: Profile | null;
  products: Product[];
  sales: Sale[];
  materials: Material[];
  production: ProductionRecord[];
  settings: AppSettings;
}
