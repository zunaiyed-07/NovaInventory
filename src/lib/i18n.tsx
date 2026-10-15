import { createContext, useContext, useMemo, type ReactNode } from "react";
import { en, type Dict } from "@/locales/en";
import { bn } from "@/locales/bn";
import { useStore } from "./store";
import type { Lang, Product } from "./types";

interface I18n {
  lang: Lang;
  t: Dict;
  money: (n: number) => string;
  num: (n: number) => string;
  date: (iso: string, withTime?: boolean) => string;
  pname: (p: Pick<Product, "name">) => string;
  fill: (tpl: string, vars: Record<string, string>) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useStore((s) => s.lang);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const value = useMemo<I18n>(() => {
    const locale = lang === "bn" ? "bn-BD" : "en-US";
    const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const nf0 = new Intl.NumberFormat(locale);
    return {
      lang,
      t: lang === "bn" ? bn : en,
      money: (n) => (lang === "bn" ? `${nf.format(n)} ${symbol}` : `${symbol} ${nf.format(n)}`),
      num: (n) => nf0.format(n),
      date: (iso, withTime = true) =>
        new Date(iso).toLocaleString(locale, withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }),
      pname: (p) => p.name[lang] || p.name.en,
      fill: (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ""),
    };
  }, [lang, symbol]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
