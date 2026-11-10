// Presentation/read boundaries. Does not create financial closes or change business policy.
const DAY = 86_400_000;
const bogotaDate = now => new Date(now.getTime() - 5 * 3600_000);
function bogotaMonthBounds(year, month) {
  return { start: new Date(Date.UTC(year, month, 1, 5)), end: new Date(Date.UTC(year, month + 1, 1, 5)) };
}
function currentBogotaYearMonth(now = new Date()) {
  const local = bogotaDate(now);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}
function readReportPeriod(query, now = new Date()) {
  const period = query.period ?? 'month';
  const comparison = query.comparison ?? 'full';
  if (!['full', 'equivalent'].includes(comparison)) throw new Error('Selecciona una comparación válida.');
  if (period === 'custom') {
    const civil = value => typeof value === 'string' && /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!civil(query.from) || !civil(query.to) || query.from > query.to) throw new Error('Selecciona fechas válidas; Desde no puede ser posterior a Hasta.');
    const today = bogotaDate(now).toISOString().slice(0, 10);
    const start = new Date(query.from + 'T00:00:00-05:00');
    const end = new Date(new Date(query.to + 'T00:00:00-05:00').getTime() + DAY);
    const duration = end - start;
    if (query.from > today || duration > 366 * DAY) throw new Error('El rango debe comenzar hoy o antes y abarcar como máximo 366 días.');
    if ((query.offset !== undefined && query.offset !== '0') || comparison !== 'full') throw new Error('El rango personalizado se compara con los mismos días inmediatamente anteriores.');
    const prev = { start: new Date(start.getTime() - duration), end: start };
    if (prev.start.getUTCFullYear() < 1000) throw new Error('El período solicitado queda fuera del rango admitido.');
    const current = { start, end }, rangeYear = Number(query.from.slice(0, 4));
    return { period, offset: 0, current, prev, year: rangeYear, asOf: now,
      metadata: { period, offset: 0, comparison: 'full', comparisonClamped: false, rangeStart: start, rangeEnd: end, previousRangeStart: prev.start, previousRangeEnd: prev.end, asOf: now, partial: now < end, year: rangeYear } };
  }
  const raw = query.offset ?? '0';
  if (!['week', 'month', 'year'].includes(period) || typeof raw !== 'string' || !/^-?\d+$/.test(raw)) throw new Error('Selecciona una semana, mes o año válido.');
  const offset = Number(raw);
  if (!Number.isSafeInteger(offset) || offset > 0 || offset < -1200) throw new Error('El período debe ser actual o anterior.');
  const { year, month } = currentBogotaYearMonth(now);
  const bounds = change => {
    if (period === 'month') return bogotaMonthBounds(year, month + change);
    if (period === 'year') return { start: new Date(Date.UTC(year + change, 0, 1, 5)), end: new Date(Date.UTC(year + change + 1, 0, 1, 5)) };
    const local = bogotaDate(now);
    const start = new Date(Date.UTC(year, month, local.getUTCDate() - (local.getUTCDay() + 6) % 7 + change * 7, 5));
    return { start, end: new Date(start.getTime() + 7 * DAY) };
  };
  const current = bounds(offset), prev = bounds(offset - 1);
  const partial = now < current.end;
  let comparisonClamped = false;
  if (comparison === 'equivalent') {
    const local = bogotaDate(now);
    const tomorrow = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 5));
    if (partial) current.end = new Date(Math.min(current.end.getTime(), tomorrow.getTime()));
    const last = bogotaDate(new Date(current.end.getTime() - 1));
    const previousStart = bogotaDate(prev.start);
    let desired;
    if (period === 'week') desired = new Date(prev.start.getTime() + (current.end - current.start));
    else {
      const previousMonth = period === 'year' ? last.getUTCMonth() : previousStart.getUTCMonth();
      const previousYear = previousStart.getUTCFullYear();
      const lastAvailable = new Date(Date.UTC(previousYear, previousMonth + 1, 0)).getUTCDate();
      const day = Math.min(last.getUTCDate(), lastAvailable);
      comparisonClamped = day !== last.getUTCDate();
      desired = new Date(Date.UTC(previousYear, previousMonth, day + 1, 5));
    }
    prev.end = new Date(Math.min(prev.end.getTime(), desired.getTime()));
  }
  if (current.start.getUTCFullYear() < 1000) throw new Error('El período solicitado queda fuera del rango admitido.');
  const rangeYear = bogotaDate(current.start).getUTCFullYear();
  return { period, offset, current, prev, year: rangeYear, asOf: now,
    metadata: { period, offset, comparison, comparisonClamped, rangeStart: current.start, rangeEnd: current.end, previousRangeStart: prev.start, previousRangeEnd: prev.end, asOf: now, partial, year: rangeYear } };
}
function readReportYear(query, now = new Date()) {
  if (query.year === undefined) return readReportPeriod(query, now).year;
  if (typeof query.year !== 'string' || !/^\d{4}$/.test(query.year)) throw new Error('Selecciona un año válido.');
  const year = Number(query.year);
  if (year < 1000 || year > currentBogotaYearMonth(now).year) throw new Error('El año debe ser actual o anterior.');
  return year;
}
const dateRange = bounds => ({ gte: bounds.start, lt: bounds.end });
const cents = value => Math.round(Number(value ?? 0) * 100);
function metric(value, previous, money = false) {
  const val = Number(value ?? 0), prev = Number(previous ?? 0);
  return { value: val, prev, delta: money ? (cents(val) - cents(prev)) / 100 : val - prev, pct: prev > 0 ? Math.round(((val - prev) / prev) * 100) : null };
}
module.exports = { bogotaMonthBounds, currentBogotaYearMonth, readReportPeriod, readReportYear, dateRange, cents, metric };
