"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/use-tenant";
import { ReportActions } from "@/components/dashboard/pos/report-actions";
import { reportComparisonText, reportDetailUrl, validReportDates, type ReportComparison, type ReportSelection } from "@/lib/pos-reports";
import { ChevronLeft, ChevronRight, RotateCcw, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReportSection, useReportData } from "@/components/dashboard/pos/report-section";
import { KIND_LABELS, METHOD_LABELS, REPORT_MONTHS, parseActivity, parseBreakdown, parseReportSummary, parseRevenueMonths, parseServices, reportBarHeight, reportDate, reportMoney, reportRange, type MetricPoint, type ReportPeriod } from "@/lib/pos-reports";

function Comparison({ metric, money = false }: { metric: MetricPoint; money?: boolean }) {
  const Icon = metric.delta > 0 ? ArrowUpRight : metric.delta < 0 ? ArrowDownRight : Minus;
  return <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-current"><Icon aria-hidden className="h-3.5 w-3.5" />
    {metric.pct === null ? "Sin base porcentual" : `${metric.pct > 0 ? "+" : ""}${metric.pct}%`}
    <span>· {metric.delta > 0 ? "+" : ""}{money ? reportMoney(metric.delta) : metric.delta} vs. período anterior</span>
  </p>;
}

export function ReportsView({ initial }: { initial?: ReportSelection }) {
  const tenant = useTenant();
  const [period, setPeriod] = useState<ReportPeriod>(initial?.period ?? "month");
  const [offset, setOffset] = useState(initial?.offset ?? 0);
  const [comparison, setComparison] = useState<ReportComparison>(initial?.comparison ?? "full");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const [from, setFrom] = useState(initial?.from ?? `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(initial?.to ?? today);
  const [customRange, setCustomRange] = useState({ from: initial?.from ?? `${today.slice(0, 7)}-01`, to: initial?.to ?? today });
  const [rangeError, setRangeError] = useState("");
  const query = new URLSearchParams(period === "custom" ? { period, offset: "0", comparison: "full", ...customRange } : { period, offset: String(offset), comparison }).toString();
  const summary = useReportData(`reports/summary?${query}`, parseReportSummary);
  const breakdown = useReportData(`reports/breakdown?${query}`, parseBreakdown);
  const services = useReportData(`reports/services?${query}`, parseServices);
  const annual = useReportData(`reports/revenue-by-month?${query}`, parseRevenueMonths);
  const activity = useReportData("reports/clients-retention", parseActivity);
  const periodName = { week: "Semana", month: "Mes", year: "Año", custom: "Rango" }[period];
  const dates = summary.data ?? breakdown.data;

  return <div className="space-y-6">
    <section aria-label="Período de reportes" className="rounded-2xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><h2 className="text-2xl font-semibold">Reportes del negocio</h2><p className="mt-1 text-sm text-muted-foreground">Consulta los resultados de tu establecimiento. Importes en COP y fechas en hora de Colombia.</p></div>
        <div role="group" aria-label="Tipo de período" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex sm:w-auto">
          {(["week", "month", "year", "custom"] as const).map(value => <Button key={value} variant={period === value ? "default" : "ghost"} className="min-h-11" aria-pressed={period === value} onClick={() => { setPeriod(value); setOffset(0); setRangeError(""); }}>{ { week: "Semana", month: "Mes", year: "Año", custom: "Por fechas" }[value]}</Button>)}
        </div>
      </div>
      {period === "custom" ? <div className="mt-5 space-y-3 border-t pt-5">
        <form aria-label="Rango de fechas del reporte" noValidate className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={event => {
          event.preventDefault();
          if (!validReportDates(from, to) || from > today) { setRangeError("Selecciona fechas válidas: Desde debe ser hoy o antes, Hasta no puede ser anterior y el rango admite hasta 366 días."); return; }
          setCustomRange({ from, to }); setRangeError("");
        }}>
          <label className="min-w-0 text-sm font-medium">Desde<Input className="mt-2 h-11 min-w-0" type="date" value={from} max={today} aria-invalid={!!rangeError} aria-describedby="report-range-help" onChange={event => setFrom(event.target.value)} /></label>
          <label className="min-w-0 text-sm font-medium">Hasta<Input className="mt-2 h-11 min-w-0" type="date" value={to} aria-invalid={!!rangeError} aria-describedby="report-range-help" onChange={event => setTo(event.target.value)} /></label>
          <Button type="submit" className="min-h-11">Consultar fechas</Button>
        </form>
        <p id="report-range-help" className="text-xs text-muted-foreground">Incluye ambos días. Máximo 366 días por consulta; se compara con el rango anterior de igual duración.</p>
        {rangeError && <p role="alert" className="text-sm text-destructive">{rangeError}</p>}
        {dates && <p className="text-sm text-muted-foreground">Rango consultado: {reportRange(dates.rangeStart, dates.rangeEnd)}</p>}
      </div> : <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
        <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label={`${periodName} anterior`} disabled={offset <= -1200} onClick={() => setOffset(value => value - 1)}><ChevronLeft /></Button>
        <div className="min-w-0 flex-1"><p className="font-semibold">{periodName} {offset === 0 ? "actual" : `anterior (${Math.abs(offset)})`}</p><p className="mt-1 text-sm text-muted-foreground">{dates ? reportRange(dates.rangeStart, dates.rangeEnd) : summary.error && breakdown.error ? "Las fechas no están disponibles. Reintenta la consulta." : "Consultando fechas del período…"}</p></div>
        <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label={`${periodName} siguiente`} disabled={offset === 0} onClick={() => setOffset(value => Math.min(0, value + 1))}><ChevronRight /></Button>
        {offset !== 0 && <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setOffset(0)}><RotateCcw />Volver al período actual</Button>}
      </div>}
      {period !== "custom" && <label className="mt-5 block text-sm font-medium">Comparar con<select className="mt-2 h-11 w-full min-w-0 rounded-xl border bg-white px-3 sm:max-w-sm" value={comparison} onChange={event => setComparison(event.target.value as ReportComparison)}><option value="full">Período anterior completo</option><option value="equivalent">Los mismos días del calendario</option></select></label>}
      <ReportActions summary={summary.data} breakdown={breakdown.data} loading={summary.loading || breakdown.loading} refresh={() => { summary.retry(); breakdown.retry(); services.retry(); annual.retry(); activity.retry(); }} />
    </section>

    <ReportSection title="Resumen del período" description="Ingresos y gastos activos. Los movimientos anulados quedan excluidos." result={summary}>
      {data => <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><p className="font-medium">{reportRange(data.rangeStart, data.rangeEnd)}</p><p className="text-muted-foreground">Actualizado: {new Date(data.asOf).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([{ label: "Ingresos", point: data.revenue, detail: `${data.transactionCount} cobros activos`, tone: "border-emerald-200 bg-emerald-50/60 text-emerald-800" }, { label: "Gastos", point: data.expenses, detail: "Gastos registrados", tone: "border-rose-200 bg-rose-50/60 text-rose-800" }, { label: "Parte de los profesionales", point: data.professionalShare, detail: "Participación generada por servicios repartidos", tone: "border-amber-200 bg-amber-50/60 text-amber-900" }, { label: "Saldo tras reservar profesionales", point: data.afterProfessionalShare, detail: "Ingresos − gastos − participación generada", tone: "border-primary/20 bg-primary/5 text-primary" }]).map((card, index) => <div key={card.label} className={`min-w-0 rounded-xl border p-5 ${card.tone}`}><h4 className="font-medium">{card.label}</h4><p className="mt-3 [overflow-wrap:anywhere] text-2xl sm:text-3xl font-semibold tabular-nums">{reportMoney(card.point.value)}</p><p className="mt-2 text-xs">{card.detail}</p><Comparison metric={card.point} money />{index < 2 && <Button asChild variant="outline" size="sm" className="mt-4 min-h-11 bg-white"><Link href={reportDetailUrl(data, index === 0 ? "income" : "expense", tenant)}>Ver {index === 0 ? "ingresos" : "gastos"}</Link></Button>}</div>)}
        </div>
        <p className="text-sm text-muted-foreground">Antes de reservar profesionales: {reportMoney(data.difference.value)}. La base de caja no suma ingresos. La participación se lee de las comisiones guardadas; no confirma entregas de dinero ni concilia gastos manuales de nómina. El saldo no equivale al efectivo físico ni a la utilidad contable.</p>
        {data.professionals.length > 0 && <div className="rounded-xl border p-4"><h4 className="font-semibold">Desglose por profesional</h4><ul className="mt-2 divide-y text-sm">{data.professionals.map(row => <li key={row.staffId ?? 'unassigned'} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3"><span className="[overflow-wrap:anywhere]">{row.name} · {row.count} servicios</span><strong className="text-right tabular-nums">{reportMoney(row.amount)}</strong></li>)}</ul></div>}
        <div className="rounded-xl bg-muted/60 p-4 text-sm"><p className="font-medium">Comparación: {reportRange(data.previousRangeStart, data.previousRangeEnd)}</p><p className="mt-1 text-muted-foreground">{reportComparisonText(data)}</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Citas vigentes", point: data.appointments, note: "Excluye canceladas y no asistidas" }, { label: "Clientes nuevos", point: data.newClients, note: "Registrados durante el período" }, { label: "Mascotas atendidas", point: data.petsAttended, note: "Mascotas distintas con expediente vinculado y cita completada" }].map(card => <div key={card.label} className="rounded-xl border p-4"><h4 className="text-sm font-medium">{card.label}</h4><p className="mt-2 text-2xl font-semibold tabular-nums">{card.point.value}</p><p className="mt-1 text-xs text-muted-foreground">{card.note}</p><Comparison metric={card.point} /></div>)}
        </div>
      </div>}
    </ReportSection>

    <ReportSection title="Composición de los ingresos" description="Medios de pago y artículos de los cobros activos del período seleccionado." result={breakdown}>
      {data => <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{reportRange(data.rangeStart, data.rangeEnd)} · {data.count} cobros · <strong className="text-foreground">{reportMoney(data.total)}</strong></p>
        <div className="grid gap-6 xl:grid-cols-2">
          <div><h4 className="mb-3 font-medium">Medios de pago</h4><div className="overflow-x-auto"><table className="w-full text-sm [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere]"><thead className="border-b text-left text-muted-foreground"><tr><th className="pb-3 font-medium">Medio</th><th className="pb-3 text-right font-medium">Cobros</th><th className="pb-3 text-right font-medium">Importe</th></tr></thead><tbody>{data.byMethod.map(row => <tr key={row.method} className="border-b last:border-0"><th scope="row" className="py-3 text-left font-normal">{row.method === "review" && row.count > 0 ? <Link className="font-medium text-primary underline underline-offset-4" href={reportDetailUrl(data, "review", tenant)}>Por revisar: ver cobros</Link> : METHOD_LABELS[row.method]}</th><td className="px-2 text-right tabular-nums">{row.count}</td><td className="text-right tabular-nums">{reportMoney(row.total)}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted-foreground">Por revisar: cobros de citas sin método confirmado por un responsable. Sin identificar: medios históricos fuera del catálogo actual.</p></div>
          <div><h4 className="mb-3 font-medium">Productos y servicios</h4><div className="overflow-x-auto"><table className="w-full text-sm [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere]"><thead className="border-b text-left text-muted-foreground"><tr><th className="pb-3 font-medium">Tipo</th><th className="pb-3 text-right font-medium">Unidades</th><th className="pb-3 text-right font-medium">Importe</th></tr></thead><tbody>{data.byKind.map(row => <tr key={row.kind} className="border-b last:border-0"><th scope="row" className="py-3 text-left font-normal">{KIND_LABELS[row.kind]}</th><td className="px-2 text-right tabular-nums">{row.quantity}</td><td className="text-right tabular-nums">{reportMoney(row.total)}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted-foreground">La clasificación utiliza los datos guardados en cada artículo. Los registros antiguos sin tipo se conservan como sin clasificación.</p>{data.unallocatedTotal !== 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Diferencia sin detalle de artículos: {reportMoney(data.unallocatedTotal)}. Se conserva el importe original del cobro.</p>}</div>
        </div>
      </div>}
    </ReportSection>
    {/* Annual and operational context stay visibly separate from the period totals. */}
    <ReportSection title="Ingresos por mes" description="Contexto anual: el año en el que comienza el período seleccionado." result={annual}>
      {months => <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">Año {months[0].year}</h4><p className="text-sm text-muted-foreground">Total del año: <strong className="text-foreground">{reportMoney(months.reduce((sum, row) => sum + Math.round(row.revenue * 100), 0) / 100)}</strong></p></div>
        {months.every(row => row.revenue === 0) ? <p className="rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">No hay ingresos activos registrados en este año.</p> : <div aria-hidden="true" className="flex items-end gap-1 sm:gap-3">{months.map(row => <div key={row.month} className="min-w-0 flex-1"><div className="flex h-[150px] items-end"><div className="w-full rounded-t bg-primary/75" style={{ height: reportBarHeight(row.revenue, Math.max(...months.map(value => value.revenue))) }} /></div><p className="mt-2 text-center text-[10px] text-muted-foreground sm:text-xs">{REPORT_MONTHS[row.month - 1]}</p></div>)}</div>}
        <details className="rounded-xl border p-4" open><summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Ver importes exactos por mes</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Ingresos activos por mes del año {months[0].year}</caption><thead className="border-b"><tr><th className="pb-2 text-left font-medium">Mes</th><th className="pb-2 text-right font-medium">Ingresos (COP)</th></tr></thead><tbody>{months.map(row => <tr key={row.month} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-normal">{REPORT_MONTHS[row.month - 1]} {row.year}</th><td className="py-2 text-right tabular-nums">{reportMoney(row.revenue)}</td></tr>)}</tbody></table></div></details>
        <p className="text-xs text-muted-foreground">Los meses futuros permanecen en cero hasta que haya cobros registrados.</p>
      </div>}
    </ReportSection>

    <div className="grid items-start gap-6 xl:grid-cols-2">
      <ReportSection title="Servicios más atendidos" description="Hasta diez servicios con citas completadas en el período seleccionado." result={services}>
        {rows => rows.length === 0 ? <p className="text-sm text-muted-foreground">No hay citas completadas en este período.</p> : <ol className="space-y-4">{rows.map((row, index) => <li key={row.name}><div className="flex items-start justify-between gap-4 text-sm"><span className="min-w-0 [overflow-wrap:anywhere]">{index + 1}. {row.name}</span><strong className="shrink-0 tabular-nums">{row.count} {row.count === 1 ? "atención" : "atenciones"}</strong></div><div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/60" style={{ width: `${row.count / Math.max(rows[0].count, 1) * 100}%` }} /></div></li>)}</ol>}
      </ReportSection>
      <ReportSection title="Actividad de clientes" description="Últimos seis meses hasta el mes actual, independiente del período seleccionado." result={activity}>
        {rows => <div><p className="mb-4 text-sm text-muted-foreground">{rows[0].label} – {rows[rows.length - 1].label}. Son clientes registrados y cantidad de citas; no mide retención.</p><div className="overflow-x-auto"><table className="w-full text-sm [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere]"><thead className="border-b text-left text-muted-foreground"><tr><th className="pb-3 font-medium">Mes</th><th className="pb-3 text-right font-medium">Clientes nuevos</th><th className="pb-3 pl-3 text-right font-medium">Citas vigentes</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-b last:border-0"><th scope="row" className="py-3 text-left font-normal">{row.label}</th><td className="text-right tabular-nums">{row.newClients}</td><td className="pl-3 text-right tabular-nums">{row.returningVisits}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted-foreground">Las citas excluyen canceladas y no asistidas. El mes actual está en curso.</p></div>}
      </ReportSection>
    </div>
    <p className="text-xs text-muted-foreground">Los seguimientos y recordatorios se consultan desde Inicio y el expediente de la mascota.{dates && ` Última consulta: ${reportDate(dates.asOf)}.`}</p>
  </div>;
}
