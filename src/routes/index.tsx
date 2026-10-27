import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  Lock,
  Plus,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, isToday, lineProfit, stockState, isNearExpiry } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel, StockBadges } from "@/components/nova/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printArea } from "@/lib/download";
import type { ShiftRegister } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NovaInventory" },
      {
        name: "description",
        content: "Today's revenue, profit, dues, stock alerts and drawer cash at a glance.",
      },
      { property: "og:title", content: "Dashboard — NovaInventory" },
      {
        property: "og:description",
        content: "Today's revenue, profit, dues, stock alerts and drawer cash at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, money, num, date, pname, lang } = useI18n();
  const { sales, customers, products, shift, role } = useStore();
  const admin = role === "admin";

  const today = sales.filter((s) => isToday(s.timestamp));
  const revenue = today.reduce((a, s) => a + s.total - (s.refundedAmount ?? 0), 0);
  const expensesToday = admin
    ? (shift?.pettyExpenses.filter((e) => isToday(e.time)).reduce((a, e) => a + e.amount, 0) ?? 0)
    : 0;
  const profit = admin
    ? today.reduce(
        (a, s) => a + s.items.reduce((b, i) => b + lineProfit(i), 0) - s.discountAmount,
        0,
      ) - expensesToday
    : 0;
  const due = customers.reduce((a, c) => a + c.currentDue, 0);
  const alerts = products.filter((p) => stockState(p) !== "normal" || isNearExpiry(p));

  const chart = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = sales.filter((s) => new Date(s.timestamp).toDateString() === d.toDateString());
      return {
        day: d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { weekday: "short" }),
        revenue: ds.reduce((a, s) => a + s.total - (s.refundedAmount ?? 0), 0),
        ...(admin
          ? {
              profit: ds.reduce(
                (a, s) => a + s.items.reduce((b, it) => b + lineProfit(it), 0) - s.discountAmount,
                0,
              ),
            }
          : {}),
      };
    });
  }, [sales, lang, admin]);

  const kpis = [
    { label: t.kpi.revenue, value: money(revenue), icon: TrendingUp, tone: "text-foreground" },
    ...(admin
      ? [
          {
            label: t.kpi.profit,
            value: money(profit),
            icon: Banknote,
            tone: profit >= 0 ? "text-success" : "text-danger",
          },
        ]
      : []),
    { label: t.kpi.due, value: money(due), icon: Users, tone: "text-danger" },
    {
      label: t.kpi.alerts,
      value: num(alerts.length),
      icon: AlertTriangle,
      tone: alerts.length ? "text-warning" : "text-foreground",
    },
    {
      label: t.kpi.drawer,
      value: shift ? money(shift.expectedCash) : "—",
      icon: Wallet,
      tone: "text-foreground",
    },
  ];

  return (
    <>
      <PageHeader title={t.nav.dashboard} sub={date(new Date().toISOString(), false)} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Panel key={k.label} className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {k.label}
              <k.icon className="size-3.5" />
            </div>
            <div className={cn("mt-2 text-xl font-semibold tracking-tight tabular", k.tone)}>
              {k.value}
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-medium">
            {admin ? t.dash.trend : t.dash.cashierTrend}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={48}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v) => num(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, k: string) => [
                    money(v),
                    k === "revenue" ? t.dash.revenue : t.dash.profit,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  fill="url(#gr)"
                  strokeWidth={2}
                />
                {admin && (
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--chart-2)"
                    fill="url(#gp)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <ShiftCard />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="border-b px-4 py-3 text-sm font-medium">{t.dash.recent}</div>
          <div className="divide-y">
            {sales.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{s.invoiceNo}</span>
                <span className="text-xs text-muted-foreground">{date(s.timestamp)}</span>
                <Badge variant="muted" className="ml-auto">
                  {t.pos[s.paymentMethod]}
                </Badge>
                {s.status !== "completed" && (
                  <Badge variant="warning">{t.ret.alreadyReturned}</Badge>
                )}
                <span className="w-28 text-right font-medium tabular">{money(s.total)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="border-b px-4 py-3 text-sm font-medium">{t.dash.alertsList}</div>
          <div className="divide-y">
            {alerts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span>{pname(p)}</span>
                <StockBadges p={p} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function ShiftCard() {
  const { t, money, date } = useI18n();
  const { shift, openShift, addPettyExpense, closeShift, settings, role } = useStore();
  const admin = role === "admin";
  const [opening, setOpening] = useState("3000");
  const [reason, setReason] = useState("");
  const [amt, setAmt] = useState("");
  const [wizard, setWizard] = useState(false);
  const [counted, setCounted] = useState("");
  const [slip, setSlip] = useState<ShiftRegister | null>(null);

  if (!shift) {
    return (
      <Panel className="flex flex-col p-4">
        <div className="text-sm font-medium">{t.shift.register}</div>
        <p className="mt-1 text-sm text-muted-foreground">{t.shift.noShift}</p>
        <label className="mt-4 text-xs text-muted-foreground">{t.shift.openingCash}</label>
        <Input
          className="mt-1"
          type="number"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
        />
        <Button
          className="mt-3"
          onClick={() => {
            openShift(Number(opening) || 0);
            toast.success(t.shift.open);
          }}
        >
          {t.shift.openShift}
        </Button>
        <SlipDialog slip={slip} onClose={() => setSlip(null)} storeName={settings.storeName} />
      </Panel>
    );
  }

  const exp = Number(counted);
  const diff = counted === "" ? 0 : exp - shift.expectedCash;

  return (
    <Panel className="flex flex-col p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{t.shift.register}</div>
        <span className="text-xs text-muted-foreground">
          {t.shift.openedAt} {date(shift.openedAt)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">{t.shift.openingCash}</dt>
        <dd className="text-right tabular">{money(shift.openingCash)}</dd>
        <dt className="text-muted-foreground">{t.shift.expected}</dt>
        <dd className="text-right font-semibold tabular">{money(shift.expectedCash)}</dd>
      </dl>
      {admin && (
        <>
          <div className="mt-4 text-xs font-medium text-muted-foreground">{t.shift.expenses}</div>
          <ul className="mt-1 space-y-1 text-sm">
            {shift.pettyExpenses.map((e) => (
              <li key={e.id} className="flex justify-between">
                <span>{e.reason}</span>
                <span className="text-danger tabular">− {money(e.amount)}</span>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim() || !(Number(amt) > 0)) return toast.error(t.common.invalid);
              addPettyExpense(reason.trim(), Number(amt));
              setReason("");
              setAmt("");
            }}
          >
            <Input
              placeholder={t.shift.reason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Input
              placeholder={t.shift.amount}
              type="number"
              className="w-24"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
            <Button type="submit" size="icon" variant="outline" aria-label={t.shift.addExpense}>
              <Plus className="size-4" />
            </Button>
          </form>
        </>
      )}
      <Button variant="outline" className="mt-auto pt-2" onClick={() => setWizard(true)}>
        <Lock className="size-4" /> {t.shift.closeShift}
      </Button>

      <Dialog open={wizard} onOpenChange={setWizard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.shift.closeWizard}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.shift.countCash}</p>
          <div className="flex justify-between text-sm">
            <span>{t.shift.expected}</span>
            <span className="font-semibold tabular">{money(shift.expectedCash)}</span>
          </div>
          <Input
            autoFocus
            type="number"
            placeholder={t.shift.actual}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
          {counted !== "" && (
            <div
              className={cn(
                "rounded-md p-3 text-sm font-medium",
                diff === 0
                  ? "bg-success-soft text-success"
                  : diff > 0
                    ? "bg-warning-soft text-warning"
                    : "bg-danger-soft text-danger",
              )}
            >
              {t.shift.discrepancy}:{" "}
              {diff === 0
                ? t.shift.balanced
                : `${diff > 0 ? t.shift.over : t.shift.short} ${money(Math.abs(diff))}`}
            </div>
          )}
          <Button
            disabled={counted === ""}
            onClick={() => {
              const s = closeShift(exp);
              setWizard(false);
              setCounted("");
              setSlip(s);
            }}
          >
            {t.shift.confirmClose}
          </Button>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function SlipDialog({
  slip,
  onClose,
  storeName,
}: {
  slip: ShiftRegister | null;
  onClose: () => void;
  storeName: string;
}) {
  const { t, money, date } = useI18n();
  if (!slip) return null;
  const exp = slip.pettyExpenses.reduce((a, e) => a + e.amount, 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="print-area mx-auto w-[80mm] max-w-full bg-card p-3 font-mono text-xs">
          <div className="text-center font-bold">{storeName}</div>
          <div className="text-center">{t.shift.slipTitle}</div>
          <div className="my-2 border-t border-dashed" />
          <Row k={t.shift.openedAt} v={date(slip.openedAt)} />
          <Row k={t.common.close} v={date(slip.closedAt!)} />
          <Row k={t.shift.openingCash} v={money(slip.openingCash)} />
          {useStore.getState().role === "admin" && (
            <Row k={t.shift.expenses} v={`− ${money(exp)}`} />
          )}
          <Row k={t.shift.expected} v={money(slip.expectedCash)} />
          <Row k={t.shift.actual} v={money(slip.actualCash ?? 0)} />
          <div className="my-2 border-t border-dashed" />
          <Row
            k={t.shift.discrepancy}
            v={
              (slip.discrepancy ?? 0) === 0
                ? t.shift.balanced
                : `${(slip.discrepancy ?? 0) > 0 ? t.shift.over : t.shift.short} ${money(Math.abs(slip.discrepancy ?? 0))}`
            }
          />
        </div>
        <Button onClick={() => printArea("slip")}>
          <Printer className="size-4" />
          {t.shift.printSlip}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2 py-0.5">
    <span>{k}</span>
    <span className="text-right">{v}</span>
  </div>
);
