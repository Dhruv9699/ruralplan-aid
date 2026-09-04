import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import en from "./en.json";
import hi from "./hi.json";
import mr from "./mr.json";

type Language = "en" | "hi" | "mr";
type TranslationKeys = typeof en;

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
  translations: TranslationKeys;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

const translations: Record<Language, TranslationKeys> = {
  en,
  hi,
  mr,
};

// Memoized translation cache to avoid repeated lookups
const translationCache = new Map<string, Map<string, string | undefined>>();

// Initialize cache for all languages
for (const lang of ["en", "hi", "mr"] as const) {
  translationCache.set(lang, new Map());
}

// Memoized helper function to get nested translation by dot notation
function getNestedTranslation(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

// Cache lookup function
function getCachedTranslation(language: Language, key: string): string | undefined {
  const cache = translationCache.get(language)!;
  
  if (!cache.has(key)) {
    const translation = getNestedTranslation(translations[language], key);
    cache.set(key, translation);
  }
  
  return cache.get(key);
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from localStorage on mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ruralplan_language");
      if (stored === "en" || stored === "hi" || stored === "mr") return stored;
    }
    return "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("ruralplan_language", lang);
    }
  }, []);

  // Memoized t function to avoid recreation on every render
  const t = useCallback((key: string, defaultValue: string = key): string => {
    const translation = getCachedTranslation(language, key);
    return translation || defaultValue;
  }, [language]);

  // Memoized context value to prevent unnecessary re-renders of children
  const contextValue = useMemo<TranslationContextType>(
    () => ({
      language,
      setLanguage,
      t,
      translations: translations[language],
    }),
    [language, setLanguage, t]
  );

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used inside TranslationProvider");
  }
  return context;
}
