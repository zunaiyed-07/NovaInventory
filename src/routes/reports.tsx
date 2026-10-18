import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  Plus,
  Printer,
  Receipt,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel } from "@/components/nova/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { printArea } from "@/lib/download";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Expenses & Monthly P&L — NovaInventory" },
      {
        name: "description",
        content: "Track business expenses and review monthly sales, costs and net profit.",
      },
      { property: "og:title", content: "Expenses & Monthly P&L — NovaInventory" },
      {
        property: "og:description",
        content: "Track business expenses and review monthly sales, costs and net profit.",
      },
    ],
  }),
  component: Reports,
});

type ExpenseCategory = Expense["category"];

const expenseCategories: ExpenseCategory[] = [
  "rent",
  "salary",
  "electricity",
  "utilities",
  "maintenance",
  "other",
];
const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const saleMonth = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Reports() {
  const { t, money, num, date, lang } = useI18n();
  const { sales, expenses, settings, deleteExpense } = useStore();
  const [month, setMonth] = useState(currentMonth);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const monthlySales = useMemo(
    () =>
      sales.filter((sale) => sale.status === "completed" && saleMonth(sale.timestamp) === month),
    [sales, month],
  );
  const monthlyExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date.slice(0, 7) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month],
  );
  const totalSales = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
  const cogs = monthlySales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (itemsTotal, item) =>
          itemsTotal + item.costPrice * (item.quantity - (item.returnedQty ?? 0)),
        0,
      ),
    0,
  );
  const grossProfit = totalSales - cogs;
  const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const monthName = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));
  const categoryLabel: Record<ExpenseCategory, string> = {
    rent: t.reports.categoryRent,
    salary: t.reports.categorySalary,
    electricity: t.reports.categoryElectricity,
    utilities: t.reports.categoryUtilities,
    maintenance: t.reports.categoryMaintenance,
    other: t.reports.categoryOther,
  };
  const expenseByCategory = expenseCategories
    .map((category) => ({
      category,
      name: categoryLabel[category],
      value: monthlyExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.value > 0);

  const kpis = [
    {
      label: t.reports.totalSales,
      value: money(totalSales),
      icon: TrendingUp,
      tone: "text-foreground",
    },
    { label: t.reports.cogs, value: money(cogs), icon: Boxes, tone: "text-foreground" },
    {
      label: t.reports.grossProfit,
      value: money(grossProfit),
      icon: Banknote,
      tone: "text-foreground",
    },
    {
      label: t.reports.totalExpenses,
      value: money(totalExpenses),
      icon: Receipt,
      tone: "text-foreground",
    },
    {
      label: t.reports.netProfit,
      value: money(netProfit),
      icon: Wallet,
      tone: netProfit >= 0 ? "text-success" : "text-danger",
      badge: netProfit >= 0 ? t.reports.netProfitPositive : t.reports.netProfitNegative,
    },
  ];

  const formatExpenseDate = (value: string) => date(`${value}T12:00:00`, false);

  return (
    <>
      <PageHeader
        title={t.reports.title}
        sub={monthName}
        actions={
          <>
            <Button variant="outline" onClick={() => printArea("monthly-report")}>
              <Printer className="size-4" />
              {t.reports.printMonthlyReport}
            </Button>
            <Button onClick={() => setIsExpenseOpen(true)}>
              <Plus className="size-4" />
              {t.reports.addExpense}
            </Button>
          </>
        }
      />
      <Panel className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium" htmlFor="report-month">
          {t.reports.month}
        </label>
        <Input
          id="report-month"
          className="w-auto"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value || currentMonth())}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Panel key={kpi.label} className="p-4">
            <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span>{kpi.label}</span>
              <kpi.icon className="size-4 shrink-0" />
            </div>
            <div className={cn("mt-2 text-lg font-semibold tracking-tight tabular", kpi.tone)}>
              {kpi.value}
            </div>
            {kpi.badge && (
              <Badge className="mt-2" variant={netProfit >= 0 ? "success" : "danger"}>
                {kpi.badge}
              </Badge>
            )}
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel className="p-4">
          <h2 className="text-sm font-medium">{t.reports.expenseBreakdown}</h2>
          {expenseByCategory.length ? (
            <>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={86}
                      paddingAngle={3}
                    >
                      {expenseByCategory.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={categoryColors[expenseCategories.indexOf(entry.category)]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid grid-cols-2 gap-2 text-xs">
                {expenseByCategory.map((item) => (
                  <li key={item.category} className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: categoryColors[expenseCategories.indexOf(item.category)],
                      }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto tabular text-muted-foreground">
                      {money(item.value)} ·{" "}
                      {num(Math.round((item.value / totalExpenses) * 1000) / 10)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t.reports.noExpenses}
            </p>
          )}
        </Panel>

        <Panel className="min-w-0">
          <div className="border-b px-4 py-3 text-sm font-medium">{t.reports.expenseHistory}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t.reports.date}</th>
                  <th className="px-3 py-2">{t.reports.expenseTitle}</th>
                  <th className="px-3 py-2">{t.reports.category}</th>
                  <th className="px-3 py-2">{t.reports.note}</th>
                  <th className="px-3 py-2 text-right">{t.reports.amount}</th>
                  <th className="px-3 py-2 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlyExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {formatExpenseDate(expense.date)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{expense.title}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="muted">{categoryLabel[expense.category]}</Badge>
                    </td>
                    <td className="max-w-48 truncate px-3 py-2.5 text-muted-foreground">
                      {expense.note || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular">
                      {money(expense.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t.reports.deleteExpense}
                        onClick={() => {
                          if (confirm(t.reports.confirmDelete)) deleteExpense(expense.id);
                        }}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!monthlyExpenses.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {t.reports.noExpenses}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="print-area print-only" id="monthly-report">
        <div className="border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-bold">{settings.storeName}</h1>
          <p className="mt-1">
            {settings.address} · {settings.phone}
          </p>
          <h2 className="mt-5 text-lg font-semibold">{t.reports.statement}</h2>
          <p>{monthName}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex justify-between gap-3 border-b border-gray-300 py-2"
            >
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm">
          {t.reports.completedSales}: {num(monthlySales.length)}
        </p>
        <p className="mt-12 border-t border-gray-400 pt-2 text-right text-xs">
          {t.common.date}: {formatExpenseDate(localDate())}
        </p>
      </div>

      <ExpenseDialog
        open={isExpenseOpen}
        onOpenChange={setIsExpenseOpen}
        categoryLabel={categoryLabel}
      />
    </>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  categoryLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: Record<ExpenseCategory, string>;
}) {
  const { t } = useI18n();
  const addExpense = useStore((state) => state.addExpense);
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(localDate);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setCategory("other");
      setAmount("");
      setExpenseDate(localDate());
      setNote("");
    }
  }, [open]);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const dateValue = new Date(`${expenseDate}T12:00:00`);
    if (
      !title.trim() ||
      !(numericAmount > 0) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) ||
      Number.isNaN(dateValue.getTime()) ||
      dateValue.toISOString().slice(0, 10) !== expenseDate
    ) {
      toast.error(t.reports.invalidExpense);
      return;
    }
    addExpense({
      title: title.trim(),
      category,
      amount: numericAmount,
      date: expenseDate,
      note: note.trim() || undefined,
    });
    toast.success(t.reports.expenseSaved);
    onOpenChange(false);
  };

  const form = (
    <form className="mt-4 space-y-3" onSubmit={save}>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{t.reports.expenseTitle}</span>
        <Input
          required
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{t.reports.category}</span>
        <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((item) => (
              <SelectItem key={item} value={item}>
                {categoryLabel[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t.reports.amount}</span>
          <Input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t.reports.date}</span>
          <Input
            required
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          {t.reports.note} · {t.reports.optionalNote}
        </span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
      <Button className="w-full" type="submit">
        <CircleDollarSign className="size-4" />
        {t.reports.saveExpense}
      </Button>
    </form>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-lg p-4"
      >
        <SheetHeader>
          <SheetTitle>{t.reports.newExpense}</SheetTitle>
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.reports.newExpense}</DialogTitle>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
