import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Printer,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Leaf,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useStore, stockState } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Panel, CatIcon } from "@/components/nova/ui";
import { ThermalReceipt } from "@/components/nova/Receipt";
import { BarcodeScanner } from "@/components/nova/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { beep, printArea } from "@/lib/download";
import {
  PRODUCT_CATEGORIES,
  type CartItem,
  type PaymentMethod,
  type Product,
  type SaleTransaction,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Point of Sale — NovaInventory" },
      {
        name: "description",
        content:
          "High-speed single-screen checkout with barcode scanning, split payments and QR receipts.",
      },
      { property: "og:title", content: "Point of Sale — NovaInventory" },
      {
        property: "og:description",
        content:
          "High-speed single-screen checkout with barcode scanning, split payments and QR receipts.",
      },
    ],
  }),
  component: POS,
});

function POS() {
  const { t, money, num, pname } = useI18n();
  const { products, productCategories, customers, settings, shift, checkout, vouchers } =
    useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const [discType, setDiscType] = useState<"flat" | "percent">("flat");
  const [disc, setDisc] = useState("");
  const [vat, setVat] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [provider, setProvider] = useState("bKash");
  const [txId, setTxId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; amount: number } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [done, setDone] = useState<SaleTransaction | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const categories = ["all", ...PRODUCT_CATEGORIES, ...productCategories.map((category) => category.id)];
  const categoryLabel = (id: string) =>
    productCategories.find((category) => category.id === id)?.label ??
    t.cat[id as keyof typeof t.cat] ??
    id;

  useEffect(() => searchRef.current?.focus(), []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (!s || [p.name.en, p.name.bn, p.sku, p.barcode].some((v) => v.toLowerCase().includes(s))),
    );
  }, [products, q, cat]);

  const add = (p: Product) => {
    const live = products.find((x) => x.id === p.id);
    if (!live) return false;
    const existing = cartRef.current.find((item) => item.id === p.id);
    if ((existing?.quantity ?? 0) + 1 > live.stock) {
      toast.error(live.stock <= 0 ? t.pos.outOfStock : t.pos.stockLimit);
      return false;
    }
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if ((ex?.quantity ?? 0) + 1 > live.stock) {
        toast.error(live.stock <= 0 ? t.pos.outOfStock : t.pos.stockLimit);
        return c;
      }
      return ex
        ? c.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...c, { ...live, quantity: 1, discount: 0 }];
    });
    return true;
  };
  const addRef = useRef(add);
  addRef.current = add;
  const productsRef = useRef(products);
  productsRef.current = products;

  useEffect(() => {
    let buffer = "";
    let lastAt = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      const now = performance.now();
      if (event.key === "Enter") {
        const scanned = buffer.length >= 6 && now - lastAt < 50;
        const code = buffer.trim();
        buffer = "";
        lastAt = 0;
        if (!scanned) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const product = productsRef.current.find(
          (item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase(),
        );
        if (!product) {
          toast.error(t.scanner.notFound);
          return;
        }
        beep();
        if (addRef.current(product)) {
          setQ("");
          setScanOpen(false);
          toast.success(`${t.scanner.added}: ${pname(product)}`);
        }
        return;
      }
      if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) {
        buffer = "";
        lastAt = 0;
        return;
      }
      if (!buffer || now - lastAt >= 50) {
        buffer = event.key;
      } else {
        buffer += event.key;
      }
      lastAt = now;
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [pname, t.scanner.added, t.scanner.notFound]);
  const setQty = (id: string, qn: number) => {
    if (!Number.isFinite(qn)) return toast.error(t.pos.stockLimit);
    if (qn <= 0) {
      setCart((c) => c.filter((i) => i.id !== id));
      return;
    }
    const live = products.find((x) => x.id === id);
    if (!live || qn > live.stock) return toast.error(t.pos.stockLimit);
    if (live.unit === "pcs" && !Number.isInteger(qn)) return toast.error(t.common.invalid);
    setCart((c) => c.map((i) => (i.id === id ? { ...i, quantity: qn } : i)));
  };
  const changeQtyByStep = (item: CartItem, direction: -1 | 1) => {
    const step = item.unit === "pcs" ? 1 : 0.1;
    const quantity = Math.round((item.quantity + direction * step) * 1000) / 1000;
    setQty(item.id, quantity);
  };
  const commitQtyDraft = (item: CartItem) => {
    const draft = quantityDrafts[item.id];
    if (draft !== undefined) {
      const quantity = Number(draft);
      if (
        draft.trim() &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        quantity <= item.stock &&
        (item.unit !== "pcs" || Number.isInteger(quantity))
      ) {
        setQty(item.id, quantity);
      } else {
        toast.error(item.unit === "pcs" && Number.isFinite(quantity) ? t.common.invalid : t.pos.stockLimit);
      }
    }
    setQuantityDrafts((drafts) => {
      const next = { ...drafts };
      delete next[item.id];
      return next;
    });
  };

  const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);
  const subtotal = safeNumber(
    cart.reduce(
      (a, i) =>
        a +
        safeNumber(i.sellingPrice) *
          safeNumber(i.quantity) *
          (1 - Math.min(100, Math.max(0, safeNumber(i.discount))) / 100),
      0,
    ),
  );
  const dv = Math.max(0, safeNumber(Number(disc)));
  const orderDisc =
    Math.min(subtotal, discType === "flat" ? dv : (subtotal * Math.min(dv, 100)) / 100) +
    Math.min(Math.max(0, safeNumber(voucher?.amount ?? 0)), subtotal);
  const discountAmount = Math.min(subtotal, orderDisc);
  const taxAmount = vat
    ? Math.max(0, safeNumber(((subtotal - discountAmount) * safeNumber(settings.vatRate)) / 100))
    : 0;
  const total = Math.round(Math.max(0, subtotal - discountAmount + taxAmount) * 100) / 100;
  const tenderNum = Math.max(0, safeNumber(Number(tendered)));

  const reset = () => {
    setCart([]);
    setDisc("");
    setTendered("");
    setTxId("");
    setCustomerId("");
    setPaidNow("");
    setVoucher(null);
    setVoucherCode("");
  };

  const complete = () => {
    if (!shift) return toast.error(t.pos.noShift);
    if (!cart.length) return;
    let paid = total;
    if (method === "cash" && tenderNum && tenderNum < total) return toast.error(t.pos.insufficient);
    if (method === "mfs" && !txId.trim()) return toast.error(`${t.pos.txId}: ${t.common.required}`);
    if (method === "credit") {
      const c = customers.find((x) => x.id === customerId);
      if (!c) return toast.error(`${t.pos.customer}: ${t.common.required}`);
      paid = Math.min(Number(paidNow) || 0, total);
      if (c.currentDue + total - paid > c.creditLimit)
        return toast.error(t.pos.creditLimitExceeded);
    }
    let sale: SaleTransaction;
    try {
      sale = checkout({
        items: cart,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paymentMethod: method,
        paidAmount: paid,
        customerId: method === "credit" ? customerId : undefined,
        mfsProvider: method === "mfs" ? provider : undefined,
        mfsTxId: method === "mfs" ? txId : undefined,
        voucherCode: voucher?.code,
      });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === "insufficient_stock"
          ? t.pos.stockLimit
          : t.common.invalid,
      );
      return;
    }
    setDone(sale);
    reset();
    toast.success(t.pos.saleDone);
  };

  const applyVoucher = () => {
    const v = vouchers.find((x) => x.code === voucherCode.trim().toUpperCase() && !x.used);
    if (!v) return toast.error(t.pos.voucherInvalid);
    setVoucher({ code: v.code, amount: v.amount });
    toast.success(t.pos.voucherApplied);
  };

  const catalog = (
    <Panel className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="space-y-3 border-b p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const hit =
                    products.find(
                      (p) =>
                        p.barcode === q.trim() || p.sku.toLowerCase() === q.trim().toLowerCase(),
                    ) ?? (list.length === 1 ? list[0] : undefined);
                  if (hit) {
                    add(hit);
                    setQ("");
                  }
                }
              }}
              placeholder={t.pos.searchPlaceholder}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => setScanOpen(true)}>
            <ScanLine className="size-4" />
            {t.pos.scan}
          </Button>
        </div>
        <div className="scrollbar-hidden flex gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97]",
                cat === c
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "all" ? t.common.all : categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => {
          const st = stockState(p);
          return (
            <button
              key={p.id}
              disabled={st === "out"}
              onClick={() => add(p)}
              className="group flex flex-col rounded-md border bg-background p-2.5 text-left transition-all hover:border-foreground/30 hover:shadow-sm disabled:opacity-50"
            >
              <div className="grid aspect-[4/3] place-items-center rounded bg-muted text-3xl transition-transform group-hover:scale-[1.02]">
                <CatIcon category={p.category} />
              </div>
              <div className="mt-2 line-clamp-1 text-sm font-medium">{pname(p)}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold tabular">{money(p.sellingPrice)}</span>
                <Badge
                  variant={st === "out" ? "danger" : st === "low" ? "warning" : "muted"}
                  className="px-1.5 text-[10px]"
                >
                  {st === "out" ? t.pos.outOfStock : num(p.stock)}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );

  const cartPanel = (
    <Panel className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-medium">
          {t.pos.cart} · {num(cart.length)} {t.common.items}
        </span>
        {cart.length > 0 && (
          <Button size="sm" variant="ghost" onClick={reset}>
            {t.pos.clear}
          </Button>
        )}
      </div>
      {!shift && (
        <div className="m-3 rounded-md bg-danger-soft p-2.5 text-xs text-danger">
          {t.pos.noShift} —{" "}
          <Link to="/" className="underline">
            {t.nav.dashboard}
          </Link>
        </div>
      )}
      <div className="shrink-0 divide-y">
        {cart.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">{t.pos.emptyCart}</p>
        )}
        {cart.map((i) => (
          <div key={i.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium">{pname(i)}</div>
              <button
                onClick={() => setQty(i.id, 0)}
                className="text-muted-foreground hover:text-danger"
                aria-label={t.common.delete}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <button
                  className="rounded-md border p-1.5"
                  onClick={() => changeQtyByStep(i, -1)}
                  aria-label="-"
                >
                  <Minus className="size-3" />
                </button>
                <Input
                  type="number"
                  min={i.unit === "pcs" ? 1 : 0.001}
                  max={i.stock}
                  step={i.unit === "pcs" ? 1 : 0.001}
                  value={quantityDrafts[i.id] ?? String(i.quantity)}
                  onFocus={() =>
                    setQuantityDrafts((drafts) => ({
                      ...drafts,
                      [i.id]: drafts[i.id] ?? String(i.quantity),
                    }))
                  }
                  onChange={(event) =>
                    setQuantityDrafts((drafts) => ({ ...drafts, [i.id]: event.target.value }))
                  }
                  onBlur={() => commitQtyDraft(i)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  aria-label={`${t.pos.quantity} (${t.unit[i.unit]})`}
                  className="h-8 w-20 px-1 text-center text-sm tabular"
                />
                <button
                  className="rounded-md border p-1.5"
                  onClick={() => changeQtyByStep(i, 1)}
                  aria-label="+"
                >
                  <Plus className="size-3" />
                </button>
                <span className="shrink-0 text-xs text-muted-foreground">{t.unit[i.unit]}</span>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                value={i.discount || ""}
                placeholder={t.pos.lineDiscount}
                onChange={(e) =>
                  setCart((c) =>
                    c.map((x) =>
                      x.id === i.id
                        ? {
                            ...x,
                            discount: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                          }
                        : x,
                    ),
                  )
                }
                className="h-8 w-24 text-xs"
              />
              <span className="ml-auto text-sm font-semibold tabular">
                {money(i.sellingPrice * i.quantity * (1 - i.discount / 100))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-3 p-3 text-sm">
        <div className="flex gap-2">
          <div className="flex rounded-md border p-0.5 text-xs">
            {(["flat", "percent"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiscType(d)}
                className={cn(
                  "rounded px-2",
                  discType === d ? "bg-muted font-medium" : "text-muted-foreground",
                )}
              >
                {t.pos[d]}
              </button>
            ))}
          </div>
          <Input
            type="number"
            className="h-8"
            placeholder={t.pos.discount}
            value={disc}
            onChange={(e) => setDisc(e.target.value)}
          />
          <label className="flex shrink-0 items-center gap-1.5 text-xs">
            <Switch checked={vat} onCheckedChange={setVat} /> {t.pos.vat} {num(settings.vatRate)}%
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            className="h-8 font-mono text-xs uppercase"
            placeholder={t.pos.voucher}
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={applyVoucher}>
            {t.pos.apply}
          </Button>
        </div>
        <div className="space-y-1">
          <Line k={t.pos.subtotal} v={money(subtotal)} />
          {discountAmount > 0 && <Line k={t.pos.discount} v={`− ${money(discountAmount)}`} />}
          {taxAmount > 0 && <Line k={t.pos.vat} v={money(taxAmount)} />}
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>{t.pos.grandTotal}</span>
            <span className="tabular">{money(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1 text-xs">
          {(["cash", "card", "mfs", "credit"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded py-1.5 font-medium",
                method === m ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {t.pos[m]}
            </button>
          ))}
        </div>
        {method === "cash" && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Pill onClick={() => setTendered(String(total))}>{t.pos.exact}</Pill>
              {[100, 500, 1000].map((d) => (
                <Pill key={d} onClick={() => setTendered(String(tenderNum + d))}>
                  +{num(d)}
                </Pill>
              ))}
            </div>
            <Input
              type="number"
              className="h-8"
              placeholder={t.pos.tendered}
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
            />
            {tenderNum >= total && total > 0 && (
              <Line k={t.pos.change} v={money(tenderNum - total)} strong />
            )}
          </div>
        )}
        {method === "mfs" && (
          <div className="flex gap-2">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["bKash", "Nagad", "Rocket"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 font-mono"
              placeholder={t.pos.txId}
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
            />
          </div>
        )}
        {method === "credit" && (
          <div className="flex gap-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={t.pos.selectCustomer} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {money(c.currentDue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="h-8 w-28"
              placeholder={t.pos.paidNow}
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
            />
          </div>
        )}
        <Button className="w-full" size="lg" disabled={!cart.length || !shift} onClick={complete}>
          {t.pos.checkout} · {money(total)}
        </Button>
      </div>
    </Panel>
  );

  return (
    <div className="lg:-mb-6">
      <div className="hidden h-[calc(100dvh-6.5rem)] min-h-0 min-w-0 gap-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] max-[1150px]:h-[calc(100dvh-9rem)]">
        {catalog}
        {cartPanel}
      </div>
      <Tabs defaultValue="catalog" className="min-h-0 min-w-0 lg:hidden">
        <TabsList className="sticky top-14 z-30 grid h-12 w-full grid-cols-2 bg-background/95 p-1 backdrop-blur">
          <TabsTrigger value="catalog" className="min-w-0 truncate">
            {t.pos.catalog}
          </TabsTrigger>
          <TabsTrigger value="cart" className="min-w-0 gap-1 overflow-hidden">
            <ShoppingCart className="mr-1 size-3.5" />
            <span className="truncate">
              {t.pos.cart} ({num(cart.length)})
            </span>
            <span className="hidden shrink-0 sm:inline">· {money(total)}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="h-[calc(100dvh-14rem)] min-h-0 min-w-0">
          {catalog}
        </TabsContent>
        <TabsContent value="cart" className="h-[calc(100dvh-14rem)] min-h-0">
          {cartPanel}
        </TabsContent>
      </Tabs>

      <BarcodeScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={(code) => {
          const product = products.find(
            (item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase(),
          );
          if (!product) {
            toast.error(t.scanner.notFound);
            return false;
          }
          if (!add(product)) return false;
          toast.success(`${t.scanner.added}: ${pname(product)}`);
          return true;
        }}
      />

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t.pos.saleDone} · {done?.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          {done && (
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <ThermalReceipt sale={done} />
              <div className="flex flex-col items-center gap-3 rounded-md border p-4 text-center">
                <Leaf className="size-5 text-success" />
                <div className="text-sm font-medium">{t.pos.ecoReceipt}</div>
                <div className="rounded-md bg-card p-2">
                  <QRCodeSVG value={`https://nova.receipt/${done.invoiceNo}`} size={140} />
                </div>
                <p className="text-xs text-muted-foreground">{t.pos.ecoHint}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDone(null)}>
              {t.pos.newSale}
            </Button>
            <Button onClick={() => printArea("receipt")}>
              <Printer className="size-4" />
              {t.pos.printReceipt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Line = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div
    className={cn(
      "flex justify-between",
      strong ? "font-semibold text-success" : "text-muted-foreground",
    )}
  >
    <span>{k}</span>
    <span className="tabular">{v}</span>
  </div>
);
const Pill = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
    {children}
  </button>
);
