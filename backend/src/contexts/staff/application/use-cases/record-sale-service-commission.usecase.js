const { resolveSaleServiceTerms } = require('./sale-service-terms');
const { calculateCommissionSplit } = require('../../domain/rules/commission-calculation.rules');
const { InvalidCommissionInputError, CommissionDayClosedError, CommissionInActiveSettlementError } = require('../../domain/errors');
const { civilDateKey } = require('../../../shared/business-day');

function createRecordSaleServiceCommissionUseCase({ sourceReader, staffRepository, serviceCategoryReader, businessConfigReader, commissionRepository, dailyCloseReader, settlementCoverageReader, businessDayGate, staffFinanceGate }) {
  return async function execute({ tenantId, transactionItemId, serviceId, staffId, historicalReason, activeModules, replacesCommissionId }, ctx) {
    if (!ctx?.tx || !ctx.eventPublisher || !tenantId) throw new Error('Sale commission requires tenant and transaction');
    const item = await sourceReader.lockItem(tenantId, transactionItemId, ctx);
    if (!item || item.itemKind !== 'service' || item.appointmentComponent || item.transaction.status !== 'active' || !item.transaction.paidAt) throw new InvalidCommissionInputError('Solo un servicio adicional pagado puede generar esta comisión.');
    const historical = historicalReason !== undefined;
    if (historical && (typeof historicalReason !== 'string' || !historicalReason.trim())) throw new InvalidCommissionInputError('La vinculación histórica necesita un motivo.');
    if (!historical && (serviceId !== item.serviceId || staffId !== item.performedByStaffId)) throw new InvalidCommissionInputError('La comisión debe corresponder al servicio y profesional del cobro.');
    const { category, splitRate } = await resolveSaleServiceTerms({ tenantId, serviceId, staffId, historical, activeModules }, ctx,
      { sourceReader, staffRepository, serviceCategoryReader, businessConfigReader });
    if (!category.appliesCommissionSplit) return null;
    await staffFinanceGate.acquire(tenantId, staffId, ctx);
    const completedAt = item.transaction.paidAt;
    await businessDayGate.acquire(tenantId, civilDateKey(completedAt), ctx);
    if (await dailyCloseReader.findByCivilDay(tenantId, completedAt, ctx)) throw new CommissionDayClosedError(civilDateKey(completedAt));
    const covering = await settlementCoverageReader.findActiveCovering(staffId, completedAt, ctx);
    if (covering) throw new CommissionInActiveSettlementError(transactionItemId, covering.id);
    const existing = await commissionRepository.findByItem(tenantId, transactionItemId, ctx);
    if (existing) {
      if (existing.serviceId !== serviceId || existing.staffId !== staffId) throw new InvalidCommissionInputError('La línea ya tiene una comisión atribuida. Usa anulación y reemplazo para corregirla.');
      return existing;
    }
    const resolvedPrice = Number(item.total);
    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) throw new InvalidCommissionInputError('Importe de línea inválido.');
    if (replacesCommissionId) {
      const previous = await commissionRepository.findById(replacesCommissionId, ctx);
      if (!previous || previous.tenantId !== tenantId || previous.transactionItemId !== transactionItemId || previous.status !== 'voided') throw new InvalidCommissionInputError('La comisión sustituida debe estar anulada y pertenecer a esta línea.');
    }
    const result = await commissionRepository.create({ tenantId, appointmentId: null, transactionItemId, serviceId, staffId, resolvedPrice, priceSource: historical ? 'historical_sale_link' : 'sale_service_line', splitRate, ...calculateCommissionSplit(resolvedPrice, splitRate), serviceCategory: category.name, completedAt, ...(replacesCommissionId ? { replacesCommissionId } : {}) }, ctx);
    await ctx.eventPublisher.publish('ComisiónRegistrada', { commission: result, ...(historical ? { reason: historicalReason.trim() } : {}) });
    return result;
  };
}
module.exports = { createRecordSaleServiceCommissionUseCase };
