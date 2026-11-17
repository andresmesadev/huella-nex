"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProtectedDialog, useDialogEditGuard } from "../protected-dialog";
import { FormDialogContent, FormDialogHeader, FormDialogBody, FormDialogFooter } from "../form-layout";
import { proxyUrl } from "@/lib/api";
import { tenantQuery, useTenant } from "@/lib/use-tenant";
import { formatCOP, formatTransactionDate, type Transaction } from "@/lib/transactions";

type Draft = { itemId: string; serviceId: string | null; staffId: string | null; transportDescription?: string; reason: string };
type Preview = { previewToken: string; before: { description: string }; after: { description: string }; previousStaffShare: number; nextStaffShare: number; total: number; reason: string };
type Revision = { id: string; occurredAt: string; before: { description: string }; after: { description: string }; reason: string; actor: { actorName: string }; commissionBefore: { staffShare: number } | null; commissionAfter: { staffShare: number } | null };
type Context = { transaction: Transaction; eligibleItemIds: string[]; defaults?: Record<string, { serviceId: string | null; staffId: string | null }>; corrections: Revision[] };
type Service = { id: string; name: string; active: boolean };
type Professional = { id: string; name: string; active: boolean };

type Props = { transaction: Transaction; onClose: () => void; onSaved: (value: Transaction) => void };
export function CorrectConceptDialog(props: Props) {
  return <ProtectedDialog open onOpenChange={open => { if (!open) props.onClose(); }}><ConceptEditor {...props} /></ProtectedDialog>;
}
function ConceptEditor({ transaction, onClose, onSaved }: Props) {
  const tenant = useTenant();
  const [context, setContext] = useState<Context | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [itemId, setItemId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [transportDescription, setTransportDescription] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewRegion = useRef<HTMLElement | null>(null);
  const [attempt, setAttempt] = useState<{ key: string; command: Draft & { previewToken: string } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const guard = useDialogEditGuard(Boolean(reason || preview || uncertain), busy);
  const base = `/api/dashboard/transactions/${encodeURIComponent(transaction.id)}/concept-corrections`;
  const field = "mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm";
  const editable = context?.eligibleItemIds.length && !busy && !uncertain;
  const selected = context?.transaction.items.find(item => item.id === itemId);
  const transport = selected?.appointmentComponent === 'transport';
  useEffect(() => { if (preview) { previewRegion.current?.focus(); previewRegion.current?.scrollIntoView({ block: 'nearest' }); } }, [preview]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const responses = await Promise.all([base, "/api/dashboard/services", "/api/dashboard/staff"].map(path => fetch(proxyUrl(`${path}${tenantQuery(tenant)}`), { cache: "no-store", signal: controller.signal })));
        if (responses.some(response => !response.ok)) throw new Error("No se pudo cargar el comprobante o el catálogo. Reintenta.");
        const [data, serviceRows, staffRows] = await Promise.all(responses.map(response => response.json())) as [Context, Service[], Professional[]];
        if (data.transaction?.id !== transaction.id || data.transaction.tenantId !== transaction.tenantId || !Array.isArray(data.eligibleItemIds) || !Array.isArray(data.corrections) || !Array.isArray(serviceRows) || !Array.isArray(staffRows)) throw new Error("No se pudo comprobar la identidad de la operación.");
        if (controller.signal.aborted) return;
        setContext(data); setServices(serviceRows.filter(row => row.active)); setProfessionals(staffRows.filter(row => row.active));
        const item = data.transaction.items.find(row => data.eligibleItemIds.includes(row.id));
        const current = item ? data.defaults?.[item.id] : undefined;
        setItemId(item?.id ?? ""); setServiceId(current?.serviceId ?? item?.serviceId ?? ""); setStaffId(current?.staffId ?? item?.performedByStaffId ?? ""); setTransportDescription(item?.appointmentComponent === 'transport' ? item.description : ''); setError("");
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la operación."); }
    }
    void load();
    return () => controller.abort();
  }, [base, tenant, transaction.id, transaction.tenantId, retry]);

  function changed() { setPreview(null); setAttempt(null); setError(""); }
  async function prepare() {
    if (busy || !editable || !selected) return;
    setBusy(true); setError("");
    try {
      const draft: Draft = { itemId, serviceId: transport ? null : serviceId, staffId: transport ? null : staffId || null, ...(transport ? { transportDescription: transportDescription.trim() } : {}), reason: reason.trim() };
      const response = await fetch(proxyUrl(`${base}/preview${tenantQuery(tenant)}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo previsualizar la corrección.");
      if (typeof body.previewToken !== "string" || body.total !== context?.transaction.total || typeof body.nextStaffShare !== "number" || typeof body.previousStaffShare !== "number") throw new Error("Previsualización inválida. Actualiza antes de continuar.");
      setPreview(body); setAttempt({ key: crypto.randomUUID(), command: { ...draft, previewToken: body.previewToken } });
    } catch (cause) { setError(cause instanceof TypeError ? "No se pudo conectar para revisar el cambio. Vuelve a intentar." : cause instanceof Error ? cause.message : "No se pudo revisar el cambio."); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (busy || !attempt) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(proxyUrl(`${base}${tenantQuery(tenant)}`), { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.key }, body: JSON.stringify(attempt.command) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status >= 500) setUncertain(true);
        else { setUncertain(false); setPreview(null); setAttempt(null); if (body.code === 'PREVIEW_CHANGED') { setContext(null); setRetry(value => value + 1); } }
        throw new Error(body.error ?? "No se pudo confirmar la corrección.");
      }
      if (body.transaction?.id !== transaction.id || body.transaction.tenantId !== transaction.tenantId || body.transaction.total !== context?.transaction.total || !Array.isArray(body.transaction.items)) { setUncertain(true); throw new Error("No se pudo comprobar el resultado. Reintenta la misma corrección."); }
      onSaved(body.transaction);
    } catch (cause) {
      const connectionFailure = cause instanceof TypeError || cause instanceof SyntaxError;
      if (connectionFailure) setUncertain(true);
      setError(connectionFailure ? "Se perdió la conexión y no se pudo comprobar el resultado. Reintenta la misma corrección." : cause instanceof Error ? cause.message : "Resultado incierto: reintenta la misma corrección.");
    } finally { setBusy(false); }
  }
  return <FormDialogContent className="max-w-2xl">
      <FormDialogHeader><DialogTitle>Corregir conceptos del comprobante</DialogTitle><DialogDescription>Corrige el servicio, profesional o concepto del domicilio. Los importes y el pago se conservan.</DialogDescription></FormDialogHeader>
      <FormDialogBody className="space-y-5">
        <p className="text-sm">Total recibido: <strong>{formatCOP(context?.transaction.total ?? transaction.total)}</strong></p>
        {!context && !error && <p role="status">Cargando comprobante…</p>}
        {!context && error && <Button type="button" variant="outline" disabled={busy} onClick={() => setRetry(value => value + 1)}>Reintentar carga</Button>}
        {context && context.eligibleItemIds.length === 0 && <p className="text-sm text-muted-foreground">Este comprobante no tiene servicios o domicilio que puedan corregirse. Solo se muestra su historial.</p>}
        {context && context.eligibleItemIds.length > 0 && <>
          <fieldset disabled={!editable || Boolean(preview)} className="space-y-4">
            <label className="block text-sm font-medium">Concepto a corregir<select className={field} value={itemId} onChange={event => { const item = context.transaction.items.find(row => row.id === event.target.value); const current = item ? context.defaults?.[item.id] : undefined; changed(); setItemId(event.target.value); setServiceId(current?.serviceId ?? item?.serviceId ?? ""); setStaffId(current?.staffId ?? item?.performedByStaffId ?? ""); setTransportDescription(item?.appointmentComponent === 'transport' ? item.description : ''); }}>{context.transaction.items.filter(item => context.eligibleItemIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.appointmentComponent === 'service' ? 'Principal: ' : item.appointmentComponent === 'transport' ? 'Domicilio: ' : ''}{item.description} · {formatCOP(item.total)}</option>)}</select></label>
            {transport ? <label className="block text-sm font-medium">Concepto correcto del domicilio<input className={field} value={transportDescription} minLength={3} maxLength={160} onChange={event => { changed(); setTransportDescription(event.target.value); }} /><span className="mt-2 block text-xs text-muted-foreground">Su importe, dirección y modalidad de traslado se conservan. El domicilio no genera comisión.</span></label> : <>
              <label className="block text-sm font-medium">Servicio correcto<select className={field} value={serviceId} onChange={event => { changed(); setServiceId(event.target.value); }}><option value="">Seleccionar servicio</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Profesional del servicio<select className={field} value={staffId} onChange={event => { changed(); setStaffId(event.target.value); }}><option value="">Sin profesional</option>{professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            </>}
            <label className="block text-sm font-medium">Motivo obligatorio<textarea className={`${field} min-h-24 py-3`} value={reason} minLength={5} maxLength={1000} onChange={event => { changed(); setReason(event.target.value); }} placeholder="Explica qué se registró por error y cuál es el servicio correcto." /></label>
          </fieldset>
          {selected && <p className="text-sm text-muted-foreground">Cantidad conservada: {selected.quantity}. Importe de la línea: {formatCOP(selected.total)}.</p>}
          {preview && <section ref={previewRegion} tabIndex={-1} aria-label="Previsualización de la corrección" className="space-y-2 rounded-xl border bg-muted p-4 text-sm focus-visible:outline-2 focus-visible:outline-primary"><p><strong>{preview.before.description}</strong> → <strong>{preview.after.description}</strong></p>{!transport && <p>Profesional: {professionals.find(person => person.id === staffId)?.name ?? 'Sin profesional'}</p>}<p>Comisión profesional: {formatCOP(preview.previousStaffShare)} → <strong>{formatCOP(preview.nextStaffShare)}</strong></p><p>Total del comprobante: <strong>{formatCOP(preview.total)}</strong></p><p className="whitespace-pre-wrap break-words">Motivo: {preview.reason}</p><p>{transport ? 'Las comisiones de los servicios se conservan. El domicilio no genera comisión.' : 'La comisión anterior se conservará anulada y se registrará la correspondiente al servicio correcto.'}</p></section>}
          {uncertain && <p role="status" className="text-sm font-medium text-amber-900">El resultado no está comprobado. Reintentar conserva la misma solicitud y recupera el resultado si ya se guardó.</p>}
          <p className="text-xs text-muted-foreground">Solo administración puede corregir el servicio principal, los adicionales y el concepto del domicilio. Se conservan precios, pago, reserva e historia clínica originales. Los cierres y las comisiones liquidadas bloquean cambios.</p>
        </>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {context && <section aria-label="Historial de correcciones" className="space-y-3 border-t pt-4"><h3 className="font-semibold">Historial de correcciones</h3>{context.corrections.length === 0 ? <p className="text-sm text-muted-foreground">Sin correcciones registradas desde esta opción.</p> : <ol className="space-y-3">{context.corrections.map(revision => <li key={revision.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{revision.before.description} → {revision.after.description}</p><p className="mt-1 text-xs text-muted-foreground">{formatTransactionDate(revision.occurredAt)} · {revision.actor.actorName}</p><p className="mt-2 whitespace-pre-wrap break-words">{revision.reason}</p><p className="mt-2">Comisión: {formatCOP(revision.commissionBefore?.staffShare ?? 0)} → {formatCOP(revision.commissionAfter?.staffShare ?? 0)}</p></li>)}</ol>}</section>}
      </FormDialogBody>
      <FormDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => guard(onClose)}>Cerrar</Button>{preview && !uncertain && <Button type="button" variant="outline" disabled={busy} onClick={changed}>Volver a editar</Button>}{context && context.eligibleItemIds.length > 0 && (preview ? <Button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? "Comprobando…" : uncertain ? "Reintentar misma corrección" : "Confirmar corrección y comisión"}</Button> : <Button type="button" disabled={busy || (transport ? transportDescription.trim().length < 3 : !serviceId) || reason.trim().length < 5} onClick={() => void prepare()}>{busy ? "Revisando…" : "Previsualizar corrección"}</Button>)}</FormDialogFooter>
    </FormDialogContent>;
}
