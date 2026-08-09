import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createDemoData, createEmptyData } from "./demo";
import type {
  AppSettings,
  Material,
  Product,
  ProductionRecord,
  Profile,
  RuralPlanData,
  Sale,
} from "./types";

const STORAGE_KEY = "ruralplan.data.v1";

const uid = () => Math.random().toString(36).slice(2, 10);

interface StoreValue extends RuralPlanData {
  ready: boolean;
  signIn: (profile: Profile) => void;
  signOut: () => void;
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addSale: (s: Omit<Sale, "id">) => void;
  removeSale: (id: string) => void;
  addMaterial: (m: Omit<Material, "id">) => void;
  updateMaterial: (id: string, m: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  addProduction: (r: Omit<ProductionRecord, "id">) => void;
  removeProduction: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function RuralPlanProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RuralPlanData>(() => createDemoData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...createEmptyData(), ...(JSON.parse(raw) as RuralPlanData) });
    } catch {
      /* ignore corrupted storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }, [data, ready]);

  const patch = useCallback(
    (fn: (d: RuralPlanData) => RuralPlanData) => setData((d) => fn(d)),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      ready,
      signIn: (profile) => patch((d) => ({ ...d, profile })),
      signOut: () => patch((d) => ({ ...d, profile: null })),
      addProduct: (p) => patch((d) => ({ ...d, products: [...d.products, { ...p, id: uid() }] })),
      updateProduct: (id, p) =>
        patch((d) => ({
          ...d,
          products: d.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
        })),
      removeProduct: (id) =>
        patch((d) => ({
          ...d,
          products: d.products.filter((x) => x.id !== id),
          sales: d.sales.filter((s) => s.productId !== id),
          production: d.production.filter((r) => r.productId !== id),
        })),
      addSale: (s) => patch((d) => ({ ...d, sales: [...d.sales, { ...s, id: uid() }] })),
      removeSale: (id) => patch((d) => ({ ...d, sales: d.sales.filter((s) => s.id !== id) })),
      addMaterial: (m) => patch((d) => ({ ...d, materials: [...d.materials, { ...m, id: uid() }] })),
      updateMaterial: (id, m) =>
        patch((d) => ({
          ...d,
          materials: d.materials.map((x) => (x.id === id ? { ...x, ...m } : x)),
        })),
      removeMaterial: (id) =>
        patch((d) => ({ ...d, materials: d.materials.filter((x) => x.id !== id) })),
      addProduction: (r) =>
        patch((d) => ({ ...d, production: [...d.production, { ...r, id: uid() }] })),
      removeProduction: (id) =>
        patch((d) => ({ ...d, production: d.production.filter((x) => x.id !== id) })),
      updateSettings: (s) => patch((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      loadDemoData: () => patch((d) => ({ ...createDemoData(), profile: d.profile })),
      clearAllData: () => patch((d) => ({ ...createEmptyData(), profile: d.profile })),
    }),
    [data, ready, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside RuralPlanProvider");
  return ctx;
}
