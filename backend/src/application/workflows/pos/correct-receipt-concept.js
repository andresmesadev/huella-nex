const { createHash } = require('node:crypto');
const { civilDateKey } = require('../../../contexts/shared/business-day');
const { isRetryableTransactionError } = require('../../../contexts/shared/persistence/transactional-events');
const TYPE = 'ConceptoDeCobroCorregido';
class ConceptCorrectionError extends Error {
  constructor(message, status = 422, code = 'INVALID_CONCEPT_CORRECTION') { super(message); this.status = status; this.code = code; }
}
const fail = (message, status, code) => { throw new ConceptCorrectionError(message, status, code); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const eligible = item => item.itemKind === 'service' && !item.productId && (!item.appointmentComponent || ['service', 'transport'].includes(item.appointmentComponent));
const effectiveIdentity = (transaction, item) => ({
  serviceId: item.serviceId ?? (item.appointmentComponent === 'service' ? transaction.appointment?.serviceId : null) ?? null,
  staffId: item.performedByStaffId ?? (item.appointmentComponent === 'service' && item.serviceId == null ? transaction.appointment?.staffId : null) ?? null,
});
const lineView = item => ({ id: item.id, description: item.description, serviceId: item.serviceId ?? null, performedByStaffId: item.performedByStaffId ?? null, quantity: item.quantity, unitPrice: String(item.unitPrice), total: String(item.total), itemKind: item.itemKind, appointmentComponent: item.appointmentComponent ?? null, productId: item.productId ?? null });
const commissionView = row => row ? { id: row.id, appointmentId: row.appointmentId ?? null, transactionItemId: row.transactionItemId ?? null, serviceId: row.serviceId, staffId: row.staffId, resolvedPrice: Number(row.resolvedPrice), splitRate: Number(row.splitRate), staffShare: Number(row.staffShare), businessShare: Number(row.businessShare), completedAt: row.completedAt } : null;
function readCommand(value) {
  const allowed = ['itemId', 'serviceId', 'staffId', 'transportDescription', 'reason', 'previewToken'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('La corrección solo admite servicio, profesional y motivo.', 400);
  if (typeof value.itemId !== 'string' || !value.itemId.trim() || value.itemId.length > 120) fail('Selecciona la línea correcta.', 400);
  if (value.serviceId != null && (typeof value.serviceId !== 'string' || !value.serviceId.trim() || value.serviceId.length > 120)) fail('Selecciona un servicio válido.', 400);
  if (value.transportDescription !== undefined && (typeof value.transportDescription !== 'string' || value.transportDescription.trim().length < 3 || value.transportDescription.length > 160)) fail('Describe el domicilio con 3 a 160 caracteres.', 400);
  if (value.staffId != null && (typeof value.staffId !== 'string' || !value.staffId.trim() || value.staffId.length > 120)) fail('Selecciona un profesional válido.', 400);
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (reason.length < 5 || reason.length > 1000) fail('Explica el motivo de la corrección con 5 a 1.000 caracteres.', 400);
  return { itemId: value.itemId.trim(), serviceId: value.serviceId?.trim() || null, staffId: value.staffId?.trim() || null, reason, previewToken: value.previewToken, ...(value.transportDescription !== undefined ? { transportDescription: value.transportDescription.trim() } : {}) };
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
    if (!item || !eligible(item)) fail('Selecciona un servicio principal, adicional o domicilio. Los productos conservan su proceso propio.');
    const primary = item.appointmentComponent === 'service';
    const transport = item.appointmentComponent === 'transport';
    const appointment = transaction.appointment;
    if (primary || transport) {
      if (transaction.origin !== 'system_appointment_completed' || !transaction.appointmentId ||
          appointment?.id !== transaction.appointmentId || appointment.tenantId !== input.tenantId ||
          appointment.status !== 'completed' || item.quantity !== 1) {
        fail('El componente necesita una cita completada del establecimiento.', 409);
      }
      if ((transaction.userId && transaction.userId !== appointment.userId) ||
          (transaction.petId && transaction.petId !== appointment.petId)) {
        fail('El comprobante y la cita necesitan revisión de sus referencias.', 409);
      }
      if (transaction.items.filter(i => i.appointmentComponent === item.appointmentComponent).length !== 1) {
        fail('El componente de cita no es único.', 409);
      }
    }
    const current = effectiveIdentity(transaction, item);
    let service;
    if (transport) {
      if (!command.transportDescription || command.serviceId || command.staffId) {
        fail('El domicilio se corrige por descripción, sin servicio ni profesional de comisión.', 400);
      }
      if (command.transportDescription === item.description) fail('Escribe un concepto de domicilio diferente.');
      service = { id: null, name: command.transportDescription };
    } else {
      if (!command.serviceId || command.transportDescription !== undefined) fail('Selecciona el servicio correcto.', 400);
      if (current.serviceId === command.serviceId && current.staffId === command.staffId) fail('Selecciona un servicio o profesional diferente.');
      service = await repository.service(input.tenantId, command.serviceId, ctx);
      if (!service) fail('Servicio activo no encontrado en este establecimiento.');
    }
    await businessDayGate.acquire(input.tenantId, civilDateKey(transaction.paidAt), ctx);
    const terms = await staff.prepareSaleConceptCorrection({
      tenantId: input.tenantId,
      transactionItemId: item.id,
      serviceId: service.id,
      staffId: command.staffId,
      amount: Number(item.total),
      paidAt: transaction.paidAt,
      activeModules: access.activeModules,
      component: item.appointmentComponent ?? null,
      ...(primary ? { appointmentId: appointment.id, completedAt: appointment.endedAt ?? appointment.date } : {}),
    }, ctx);
    if (terms.previous) {
      const wrongStaff = terms.previous.staffId !== current.staffId;
      const wrongSource = primary
        ? terms.previous.appointmentId !== appointment.id ||
          (terms.previous.serviceId != null && terms.previous.serviceId !== current.serviceId)
        : terms.previous.serviceId !== item.serviceId;
      if (wrongStaff || wrongSource) fail('La comisión de esta línea necesita revisión antes de corregir el concepto.', 409);
    }
    const previewToken = digest({ receipt: { id: transaction.id, status: transaction.status, origin: transaction.origin, total: String(transaction.total), paidAt: transaction.paidAt, method: transaction.paymentMethod, cash: transaction.cashAmount, transfer: transaction.transferAmount, notes: transaction.notes, items: [...transaction.items].sort((a,b) => a.id.localeCompare(b.id)).map(lineView) }, ...(primary || transport ? { appointment } : {}), command: { ...command, previewToken: undefined }, service, commissionBefore: commissionView(terms.previous), commissionAfter: terms.next });
    return { transaction, item, service, terms, previewToken, preview: { previewToken, before: lineView(item), after: { ...lineView(item), description: service.name, serviceId: service.id, performedByStaffId: command.staffId }, previousStaffShare: Number(terms.previous?.staffShare ?? 0), nextStaffShare: terms.next.staffShare, total: Number(transaction.total), reason: command.reason } };
  }
  async function context(input) {
    return unitOfWork.run(async ctx => {
      await identity(input, ctx);
      const transaction = await receipt(input, ctx);
      const { domainEvents } = await audit.listDomainEvents({ tenantId: input.tenantId, eventTypeName: TYPE, aggregateId: input.transactionId }, ctx);
      return { transaction, defaults: Object.fromEntries(transaction.items.filter(eligible).map(item => [item.id, effectiveIdentity(transaction, item)])), corrections: domainEvents.map(event => ({ id: event.id, occurredAt: event.occurredAt, ...event.payload })), eligibleItemIds: transaction.status === 'active' && transaction.paidAt ? transaction.items.filter(eligible).map(i => i.id) : [] };
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
    const commandHash = digest({ itemId: command.itemId, serviceId: command.serviceId, staffId: command.staffId, reason: command.reason, ...(command.transportDescription !== undefined ? { transportDescription: command.transportDescription } : {}) });
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
          const commission = prepared.item.appointmentComponent === 'transport' ? null : await staff.recordSaleServiceCommission({
            tenantId: input.tenantId,
            transactionItemId: updated.id,
            serviceId: command.serviceId,
            staffId: command.staffId,
            activeModules: access.activeModules,
            ...(prepared.item.appointmentComponent === 'service' ? { principalCorrection: true, completedAt: prepared.terms.next.completedAt } : {}),
            ...(prepared.terms.previous ? { replacesCommissionId: prepared.terms.previous.id } : {}),
          }, ctx);
          if (Number(commission?.staffShare ?? 0) !== prepared.terms.next.staffShare) throw new Error('Commission preview does not match registration');
          const payload = { aggregateId: input.transactionId, commandHash, actor: access.snapshot, reason: command.reason, before: lineView(prepared.item), after: lineView(updated), ...(prepared.item.appointmentComponent ? { appointmentBefore: prepared.transaction.appointment } : {}), commissionBefore: commissionView(prepared.terms.previous), commissionAfter: commissionView(commission), total: Number(prepared.transaction.total), paymentMethod: prepared.transaction.paymentMethod, paidAt: prepared.transaction.paidAt };
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
