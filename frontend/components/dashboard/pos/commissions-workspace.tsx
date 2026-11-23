"use client";

// C3 (23/11/2026) — Comisiones, liquidaciones y períodos financieros.
// Expone casos de uso existentes; no recalcula montos. Ver
// docs/architecture/c3-liquidaciones-y-periodos-20261123.md.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActionConfirmation } from "@/components/dashboard/action-confirmation";
import { proxyUrl } from "@/lib/api";
import { formatPosMoney } from "@/lib/pos-checkout";
import { useTenant } from "@/lib/use-tenant";

type Staff = { id: string; name: string; active?: boolean };
type Commission = {
  id: string; staffId: string | null; staffName: string | null; completedAt: string; origin: "appointment" | "sale";
  serviceName: string; petName: string | null; resolvedPrice: number; staffShare: number; businessShare: number;
  status: "active" | "voided"; voidReason: string | null; settled: boolean; dayClosed: boolean;
};
type Settlement = { id: string; staffId: string; periodStart: string; periodEnd: string; totalAmount: number | string; status: string; createdAt: string };
type Period = { id: string; periodStart: string; periodEnd: string; incomeTotal: number; expenseTotal: number; netAmount: number };

const bogotaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const monthStart = (ymd: string) => `${ymd.slice(0, 8)}01`;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
// Rango civil de Colombia: inicio del primer día y último instante del último día.
const civilStart = (ymd: string) => `${ymd}T00:00:00-05:00`;
const civilEnd = (ymd: string) => `${ymd}T23:59:59.999-05:00`;

export function CommissionsWorkspace() {
  const tenant = useTenant();
  const { confirm, confirmation } = useActionConfirmation();
  const today = bogotaToday();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [staffId, setStaffId] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Commission[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [period, setPeriod] = useState<Period | null | "none">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Commission | null>(null);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(proxyUrl(`/api/dashboard${path}${tenant ? `${separator}tenantId=${encodeURIComponent(tenant)}` : ""}`), {
      cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  }, [tenant]);

  useEffect(() => {
    let current = true;
    void api("/staff").then(({ ok, body }) => { if (current && ok && Array.isArray(body)) setStaff(body); });
    return () => { current = false; };
  }, [api]);

  const load = useCallback(async () => {
    if (!from || !to || from > to) { setError("Revisa las fechas: «Desde» debe ser anterior o igual a «Hasta»."); return; }
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({ from, to, ...(staffId ? { staffId } : {}) });
      const [list, settled, closed] = await Promise.all([
        api(`/commissions?${query}`),
        api(`/settlements?${new URLSearchParams({ from: civilStart(from), to: civilEnd(to), ...(staffId ? { staffId } : {}) })}`),
        api(`/financial-periods?${new URLSearchParams({ periodStart: from, periodEnd: to })}`),
      ]);
      if (!list.ok) throw new Error(list.body.error ?? "No se pudieron consultar las comisiones.");
      setRows(list.body.commissions); setTruncated(Boolean(list.body.truncated));
      setSettlements(settled.ok && Array.isArray(settled.body) ? settled.body : []);
      setPeriod(closed.ok ? closed.body : closed.status === 404 ? "none" : null);
    } catch (cause) { setRows(null); setError(cause instanceof Error ? cause.message : "No se pudieron consultar las comisiones."); }
    finally { setBusy(false); }
  }, [api, from, to, staffId]);

  useEffect(() => {
    // Consulta inicial y al cambiar filtros; la carga marca su propio estado de espera.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const staffName = useCallback((id: string | null) => (id && staff.find(s => s.id === id)?.name) || (id ? "Profesional" : "Sin asignar"), [staff]);
  const active = useMemo(() => (rows ?? []).filter(r => r.status === "active"), [rows]);
  const totals = useMemo(() => {
    const map = new Map<string, { name: string; count: number; share: number }>();
    for (const r of active) {
      const key = r.staffId ?? "none";
      const entry = map.get(key) ?? { name: r.staffName ?? staffName(r.staffId), count: 0, share: 0 };
      entry.count++; entry.share += r.staffShare; map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.share - a.share);
  }, [active, staffName]);
  const selectedName = staffId ? staffName(staffId) : "";
  const pendingForSettlement = active.filter(r => r.staffId === staffId && !r.settled);

  async function generateSettlement() {
    if (!staffId) return;
    const total = pendingForSettlement.reduce((sum, r) => sum + r.staffShare, 0);
    if (!await confirm({
      title: "Generar liquidación",
      description: `Se consolidarán ${pendingForSettlement.length} comisiones de ${selectedName} del ${fmtDay(civilStart(from))} al ${fmtDay(civilStart(to))} por ${formatPosMoney(total)}. Es un estado de cuenta, no un pago. Hoy no se puede anular desde el dashboard, y las comisiones liquidadas ya no podrán corregirse.`,
      confirmLabel: "Generar liquidación",
    })) return;
    setBusy(true); setError("");
    const result = await api("/settlements", { method: "POST", body: JSON.stringify({ staffId, periodStart: civilStart(from), periodEnd: civilEnd(to) }) });
    setBusy(false);
    if (!result.ok) { setError(result.body.error ?? "No se pudo generar la liquidación."); return; }
    setNotice(`Liquidación de ${selectedName} generada por ${formatPosMoney(Number(result.body.totalAmount))}.`);
    await load();
  }

  async function closePeriod() {
    if (!await confirm({
      title: "Cerrar período financiero",
      description: `Se registrará el período del ${fmtDay(civilStart(from))} al ${fmtDay(civilStart(to))} con los cierres oficiales de cada día. Solo es posible si todos los días tienen su cierre. Hoy no se puede anular desde el dashboard.`,
      confirmLabel: "Cerrar período",
    })) return;
    setBusy(true); setError("");
    const result = await api("/financial-periods", { method: "POST", body: JSON.stringify({ periodStart: from, periodEnd: to }) });
    setBusy(false);
    if (!result.ok) { setError(result.body.error ?? "No se pudo cerrar el período."); return; }
    setNotice("Período financiero registrado.");
    await load();
  }

  return (
    <div className="space-y-6">
      {confirmation}
      <section aria-labelledby="commission-filters" className="rounded-2xl border border-border bg-card p-5">
        <h3 id="commission-filters" className="sr-only">Filtros</h3>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" onSubmit={event => { event.preventDefault(); setNotice(""); void load(); }}>
          <label className="text-sm font-medium">Profesional
            <select className="mt-1 block h-11 w-full rounded-lg border border-input bg-white px-3 text-base sm:text-sm" value={staffId} onChange={event => setStaffId(event.target.value)}>
              <option value="">Todo el equipo</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.active === false ? " (inactivo)" : ""}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Desde<Input className="mt-1 h-11" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
          <label className="text-sm font-medium">Hasta<Input className="mt-1 h-11" type="date" value={to} min={from} max={today} onChange={event => setTo(event.target.value)} /></label>
          <Button type="submit" variant="outline" disabled={busy}>{busy ? "Consultando…" : "Consultar"}</Button>
        </form>
      </section>

      {error && <p role="alert" className="rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success">{notice}</p>}

      {rows && <>
        <section aria-labelledby="commission-totals" className="rounded-2xl border border-border bg-card p-5">
          <h3 id="commission-totals" className="font-semibold">Comisiones vigentes del período</h3>
          {totals.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No hay comisiones vigentes en este rango.</p> :
            <ul className="mt-3 divide-y text-sm">{totals.map(t => <li key={t.name} className="flex flex-wrap items-baseline justify-between gap-3 py-2"><span>{t.name} · {t.count} {t.count === 1 ? "servicio" : "servicios"}</span><strong className="tabular-nums">{formatPosMoney(t.share)}</strong></li>)}</ul>}
          <p className="mt-3 text-xs text-muted-foreground">Es lo generado según los servicios completados; no confirma pagos al profesional.</p>
        </section>

        <section aria-labelledby="commission-list" className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4"><h3 id="commission-list" className="font-semibold">Detalle de comisiones</h3>
            <p className="mt-1 text-sm text-muted-foreground">Puedes reasignar una comisión a otro profesional o anularla si el servicio no debía generarla. El precio se corrige desde el recibo, en Historial de cobros.</p></div>
          {truncated && <p role="status" className="px-5 pt-3 text-sm text-warning">Se muestran las 500 más recientes. Acota el rango para ver el resto.</p>}
          {rows.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">Sin comisiones en este rango.</p> :
            <ul className="divide-y">{rows.map(r => {
              const locked = r.status !== "active" || r.settled || r.dayClosed;
              const state = r.status === "voided" ? "Anulada" : r.settled ? "Liquidada" : r.dayClosed ? "Día cerrado" : "Vigente";
              return <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="font-medium [overflow-wrap:anywhere]">{r.serviceName}{r.petName ? ` · ${r.petName}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{fmtDay(r.completedAt)} · {r.staffName ?? staffName(r.staffId)} · {r.origin === "sale" ? "Venta" : "Cita"} · Precio {formatPosMoney(r.resolvedPrice)}{r.voidReason ? ` · Motivo: ${r.voidReason}` : ""}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "voided" ? "bg-muted text-muted-foreground line-through" : r.settled ? "bg-info-surface text-info" : r.dayClosed ? "bg-warning-surface text-warning" : "bg-success-surface text-success"}`}>{state}</span>
                <strong className={`ml-auto text-right tabular-nums sm:ml-0 sm:w-28 ${r.status === "voided" ? "text-muted-foreground line-through" : ""}`}>{formatPosMoney(r.staffShare)}</strong>
                {!locked && <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => setEditing(r)}>Corregir</Button>}
              </li>;
            })}</ul>}
        </section>

        <section aria-labelledby="settlements-title" className="rounded-2xl border border-border bg-card p-5">
          <h3 id="settlements-title" className="font-semibold">Liquidaciones</h3>
          <p className="mt-1 text-sm text-muted-foreground">Consolida las comisiones vigentes de un profesional en un estado de cuenta del período. No registra el pago.</p>
          {!staffId ? <p className="mt-3 text-sm">Elige un profesional en los filtros para generar su liquidación.</p> :
            <Button type="button" className="mt-3" disabled={busy || pendingForSettlement.length === 0} onClick={() => void generateSettlement()}>
              {pendingForSettlement.length === 0 ? "Sin comisiones por liquidar" : `Generar liquidación de ${selectedName}`}
            </Button>}
          {settlements.length > 0 && <ul aria-label="Liquidaciones del período" className="mt-4 divide-y text-sm">{settlements.map(s => <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-3 py-2">
            <span>{staffName(s.staffId)} · {fmtDay(s.periodStart)} – {fmtDay(s.periodEnd)}{s.status !== "active" ? " · Anulada" : ""}</span>
            <strong className="tabular-nums">{formatPosMoney(Number(s.totalAmount))}</strong></li>)}</ul>}
        </section>

        <section aria-labelledby="period-title" className="rounded-2xl border border-border bg-card p-5">
          <h3 id="period-title" className="font-semibold">Período financiero</h3>
          {period && period !== "none" ? <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Ingresos</dt><dd className="font-semibold tabular-nums">{formatPosMoney(period.incomeTotal)}</dd></div>
            <div><dt className="text-muted-foreground">Gastos</dt><dd className="font-semibold tabular-nums">{formatPosMoney(period.expenseTotal)}</dd></div>
            <div><dt className="text-muted-foreground">Neto</dt><dd className="font-semibold tabular-nums">{formatPosMoney(period.netAmount)}</dd></div>
          </dl> : <>
            <p className="mt-1 text-sm text-muted-foreground">{period === "none" ? "Este rango todavía no tiene un período financiero registrado." : "No se pudo consultar el período de este rango."} Para registrarlo, cada día debe tener su cierre oficial.</p>
            <Button type="button" variant="outline" className="mt-3" disabled={busy || period === null} onClick={() => void closePeriod()}>Cerrar período del {fmtDay(civilStart(from))} al {fmtDay(civilStart(to))}</Button>
          </>}
        </section>
      </>}

      {editing && <CorrectCommissionDialog commission={editing} staff={staff.filter(s => s.active !== false && s.id !== editing.staffId)} staffName={staffName}
        onClose={() => setEditing(null)}
        onSubmit={async ({ reason, targetStaffId }) => {
          const result = await api(`/commissions/${encodeURIComponent(editing.id)}/void`, { method: "POST", body: JSON.stringify({ reason, replacement: targetStaffId ? { staffId: targetStaffId } : null }) });
          if (!result.ok) return result.body.error ?? "No se pudo corregir la comisión.";
          setEditing(null);
          setNotice(targetStaffId ? `Comisión reasignada a ${staffName(targetStaffId)}.` : "Comisión anulada.");
          await load();
          return null;
        }} />}
    </div>
  );
}

function CorrectCommissionDialog({ commission, staff, staffName, onClose, onSubmit }: {
  commission: Commission; staff: Staff[]; staffName: (id: string | null) => string;
  onClose: () => void; onSubmit: (input: { reason: string; targetStaffId: string | null }) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"reassign" | "void">("reassign");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const valid = reason.trim().length >= 3 && (mode === "void" || Boolean(target));
  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent showClose={!saving} className="max-w-lg">
        <DialogHeader className="pr-14">
          <DialogTitle>Corregir comisión</DialogTitle>
          <DialogDescription>{commission.serviceName}{commission.petName ? ` · ${commission.petName}` : ""} · {fmtDay(commission.completedAt)} · {formatPosMoney(commission.staffShare)} para {commission.staffName ?? staffName(commission.staffId)}. El precio no cambia.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 px-6 py-5" onSubmit={async event => {
          event.preventDefault(); if (!valid) return;
          setSaving(true); setError("");
          const failure = await onSubmit({ reason: reason.trim(), targetStaffId: mode === "reassign" ? target : null });
          setSaving(false); if (failure) setError(failure);
        }}>
          <fieldset className="space-y-2" disabled={saving}>
            <legend className="text-sm font-semibold">¿Qué corrección necesitas?</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="mode" className="size-4 accent-teal-700" checked={mode === "reassign"} onChange={() => setMode("reassign")} />Asignarla a otro profesional</label>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="mode" className="size-4 accent-teal-700" checked={mode === "void"} onChange={() => setMode("void")} />Anularla: este servicio no debía generar comisión</label>
          </fieldset>
          {mode === "reassign" && <label className="block text-sm font-medium">Profesional correcto
            <select required className="mt-1 block h-11 w-full rounded-lg border border-input bg-white px-3 text-base sm:text-sm" value={target} disabled={saving} onChange={event => setTarget(event.target.value)}>
              <option value="">Selecciona un profesional</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>}
          <label className="block text-sm font-medium">Motivo<Textarea className="mt-1" required minLength={3} maxLength={300} value={reason} disabled={saving} onChange={event => setReason(event.target.value)} placeholder="Ej. la atención la realizó otra persona del equipo" /></label>
          <p className="text-xs text-muted-foreground">La comisión original se conserva como anulada, con su motivo; la corrección queda registrada.</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter className="-mx-6 -mb-5 mt-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !valid}>{saving ? "Guardando…" : mode === "reassign" ? "Reasignar comisión" : "Anular comisión"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
