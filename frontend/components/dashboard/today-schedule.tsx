"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardAccess } from "@/lib/dashboard-access";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { homeAppointments, homeHref } from "@/lib/home-workspace";
import { DAY_GROUPS, matchesDayGroup, type HomeScheduleFilter } from "@/lib/home-adaptability";
import { CalendarDays, ChevronRight, RefreshCw } from "lucide-react";
import { DailyCloseSheet } from "@/components/dashboard/daily-close-sheet";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentDetailDialog } from "@/components/dashboard/appointment-detail-dialog";
import { AppointmentQuickActions } from "./appointment-quick-actions";
import {
  type TodayAppointment,
  appointmentNeedsReview,
  isGroomingAppointment,
  formatColombiaTime,
  formatService,
  formatStatus,
  statusBadgeClass,
} from "@/lib/appointments";
import { getPetEmoji } from "@/lib/pets";
import { proxyUrl } from "@/lib/api";
import { useTenant } from "@/lib/use-tenant";
import { agendaPage, visibleAgendaAppointments } from "@/lib/agenda-display";
import { Button } from "@/components/ui/button";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const PRICE_SOURCE_LABEL: Record<string, string> = {
  manual_override:   "Override",
  pet_agreed_price: "Tarifa de mascota",
  pet_default_price: "Mascota",
  service_base_price:"Catálogo",
};

function DaySummary({ appointments, prices }: { appointments: TodayAppointment[]; prices: boolean }) {
  const active = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "no_show"
  );
  const withPrice = active.filter((a) => a.finalPrice !== null);
  const withoutPrice = active.filter((a) => isGroomingAppointment(a) && a.finalPrice === null);
  const total = withPrice.reduce((sum, a) => sum + (a.finalPrice ?? 0), 0);

  return (
    <div className="flex flex-wrap gap-3 px-1 py-2 mb-1 text-sm">
      <span className="text-muted-foreground">
        <span className="font-semibold text-foreground">{active.length}</span>{" "}
        {active.length === 1 ? "cita" : "citas"}
      </span>
      {prices && withPrice.length > 0 && (
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{COP.format(total)}</span>{" "}
          esperados
        </span>
      )}
      {prices && withoutPrice.length > 0 && (
        <span className="flex items-center gap-1 text-amber-500 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {withoutPrice.length} sin precio
        </span>
      )}
    </div>
  );
}

function AppointmentAmounts({ appointment: appt }: { appointment: TodayAppointment }) {
  const paid = appt.payment?.status === "paid" && appt.payment.total != null;
  const service = appt.priceResolution?.servicePrice ?? appt.finalPrice;
  const source = appt.finalPrice !== null && appt.priceResolution?.source;
  return <span className="mt-2 block space-y-1 text-xs text-muted-foreground">
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
      {paid ? <span className="font-semibold text-primary">Cobrado: {COP.format(appt.payment!.total!)}</span> : <>
        <span>Servicio: <span className="font-medium text-foreground">{service == null ? "Por confirmar" : COP.format(service)}</span></span>
        <span>Domicilio: {appt.transport?.pending ? "Por confirmar" : COP.format(appt.transport?.price ?? 0)}</span>
        <span className="font-semibold text-foreground">{appt.payment?.status === "pending" ? "Referencia" : "Total"}: {appt.finalPrice == null ? "Por confirmar" : COP.format(appt.finalPrice)}</span>
      </>}
    </span>
    {source && source !== "manual_override" && <span className="block">{PRICE_SOURCE_LABEL[source]}</span>}
  </span>;
}

function formatTimeSince(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "justo ahora";
  if (secs < 60) return `hace ${secs}s`;
  return `hace ${Math.floor(secs / 60)}min`;
}

function formatTodayHeader(): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

type Props = {
  appointments: TodayAppointment[];
  initialReview?: boolean;
  compact?: boolean;
  access?: DashboardAccess;
  filter?: HomeScheduleFilter;
  onFilterChange?: (filter: HomeScheduleFilter) => void;
  onAppointmentsChange?: (appointments: TodayAppointment[]) => void;
};

const POLL_INTERVAL_MS = 30_000;

export function TodaySchedule({ appointments: initial, initialReview = false, compact = false, access: providedAccess, filter, onFilterChange, onAppointmentsChange }: Props) {
  const contextAccess = useDashboardAccess();
  const access = providedAccess ?? contextAccess;
  const prices = !!(access?.capabilities.cash || access?.capabilities.appointmentPrice);
  const router = useRouter();
  const tenant = useTenant();
  const [appointments, setAppointments] = useState(initial);
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(initialReview);
  const [selected, setSelected] = useState<TodayAppointment | null>(null);
  const [startInPriceEdit, setStartInPriceEdit] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [polling, setPolling] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => {
    // Synchronize the server refresh without remounting an open appointment dialog.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppointments(initial);
  }, [initial]);

  const header = formatTodayHeader();
  const capitalized = header.charAt(0).toUpperCase() + header.slice(1);
  const needsAttention = (appointment: TodayAppointment) => prices ? appointmentNeedsReview(appointment) :
    ["pending", "confirmed", "arrived", "in_progress"].includes(appointment.status) && (["arrived", "in_progress"].includes(appointment.status) || !appointment.staffName);
  const agendaAppointments = visibleAgendaAppointments(appointments);
  const attentionCount = agendaAppointments.filter(needsAttention).length;
  const selectedFilter = filter ?? (onlyNeedsAttention ? "review" : "all");
  const groupLabel = DAY_GROUPS.find(group => group.key === selectedFilter)?.label;
  const visibleAppointments = agendaAppointments.filter(appointment => selectedFilter === "review" ? needsAttention(appointment) : matchesDayGroup(appointment, selectedFilter));
  const pagination = agendaPage(visibleAppointments, page);
  useEffect(() => {
    // A different day, tenant or filter starts its list on the first page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [selectedFilter, capitalized, tenant]);
  useEffect(() => { onAppointmentsChange?.(appointments); }, [appointments, onAppointmentsChange]);
  function changeFilter(next: HomeScheduleFilter) { if (onFilterChange) onFilterChange(next); else setOnlyNeedsAttention(next === "review"); }

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setPolling(true);
    try {
      const res = await fetch(proxyUrl(`/api/dashboard/appointments/today${tenant ? `?tenantId=${encodeURIComponent(tenant)}` : ""}`), {
        cache: "no-store",
      });
      if (res.ok) {
        const data: TodayAppointment[] = await res.json();
        setAppointments(access ? homeAppointments(data, access) : data);
        setLastUpdated(new Date());
        setRefreshError(false);
        if (compact) router.refresh();
      } else setRefreshError(true);
    } catch { setRefreshError(true); } finally {
      if (!silent) setPolling(false);
    }
  }, [tenant, compact, router, access]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (compact) return;
    const id = setInterval(() => refresh(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh, compact]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("dashboard:appointments-updated", { detail: appointments }));
  }, [appointments]);

  return (
    <>
      <Card id="agenda-de-hoy" className={`scroll-mt-28 border-border shadow-none ${compact ? "@min-[880px]:min-h-[430px]" : ""}`}>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <CardTitle className="text-lg font-semibold"><h2 className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-5 text-primary" />Agenda de hoy</h2></CardTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{capitalized}</span>
            {access?.capabilities.finance && !compact && <DailyCloseSheet />}
            <button
              onClick={() => refresh(false)}
              disabled={polling}
              aria-label="Actualizar ahora"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${polling ? "animate-spin motion-reduce:animate-none" : ""}`} />
              <span className="text-xs">
                {polling ? "Actualizando…" : `${formatTimeSince(lastUpdated)}`}
              </span>
            </button>
          </div>
        </CardHeader>

        <CardContent className={compact ? "flex min-h-0 flex-1 flex-col" : undefined}>
          {refreshError && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No se pudo actualizar. Se muestran los últimos datos cargados.</p>}
          {agendaAppointments.length > 0 && !compact && <DaySummary appointments={agendaAppointments} prices={prices} />}
          {agendaAppointments.length > 0 && <div role="group" aria-label="Filtros de la agenda del día" className="mb-2 flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <button type="button" onClick={() => changeFilter("all")} aria-pressed={selectedFilter === "all"} className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Todas las citas</button>
            <button type="button" onClick={() => changeFilter("review")} aria-pressed={selectedFilter === "review"} className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedFilter === "review" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Por revisar ({attentionCount})</button>
          </div>}
          {groupLabel && <p role="status" className="mb-3 text-sm font-semibold text-primary">Mostrando: {groupLabel.toLocaleLowerCase("es-CO")}</p>}
          {agendaAppointments.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-5">
              <div>
                <p className="text-sm font-semibold text-foreground">No hay citas para hoy</p>
                <p className="text-sm text-muted-foreground">{access?.capabilities.schedule ? "Puedes agendar una cita manualmente." : "Las citas de tu área aparecerán aquí."}</p>
              </div>
              {access?.capabilities.schedule && <Link prefetch={false} href={homeHref("/dashboard/calendar?new=1", tenant)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">Nueva cita</Link>}
            </div>
          ) : visibleAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{groupLabel ? `No hay citas en «${groupLabel}» ahora.` : "No hay citas que requieran revisión ahora."}</p>
          ) : (
            <ul className="divide-y" aria-label="Citas de la agenda">
              {pagination.appointments.map((appt) => (
                <li key={appt.id} className="grid min-w-0 grid-cols-1 gap-x-3 py-2 transition-colors hover:bg-muted/40 focus-within:bg-muted/40 xl:grid-cols-[minmax(0,1fr)_14rem]">
                  <button type="button" onClick={() => { setStartInPriceEdit(false); setSelected(appt); }} aria-label={`Abrir cita de ${appt.petName}, ${formatColombiaTime(appt.date)}`} className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-lg px-1 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[5.5rem_minmax(0,1fr)_7.5rem_1rem] sm:items-center sm:px-3">
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums text-foreground"><time dateTime={appt.date}>{formatColombiaTime(appt.date)}</time></span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 wrap-anywhere text-base font-semibold text-foreground">{getPetEmoji(appt.petType)} {appt.petName}</span>
                        <span className="min-w-0 wrap-anywhere text-sm text-muted-foreground">{appt.clientName ?? appt.clientPhone}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{appt.serviceName ?? formatService(appt.serviceType)}</span>
                        <span className={!appt.staffName && !["cancelled", "no_show"].includes(appt.status) ? "font-medium text-amber-700" : ""}>Profesional: {appt.staffName ?? "Sin asignar"}</span>
                        </span>
                      {prices && <AppointmentAmounts appointment={appt} />}
                    </span>
                    <Badge variant="outline" className={`col-start-2 justify-self-start sm:col-start-auto sm:justify-self-center ${statusBadgeClass(appt.status)}`}>{formatStatus(appt.status)}</Badge>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-2 px-1 pb-2 sm:px-3 xl:py-2 [&_a]:min-h-11 [&_button]:min-h-11">
                    <AppointmentQuickActions appointment={appt} onUpdated={updated => { setAppointments(current => current.map(value => value.id === updated.id ? updated : value)); if (compact) router.refresh(); }} />
                    {access?.capabilities.appointmentPrice && isGroomingAppointment(appt) && appt.finalPrice === null && !["completed", "cancelled", "no_show"].includes(appt.status) && <button type="button" onClick={() => { setStartInPriceEdit(true); setSelected(appt); }} className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-amber-700">Definir precio</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
            <p className="text-xs text-muted-foreground" aria-live="polite">{pagination.pages > 1 ? `${pagination.start}–${pagination.end} de ${pagination.total} citas en este filtro` : `${pagination.total} citas en este filtro`}</p>
            {pagination.pages > 1 && <nav aria-label="Páginas de la agenda de hoy" className="flex flex-wrap items-center gap-2 [&_button]:min-h-11">
              <Button variant="outline" disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)} aria-label="Página anterior de citas">Anterior</Button>
              <span className="text-xs text-muted-foreground">Página {pagination.page} de {pagination.pages}</span>
              <Button variant="outline" disabled={pagination.page === pagination.pages} onClick={() => setPage(pagination.page + 1)} aria-label="Página siguiente de citas">Siguiente</Button>
            </nav>}
            {compact && <Link prefetch={false} href={homeHref("/dashboard/calendar", tenant)} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">Abrir agenda completa</Link>}
          </div>
        </CardContent>
      </Card>

      {selected && <AppointmentDetailDialog appointment={selected} startInPriceEdit={startInPriceEdit} onClose={() => { setSelected(null); setStartInPriceEdit(false); }} onUpdated={(updated) => {
        setSelected(updated);
        setAppointments((current) => current.map((appointment) => appointment.id === updated.id ? updated : appointment));
        if (compact) router.refresh();
      }} />}
    </>
  );
}
