import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { isNearExpiry, stockState } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border bg-card", className)}>{children}</div>;
}

export function StockBadges({ p }: { p: Product }) {
  const { t, num, unit } = { ...useI18n(), unit: useI18n().t.unit };
  const s = stockState(p);
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={s === "out" ? "danger" : s === "low" ? "warning" : "success"}>
        {s === "out" ? t.inv.out : s === "low" ? `${t.inv.low} · ${num(p.stock)}` : `${num(p.stock)} ${unit[p.unit]}`}
      </Badge>
      {isNearExpiry(p) && <Badge variant="danger">{t.inv.nearExpiry}</Badge>}
    </div>
  );
}

export function CatIcon({ category }: { category: string }) {
  const map: Record<string, string> = { groceries: "🌾", beverages: "🥤", hardware: "🔧", personal: "🧼", snacks: "🍿" };
  return <span aria-hidden>{map[category] ?? "📦"}</span>;
}
