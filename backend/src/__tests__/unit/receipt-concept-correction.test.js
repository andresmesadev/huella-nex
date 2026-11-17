const { buildReceiptConceptCorrection, TYPE } = require('../../application/workflows/pos/correct-receipt-concept');
const { createPrepareSaleConceptCorrection } = require('../../contexts/staff/application/use-cases/prepare-sale-concept-correction');
const { createRecordSaleServiceCommissionUseCase } = require('../../contexts/staff/application/use-cases/record-sale-service-commission.usecase');
const { createVoidCommissionUseCase } = require('../../contexts/staff/application/use-cases/void-commission.usecase');

function fixture() {
  const paidAt = new Date('2026-11-14T18:00:00Z');
  let state = { receipt: { id: 'receipt', tenantId: 'tenant', status: 'active', origin: 'system_appointment_completed', total: '100000', paymentMethod: 'transfer', paidAt, notes: null, items: [
    { id: 'main', itemKind: 'service', appointmentComponent: 'service', description: 'Grooming', quantity: 1, unitPrice: '60000', total: '60000' },
    { id: 'transport', itemKind: 'service', appointmentComponent: 'transport', description: 'Transport', quantity: 1, unitPrice: '22000', total: '22000' },
    { id: 'line', itemKind: 'service', description: 'Cut', serviceId: 'cut', performedByStaffId: 'person', quantity: 1, unitPrice: '10000', total: '10000' },
    { id: 'other', itemKind: 'service', description: 'Detangle', serviceId: 'cut', performedByStaffId: 'person', quantity: 1, unitPrice: '8000', total: '8000' },
  ] }, commissions: [{ id: 'old', tenantId: 'tenant', serviceId: 'cut', transactionItemId: 'line', staffId: 'person', status: 'active', resolvedPrice: 10000, splitRate: .5, staffShare: 5000, businessShare: 5000, completedAt: paidAt }, { id: 'untouched', tenantId: 'tenant', serviceId: 'cut', transactionItemId: 'other', staffId: 'person', status: 'active', resolvedPrice: 8000, splitRate: .5, staffShare: 4000, businessShare: 4000, completedAt: paidAt }], events: [], serial: 0 };
  const services = { cut: { id: 'cut', tenantId: 'tenant', name: 'Cut', active: true, split: true }, bath: { id: 'bath', tenantId: 'tenant', name: 'Medicated bath', active: true, split: false } };
  const people = { person: { id: 'person', tenantId: 'tenant', active: true, role: 'groomer', contractType: 'service', commissionRate: .5 }, second: { id: 'second', tenantId: 'tenant', active: true, role: 'groomer', contractType: 'service', commissionRate: .4 } };
  const clone = value => structuredClone(value);
  const flags = { closed: false, settled: false, certificationFailure: false, serializations: 0 };
  let inTransaction = false;
  const commissionRepository = {
    findByItem: async (tenantId, id) => clone(state.commissions.find(c => c.tenantId === tenantId && c.transactionItemId === id && c.status === 'active') ?? null),
    findById: async id => clone(state.commissions.find(c => c.id === id)),
    create: jest.fn(async data => { const row = { id: 'new-' + ++state.serial, ...data, status: 'active' }; state.commissions.push(row); return clone(row); }),
    voidAndReplace: async (id, data) => { const row = state.commissions.find(c => c.id === id); Object.assign(row, { status: 'voided', voidedAt: data.voidedAt, voidReason: data.voidReason }); return { voided: clone(row), replacement: null }; },
  };
  const deps = { commissionRepository, sourceReader: { lockItem: async (_tenant, id) => { const row = state.receipt.items.find(i => i.id === id); return { ...clone(row), transaction: clone(state.receipt) }; }, service: async (tenantId, id) => services[id]?.tenantId === tenantId ? services[id] : null, capabilities: async () => [] }, staffRepository: { findById: async id => people[id] }, serviceCategoryReader: { getCategoryForService: async id => ({ id: 'category', name: 'grooming', appliesCommissionSplit: services[id]?.split }) }, businessConfigReader: { getCommissionSplitRate: async () => .5 }, dailyCloseReader: { findByCivilDay: async () => flags.closed ? { date: paidAt } : null }, settlementCoverageReader: { findActiveCovering: async () => flags.settled ? { id: 'settled' } : null }, businessDayGate: { acquire: jest.fn() }, staffFinanceGate: { acquire: jest.fn() }, eventPublisher: { publish: jest.fn() } };
  const staff = { prepareSaleConceptCorrection: createPrepareSaleConceptCorrection(deps), recordSaleServiceCommission: createRecordSaleServiceCommissionUseCase(deps), voidCommission: createVoidCommissionUseCase(deps), publishCheckoutCorrection: jest.fn(async () => { expect(inTransaction).toBe(false); }) };
  const repository = { read: async tenantId => tenantId === state.receipt.tenantId ? clone(state.receipt) : null, lock: async tenantId => tenantId === state.receipt.tenantId ? clone(state.receipt) : null, service: async (tenantId, id) => services[id]?.tenantId === tenantId && services[id].active ? clone(services[id]) : null, correct: jest.fn(async (_tenant, _receipt, id, data) => { const item = state.receipt.items.find(i => i.id === id); Object.assign(item, data); return clone(item); }) };
  const audit = { findDomainEvent: async ({ tenantId, id }) => clone(state.events.find(e => e.tenantId === tenantId && e.id === id) ?? null), listDomainEvents: async ({ tenantId, aggregateId }) => ({ domainEvents: clone(state.events.filter(e => e.tenantId === tenantId && e.payload.aggregateId === aggregateId)) }), registerDomainEvent: jest.fn(async input => { if (flags.certificationFailure) throw new Error('certificate failed'); const event = { ...clone(input), eventType: { name: input.eventTypeName } }; state.events.push(event); return { domainEvent: clone(event) }; }), notifyCertifiedEvent: jest.fn(async () => { expect(inTransaction).toBe(false); }) };
  const accessReader = { readAccess: async ({ actor }) => ({ capabilities: { administration: actor.type === 'admin', cash: true, services: actor.services !== false }, activeModules: ['grooming'], principalKey: 'staff:admin', snapshot: { actorId: 'staff:admin', actorName: 'Administrator', actorRole: actor.type } }) };
  const unitOfWork = { run: async fn => { const saved = clone(state); inTransaction = true; try { const result = await fn({ tx: {} }); if (flags.serializations-- > 0) { const e = new Error('serialization'); e.code = 'P2034'; throw e; } inTransaction = false; return result; } catch (error) { state = saved; inTransaction = false; throw error; } } };
  const workflow = buildReceiptConceptCorrection({ repository, accessReader, staff, audit, unitOfWork, businessDayGate: deps.businessDayGate, clock: () => paidAt, logger: { warn: jest.fn() } });
  const input = { tenantId: 'tenant', transactionId: 'receipt', actor: { type: 'admin' }, operationKey: '58f65a1d-d459-4ceb-b805-9d10a080c2f2', command: { itemId: 'line', serviceId: 'bath', staffId: 'person', reason: 'Wrong service entered' } };
  async function ready() { const preview = await workflow.preview(input); input.command.previewToken = preview.previewToken; return preview; }
  return { workflow, input, ready, flags, services, people, staff, audit, repository, commissionRepository, get state() { return state; } };
}

test('preview uses the real contract rules and makes no financial change', async () => {
  const f = fixture(), before = structuredClone(f.state);
  expect(await f.ready()).toMatchObject({ previousStaffShare: 5000, nextStaffShare: 0, total: 100000, after: { description: 'Medicated bath' } });
  expect(f.state).toEqual(before); expect(f.audit.registerDomainEvent).not.toHaveBeenCalled();
});
test('cut to bath preserves the payment, other lines and commissions with a durable correction', async () => {
  const f = fixture(), before = structuredClone(f.state); await f.ready();
  const result = await f.workflow.confirm(f.input);
  expect(result.replayed).toBe(false); expect(result.correction.before.description).toBe('Cut');
  expect(result.transaction).toMatchObject({ total: '100000', paymentMethod: 'transfer', paidAt: before.receipt.paidAt });
  expect(f.state.commissions[0]).toMatchObject({ status: 'voided', staffShare: 5000 });
  expect(f.state.commissions[1]).toEqual(before.commissions[1]);
  expect(f.state.receipt.items.filter(i => i.id !== 'line')).toEqual(before.receipt.items.filter(i => i.id !== 'line'));
  expect(f.state.events).toHaveLength(1); expect(f.state.events[0].eventType.name).toBe(TYPE);
  expect(f.state.events[0].payload.actor.actorId).toBe('staff:admin');
});
test('changing a professional creates the correct immutable replacement link and personal rate', async () => {
  const f = fixture(); f.input.command.serviceId = 'cut'; f.input.command.staffId = 'second';
  expect(await f.ready()).toMatchObject({ nextStaffShare: 4000 }); await f.workflow.confirm(f.input);
  expect(f.state.commissions.find(c => c.id.startsWith('new-'))).toMatchObject({ staffId: 'second', staffShare: 4000, replacesCommissionId: 'old', transactionItemId: 'line' });
});
test('a previously direct service can gain its correct commission', async () => {
  const f = fixture(); Object.assign(f.state.receipt.items.find(i => i.id === 'line'), { serviceId: 'bath', description: 'Medicated bath' }); f.state.commissions[0].status = 'voided'; f.input.command.serviceId = 'cut';
  expect(await f.ready()).toMatchObject({ previousStaffShare: 0, nextStaffShare: 5000 }); await f.workflow.confirm(f.input);
  expect(f.state.commissions.find(c => c.id.startsWith('new-'))).toMatchObject({ staffShare: 5000 });
});
test('retry returns the existing certificate without another correction or commission', async () => {
  const f = fixture(); await f.ready(); const first = await f.workflow.confirm(f.input), second = await f.workflow.confirm(f.input);
  expect(second.replayed).toBe(true); expect(second.correction.id).toBe(first.correction.id);
  expect(f.state.events).toHaveLength(1); expect(f.repository.correct).toHaveBeenCalledTimes(1); expect(f.audit.notifyCertifiedEvent).toHaveBeenCalledTimes(1);
});
test('reusing a key with different content fails', async () => {
  const f = fixture(); await f.ready(); await f.workflow.confirm(f.input); f.input.command.reason = 'Different reason now';
  await expect(f.workflow.confirm(f.input)).rejects.toMatchObject({ code: 'OPERATION_CONTENT_CHANGED' });
});
test.each(['notes', 'contract'])('a stale %s preview cannot overwrite a new financial state', async kind => {
  const f = fixture(); f.input.command.serviceId = 'cut'; f.input.command.staffId = 'second'; await f.ready();
  if (kind === 'notes') f.state.receipt.notes = 'Changed by another operator'; else f.people.second.commissionRate = .3;
  await expect(f.workflow.confirm(f.input)).rejects.toMatchObject({ code: 'PREVIEW_CHANGED' }); expect(f.state.events).toHaveLength(0);
});
test.each(['product', 'principal', 'transport', 'voided', 'pending', 'foreign', 'noadmin', 'reason', 'money', 'service', 'professional', 'closed', 'settled'])('rejects %s before any correction', async kind => {
  const f = fixture();
  if (kind === 'product') f.state.receipt.items.find(i => i.id === 'line').itemKind = 'product';
  if (kind === 'principal') f.input.command.itemId = 'main';
  if (kind === 'transport') f.input.command.itemId = 'transport';
  if (kind === 'voided') f.state.receipt.status = 'voided';
  if (kind === 'pending') f.state.receipt.paidAt = null;
  if (kind === 'foreign') f.input.tenantId = 'other';
  if (kind === 'noadmin') f.input.actor.type = 'vet';
  if (kind === 'reason') f.input.command.reason = 'x';
  if (kind === 'money') f.input.command.total = 1;
  if (kind === 'service') f.services.bath.tenantId = 'other';
  if (kind === 'professional') f.people.person.tenantId = 'other';
  if (kind === 'closed') f.flags.closed = true;
  if (kind === 'settled') f.flags.settled = true;
  await expect(f.ready()).rejects.toThrow(); expect(f.repository.correct).not.toHaveBeenCalled(); expect(f.state.events).toHaveLength(0);
});
test('certificate failure rolls back the line and voided commission together', async () => {
  const f = fixture(); await f.ready(); const before = structuredClone(f.state); f.flags.certificationFailure = true;
  await expect(f.workflow.confirm(f.input)).rejects.toThrow('certificate failed'); expect(f.state).toEqual(before); expect(f.staff.publishCheckoutCorrection).not.toHaveBeenCalled();
});
test('a serialization rollback retries without duplicating a certificate or publishing before commit', async () => {
  const f = fixture(); await f.ready(); f.flags.serializations = 1; await f.workflow.confirm(f.input);
  expect(f.state.events).toHaveLength(1); expect(f.state.commissions.filter(c => c.id === 'old' && c.status === 'voided')).toHaveLength(1); expect(f.audit.notifyCertifiedEvent).toHaveBeenCalledTimes(1);
});
test('postcommit notification failure never repeats committed business writes', async () => {
  const f = fixture(); await f.ready(); f.audit.notifyCertifiedEvent.mockRejectedValue(new Error('notification failed'));
  expect((await f.workflow.confirm(f.input)).replayed).toBe(false); expect(f.repository.correct).toHaveBeenCalledTimes(1); expect(f.state.events).toHaveLength(1);
});
test('history returns a scoped immutable before/after trail', async () => {
  const f = fixture(); await f.ready(); await f.workflow.confirm(f.input);
  const result = await f.workflow.context(f.input);
  expect(result.corrections).toHaveLength(1); expect(result.corrections[0]).toMatchObject({ before: { description: 'Cut' }, after: { description: 'Medicated bath' }, reason: 'Wrong service entered' });
  await expect(f.workflow.context({ ...f.input, tenantId: 'other' })).rejects.toMatchObject({ status: 404 });
});
