import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { ArrowUpDown, Download, Pencil, Plus, Printer, ScanLine, Tag, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStore, isNearExpiry, stockState } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel, StockBadges } from "@/components/nova/ui";
import { BarcodeScanner } from "@/components/nova/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadFile, printArea } from "@/lib/download";
import type { Product, Unit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Inventory — NovaInventory" },
      { name: "description", content: "Stock governance with margins, low-stock and expiry alerts, barcode labels and CSV import/export." },
      { property: "og:title", content: "Inventory — NovaInventory" },
      { property: "og:description", content: "Stock governance with margins, low-stock and expiry alerts, barcode labels and CSV import/export." },
    ],
  }),
  component: Inventory,
});

type SortKey = "name" | "category" | "costPrice" | "sellingPrice" | "margin" | "stock";
const PAGE = 8;
const CATS = ["groceries", "beverages", "hardware", "personal", "snacks"] as const;
const margin = (p: Product) => (p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0);

function Inventory() {
  const { t, money, num, pname } = useI18n();
  const search = Route.useSearch();
  const { products, role, deleteProduct, importProducts } = useStore();
  const admin = role === "admin";
  const [q, setQ] = useState(search.q ?? "");
  const [tab, setTab] = useState<"all" | "low" | "expiry">("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [page, setPage] = useState(0);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [labels, setLabels] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    const val = (p: Product) => (sort.k === "name" ? pname(p) : sort.k === "margin" ? margin(p) : p[sort.k]);
    return products
      .filter((p) => tab === "all" || (tab === "low" ? stockState(p) !== "normal" : isNearExpiry(p)))
      .filter((p) => !s || [p.name.en, p.name.bn, p.sku, p.barcode].some((v) => v.toLowerCase().includes(s)))
      .sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [products, q, tab, sort, pname]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => setPage(0), [q, tab]);

  const exportCsv = () => {
    const head = "sku,barcode,name_en,name_bn,category,cost,price,stock,min_alert,expiry,unit";
    const body = products.map((p) => [p.sku, p.barcode, p.name.en, p.name.bn, p.category, p.costPrice, p.sellingPrice, p.stock, p.minStockAlert, p.expiryDate ?? "", p.unit].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    downloadFile("nova-inventory.csv", "\uFEFF" + [head, ...body].join("\n"), "text/csv");
    toast.success(t.inv.exported);
  };
  const importCsv = async (f: File) => {
    const lines = (await f.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).slice(1);
    const parse = (l: string) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
    const ps: Product[] = lines.map((l) => {
      const c = parse(l);
      return { id: crypto.randomUUID(), sku: c[0], barcode: c[1], name: { en: c[2], bn: c[3] || c[2] }, category: c[4] || "groceries", costPrice: +c[5] || 0, sellingPrice: +c[6] || 0, stock: +c[7] || 0, minStockAlert: +c[8] || 0, expiryDate: c[9] || undefined, unit: (c[10] as Unit) || "pcs" };
    }).filter((p) => p.sku);
    importProducts(ps);
    toast.success(`${t.inv.imported}: ${num(ps.length)}`);
  };

  const Th = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-2 text-left text-xs font-medium text-muted-foreground", className)}>
      {k ? (
        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : 1 }))}>
          {children}<ArrowUpDown className="size-3" />
        </button>
      ) : children}
    </th>
  );

  return (
    <>
      <PageHeader
        title={t.inv.title}
        sub={`${num(products.length)} ${t.common.items}`}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => setLabels(true)}><Tag className="size-4" />{t.inv.labels}</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" />{t.inv.exportCsv}</Button>
          {admin && <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="size-4" />{t.inv.importCsv}</Button>}
          {admin && <Button size="sm" onClick={() => { setEditingProduct(null); setIsAddProductOpen(true); }}><Plus className="size-4" />{t.inv.addProduct}</Button>}
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
        </>}
      />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="flex rounded-md bg-muted p-0.5 text-xs">
            {([["all", t.common.all], ["low", t.inv.low], ["expiry", t.inv.nearExpiry]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn("rounded px-3 py-1 font-medium", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
            ))}
          </div>
          <Input className="ml-auto h-8 max-w-xs" placeholder={t.pos.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b"><tr>
              <Th k="name">{t.inv.product}</Th><Th>{t.inv.sku}</Th><Th k="category">{t.inv.category}</Th>
              {admin && <Th k="costPrice" className="text-right">{t.inv.cost}</Th>}
              <Th k="sellingPrice">{t.inv.price}</Th>
              {admin && <Th k="margin">{t.inv.margin}</Th>}
              <Th k="stock">{t.common.status}</Th><Th className="text-right">{t.common.actions}</Th>
            </tr></thead>
            <tbody className="divide-y">
              {view.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium">{pname(p)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}<div>{p.barcode}</div></td>
                  <td className="px-3 py-2.5">{t.cat[p.category as keyof typeof t.cat] ?? p.category}</td>
                  {admin && <td className="px-3 py-2.5 tabular">{money(p.costPrice)}</td>}
                  <td className="px-3 py-2.5 tabular">{money(p.sellingPrice)}</td>
                  {admin && <td className={cn("px-3 py-2.5 tabular", margin(p) > 0 ? "text-success" : "text-danger")}>{num(Math.round(margin(p) * 10) / 10)}%</td>}
                  <td className="px-3 py-2.5"><StockBadges p={p} /></td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label={t.common.edit} onClick={() => { setEditingProduct(p); setIsAddProductOpen(true); }}><Pencil className="size-4" /></Button>
                    {admin && (
                      <Button size="icon" variant="ghost" aria-label={t.common.delete} onClick={() => { if (confirm(t.inv.confirmDelete)) { deleteProduct(p.id); toast.success(t.inv.deleted); } }}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!view.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t.common.none}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-3 text-xs text-muted-foreground">
          {t.common.page} {num(page + 1)} / {num(pages)}
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t.common.prev}</Button>
          <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t.common.next}</Button>
        </div>
      </Panel>
      <ProductSheet
        value={isAddProductOpen ? editingProduct ?? "new" : null}
        onClose={() => { setIsAddProductOpen(false); setEditingProduct(null); }}
      />
      <LabelSheet open={labels} onOpenChange={setLabels} products={rows} />
    </>
  );
}

function ProductSheet({ value, onClose }: { value: Product | null | "new"; onClose: () => void }) {
  const { t, num } = useI18n();
  const { upsertProduct, role, products } = useStore();
  const isMobile = useIsMobile();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const blank: Product = { id: "", sku: "", barcode: "", name: { en: "", bn: "" }, category: "groceries", costPrice: 0, sellingPrice: 0, stock: 0, minStockAlert: 5, unit: "pcs" };
  const [f, setF] = useState<Product>(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (value) {
      setF(value === "new" ? { ...blank, id: crypto.randomUUID() } : value);
      setErr({});
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const admin = role === "admin";
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.en.trim()) e.nameEn = t.common.required;
    if (!f.sku.trim()) e.sku = t.common.required;
    else if (products.some((p) => p.sku === f.sku && p.id !== f.id)) e.sku = t.common.invalid;
    if (!/^\d{6,14}$/.test(f.barcode)) e.barcode = t.common.invalid;
    if (f.sellingPrice <= 0) e.price = t.common.invalid;
    if (f.costPrice < 0) e.cost = t.common.invalid;
    if (f.stock < 0) e.stock = t.common.invalid;
    setErr(e);
    if (Object.keys(e).length) return;
    upsertProduct({ ...f, name: { en: f.name.en.trim(), bn: f.name.bn.trim() || f.name.en.trim() } });
    toast.success(t.inv.saved);
    onClose();
  };
  const m = margin(f);
  const title = value === "new" ? t.inv.addProduct : t.inv.editProduct;
  const fields = (
    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <F label={t.inv.nameEn} e={err.nameEn}><Input value={f.name.en} onChange={(e) => set("name", { ...f.name, en: e.target.value })} /></F>
          <F label={t.inv.nameBn}><Input value={f.name.bn} onChange={(e) => set("name", { ...f.name, bn: e.target.value })} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label={t.inv.sku} e={err.sku}><Input value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} /></F>
            <div className="block space-y-1">
              <span className="text-xs text-muted-foreground">{t.inv.barcode}</span>
              <div className="flex gap-1">
                <Input aria-label={t.inv.barcode} value={f.barcode} onChange={(e) => set("barcode", e.target.value.replace(/\D/g, ""))} />
                <Button type="button" variant="outline" size="icon" aria-label={t.pos.scan} onClick={() => setIsScannerOpen(true)}>
                  <ScanLine className="size-4" />
                </Button>
              </div>
              {err.barcode && <span className="text-xs text-danger">{err.barcode}</span>}
            </div>
            <F label={t.inv.category}>
              <Select value={f.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{t.cat[c]}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label={t.inv.unit}>
              <Select value={f.unit} onValueChange={(v) => set("unit", v as Unit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["pcs", "kg", "ltr"] as const).map((u) => <SelectItem key={u} value={u}>{t.unit[u]}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            {admin && <F label={t.inv.cost} e={err.cost}><Input type="number" value={f.costPrice} onChange={(e) => set("costPrice", +e.target.value)} /></F>}
            <F label={t.inv.price} e={err.price}><Input type="number" value={f.sellingPrice} onChange={(e) => set("sellingPrice", +e.target.value)} /></F>
            <F label={t.inv.stock} e={err.stock}><Input type="number" value={f.stock} onChange={(e) => set("stock", +e.target.value)} /></F>
            <F label={t.inv.minAlert}><Input type="number" value={f.minStockAlert} onChange={(e) => set("minStockAlert", +e.target.value)} /></F>
          </div>
          <F label={t.inv.expiry}><Input type="date" value={f.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value || undefined)} /></F>
          {admin && (
            <div className={cn("rounded-md p-3 text-sm", m > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
              {t.inv.marginPreview}: <b>{num(Math.round(m * 10) / 10)}%</b>
            </div>
          )}
          <Button className="w-full" type="submit">{t.common.save}</Button>
    </form>
  );
  const form = isMobile ? (
    <Sheet open={!!value} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-lg p-4">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        {fields}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={!!value} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {fields}
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {form}
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={(code) => {
          set("barcode", code.replace(/\D/g, ""));
          toast.success(t.inv.barcodeScanned);
          return true;
        }}
      />
    </>
  );
}

const F = ({ label, e, children }: { label: string; e?: string; children: React.ReactNode }) => (
  <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}{e && <span className="text-xs text-danger">{e}</span>}</label>
);

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) try { JsBarcode(ref.current, value, { height: 36, width: 1.4, fontSize: 11, margin: 0 }); } catch { /* invalid */ } }, [value]);
  return <svg ref={ref} />;
}

function LabelSheet({ open, onOpenChange, products }: { open: boolean; onOpenChange: (o: boolean) => void; products: Product[] }) {
  const { t, money, pname } = useI18n();
  const store = useStore((s) => s.settings.storeName);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{t.inv.labelSheet}</DialogTitle></DialogHeader>
        <div className="print-area grid grid-cols-2 gap-2 bg-card sm:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col items-center rounded border border-dashed p-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{store}</div>
              <div className="line-clamp-1 text-xs font-medium">{pname(p)}</div>
              <div className="text-sm font-bold">{money(p.sellingPrice)}</div>
              <div className="rounded bg-primary-foreground p-1"><Barcode value={p.barcode} /></div>
            </div>
          ))}
        </div>
        <Button onClick={() => printArea("labels")}><Printer className="size-4" />{t.common.print}</Button>
      </DialogContent>
    </Dialog>
  );
}
