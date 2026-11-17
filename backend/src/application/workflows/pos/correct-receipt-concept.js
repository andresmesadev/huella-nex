const { createHash } = require('node:crypto');
const { civilDateKey } = require('../../../contexts/shared/business-day');
const { isRetryableTransactionError } = require('../../../contexts/shared/persistence/transactional-events');
const TYPE = 'ConceptoDeCobroCorregido';
class ConceptCorrectionError extends Error {
  constructor(message, status = 422, code = 'INVALID_CONCEPT_CORRECTION') { super(message); this.status = status; this.code = code; }
}
const fail = (message, status, code) => { throw new ConceptCorrectionError(message, status, code); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const eligible = item => item.itemKind === 'service' && !item.appointmentComponent && !item.productId;
const lineView = item => ({ id: item.id, description: item.description, serviceId: item.serviceId ?? null, performedByStaffId: item.performedByStaffId ?? null, quantity: item.quantity, unitPrice: String(item.unitPrice), total: String(item.total), itemKind: item.itemKind, appointmentComponent: item.appointmentComponent ?? null, productId: item.productId ?? null });
const commissionView = row => row ? { id: row.id, serviceId: row.serviceId, staffId: row.staffId, resolvedPrice: Number(row.resolvedPrice), splitRate: Number(row.splitRate), staffShare: Number(row.staffShare), businessShare: Number(row.businessShare), completedAt: row.completedAt } : null;
function readCommand(value) {
  const allowed = ['itemId', 'serviceId', 'staffId', 'reason', 'previewToken'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('La corrección solo admite servicio, profesional y motivo.', 400);
  for (const key of ['itemId', 'serviceId']) if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 120) fail('Selecciona la línea y el servicio correctos.', 400);
  if (value.staffId != null && (typeof value.staffId !== 'string' || !value.staffId.trim() || value.staffId.length > 120)) fail('Selecciona un profesional válido.', 400);
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (reason.length < 5 || reason.length > 1000) fail('Explica el motivo de la corrección con 5 a 1.000 caracteres.', 400);
  return { itemId: value.itemId.trim(), serviceId: value.serviceId.trim(), staffId: value.staffId?.trim() || null, reason, previewToken: value.previewToken };
}
function buildReceiptConceptCorrection({ repository, accessReader, staff, audit, unitOfWork, businessDayGate, clock = () => new Date(), logger = console }) {
  async function identity(input, ctx) {
    if (!input.tenantId || !input.transactionId) fail('Selecciona un establecimiento y comprobante.', 400);
    const access = await accessReader.readAccess({ tenantId: input.tenantId, actor: input.actor }, ctx);
    if (!access.capabilities.administration || !access.capabilities.cash) fail('Solo administración puede corregir conceptos cobrados.', 403, 'ACCESS_DENIED');
    return access;
  }
  async function receipt(input, ctx, lock = false) {
    const row = await repository[lock ? 'lock' : 'read'](input.tenantId, input.transactionId, ctx);
    if (!row) fail('Comprobante no encontrado.', 404, 'RECEIPT_NOT_FOUND');
    return row;
  }
  async function prepare(input, access, command, ctx) {
    if (!access.capabilities.services) fail('Los servicios no están habilitados para este establecimiento.', 403, 'ACCESS_DENIED');
    const transaction = await receipt(input, ctx, true);
    if (transaction.status !== 'active' || !transaction.paidAt || !['manual_pos_sale', 'system_appointment_completed'].includes(transaction.origin)) fail('Solo se corrigen comprobantes activos y pagados.');
    const item = transaction.items.find(i => i.id === command.itemId);
    if (!item || !eligible(item)) fail('Selecciona un servicio adicional. Productos, servicio principal y domicilio conservan su proceso propio.');
    if (item.serviceId === command.serviceId && (item.performedByStaffId ?? null) === command.staffId) fail('Selecciona un servicio o profesional diferente.');
    const service = await repository.service(input.tenantId, command.serviceId, ctx);
    if (!service) fail('Servicio activo no encontrado en este establecimiento.');
    await businessDayGate.acquire(input.tenantId, civilDateKey(transaction.paidAt), ctx);
    const terms = await staff.prepareSaleConceptCorrection({ tenantId: input.tenantId, transactionItemId: item.id, serviceId: service.id, staffId: command.staffId, amount: Number(item.total), paidAt: transaction.paidAt, activeModules: access.activeModules }, ctx);
    if (terms.previous && (terms.previous.serviceId !== item.serviceId || terms.previous.staffId !== item.performedByStaffId)) fail('La comisión de esta línea necesita revisión antes de corregir el concepto.', 409);
    const previewToken = digest({ receipt: { id: transaction.id, status: transaction.status, origin: transaction.origin, total: String(transaction.total), paidAt: transaction.paidAt, method: transaction.paymentMethod, cash: transaction.cashAmount, transfer: transaction.transferAmount, notes: transaction.notes, items: [...transaction.items].sort((a,b) => a.id.localeCompare(b.id)).map(lineView) }, command: { ...command, previewToken: undefined }, service, commissionBefore: commissionView(terms.previous), commissionAfter: terms.next });
    return { transaction, item, service, terms, previewToken, preview: { previewToken, before: lineView(item), after: { ...lineView(item), description: service.name, serviceId: service.id, performedByStaffId: command.staffId }, previousStaffShare: Number(terms.previous?.staffShare ?? 0), nextStaffShare: terms.next.staffShare, total: Number(transaction.total), reason: command.reason } };
  }
  async function context(input) {
    return unitOfWork.run(async ctx => {
      await identity(input, ctx);
      const transaction = await receipt(input, ctx);
      const { domainEvents } = await audit.listDomainEvents({ tenantId: input.tenantId, eventTypeName: TYPE, aggregateId: input.transactionId }, ctx);
      return { transaction, corrections: domainEvents.map(event => ({ id: event.id, occurredAt: event.occurredAt, ...event.payload })), eligibleItemIds: transaction.status === 'active' && transaction.paidAt ? transaction.items.filter(eligible).map(i => i.id) : [] };
    });
  }
  async function preview(input) {
    const command = readCommand(input.command);
    return unitOfWork.run(async ctx => (await prepare(input, await identity(input, ctx), command, ctx)).preview, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 20000 });
  }
  async function confirm(input) {
    const command = readCommand(input.command);
    if (typeof input.operationKey !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.operationKey)) fail('La corrección necesita una clave de operación válida.', 400);
    if (typeof command.previewToken !== 'string' || !/^[a-f0-9]{64}$/.test(command.previewToken)) fail('Previsualiza el cambio antes de confirmar.', 400);
    const commandHash = digest({ itemId: command.itemId, serviceId: command.serviceId, staffId: command.staffId, reason: command.reason });
    let result, collected;
    for (let attempt = 0; attempt < 3; attempt++) {
      collected = [];
      try {
        result = await unitOfWork.run(async inner => {
          const ctx = { ...inner, eventPublisher: { publish: async (name, payload) => collected.push({ name, payload }) } };
          const access = await identity(input, ctx);
          const eventId = 'receipt-concept-' + digest([input.tenantId, input.transactionId, access.principalKey, input.operationKey.toLowerCase()]);
          const existing = await audit.findDomainEvent({ tenantId: input.tenantId, id: eventId }, ctx);
          if (existing) {
            if (existing.eventType.name !== TYPE || existing.payload.commandHash !== commandHash || existing.payload.aggregateId !== input.transactionId || existing.payload.actor.actorId !== access.snapshot.actorId) fail('La clave ya corresponde a otra corrección.', 409, 'OPERATION_CONTENT_CHANGED');
            return { transaction: await receipt(input, ctx), correction: { id: existing.id, occurredAt: existing.occurredAt, ...existing.payload }, replayed: true };
          }
          const prepared = await prepare(input, access, command, ctx);
          if (prepared.previewToken !== command.previewToken) fail('El comprobante o la comisión cambiaron. Vuelve a previsualizar.', 409, 'PREVIEW_CHANGED');
          const reason = `${command.reason} [corrección de comprobante ${input.transactionId}; responsable ${access.snapshot.actorId}]`;
          if (prepared.terms.previous) await staff.voidCommission({ tenantId: input.tenantId, commissionId: prepared.terms.previous.id, reason, replacement: null }, ctx);
          const updated = await repository.correct(input.tenantId, input.transactionId, command.itemId, { description: prepared.service.name, serviceId: command.serviceId, performedByStaffId: command.staffId }, ctx);
          const commission = await staff.recordSaleServiceCommission({ tenantId: input.tenantId, transactionItemId: updated.id, serviceId: command.serviceId, staffId: command.staffId, activeModules: access.activeModules, ...(prepared.terms.previous ? { replacesCommissionId: prepared.terms.previous.id } : {}) }, ctx);
          if (Number(commission?.staffShare ?? 0) !== prepared.terms.next.staffShare) throw new Error('Commission preview does not match registration');
          const payload = { aggregateId: input.transactionId, commandHash, actor: access.snapshot, reason: command.reason, before: lineView(prepared.item), after: lineView(updated), commissionBefore: commissionView(prepared.terms.previous), commissionAfter: commissionView(commission), total: Number(prepared.transaction.total), paymentMethod: prepared.transaction.paymentMethod, paidAt: prepared.transaction.paidAt };
          const { domainEvent } = await audit.registerDomainEvent({ id: eventId, dispatch: 'deferred', tenantId: input.tenantId, eventTypeName: TYPE, origin: 'Finanzas', occurredAt: clock(), payload }, ctx);
          return { transaction: await receipt(input, ctx), correction: { id: domainEvent.id, occurredAt: domainEvent.occurredAt, ...payload }, replayed: false };
        }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 20000 });
        break;
      } catch (error) { if (isRetryableTransactionError(error) && attempt < 2) continue; throw error; }
    }
    if (!result.replayed) {
      // A delivery failure never re-executes the committed financial command.
      for (const event of collected) try { await staff.publishCheckoutCorrection(event); } catch { logger.warn('[ConceptCorrection] Staff event delivery failed', event.name); }
      try { await audit.notifyCertifiedEvent({ id: result.correction.id }); } catch { logger.warn('[ConceptCorrection] Correction notification failed', result.correction.id); }
    }
    return result;
  }
  return { context, preview, confirm };
}
module.exports = { buildReceiptConceptCorrection, ConceptCorrectionError, TYPE, eligible, lineView };
