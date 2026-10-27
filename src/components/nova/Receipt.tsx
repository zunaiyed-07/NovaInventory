import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { SaleTransaction } from "@/lib/types";

export function ThermalReceipt({ sale }: { sale: SaleTransaction }) {
  const { t, money, date, pname, num } = useI18n();
  const settings = useStore((s) => s.settings);
  const R = ({ k, v, b }: { k: string; v: string; b?: boolean }) => (
    <div className={`flex justify-between ${b ? "font-bold" : ""}`}><span>{k}</span><span>{v}</span></div>
  );
  return (
    <div
      id="receipt"
      className="print-area mx-auto w-[80mm] max-w-full rounded-md border bg-card p-3 font-mono text-[11px] leading-relaxed"
    >
      <div className="text-center text-sm font-bold">{settings.storeName}</div>
      <div className="text-center">{settings.address}</div>
      <div className="text-center">{settings.phone}</div>
      <div className="my-2 border-t border-dashed" />
      <R k={t.receipt.invoice} v={sale.invoiceNo} />
      <R k={t.common.date} v={date(sale.timestamp)} />
      <R k={t.receipt.cashier} v={sale.cashierName} />
      <div className="my-2 border-t border-dashed" />
      {sale.items.map((i) => (
        <div key={i.id}>
          <div>{pname(i)}</div>
          <div className="flex justify-between pl-2 text-muted-foreground">
            <span>{num(i.quantity)} × {money(i.sellingPrice)}{i.discount ? ` −${num(i.discount)}%` : ""}</span>
            <span className="text-foreground">{money(i.quantity * i.sellingPrice * (1 - i.discount / 100))}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed" />
      <R k={t.pos.subtotal} v={money(sale.subtotal)} />
      {sale.discountAmount > 0 && <R k={t.pos.discount} v={`− ${money(sale.discountAmount)}`} />}
      {sale.taxAmount > 0 && <R k={t.pos.vat} v={money(sale.taxAmount)} />}
      <R k={t.pos.grandTotal} v={money(sale.total)} b />
      <R k={`${t.receipt.paid} (${t.pos[sale.paymentMethod]})`} v={money(sale.paidAmount)} />
      {sale.dueAmount > 0 && <R k={t.pos.due} v={money(sale.dueAmount)} b />}
      {sale.mfsTxId && <R k={`${sale.mfsProvider} TxID`} v={sale.mfsTxId} />}
      <div className="my-2 border-t border-dashed" />
      <div className="flex justify-center py-1">
        <QRCodeSVG value={`https://nova.receipt/${sale.invoiceNo}?t=${sale.total}`} size={84} bgColor="transparent" fgColor="currentColor" />
      </div>
      <div className="text-center">{settings.receiptFooter}</div>
      <div className="text-center font-bold">{t.receipt.thanks}</div>
    </div>
  );
}
