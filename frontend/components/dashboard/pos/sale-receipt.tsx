"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYMENT_METHOD_LABELS, formatTransactionDate, type Transaction } from "@/lib/transactions";
import { formatPosMoney } from "@/lib/pos-checkout";
import { HISTORY_ORIGIN_LABELS, transactionNeedsReview } from "@/lib/pos-history";
import { proxyUrl } from "@/lib/api";

export type ReceiptEstablishment = { id: string; name: string; contactPhone: string | null; address: string | null };

export function SaleReceipt({ transaction, cash, establishment }: { transaction: Transaction; cash?: { received: number; change: number }; establishment?: ReceiptEstablishment | null }) {
  const review = transactionNeedsReview(transaction);
  const issuer = establishment?.id === transaction.tenantId ? establishment : null;
  return <article aria-label="Comprobante guardado" className="min-w-0 space-y-5 text-sm">
    {issuer && <header className="space-y-1 border-b pb-4" aria-label="Establecimiento del comprobante"><p className="[overflow-wrap:anywhere] text-lg font-bold">{issuer.name}</p>{issuer.contactPhone && <p className="[overflow-wrap:anywhere]">{issuer.contactPhone}</p>}{issuer.address && <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground">{issuer.address}</p>}</header>}
    {transaction.status === "voided" && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900"><p className="font-bold">VENTA ANULADA</p><p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{transaction.voidReason}</p>{transaction.voidedAt && <p className="mt-1 text-xs">{formatTransactionDate(transaction.voidedAt)}</p>}<p className="mt-2 text-xs">Importe original conservado para consulta. Excluido de los ingresos.</p></div>}
    <div className="border-b border-dashed pb-4"><h3 className="text-xl font-bold">{review ? "Comprobante de operación" : "Comprobante de cobro"}</h3><p className="mt-1 text-muted-foreground">{formatTransactionDate(transaction.paidAt)}</p><p className="mt-1 text-muted-foreground">{HISTORY_ORIGIN_LABELS[transaction.origin || "legacy"]}</p><p className="mt-2 break-all text-xs text-muted-foreground">Referencia: {transaction.id}</p></div>
    <dl className="space-y-2"><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3"><dt className="text-muted-foreground">Cliente</dt><dd className="[overflow-wrap:anywhere] text-right font-medium">{transaction.clientName || transaction.clientPhone || "Venta de mostrador"}</dd></div>{transaction.petName && <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3"><dt className="text-muted-foreground">Mascota</dt><dd className="[overflow-wrap:anywhere] text-right">{transaction.petName}</dd></div>}</dl>
    <table className="w-full table-fixed text-left"><caption className="sr-only">Artículos de la operación</caption><colgroup><col className="w-[62%]" /><col className="w-[38%]" /></colgroup><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Artículo / cantidad</th><th className="pb-2 text-right font-medium">Importe</th></tr></thead><tbody>{transaction.items.map(item => <tr key={item.id} className="border-b border-dashed"><td className="py-3 pr-3"><p className="[overflow-wrap:anywhere] font-medium">{item.description}</p>{item.productId && <p className="mt-1 [overflow-wrap:anywhere] text-xs text-muted-foreground">{[item.productCode, item.presentation].filter(Boolean).join(" · ")}</p>}<p className="mt-1 text-xs text-muted-foreground">{item.quantity} × {formatPosMoney(item.unitPrice)}</p>{item.inventoryReturn && <p className="mt-1 text-xs text-emerald-800">Devolución: {item.inventoryReturn.quantity} unidades · {item.inventoryReturn.disposition === "restock" ? "Repuestas en inventario" : "Recibidas sin reposición"}</p>}</td><td className="py-3 [overflow-wrap:anywhere] text-right align-top tabular-nums">{formatPosMoney(item.total)}</td></tr>)}</tbody></table>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xl font-bold"><span>Total COP</span><span className="tabular-nums">{formatPosMoney(transaction.total)}</span></div>
    {!review && transaction.paymentMethod === 'mixed' && <dl className="space-y-2 rounded-xl bg-muted p-3"><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 [&>dd]:[overflow-wrap:anywhere] [&>dd]:text-right"><dt>Parte en efectivo</dt><dd className="font-semibold tabular-nums">{formatPosMoney(transaction.cashAmount ?? 0)}</dd></div><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 [&>dd]:[overflow-wrap:anywhere] [&>dd]:text-right"><dt>Parte en transferencia</dt><dd className="font-semibold tabular-nums">{formatPosMoney(transaction.transferAmount ?? 0)}</dd></div>{cash && <><div className="flex justify-between"><dt>Efectivo recibido</dt><dd>{formatPosMoney(cash.received)}</dd></div><div className="flex justify-between font-semibold"><dt>Cambio</dt><dd>{formatPosMoney(cash.change)}</dd></div></>}</dl>}
    <dl className="space-y-2 border-t pt-4"><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 [&>dd]:[overflow-wrap:anywhere] [&>dd]:text-right"><dt className="text-muted-foreground">Método de pago</dt><dd className="font-medium">{review ? "Por revisar en Caja diaria" : PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</dd></div>{cash && !review && transaction.paymentMethod === "cash" && <><div className="flex justify-between"><dt>Efectivo recibido</dt><dd>{formatPosMoney(cash.received)}</dd></div><div className="flex justify-between font-semibold"><dt>Cambio</dt><dd>{formatPosMoney(cash.change)}</dd></div></>}{transaction.recordedBy?.name && <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 [&>dd]:[overflow-wrap:anywhere] [&>dd]:text-right"><dt className="text-muted-foreground">Registró</dt><dd className="[overflow-wrap:anywhere] text-right">{transaction.recordedBy.name}</dd></div>}</dl>
    {transaction.notes && <p className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg bg-muted p-3">{transaction.notes}</p>}
    <p className="border-t pt-4 text-center text-xs text-muted-foreground">Comprobante interno de la operación. No es una factura electrónica.</p>
  </article>;
}

export function ReceiptDialog({ transaction, onClose, cash }: { transaction: Transaction | null; onClose: () => void; cash?: { received: number; change: number } }) {
  return <>
    <Dialog open={!!transaction} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden border-border bg-white shadow-xl">
        <DialogHeader className="shrink-0 border-border px-5 pr-14 sm:px-6 sm:pr-14"><DialogTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Detalle de operación</DialogTitle><DialogDescription>Consulta los datos guardados de esta operación.</DialogDescription></DialogHeader>
        {transaction && <ReceiptContent key={`${transaction.tenantId}:${transaction.id}`} transaction={transaction} cash={cash} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  </>;
}

function ReceiptContent({ transaction, cash, onClose }: { transaction: Transaction; cash?: { received: number; change: number }; onClose: () => void }) {
  const [establishment, setEstablishment] = useState<ReceiptEstablishment | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (!transaction.tenantId) throw new Error("missing establishment");
        const response = await fetch(proxyUrl(`/api/dashboard/tenant/profile?tenantId=${encodeURIComponent(transaction.tenantId)}`), { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("profile unavailable");
        const profile = await response.json();
        if (profile?.id !== transaction.tenantId || typeof profile.name !== "string" || !profile.name.trim()) throw new Error("establishment mismatch");
        if (!controller.signal.aborted) setEstablishment({ id: profile.id, name: profile.name, contactPhone: typeof profile.contactPhone === "string" ? profile.contactPhone : null, address: typeof profile.address === "string" ? profile.address : null });
      } catch {
        if (!controller.signal.aborted) setError("No se pudo comprobar el establecimiento de este cobro. Reintenta antes de imprimir.");
      }
    }
    void load();
    return () => controller.abort();
  }, [transaction.tenantId, attempt]);
  return <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
    {!establishment && (error ? <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p>{error}</p><Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Reintentar establecimiento</Button></div> : <p role="status" className="mb-4 text-sm text-muted-foreground">Comprobando establecimiento…</p>)}
    <SaleReceipt transaction={transaction} cash={cash} establishment={establishment} />
    <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-2 border-t bg-white pt-4 [&_button]:min-h-11"><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button><Button type="button" disabled={!establishment} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button></div>
    {establishment && createPortal(<div data-pos-print="true" className="hidden"><style>{`@media print { body > *:not([data-pos-print]) { display: none !important; } body > [data-pos-print] { display: block !important; max-width: 80mm; padding: 4mm; margin: 0 auto; color: #111; background: white; } @page { margin: 10mm; } }`}</style><SaleReceipt transaction={transaction} cash={cash} establishment={establishment} /></div>, document.body)}
  </div>;
}
