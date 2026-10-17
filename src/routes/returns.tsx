import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel } from "@/components/nova/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns & Refunds — NovaInventory" },
      { name: "description", content: "Pull past invoices, return items, refund cash or issue store credit vouchers." },
      { property: "og:title", content: "Returns & Refunds — NovaInventory" },
      { property: "og:description", content: "Pull past invoices, return items, refund cash or issue store credit vouchers." },
    ],
  }),
  component: Returns,
});

function Returns() {
  const { t, money, num, date, pname } = useI18n();
  const { sales, processReturn, shift } = useStore();
  const [inv, setInv] = useState("");
  const [saleId, setSaleId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<"damaged" | "wrong" | "exchange">("damaged");
  const [mode, setMode] = useState<"cash" | "voucher">("cash");
  const [result, setResult] = useState<{ amount: number; voucher?: string } | null>(null);
  const sale = sales.find((s) => s.id === saleId);

  const find = () => {
    const s = sales.find((x) => x.invoiceNo.toLowerCase() === inv.trim().toLowerCase());
    if (!s) return toast.error(t.ret.notFound);
    setSaleId(s.id); setQty({}); setResult(null);
  };
  const ratio = sale && sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
  const refund = sale ? sale.items.reduce((a, i) => a + (qty[i.id] ?? 0) * i.sellingPrice * (1 - i.discount / 100) * ratio, 0) : 0;

  const submit = () => {
    if (!sale || refund <= 0) return;
    if (mode === "cash" && !shift) return toast.error(t.pos.noShift);
    const r = processReturn(sale.id, qty, mode);
    setResult(r); setQty({});
    toast.success(t.ret.done);
  };

  return (
    <>
      <PageHeader title={t.ret.title} sub={t.ret.hint} />
      <form className="mb-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
        <Input className="font-mono" placeholder={t.ret.lookup} value={inv} onChange={(e) => setInv(e.target.value)} />
        <Button type="submit"><Search className="size-4" />{t.ret.find}</Button>
      </form>
      {sale && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Panel>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm">
              <span className="font-mono font-medium">{sale.invoiceNo}</span>
              <span className="text-muted-foreground">{date(sale.timestamp)}</span>
              <Badge variant="muted">{t.pos[sale.paymentMethod]}</Badge>
              {sale.status !== "completed" && <Badge variant="warning">{t.ret.alreadyReturned}</Badge>}
              <span className="ml-auto font-semibold tabular">{money(sale.total)}</span>
            </div>
            <div className="divide-y">
              {sale.items.map((i) => {
                const left = i.quantity - (i.returnedQty ?? 0);
                return (
                  <div key={i.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{pname(i)}</div>
                      <div className="text-xs text-muted-foreground">{t.ret.sold}: {num(i.quantity)} · {t.ret.returnable}: {num(left)} · {money(i.sellingPrice)}</div>
                    </div>
                    <Input
                      type="number" min={0} max={left} disabled={left === 0} className="h-8 w-20"
                      value={qty[i.id] ?? ""} placeholder="0"
                      onChange={(e) => setQty((q) => ({ ...q, [i.id]: Math.max(0, Math.min(left, Number(e.target.value) || 0)) }))}
                    />
                    <Button size="sm" variant="ghost" disabled={left === 0} onClick={() => setQty((q) => ({ ...q, [i.id]: left }))}>{t.common.all}</Button>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel className="space-y-4 p-4">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t.ret.reason}</div>
              <div className="flex flex-col gap-1.5">
                {(["damaged", "wrong", "exchange"] as const).map((r) => (
                  <Opt key={r} active={reason === r} onClick={() => setReason(r)}>{t.ret[r]}</Opt>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t.ret.settlement}</div>
              <div className="grid grid-cols-2 gap-1.5">
                <Opt active={mode === "cash"} onClick={() => setMode("cash")}>{t.ret.refundCash}</Opt>
                <Opt active={mode === "voucher"} onClick={() => setMode("voucher")}>{t.ret.storeCredit}</Opt>
              </div>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold"><span>{t.ret.refundTotal}</span><span className="tabular">{money(refund)}</span></div>
            <Button className="w-full" disabled={refund <= 0} onClick={submit}>{t.ret.submit}</Button>
            {result && (
              <div className="rounded-md bg-success-soft p-3 text-sm text-success">
                {t.ret.done}: {money(result.amount)}
                {result.voucher && <div className="mt-1">{t.ret.voucherIssued}: <b className="font-mono">{result.voucher}</b></div>}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

const Opt = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn("rounded-md border px-3 py-2 text-left text-sm transition-colors", active ? "border-foreground bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>{children}</button>
);
