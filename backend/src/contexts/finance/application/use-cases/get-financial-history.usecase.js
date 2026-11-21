const { summarizeDay, summarizeCommissions } = require("../../domain/rules/financial-summary.rules");
const { enumerateDates } = require("../../domain/rules/period-completeness.rules");
// Día civil del negocio (ADR 008) — misma frontera que GenerateDailyCloseUseCase.
const { civilDayBounds, civilDateKey } = require("../../../shared/business-day");

/**
 * GetFinancialHistoryUseCase — Consulta.
 * Implementa "Consultar Historial Financiero". Para días ya cerrados,
 * devuelve el DailyClose oficial; para días sin cerrar, calcula una vista
 * preliminar reutilizando exactamente financial-summary.rules.js — mismo
 * algoritmo que GenerateDailyCloseUseCase, nunca un segundo cálculo
 * (sistema-operativo-finanzas.md, caso de uso 7).
 *
 * @param {Object} deps
 * @param {import("../ports/daily-close-repository.port").DailyCloseRepositoryPort} deps.dailyCloseRepository
 * @param {import("../ports/transaction-repository.port").TransactionRepositoryPort} deps.transactionRepository
 * @param {import("../ports/expense-repository.port").ExpenseRepositoryPort} deps.expenseRepository
 * @param {import("../ports/commission-reader.port").CommissionReaderPort} deps.commissionReader
 */
function createGetFinancialHistoryUseCase({
  dailyCloseRepository,
  transactionRepository,
  expenseRepository,
  commissionReader,
}) {
  return async function execute({ tenantId, rangeStart, rangeEnd }, ctx) {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const expectedDates = enumerateDates(start, end);

    const dailyCloses = await dailyCloseRepository.listByDateRange(tenantId ?? null, start, end, ctx);
    const byDate = new Map(dailyCloses.map((d) => [d.date.toISOString().slice(0, 10), d]));

    const datesWithMissingActivity = expectedDates.filter(ymd => {
      const close = byDate.get(ymd);
      return !close || (Array.isArray(close.staffBreakdown) && close.staffBreakdown.some(row => !row.activity));
    });
    const commissionsByDay = new Map();
    if (datesWithMissingActivity.length) {
      const from = civilDayBounds(datesWithMissingActivity[0]).start;
      const to = civilDayBounds(datesWithMissingActivity.at(-1)).end;
      const commissions = await commissionReader.listByDateRange(tenantId ?? null, from, to, ctx);
      for (const commission of commissions) {
        const date = civilDateKey(commission.completedAt);
        const rows = commissionsByDay.get(date) ?? [];
        rows.push(commission);
        commissionsByDay.set(date, rows);
      }
    }

    const days = await Promise.all(
      expectedDates.map(async (ymd) => {
        const existing = byDate.get(ymd);
        const commissions = commissionsByDay.get(ymd) ?? [];
        if (existing) {
          if (!Array.isArray(existing.staffBreakdown) || existing.staffBreakdown.every(row => row.activity)) {
            return { date: ymd, closed: true, dailyClose: existing };
          }
          const liveByStaff = new Map(summarizeCommissions(commissions).map(row => [row.staffId, row]));
          const staffBreakdown = existing.staffBreakdown.map(row => {
            if (row.activity) return row;
            const live = liveByStaff.get(row.staffId ?? null);
            if (!live || live.count !== row.count || live.staffShare !== Number(row.staffShare) || live.businessShare !== Number(row.businessShare)) return row;
            return { ...row, activity: live.activity };
          });
          return { date: ymd, closed: true, dailyClose: existing, staffBreakdown };
        }

        const { start: dayStart, end: dayEnd } = civilDayBounds(ymd);
        const [charges, expenses] = await Promise.all([
          transactionRepository.listByDateRange(tenantId ?? null, dayStart, dayEnd, ctx),
          expenseRepository.listByDateRange(tenantId ?? null, dayStart, dayEnd, ctx),
        ]);
        const preview = summarizeDay({ charges, expenses, commissions });

        return { date: ymd, closed: false, preview };
      })
    );

    return { days };
  };
}

module.exports = { createGetFinancialHistoryUseCase };
