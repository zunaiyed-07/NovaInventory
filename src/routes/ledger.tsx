import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Plus, Printer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel } from "@/components/nova/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printArea } from "@/lib/download";
import type { CustomerLedger } from "@/lib/types";

export const Route = createFileRoute("/ledger")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Baki Khata — NovaInventory" },
      { name: "description", content: "Digital customer credit ledger with repayments, receipts and WhatsApp due reminders." },
      { property: "og:title", content: "Baki Khata — NovaInventory" },
      { property: "og:description", content: "Digital customer credit ledger with repayments, receipts and WhatsApp due reminders." },
    ],
  }),
  component: Ledger,
});

export function waLink(c: CustomerLedger, msg: string) {
  return `https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

function Ledger() {
  const { t, money, date, fill } = useI18n();
  const search = Route.useSearch();
  const { customers, addCustomer, recordRepayment, settings } = useStore();
  const [q, setQ] = useState(search.q ?? "");
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", creditLimit: "5000" });
  const [pay, setPay] = useState<CustomerLedger | null>(null);
  const [amt, setAmt] = useState("");
  const [receipt, setReceipt] = useState<{ c: CustomerLedger; amount: number; remaining: number; at: string } | null>(null);
  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const list = customers.filter((c) => !q || `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const total = customers.reduce((a, c) => a + c.currentDue, 0);

  return (
    <>
      <PageHeader title={t.ledger.title} sub={`${t.kpi.due}: ${money(total)}`} actions={<Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" />{t.ledger.addCustomer}</Button>} />
      <Input className="mb-3 max-w-xs" placeholder={t.common.search} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Panel key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="font-mono text-xs text-muted-foreground">+{c.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{t.ledger.outstanding}</div>
                <div className={c.currentDue > 0 ? "font-semibold text-danger tabular" : "font-semibold text-success tabular"}>{money(c.currentDue)}</div>
              </div>
            </div>
            <Progress className="mt-3 h-1.5" value={Math.min(100, (c.currentDue / (c.creditLimit || 1)) * 100)} />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{t.ledger.creditLimit}: {money(c.creditLimit)}</span>
              <span>{t.ledger.lastPayment}: {c.lastPaymentDate ? date(c.lastPaymentDate, false) : "—"}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={c.currentDue <= 0} onClick={() => { setPay(c); setAmt(""); }}><Wallet className="size-4" />{t.ledger.repay}</Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={c.currentDue <= 0} asChild>
                <a href={waLink(c, fill(t.ledger.waMessage, { name: c.name, store: settings.storeName, amount: money(c.currentDue) }))} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4 text-success" />{t.ledger.whatsapp}
                </a>
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.ledger.addCustomer}</DialogTitle></DialogHeader>
          <Input placeholder={t.common.name} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <Input placeholder="8801XXXXXXXXX" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value.replace(/\D/g, "") })} />
          <Input type="number" placeholder={t.ledger.creditLimit} value={nc.creditLimit} onChange={(e) => setNc({ ...nc, creditLimit: e.target.value })} />
          <Button onClick={() => {
            if (!nc.name.trim() || nc.phone.length < 10) return toast.error(t.common.invalid);
            addCustomer({ name: nc.name.trim(), phone: nc.phone, creditLimit: Number(nc.creditLimit) || 0 });
            setAdding(false); setNc({ name: "", phone: "", creditLimit: "5000" });
          }}>{t.common.save}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.ledger.repay} · {pay?.name}</DialogTitle></DialogHeader>
          <div className="text-sm">{t.ledger.outstanding}: <b className="tabular">{pay && money(pay.currentDue)}</b></div>
          <div className="flex gap-2">
            <Input type="number" placeholder={t.shift.amount} value={amt} onChange={(e) => setAmt(e.target.value)} />
            <Button variant="outline" onClick={() => pay && setAmt(String(pay.currentDue))}>{t.ledger.full}</Button>
          </div>
          <Button onClick={() => {
            const a = Number(amt);
            if (!pay || !(a > 0) || a > pay.currentDue) return toast.error(t.common.invalid);
            recordRepayment(pay.id, a);
            setReceipt({ c: pay, amount: a, remaining: pay.currentDue - a, at: new Date().toISOString() });
            setPay(null);
            toast.success(t.ledger.paymentRecorded);
          }}>{t.common.confirm}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          {receipt && (
            <div className="print-area mx-auto w-[80mm] max-w-full bg-card p-3 font-mono text-xs">
              <div className="text-center font-bold">{settings.storeName}</div>
              <div className="text-center">{t.ledger.paymentReceipt}</div>
              <div className="my-2 border-t border-dashed" />
              <div className="flex justify-between"><span>{t.common.date}</span><span>{date(receipt.at)}</span></div>
              <div className="flex justify-between"><span>{t.pos.customer}</span><span>{receipt.c.name}</span></div>
              <div className="flex justify-between font-bold"><span>{t.receipt.paid}</span><span>{money(receipt.amount)}</span></div>
              <div className="flex justify-between"><span>{t.ledger.remaining}</span><span>{money(receipt.remaining)}</span></div>
              <div className="my-2 border-t border-dashed" />
              <div className="text-center">{t.receipt.thanks}</div>
            </div>
          )}
          <Button onClick={() => printArea("pay")}><Printer className="size-4" />{t.common.print}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
