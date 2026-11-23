"use client";

// C2 (23/11/2026) — Supervisión de Empleados Digitales: estado, escalaciones
// pendientes y límite de autonomía del Coordinador de Agenda. Expone casos de
// uso existentes; ver docs/architecture/c2-escalaciones-y-autonomia-20261123.md.
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActionConfirmation } from "@/components/dashboard/action-confirmation";
import { proxyUrl } from "@/lib/api";

type Employee = { id: string; specialization: string; status: string };
type Escalation = {
  id: string; status: string; createdAt: string; context: Record<string, unknown> | null;
  agentTask?: { digitalEmployee?: { id: string; specialization: string } };
};
type Limit = { action: string; autoApproved: boolean };

const SPECIALIZATION: Record<string, string> = {
  recepcionista: "Recepcionista IA",
  coordinador_agenda: "Coordinador de agenda IA",
  asistente_financiero: "Asistente financiero",
  asistente_administrativo: "Administración e inventario",
};
// Tipos reales de recordatorio del Coordinador de Agenda (jobs/reminder.job.js).
const REMINDERS: { action: string; label: string }[] = [
  { action: "appointment", label: "Recordatorio de cita" },
  { action: "vaccine", label: "Vacuna por vencer" },
  { action: "deworming", label: "Desparasitación por vencer" },
  { action: "grooming", label: "Peluquería pendiente" },
  { action: "follow_up", label: "Control o seguimiento" },
];
const reminderLabel = (action: unknown) => REMINDERS.find(r => r.action === action)?.label.toLowerCase() ?? "recordatorio";

function describe(escalation: Escalation): { title: string; detail: string } {
  const c = escalation.context ?? {};
  if (c.reason === "autonomy_limit_not_approved") return {
    title: `Recordatorio retenido: ${reminderLabel(c.reminderType)}`,
    detail: "Este tipo de recordatorio requiere revisión antes de enviarse, así que no se envió. Atenderla no lo reenvía.",
  };
  if ("conversationId" in c) return {
    title: "Conversación de WhatsApp que pide atención humana",
    detail: typeof c.userMessage === "string" && c.userMessage ? `Último mensaje: «${c.userMessage.slice(0, 160)}». Respóndelo desde WhatsApp.` : "Respóndela desde WhatsApp.",
  };
  if (c.code === "REQUEST_RETRY_LIMIT") return {
    title: "Solicitud de un asistente sin completar",
    detail: "La solicitud agotó sus reintentos. Revisa su estado en esta pantalla antes de repetirla.",
  };
  return { title: "Escalación pendiente", detail: "Requiere revisión de una persona del equipo." };
}

export function DigitalEmployeesSupervision({ tenant }: { tenant: string | null }) {
  const { confirm, confirmation } = useActionConfirmation();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(proxyUrl(`/api/dashboard${path}${tenant ? `?tenantId=${encodeURIComponent(tenant)}` : ""}`), {
      cache: "no-store", ...init, headers: { "Content-Type": "application/json" },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "No se pudo completar la solicitud.");
    return body;
  }, [tenant]);

  const coordinator = employees?.find(e => e.specialization === "coordinador_agenda") ?? null;

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, pending] = await Promise.all([api("/digital-employees") as Promise<Employee[]>, api("/escalations/pending") as Promise<Escalation[]>]);
      setEmployees(list); setEscalations(pending);
      const coord = list.find(e => e.specialization === "coordinador_agenda");
      setLimits(coord ? await api(`/digital-employees/${encodeURIComponent(coord.id)}/autonomy-limits`) as Limit[] : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la supervisión."); }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la acción."); }
    finally { setBusy(false); }
  }

  async function setReview(action: string, label: string, review: boolean) {
    if (!coordinator) return;
    if (review && !await confirm({
      title: "Pedir revisión antes de enviar",
      description: `Desde ahora, «${label}» no se enviará automáticamente: cada uno quedará como escalación en esta pantalla y no llegará al cliente hasta que alguien lo gestione por su cuenta.`,
      confirmLabel: "Pedir revisión",
    })) return;
    await run(() => api(`/digital-employees/${encodeURIComponent(coordinator.id)}/autonomy-limits`, { method: "POST", body: JSON.stringify({ action, autoApproved: !review }) }),
      review ? `«${label}» ahora requiere revisión.` : `«${label}» se enviará automáticamente.`);
  }

  if (!employees && !error) return <section className="rounded-2xl border bg-white p-6"><p role="status">Cargando supervisión…</p></section>;

  return (
    <section aria-labelledby="supervision-title" className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-6">
      {confirmation}
      <div>
        <h2 id="supervision-title" className="font-semibold">Supervisión de empleados digitales</h2>
        <p className="mt-1 text-sm text-muted-foreground">Revisa lo que los asistentes automáticos dejaron para una persona y decide qué recordatorios se envían solos.</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger">{error} <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void load()}>Reintentar</button></p>}
      {notice && <p role="status" className="rounded-xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success">{notice}</p>}

      <div>
        <h3 className="text-sm font-semibold">Pendientes de revisión {escalations.length > 0 && <span className="ml-1 rounded-full bg-warning-surface px-2 text-warning">{escalations.length}</span>}</h3>
        {escalations.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No hay nada pendiente.</p> :
          <ul className="mt-2 divide-y rounded-xl border">{escalations.map(e => {
            const { title, detail } = describe(e);
            const who = SPECIALIZATION[e.agentTask?.digitalEmployee?.specialization ?? ""] ?? "Empleado digital";
            return <li key={e.id} className="flex flex-wrap items-start gap-3 p-4 text-sm">
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-muted-foreground">{detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{who} · {new Date(e.createdAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => void run(() => api(`/escalations/${encodeURIComponent(e.id)}/attend`, { method: "POST", body: "{}" }), "Marcada como atendida.")}>Marcar como atendida</Button>
            </li>;
          })}</ul>}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Empleados digitales</h3>
        {employees && employees.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Este establecimiento no tiene empleados digitales activos.</p> :
          <ul className="mt-2 divide-y rounded-xl border">{(employees ?? []).map(e => {
            const name = SPECIALIZATION[e.specialization] ?? e.specialization;
            const paused = e.status !== "activo";
            return <li key={e.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="min-w-0 flex-1 font-medium">{name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paused ? "bg-warning-surface text-warning" : "bg-success-surface text-success"}`}>{paused ? "Pausado" : "Activo"}</span>
              <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={async () => {
                if (!paused && !await confirm({ title: `Pausar ${name}`, description: `Mientras esté pausado, ${name} no realizará su trabajo automático. Puedes reactivarlo cuando quieras.`, confirmLabel: "Pausar" })) return;
                await run(() => api(`/digital-employees/${encodeURIComponent(e.id)}/${paused ? "reactivate" : "pause"}`, { method: "POST", body: "{}" }), paused ? `${name} reactivado.` : `${name} pausado.`);
              }}>{paused ? "Reactivar" : "Pausar"}</Button>
            </li>;
          })}</ul>}
      </div>

      {coordinator && <fieldset disabled={busy} className="space-y-2">
        <legend className="text-sm font-semibold">Recordatorios automáticos del coordinador de agenda</legend>
        <p className="text-sm text-muted-foreground">Por defecto todos se envían solos. Si pides revisión para un tipo, ese recordatorio no se envía y aparece en «Pendientes de revisión».</p>
        <ul className="divide-y rounded-xl border">{REMINDERS.map(r => {
          const review = limits.some(l => l.action === r.action && !l.autoApproved);
          return <li key={r.action} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="min-w-0 flex-1">{r.label}</span>
            <div role="group" aria-label={`Envío de ${r.label}`} className="inline-flex rounded-lg border p-1">
              <button type="button" aria-pressed={!review} className={`min-h-10 rounded-md px-3 text-sm font-semibold ${!review ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => { if (review) void setReview(r.action, r.label, false); }}>Enviar solo</button>
              <button type="button" aria-pressed={review} className={`min-h-10 rounded-md px-3 text-sm font-semibold ${review ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => { if (!review) void setReview(r.action, r.label, true); }}>Pedir revisión</button>
            </div>
          </li>;
        })}</ul>
      </fieldset>}
    </section>
  );
}
