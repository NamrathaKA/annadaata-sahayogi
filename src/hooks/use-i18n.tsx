import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Lang, t } from "@/lib/i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("kn");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("farmpido_lang") as Lang | null) : null;
    if (stored) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("farmpido_lang", l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: (k) => t(lang, k) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
