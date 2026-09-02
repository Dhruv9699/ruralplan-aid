import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { createDemoData, createEmptyData } from "./demo";
import type { AppSettings, Material, Product, ProductionRecord, Profile, RuralPlanData, Sale } from "./types";

interface StoreValue extends RuralPlanData {
  ready: boolean;
  isAuthenticated: boolean;
  register: (profile: Profile, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  signIn: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, "id">) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id">) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Material>) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
  addProduction: (r: Omit<ProductionRecord, "id">) => Promise<void>;
  removeProduction: (id: string) => Promise<void>;
  saveRecommendation: (r: {
    productId: string;
    expectedDemand: number;
    currentStock: number;
    safetyStock: number;
    recommendedQuantity: number;
  }) => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function RuralPlanProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RuralPlanData>(() => createEmptyData());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const patch = useCallback((fn: (d: RuralPlanData) => RuralPlanData) => setData((d) => fn(d)), []);

  const loadData = useCallback(async (id: string, user?: { email?: string; user_metadata?: Record<string, unknown> }) => {
    const [profileResult, productsResult, salesResult, inventoryResult, productionResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("products").select("*").eq("user_id", id),
      supabase.from("sales_history").select("*").eq("user_id", id),
      supabase.from("inventory").select("*").eq("user_id", id),
      supabase.from("production_history").select("*").eq("user_id", id),
    ]);
    const error = [profileResult.error, productsResult.error, salesResult.error, inventoryResult.error, productionResult.error].find(Boolean);
    if (error) throw error;

    let profileRow = profileResult.data;
    if (!profileRow && user) {
      const meta = user.user_metadata ?? {};
      const created = await supabase.from("profiles").upsert({
        id,
        name: String(meta["name"] ?? meta["full_name"] ?? "RuralPlan User"),
        email: user.email ?? "",
        location: String(meta["village"] ?? "Ozar"),
        district: String(meta["district"] ?? "Nashik"),
        state: String(meta["state"] ?? "Maharashtra"),
      }).select("*").single();
      if (created.error) throw created.error;
      profileRow = created.data;
    }

    setData({
      profile: profileRow ? { name: profileRow.name, email: profileRow.email, village: profileRow.location, district: profileRow.district, state: profileRow.state } : null,
      products: (productsResult.data ?? []).map((p) => ({ id: p.id, name: p.product_name, rawMaterial: p.raw_material_name, unit: p.unit, capacityPerDay: p.production_capacity, minStock: p.minimum_stock, currentStock: p.current_stock, productionCost: p.production_cost, shelfLifeDays: p.shelf_life, workers: p.workers, rawPerUnit: p.raw_per_unit, rawUnit: p.raw_unit })),
      sales: (salesResult.data ?? []).map((s) => ({ id: s.id, date: s.date, productId: s.product_id, location: s.location, quantity: s.quantity_sold })),
      materials: (inventoryResult.data ?? []).map((m) => ({ id: m.id, name: m.material_name, unit: m.unit, currentQty: m.current_quantity, requiredQty: m.required_quantity, minLevel: m.minimum_quantity })),
      production: (productionResult.data ?? []).map((r) => ({ id: r.id, date: r.date, productId: r.product_id, planned: r.planned_quantity, actual: r.actual_quantity, sold: r.quantity_sold, remainingStock: r.remaining_stock })),
      settings: { safetyStockPercent: profileRow?.safety_stock_percent ?? 10, planningDays: profileRow?.planning_days ?? 30, district: profileRow?.district ?? "Nashik", village: profileRow?.location ?? "Ozar" },
    });
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session && active) {
        setUserId(authData.session.user.id);
        try { await loadData(authData.session.user.id, authData.session.user); } catch (error) { console.error("Unable to load RuralPlan data", error); }
      }
      if (active) setReady(true);
    };
    void initialize();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void (async () => {
        if (!session) { setUserId(null); setData(createEmptyData()); return; }
        setUserId(session.user.id);
        try { await loadData(session.user.id, session.user); } catch (error) { console.error("Unable to refresh RuralPlan data", error); }
      })();
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [loadData]);

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("Please sign in to manage your RuralPlan data.");
    return userId;
  }, [userId]);

  const register = useCallback(async (profile: Profile, password: string) => {
    const { data: result, error } = await supabase.auth.signUp({ email: profile.email, password, options: { data: profile } });
    if (error) throw error;
    if (!result.user) throw new Error("Account could not be created.");
    if (result.session) {
      setUserId(result.user.id);
      const profileResult = await supabase.from("profiles").upsert({ id: result.user.id, name: profile.name, email: profile.email, location: profile.village, district: profile.district, state: profile.state });
      if (profileResult.error) throw profileResult.error;
      await loadData(result.user.id, result.user);
    }
    return Boolean(result.session);
  }, [loadData]);

  const login = useCallback(async (email: string, password: string) => {
    const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!result.user) throw new Error("Sign in failed.");
    setUserId(result.user.id);
    await loadData(result.user.id, result.user);
  }, [loadData]);

  const signIn = useCallback(async (profile: Profile) => {
    const id = requireUser();
    const { error } = await supabase.from("profiles").upsert({ id, name: profile.name, email: profile.email, location: profile.village, district: profile.district, state: profile.state });
    if (error) throw error;
    patch((d) => ({ ...d, profile }));
  }, [patch, requireUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setData(createEmptyData());
  }, []);

  const value = useMemo<StoreValue>(() => ({
    ...data,
    ready,
    isAuthenticated: Boolean(userId),
    register,
    login,
    signIn,
    signOut,
    addProduct: async (p) => {
      const owner = requireUser();
      const { data: row, error } = await supabase.from("products").insert({ user_id: owner, product_name: p.name, raw_material_name: p.rawMaterial, unit: p.unit, production_capacity: p.capacityPerDay, current_stock: p.currentStock, minimum_stock: p.minStock, shelf_life: p.shelfLifeDays, production_cost: p.productionCost ?? 0, workers: p.workers, raw_per_unit: p.rawPerUnit, raw_unit: p.rawUnit }).select("*").single();
      if (error) throw error;
      patch((d) => ({ ...d, products: [...d.products, { ...p, id: row.id }] }));
    },
    updateProduct: async (id, p) => {
      requireUser();
      const next = { ...(p.name === undefined ? {} : { product_name: p.name }), ...(p.rawMaterial === undefined ? {} : { raw_material_name: p.rawMaterial }), ...(p.unit === undefined ? {} : { unit: p.unit }), ...(p.capacityPerDay === undefined ? {} : { production_capacity: p.capacityPerDay }), ...(p.currentStock === undefined ? {} : { current_stock: p.currentStock }), ...(p.minStock === undefined ? {} : { minimum_stock: p.minStock }), ...(p.shelfLifeDays === undefined ? {} : { shelf_life: p.shelfLifeDays }), ...(p.productionCost === undefined ? {} : { production_cost: p.productionCost }), ...(p.workers === undefined ? {} : { workers: p.workers }), ...(p.rawPerUnit === undefined ? {} : { raw_per_unit: p.rawPerUnit }), ...(p.rawUnit === undefined ? {} : { raw_unit: p.rawUnit }) };
      const { error } = await supabase.from("products").update(next).eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, products: d.products.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
    },
    removeProduct: async (id) => {
      requireUser();
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, products: d.products.filter((x) => x.id !== id), sales: d.sales.filter((s) => s.productId !== id), production: d.production.filter((r) => r.productId !== id) }));
    },
    addSale: async (s) => {
      const owner = requireUser();
      const { data: row, error } = await supabase.from("sales_history").insert({ user_id: owner, product_id: s.productId, date: s.date, quantity_sold: s.quantity, location: s.location }).select("*").single();
      if (error) throw error;
      patch((d) => ({ ...d, sales: [...d.sales, { ...s, id: row.id }] }));
    },
    removeSale: async (id) => {
      requireUser();
      const { error } = await supabase.from("sales_history").delete().eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, sales: d.sales.filter((s) => s.id !== id) }));
    },
    addMaterial: async (m) => {
      const owner = requireUser();
      const { data: row, error } = await supabase.from("inventory").insert({ user_id: owner, material_name: m.name, unit: m.unit, current_quantity: m.currentQty, required_quantity: m.requiredQty, minimum_quantity: m.minLevel }).select("*").single();
      if (error) throw error;
      patch((d) => ({ ...d, materials: [...d.materials, { ...m, id: row.id }] }));
    },
    updateMaterial: async (id, m) => {
      requireUser();
      const next = { ...(m.name === undefined ? {} : { material_name: m.name }), ...(m.unit === undefined ? {} : { unit: m.unit }), ...(m.currentQty === undefined ? {} : { current_quantity: m.currentQty }), ...(m.requiredQty === undefined ? {} : { required_quantity: m.requiredQty }), ...(m.minLevel === undefined ? {} : { minimum_quantity: m.minLevel }) };
      const { error } = await supabase.from("inventory").update(next).eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, materials: d.materials.map((x) => (x.id === id ? { ...x, ...m } : x)) }));
    },
    removeMaterial: async (id) => {
      requireUser();
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, materials: d.materials.filter((x) => x.id !== id) }));
    },
    addProduction: async (r) => {
      const owner = requireUser();
      const product = data.products.find((p) => p.id === r.productId);
      const remainingStock = Math.max(0, (product?.currentStock ?? 0) + r.actual - r.sold);
      const { data: row, error } = await supabase.from("production_history").insert({ user_id: owner, product_id: r.productId, date: r.date, planned_quantity: r.planned, actual_quantity: r.actual, quantity_sold: r.sold, remaining_stock: remainingStock }).select("*").single();
      if (error) throw error;
      patch((d) => ({ ...d, production: [...d.production, { ...r, id: row.id, remainingStock }] }));
    },
    removeProduction: async (id) => {
      requireUser();
      const { error } = await supabase.from("production_history").delete().eq("id", id);
      if (error) throw error;
      patch((d) => ({ ...d, production: d.production.filter((x) => x.id !== id) }));
    },
    saveRecommendation: async (r) => {
      const owner = requireUser();
      const { error } = await supabase.from("production_recommendations").insert({
        user_id: owner,
        product_id: r.productId,
        expected_demand: r.expectedDemand,
        current_stock: r.currentStock,
        safety_stock: r.safetyStock,
        recommended_quantity: r.recommendedQuantity,
      });
      if (error) throw error;
    },
    updateSettings: async (s) => {
      const owner = requireUser();
      const next = { ...(s.village === undefined ? {} : { location: s.village }), ...(s.district === undefined ? {} : { district: s.district }), ...(s.safetyStockPercent === undefined ? {} : { safety_stock_percent: s.safetyStockPercent }), ...(s.planningDays === undefined ? {} : { planning_days: s.planningDays }) };
      const { error } = await supabase.from("profiles").update(next).eq("id", owner);
      if (error) throw error;
      patch((d) => ({ ...d, settings: { ...d.settings, ...s } }));
    },
    loadDemoData: async () => {
      const owner = requireUser();
      const demo = createDemoData();
      const clearResults = await Promise.all([
        supabase.from("inventory").delete().eq("user_id", owner),
        supabase.from("sales_history").delete().eq("user_id", owner),
        supabase.from("production_history").delete().eq("user_id", owner),
        supabase.from("production_recommendations").delete().eq("user_id", owner),
        supabase.from("products").delete().eq("user_id", owner),
      ]);
      const clearError = clearResults.find((result) => result.error)?.error;
      if (clearError) throw clearError;
      const inserted = await supabase.from("products").insert(demo.products.map((p) => ({ user_id: owner, product_name: p.name, raw_material_name: p.rawMaterial, unit: p.unit, production_capacity: p.capacityPerDay, current_stock: p.currentStock, minimum_stock: p.minStock, shelf_life: p.shelfLifeDays, production_cost: p.productionCost ?? 0, workers: p.workers, raw_per_unit: p.rawPerUnit, raw_unit: p.rawUnit }))).select("*");
      if (inserted.error) throw inserted.error;
      const ids = new Map(inserted.data.map((p) => [p.product_name, p.id]));
      const productIds = new Map(demo.products.map((p) => [p.id, ids.get(p.name)]));
      const results = await Promise.all([
        supabase.from("inventory").insert(demo.materials.map((m) => ({ user_id: owner, material_name: m.name, unit: m.unit, current_quantity: m.currentQty, required_quantity: m.requiredQty, minimum_quantity: m.minLevel }))),
        supabase.from("sales_history").insert(demo.sales.flatMap((s) => { const productId = productIds.get(s.productId); return productId ? [{ user_id: owner, product_id: productId, date: s.date, quantity_sold: s.quantity, location: s.location }] : []; })),
        supabase.from("production_history").insert(demo.production.flatMap((r) => { const productId = productIds.get(r.productId); return productId ? [{ user_id: owner, product_id: productId, date: r.date, planned_quantity: r.planned, actual_quantity: r.actual, quantity_sold: r.sold, remaining_stock: Math.max(0, r.actual - r.sold) }] : []; })),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error) throw error;
      await loadData(owner);
    },
    clearAllData: async () => {
      const owner = requireUser();
      const results = await Promise.all([
        supabase.from("inventory").delete().eq("user_id", owner),
        supabase.from("sales_history").delete().eq("user_id", owner),
        supabase.from("production_history").delete().eq("user_id", owner),
        supabase.from("production_recommendations").delete().eq("user_id", owner),
        supabase.from("products").delete().eq("user_id", owner),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error) throw error;
      patch((d) => ({ ...createEmptyData(), profile: d.profile }));
    },
  }), [data, ready, userId, register, login, signIn, signOut, patch, requireUser, loadData]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside RuralPlanProvider");
  return ctx;
}
