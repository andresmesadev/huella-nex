const { resolveSaleServiceTerms } = require('./sale-service-terms');
const { calculateCommissionSplit } = require('../../domain/rules/commission-calculation.rules');
const { CommissionDayClosedError, CommissionInActiveSettlementError, InvalidCommissionInputError } = require('../../domain/errors');
const { civilDateKey } = require('../../../shared/business-day');

function createPrepareSaleConceptCorrection(deps) {
  return async function prepare({ tenantId, transactionItemId, serviceId, staffId, amount, paidAt, activeModules, component = null, appointmentId, completedAt }, ctx) {
    if (!tenantId || !ctx?.tx) throw new Error('Concept correction requires a scoped transaction');
    if (!Number.isFinite(amount) || amount < 0) throw new InvalidCommissionInputError('Importe de línea inválido.');
    const primary = component === 'service', transport = component === 'transport';
    if (primary && (!appointmentId || !Number.isFinite(new Date(completedAt).getTime()))) throw new InvalidCommissionInputError('La comisión principal necesita una cita completada.');
    const previous = primary
      ? await deps.commissionRepository.lockByAppointment(tenantId, appointmentId, ctx)
      : await deps.commissionRepository.findByItem(tenantId, transactionItemId, ctx);
    if (transport && previous) throw new InvalidCommissionInputError('El domicilio no puede tener una comisión de servicio. Revisa sus antecedentes.');
    const last = primary && !previous ? await deps.commissionRepository.lastByAppointment(tenantId, appointmentId, ctx) : previous;
    const commissionDate = primary ? new Date(last?.completedAt ?? completedAt) : paidAt;
    const ids = [...new Set([previous?.staffId, staffId].filter(Boolean))].sort();
    for (const id of ids) await deps.staffFinanceGate.acquire(tenantId, id, ctx);
    const terms = transport ? { category: { appliesCommissionSplit: false }, splitRate: null }
      : await resolveSaleServiceTerms({ tenantId, serviceId, staffId, activeModules }, ctx, deps);
    const dates = [paidAt, ...(primary ? [commissionDate] : []), ...(previous ? [previous.completedAt] : [])];
    for (const date of dates) {
      await deps.businessDayGate.acquire(tenantId, civilDateKey(date), ctx);
      if (await deps.dailyCloseReader.findByCivilDay(tenantId, date, ctx)) throw new CommissionDayClosedError(civilDateKey(date));
    }
    for (const [id, date] of [[previous?.staffId, previous?.completedAt], [terms.category.appliesCommissionSplit ? staffId : null, commissionDate]]) {
      if (!id) continue;
      const covering = await deps.settlementCoverageReader.findActiveCovering(id, date, ctx);
      if (covering) throw new CommissionInActiveSettlementError(transactionItemId, covering.id);
    }
    const appliesCommissionSplit = Boolean(terms.category.appliesCommissionSplit);
    const split = appliesCommissionSplit ? calculateCommissionSplit(amount, terms.splitRate) : { staffShare: 0, businessShare: amount };
    return { previous, next: { appliesCommissionSplit, staffId: staffId ?? null, serviceId, splitRate: appliesCommissionSplit ? Number(terms.splitRate) : null, staffShare: Number(split.staffShare), businessShare: Number(split.businessShare), ...(primary ? { completedAt: commissionDate } : {}) } };
  };
}
module.exports = { createPrepareSaleConceptCorrection };
