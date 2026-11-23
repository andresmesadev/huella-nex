import { Calendar } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";

import { auth } from "@/auth";
import { apiUrl, makeServerHeaders } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { type TodayAppointment } from "@/lib/appointments";
import { previewWeekData } from "@/lib/calendar-preview";
import { agendaGridRange, type BusinessHours } from "@/lib/agenda-display";
import type { ClientDetail } from "@/lib/clients";
import { ReadFailureNotice } from "@/components/dashboard/read-failure-notice";
import { readFailure, type ReadFailure } from "@/lib/read-failure";

type WeekData = {
  weekStart: string;
  weekEnd: string;
  mondayYmd: string;
  appointments: TodayAppointment[];
};

type PageProps = {
  searchParams: Promise<{ date?: string; tenant?: string; preview?: string; client?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  await connection();
  const { date, tenant, preview, client } = await searchParams;
  const isPreview = process.env.NODE_ENV === "development" && preview === "1" && !client;

  let data: WeekData | null = isPreview ? previewWeekData(date) : null;
  let businessHours: BusinessHours | null = null;
  let activeModules: string[] = [];
  let owner: { id: string; name: string } | undefined;
  let ownerError = false;
  let failure: ReadFailure = "unavailable";
  let profileMissing = false;

  if (!isPreview) {
    const session = await auth();
    const headers = makeServerHeaders(session, tenant);
    const url = new URL(apiUrl("/api/dashboard/appointments/week"));
    if (date) url.searchParams.set("date", date);

    try {
      const [apptRes, profileRes, clientRes] = await Promise.all([
        fetch(url.toString(), { cache: "no-store", headers }),
        fetch(apiUrl("/api/dashboard/tenant/profile"), { cache: "no-store", headers }),
        client ? fetch(apiUrl(`/api/dashboard/clients/${encodeURIComponent(client)}`), { cache: "no-store", headers }) : Promise.resolve(null),
      ]);
      if (apptRes.ok) data = await apptRes.json();
      else failure = readFailure(apptRes.status);
      if (!profileRes.ok) profileMissing = true;
      if (profileRes.ok) {
        const profile = await profileRes.json();
        businessHours = profile.businessHours ?? null;
        activeModules = profile.activeModules ?? [];
      }
      if (client) {
        if (clientRes?.ok) {
          const detail = await clientRes.json() as ClientDetail;
          if (detail.id === client) owner = { id: detail.id, name: detail.name || detail.phone || "Propietario" };
        }
        ownerError = !owner;
      }
    } catch { if (client) ownerError = true; failure = readFailure(null); /* La vista mostrará un error de carga. */ }
  }

  const { hourStart, hourEnd } = agendaGridRange(businessHours, activeModules);
  const retryParams = new URLSearchParams();
  if (date) retryParams.set("date", date);
  if (tenant) retryParams.set("tenant", tenant);
  if (client) retryParams.set("client", client);
  const unfilteredParams = new URLSearchParams(retryParams);
  unfilteredParams.delete("client");
  const previewParams = new URLSearchParams(retryParams);
  previewParams.set("preview", "1");

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Consulta las citas por día, semana, mes o profesional. Horarios expresados en hora de Colombia."
        icon={Calendar}
        tint="bg-teal-100 text-teal-700"
      />
      {isPreview && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
          <p><strong>Vista de ejemplo.</strong> Las citas y los nombres son ficticios; no se muestran datos reales.</p>
          <Link href={`/dashboard/calendar${retryParams.size ? `?${retryParams.toString()}` : ""}`} className="font-semibold underline underline-offset-2">Volver a la agenda real</Link>
        </div>
      )}
      {ownerError ? (
        <div role="alert" className="rounded-2xl border border-warning-border bg-warning-surface p-6 text-sm text-amber-950"><h2 className="font-semibold">No se pudo cargar la agenda de ese propietario</h2><p className="mt-1">Comprueba el establecimiento seleccionado o vuelve a abrir la ficha del cliente.</p><div className="mt-3 flex flex-wrap gap-4"><Link href={`/dashboard/calendar?${retryParams}`} className="inline-flex min-h-11 items-center font-semibold underline">Reintentar</Link><Link href={`/dashboard/calendar${unfilteredParams.size ? `?${unfilteredParams}` : ""}`} className="inline-flex min-h-11 items-center font-semibold underline">Ver toda la agenda</Link></div></div>
      ) : data ? (
        <>
          {profileMissing && !isPreview && (
            <p role="status" className="mb-4 rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm text-amber-950">
              No se pudieron cargar el horario y las áreas del negocio. La cuadrícula muestra el horario predeterminado; <Link href={`/dashboard/calendar${retryParams.size ? `?${retryParams.toString()}` : ""}`} className="font-semibold underline underline-offset-2">recarga la agenda</Link> para intentarlo de nuevo.
            </p>
          )}
          <WeekCalendar key={client ?? "all"} data={data} hourStart={hourStart} hourEnd={hourEnd} preview={isPreview} owner={owner} />
        </>
      ) : (
        <ReadFailureNotice title="No se pudo cargar la agenda" reason={failure} retryHref={`/dashboard/calendar${retryParams.size ? `?${retryParams.toString()}` : ""}`}>
          {process.env.NODE_ENV === "development" && (
            <Link href={`/dashboard/calendar?${previewParams.toString()}`} className="inline-flex min-h-11 items-center rounded-lg border border-amber-300 bg-white px-4 font-semibold hover:bg-amber-100">
              Ver agenda de ejemplo
            </Link>
          )}
        </ReadFailureNotice>
      )}
    </div>
  );
}
