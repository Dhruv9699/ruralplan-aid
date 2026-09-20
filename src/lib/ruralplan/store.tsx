import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../supabase";
import { createEmptyData } from "./demo";
import type {
  AppSettings,
  Material,
  Product,
  ProductionRecord,
  Profile,
  RuralPlanData,
  Sale,
} from "./types";

interface StoreValue extends RuralPlanData {
  ready: boolean;
  loading: boolean;
  error: string | null;
  signIn: (profile: Profile) => void;
  signOut: () => void;
  loadUserData: () => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "userId">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Omit<Product, "id" | "userId">>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, "id" | "userId">) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id" | "userId">) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Omit<Material, "id" | "userId">>) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
  addProduction: (r: Omit<ProductionRecord, "id" | "userId">) => Promise<void>;
  removeProduction: (id: string) => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => void;
  clearAllData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function RuralPlanProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RuralPlanData>(() => createEmptyData());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data from Supabase
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setData(createEmptyData());
        setReady(true);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch all user data in parallel
      const [productsRes, salesRes, inventoryRes, productionRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", userId),
        supabase.from("sales_history").select("*").eq("user_id", userId),
        supabase.from("inventory").select("*").eq("user_id", userId),
        supabase.from("production_history").select("*").eq("user_id", userId),
      ]);

      // Map database rows to app types
      const products: Product[] = (productsRes.data || []).map((p) => ({
        id: p.id,
        userId: p.user_id,
        name: p.product_name,
        rawMaterial: p.raw_material_name,
        unit: p.unit,
        capacityPerDay: p.production_capacity,
        minStock: p.minimum_stock,
        currentStock: p.current_stock,
        productionCost: p.production_cost,
        shelfLifeDays: p.shelf_life,
        workers: p.workers,
        rawPerUnit: p.raw_per_unit,
        rawUnit: p.raw_unit,
      }));

      const sales: Sale[] = (salesRes.data || []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        date: s.date,
        productId: s.product_id,
        location: s.location,
        quantity: s.quantity_sold,
      }));

      const materials: Material[] = (inventoryRes.data || []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        name: m.material_name,
        unit: m.unit,
        currentQty: m.current_quantity,
        requiredQty: m.required_quantity,
        minLevel: m.minimum_quantity,
      }));

      const production: ProductionRecord[] = (productionRes.data || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        date: r.date,
        productId: r.product_id,
        planned: r.planned_quantity,
        actual: r.actual_quantity,
        sold: r.quantity_sold,
      }));

      setData({
        ...data,
        products,
        sales,
        materials,
        production,
      });

      setReady(true);
    } catch (err) {
      console.error("Failed to load user data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount and when auth state changes
  useEffect(() => {
    loadUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        loadUserData();
      } else if (event === "SIGNED_OUT") {
        setData(createEmptyData());
        setReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const patch = useCallback((fn: (d: RuralPlanData) => RuralPlanData) => setData((d) => fn(d)), []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      ready,
      loading,
      error,
      loadUserData,
      signIn: (profile) => patch((d) => ({ ...d, profile })),
      signOut: () => patch((d) => ({ ...createEmptyData(), profile: null })),

      // Products
      addProduct: async (p) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data: newProduct, error } = await supabase
          .from("products")
          .insert({
            user_id: session.user.id,
            product_name: p.name,
            raw_material_name: p.rawMaterial,
            unit: p.unit,
            production_capacity: p.capacityPerDay,
            minimum_stock: p.minStock,
            current_stock: p.currentStock,
            production_cost: p.productionCost || 0,
            shelf_life: p.shelfLifeDays,
            workers: p.workers,
            raw_per_unit: p.rawPerUnit,
            raw_unit: p.rawUnit,
          })
          .select()
          .single();

        if (error) throw error;

        const product: Product = {
          id: newProduct.id,
          userId: newProduct.user_id,
          name: newProduct.product_name,
          rawMaterial: newProduct.raw_material_name,
          unit: newProduct.unit,
          capacityPerDay: newProduct.production_capacity,
          minStock: newProduct.minimum_stock,
          currentStock: newProduct.current_stock,
          productionCost: newProduct.production_cost,
          shelfLifeDays: newProduct.shelf_life,
          workers: newProduct.workers,
          rawPerUnit: newProduct.raw_per_unit,
          rawUnit: newProduct.raw_unit,
        };

        patch((d) => ({ ...d, products: [...d.products, product] }));
      },

      updateProduct: async (id, p) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const updateData: Record<string, any> = {};
        if (p.name !== undefined) updateData.product_name = p.name;
        if (p.rawMaterial !== undefined) updateData.raw_material_name = p.rawMaterial;
        if (p.unit !== undefined) updateData.unit = p.unit;
        if (p.capacityPerDay !== undefined) updateData.production_capacity = p.capacityPerDay;
        if (p.minStock !== undefined) updateData.minimum_stock = p.minStock;
        if (p.currentStock !== undefined) updateData.current_stock = p.currentStock;
        if (p.productionCost !== undefined) updateData.production_cost = p.productionCost;
        if (p.shelfLifeDays !== undefined) updateData.shelf_life = p.shelfLifeDays;
        if (p.workers !== undefined) updateData.workers = p.workers;
        if (p.rawPerUnit !== undefined) updateData.raw_per_unit = p.rawPerUnit;
        if (p.rawUnit !== undefined) updateData.raw_unit = p.rawUnit;

        const { error } = await supabase.from("products").update(updateData).eq("id", id).eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({
          ...d,
          products: d.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
        }));
      },

      removeProduct: async (id) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({
          ...d,
          products: d.products.filter((x) => x.id !== id),
          sales: d.sales.filter((s) => s.productId !== id),
          production: d.production.filter((r) => r.productId !== id),
        }));
      },

      // Sales
      addSale: async (s) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data: newSale, error } = await supabase
          .from("sales_history")
          .insert({
            user_id: session.user.id,
            product_id: s.productId,
            date: s.date,
            quantity_sold: s.quantity,
            location: s.location,
          })
          .select()
          .single();

        if (error) throw error;

        const sale: Sale = {
          id: newSale.id,
          userId: newSale.user_id,
          date: newSale.date,
          productId: newSale.product_id,
          location: newSale.location,
          quantity: newSale.quantity_sold,
        };

        patch((d) => ({ ...d, sales: [...d.sales, sale] }));
      },

      removeSale: async (id) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error } = await supabase.from("sales_history").delete().eq("id", id).eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({ ...d, sales: d.sales.filter((s) => s.id !== id) }));
      },

      // Materials (Inventory)
      addMaterial: async (m) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data: newMaterial, error } = await supabase
          .from("inventory")
          .insert({
            user_id: session.user.id,
            material_name: m.name,
            unit: m.unit,
            current_quantity: m.currentQty,
            required_quantity: m.requiredQty,
            minimum_quantity: m.minLevel,
          })
          .select()
          .single();

        if (error) throw error;

        const material: Material = {
          id: newMaterial.id,
          userId: newMaterial.user_id,
          name: newMaterial.material_name,
          unit: newMaterial.unit,
          currentQty: newMaterial.current_quantity,
          requiredQty: newMaterial.required_quantity,
          minLevel: newMaterial.minimum_quantity,
        };

        patch((d) => ({ ...d, materials: [...d.materials, material] }));
      },

      updateMaterial: async (id, m) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const updateData: Record<string, any> = {};
        if (m.name !== undefined) updateData.material_name = m.name;
        if (m.unit !== undefined) updateData.unit = m.unit;
        if (m.currentQty !== undefined) updateData.current_quantity = m.currentQty;
        if (m.requiredQty !== undefined) updateData.required_quantity = m.requiredQty;
        if (m.minLevel !== undefined) updateData.minimum_quantity = m.minLevel;

        const { error } = await supabase.from("inventory").update(updateData).eq("id", id).eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({
          ...d,
          materials: d.materials.map((x) => (x.id === id ? { ...x, ...m } : x)),
        }));
      },

      removeMaterial: async (id) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error } = await supabase.from("inventory").delete().eq("id", id).eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({ ...d, materials: d.materials.filter((x) => x.id !== id) }));
      },

      // Production
      addProduction: async (r) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data: newRecord, error } = await supabase
          .from("production_history")
          .insert({
            user_id: session.user.id,
            product_id: r.productId,
            date: r.date,
            planned_quantity: r.planned,
            actual_quantity: r.actual,
            quantity_sold: r.sold,
            remaining_stock: 0, // Calculate if needed
          })
          .select()
          .single();

        if (error) throw error;

        const record: ProductionRecord = {
          id: newRecord.id,
          userId: newRecord.user_id,
          date: newRecord.date,
          productId: newRecord.product_id,
          planned: newRecord.planned_quantity,
          actual: newRecord.actual_quantity,
          sold: newRecord.quantity_sold,
        };

        patch((d) => ({ ...d, production: [...d.production, record] }));
      },

      removeProduction: async (id) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error } = await supabase
          .from("production_history")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);

        if (error) throw error;

        patch((d) => ({ ...d, production: d.production.filter((x) => x.id !== id) }));
      },

      updateSettings: (s) => patch((d) => ({ ...d, settings: { ...d.settings, ...s } })),

      clearAllData: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        // Delete all user data from database
        await Promise.all([
          supabase.from("products").delete().eq("user_id", session.user.id),
          supabase.from("sales_history").delete().eq("user_id", session.user.id),
          supabase.from("inventory").delete().eq("user_id", session.user.id),
          supabase.from("production_history").delete().eq("user_id", session.user.id),
        ]);

        patch((d) => ({ ...createEmptyData(), profile: d.profile, settings: d.settings }));
      },
    }),
    [data, ready, loading, error, patch, loadUserData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside RuralPlanProvider");
  return ctx;
}
