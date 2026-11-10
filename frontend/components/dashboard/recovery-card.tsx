import type { RecoveryMetrics } from "@/lib/customer-followup";
export function RecoveryCard({ metrics, grooming = true }: { metrics: RecoveryMetrics; grooming?: boolean }) {
  const stats = [
    ...(grooming ? [{ title: "Clientes contactados", value: metrics.reactivation.contacted, detail: "Con al menos un contacto de reactivación registrado." }, { title: "Clientes que regresaron", value: metrics.reactivation.reactivated, detail: "Con una cita completada o una visita de peluquería posterior al último contacto." }] : []),
    { title: "Pendientes con recordatorio", value: metrics.nextActions.reminded, detail: "Acciones del expediente con un envío de recordatorio registrado." },
    { title: "Pendientes realizados", value: metrics.nextActions.closed, detail: "De las acciones con recordatorio, las marcadas como realizadas." },
  ];
  return <section className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6"><div><h2 className="text-xl font-semibold">Resultados del seguimiento</h2><p className="mt-2 text-sm text-muted-foreground">Acumulado histórico del establecimiento. Estos datos muestran actividad registrada; no atribuyen un regreso al mensaje enviado.</p></div><div className="divide-y divide-border">{stats.map(s => <div key={s.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-4"><h3 className="text-sm font-semibold">{s.title}</h3><p className="row-span-2 text-xl font-semibold tabular-nums text-primary">{s.value}</p><p className="text-sm text-muted-foreground">{s.detail}</p></div>)}</div><p className="text-sm text-muted-foreground">Un cero significa que aún no hay actividad registrada para ese indicador. Puedes revisar cada mascota desde Pendientes.</p></section>;
}
