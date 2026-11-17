const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const url = process.env.RECEIPT_CONCEPT_TEST_DATABASE_URL || (process.env.CI === 'true' ? process.env.DATABASE_URL : null);

test('receipt concepts: real PostgreSQL atomicity, immutable audit, concurrent replay and commission guards', { skip: !url }, async () => {
  const target = new URL(url);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
  assert(target.pathname === '/receipt_concept_test' || (process.env.CI === 'true' && target.pathname === '/mateos_dev'), 'Only a disposable test database is allowed');
  process.env.DATABASE_URL = url;
  const p = require('../backend/src/lib/prisma');
  const events = require('../backend/src/contexts/events');
  const realStaff = require('../backend/src/contexts/staff');
  const { PrismaReceiptConceptRepository } = require('../backend/src/contexts/finance/infrastructure/persistence/prisma-receipt-concept.repository');
  const { PrismaInventoryAccessReader } = require('../backend/src/contexts/inventory/infrastructure/prisma-access.reader');
  const { PrismaUnitOfWork } = require('../backend/src/contexts/shared/persistence/prisma-unit-of-work');
  const { PrismaBusinessDayGate } = require('../backend/src/contexts/shared/persistence/prisma-business-day-gate');
  const { buildReceiptConceptCorrection, TYPE } = require('../backend/src/application/workflows/pos/correct-receipt-concept');
  const tenantId = randomUUID(), foreignTenant = randomUUID(), paidAt = new Date('2026-11-17T17:00:00Z');
  const actor = { type: 'admin', email: 'fixture-admin@example.invalid', name: 'Synthetic administrator' };
  const local = { publish: async () => {} };
  const work = new PrismaUnitOfWork();
  const staff = { ...realStaff, publishCheckoutCorrection: async () => {} };
  const audit = { ...events, notifyCertifiedEvent: async () => {} };
  const make = override => buildReceiptConceptCorrection({ repository: new PrismaReceiptConceptRepository(), accessReader: new PrismaInventoryAccessReader(), staff, audit, unitOfWork: work, businessDayGate: new PrismaBusinessDayGate(), ...override });
  const service = make();
  try {
    for (const id of [tenantId, foreignTenant]) await p.tenant.create({ data: { id, name: 'Synthetic receipt correction', slug: 'receipt-' + id, activeModules: ['grooming', 'retail'] } });
    const category = await p.serviceCategory.create({ data: { tenantId, name: 'grooming', appliesCommissionSplit: true } });
    const cut = await p.service.create({ data: { tenantId, categoryId: category.id, name: 'Synthetic cut', requiresAppointment: false, appliesCommissionSplit: true } });
    const bath = await p.service.create({ data: { tenantId, categoryId: category.id, name: 'Synthetic medicated bath', requiresAppointment: false, appliesCommissionSplit: false } });
    const people = [];
    for (const rate of [.5, .4]) people.push(await p.staff.create({ data: { tenantId, name: 'Synthetic professional ' + rate, role: 'groomer', contractType: 'service', commissionRate: rate } }));
    const receipt = await p.transaction.create({ data: { tenantId, total: 100000, paymentMethod: 'transfer', paidAt, origin: 'manual_pos_sale', recordedActorId: 'synthetic-original', items: { create: [
      { itemKind: 'service', serviceId: cut.id, performedByStaffId: people[0].id, description: cut.name, quantity: 1, unitPrice: 10000, total: 10000 },
      { itemKind: 'legacy', description: 'Untouched synthetic amount', quantity: 1, unitPrice: 90000, total: 90000 },
    ] } }, include: { items: true } });
    const line = receipt.items.find(i => i.serviceId === cut.id);
    const old = await p.$transaction(tx => realStaff.recordSaleServiceCommission({ tenantId, transactionItemId: line.id, serviceId: cut.id, staffId: people[0].id }, { tx, eventPublisher: local }));
    assert.equal(Number(old.staffShare), 5000);
    let input = { tenantId, transactionId: receipt.id, actor, operationKey: randomUUID(), command: { itemId: line.id, serviceId: bath.id, staffId: people[0].id, reason: 'Synthetic wrong concept correction' } };
    let preview = await service.preview(input); assert.equal(preview.nextStaffShare, 0);
    assert.equal((await p.transactionItem.findUnique({ where: { id: line.id } })).description, cut.name);
    input.command.previewToken = preview.previewToken;
    const concurrent = await Promise.all(Array.from({ length: 6 }, () => service.confirm(input)));
    assert.equal(concurrent.filter(r => !r.replayed).length, 1);
    assert.equal(new Set(concurrent.map(r => r.correction.id)).size, 1);
    assert.equal((await p.commission.findUnique({ where: { id: old.id } })).status, 'voided');
    assert.equal(await p.commission.count({ where: { tenantId, transactionItemId: line.id, status: 'active' } }), 0);
    let now = await p.transaction.findUnique({ where: { id: receipt.id }, include: { items: true } });
    assert.equal(Number(now.total), 100000); assert.equal(now.paymentMethod, 'transfer'); assert.equal(now.paidAt.toISOString(), paidAt.toISOString()); assert.equal(now.recordedActorId, 'synthetic-original');
    assert.equal(now.items.find(i => i.id !== line.id).description, 'Untouched synthetic amount');
    await assert.rejects(service.confirm({ ...input, command: { ...input.command, reason: 'Different request content' } }), error => error.code === 'OPERATION_CONTENT_CHANGED');
    const eventId = concurrent[0].correction.id;
    await assert.rejects(p.domainEvent.update({ where: { id: eventId }, data: { origin: 'tampered' } }), /immutable|append.only|constraint/i);
    await assert.rejects(p.domainEvent.delete({ where: { id: eventId } }), /immutable|append.only|constraint/i);
    input = { ...input, operationKey: randomUUID(), command: { itemId: line.id, serviceId: cut.id, staffId: people[1].id, reason: 'Synthetic second professional correction' } };
    preview = await service.preview(input); assert.equal(preview.nextStaffShare, 4000); input.command.previewToken = preview.previewToken;
    await service.confirm(input);
    const four = await p.commission.findFirst({ where: { tenantId, transactionItemId: line.id, status: 'active' } }); assert.equal(Number(four.staffShare), 4000);
    input = { ...input, operationKey: randomUUID(), command: { ...input.command, staffId: people[0].id, reason: 'Synthetic professional corrected again' } };
    input.command.previewToken = (await service.preview(input)).previewToken; await service.confirm(input);
    const five = await p.commission.findFirst({ where: { tenantId, transactionItemId: line.id, status: 'active' } }); assert.equal(Number(five.staffShare), 5000); assert.equal(five.replacesCommissionId, four.id);
    const attempt = { ...input, operationKey: randomUUID(), command: { itemId: line.id, serviceId: bath.id, staffId: people[0].id, reason: 'Synthetic rollback on failed audit' } };
    attempt.command.previewToken = (await service.preview(attempt)).previewToken;
    const broken = make({ audit: { ...audit, registerDomainEvent: async () => { throw new Error('Synthetic certificate failure'); } } });
    await assert.rejects(broken.confirm(attempt), /Synthetic certificate failure/);
    assert.equal((await p.transactionItem.findUnique({ where: { id: line.id } })).serviceId, cut.id);
    assert.equal((await p.commission.findUnique({ where: { id: five.id } })).status, 'active');
    const history = await service.context(input); assert.equal(history.corrections.length, 3); assert(history.corrections.every(r => r.aggregateId === receipt.id));
    await assert.rejects(service.context({ ...input, tenantId: foreignTenant }), error => error.status === 404);
    await p.transaction.update({ where: { id: receipt.id }, data: { notes: 'Synthetic concurrent change' } });
    await assert.rejects(service.confirm(attempt), error => error.code === 'PREVIEW_CHANGED');
    const settlement = await p.settlement.create({ data: { tenantId, staffId: people[0].id, periodStart: new Date('2026-11-17T05:00:00Z'), periodEnd: new Date('2026-11-18T04:59:59.999Z'), totalAmount: 5000 } });
    await assert.rejects(service.preview(attempt), error => error.constructor.name === 'CommissionInActiveSettlementError');
    await p.settlement.update({ where: { id: settlement.id }, data: { status: 'voided', voidedAt: new Date(), voidReason: 'Synthetic fixture cleanup' } });
    await p.dailyClose.create({ data: { tenantId, date: new Date('2026-11-17T00:00:00Z'), incomeTotal: 100000, expenseTotal: 0, netAmount: 100000, staffBreakdown: {} } });
    await assert.rejects(service.preview(attempt), error => error.constructor.name === 'CommissionDayClosedError');
    assert.equal(await p.domainEvent.count({ where: { tenantId, eventType: { name: TYPE } } }), 3);
    now = await p.transaction.findUnique({ where: { id: receipt.id } }); assert.equal(Number(now.total), 100000);
  } finally {
    // Audit is append-only. The disposable container/database is discarded, not its history rewritten.
    await p.$disconnect();
  }
});
