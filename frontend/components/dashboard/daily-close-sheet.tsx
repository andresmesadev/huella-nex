"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { proxyUrl } from "@/lib/api";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type StaffBreakdown = {
  staffId: string | null;
  staffName: string;
  count: number;
  revenue: number;
  staffShare: number;
  businessShare: number;
};

type DailyCloseSummary = {
  date: string;
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    pending: number;
  };
  commissions: {
    count: number;
    totalRevenue: number;
    totalStaffShare: number;
    totalBusinessShare: number;
    byStaff: StaffBreakdown[];
  };
  missingCommissionsCount: number;
};

// Advertencias con el color semántico del tema (contraste AA).
const WARN = "text-warning";

function Row({ label, value, highlight = false, warn = false }: {
  label: string; value: string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className={`text-sm ${warn ? `${WARN} font-medium` : "text-muted-foreground"}`}>{label}</dt>
      <dd className={`text-sm font-medium tabular-nums ${highlight ? "text-base font-bold text-foreground" : warn ? WARN : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

function Divider() {
  return <div className="my-2 border-t border-border" />;
}

export function DailyCloseSheet() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailyCloseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(proxyUrl("/api/dashboard/daily-close"), { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el resumen del día.");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el resumen del día.");
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  const dateLabel = data
    ? new Date(`${data.date}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="min-h-11 border-primary/40 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary">
          Resumen del día
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md flex-col overflow-hidden border-border bg-background shadow-xl">
        <DialogHeader className="shrink-0 border-border px-5 pb-3 pt-5 pr-12">
          <DialogTitle className="text-base font-semibold">Resumen del día</DialogTitle>
          <DialogDescription className="text-xs first-letter:uppercase">
            {dateLabel ?? "Citas y comisiones registradas hoy."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-busy={loading}>
          {loading && (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">Calculando el resumen…</p>
          )}

          {error && !loading && (
            <div role="alert" className="space-y-3 py-6 text-center text-sm text-red-800">
              <p>{error}</p>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => void load()}>Reintentar</Button>
            </div>
          )}

          {data && !loading && !error && (
            <>
              <section aria-labelledby="daily-close-appointments">
                <SectionTitle><span id="daily-close-appointments">Citas</span></SectionTitle>
                <dl>
                  <Row label="Total del día" value={String(data.appointments.total)} />
                  <Row label="Completadas" value={String(data.appointments.completed)} />
                  {data.appointments.cancelled > 0 && <Row label="Canceladas" value={String(data.appointments.cancelled)} />}
                  {data.appointments.noShow > 0 && <Row label="No asistió" value={String(data.appointments.noShow)} />}
                  {data.appointments.pending > 0 && <Row label="Pendientes aún" value={String(data.appointments.pending)} warn />}
                </dl>
              </section>

              <Divider />

              <section aria-labelledby="daily-close-revenue">
                <SectionTitle><span id="daily-close-revenue">Servicios con comisión</span></SectionTitle>
                {data.commissions.count === 0 ? (
                  <p className="py-1 text-sm text-muted-foreground">Sin comisiones registradas hoy.</p>
                ) : (
                  <dl>
                    <Row label="Total facturado" value={COP.format(data.commissions.totalRevenue)} highlight />
                    <Row label="Parte del negocio" value={COP.format(data.commissions.totalBusinessShare)} />
                    <Row label="Parte del equipo" value={COP.format(data.commissions.totalStaffShare)} />
                  </dl>
                )}
              </section>

              {data.commissions.byStaff.length > 0 && (
                <>
                  <Divider />
                  <section aria-labelledby="daily-close-staff">
                    <SectionTitle><span id="daily-close-staff">Por profesional</span></SectionTitle>
                    <ul className="space-y-3">
                      {data.commissions.byStaff.map((s) => (
                        <li key={s.staffId ?? "__unassigned__"}>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${!s.staffId ? WARN : "text-foreground"}`}>
                              {s.staffName}{!s.staffId && <span className="sr-only"> (sin profesional asignado)</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.count} {s.count === 1 ? "cita" : "citas"}</span>
                          </div>
                          <dl>
                            <div className="mt-0.5 flex items-center justify-between">
                              <dt className="text-xs text-muted-foreground">Comisión</dt>
                              <dd className="text-xs font-medium tabular-nums">{COP.format(s.staffShare)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-muted-foreground">Negocio</dt>
                              <dd className="text-xs font-medium tabular-nums">{COP.format(s.businessShare)}</dd>
                            </div>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {data.missingCommissionsCount > 0 && (
                <>
                  <Divider />
                  <p className={`flex items-start gap-2 text-sm ${WARN}`}>
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="sr-only">Advertencia: </span>
                      {data.missingCommissionsCount} cita{data.missingCommissionsCount > 1 ? "s" : ""} de peluquería completada{data.missingCommissionsCount > 1 ? "s" : ""} sin precio registrado.
                      La comisión no pudo calcularse para {data.missingCommissionsCount > 1 ? "ellas" : "ella"}.
                    </span>
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-border px-5 py-4">
          <Button variant="outline" className="min-h-11 w-full" onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
