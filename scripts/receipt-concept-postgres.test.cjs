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
    // A paid appointment can have only its principal and transport: both are editable,
    // while the original booking and the principal commission's source/date survive.
    const owner = await p.user.create({ data: { tenantId, name: 'Synthetic component owner', phone: 'fixture-' + randomUUID() } });
    const pet = await p.pet.create({ data: { tenantId, ownerId: owner.id, name: 'Synthetic component pet', type: 'perro' } });
    const completedAt = new Date('2026-11-16T17:00:00Z');
    const visit = await p.appointment.create({ data: { tenantId, userId: owner.id, petId: pet.id, petName: pet.name, petType: pet.type, serviceType: 'grooming', serviceId: cut.id, staffId: people[0].id, date: completedAt, endedAt: completedAt, status: 'completed', finalPrice: 60000, transportMode: 'round_trip', transportPrice: 22000, transportAddress: 'Synthetic pickup address' } });
    const primaryReceipt = await p.transaction.create({ data: { tenantId, userId: owner.id, petId: pet.id, appointmentId: visit.id, origin: 'system_appointment_completed', paidAt, total: 82000, paymentMethod: 'cash', recordedActorId: 'synthetic-original', items: { create: [
      { itemKind: 'service', appointmentComponent: 'service', description: 'Synthetic principal', quantity: 1, unitPrice: 60000, total: 60000 },
      { itemKind: 'service', appointmentComponent: 'transport', description: 'Synthetic transport', quantity: 1, unitPrice: 22000, total: 22000 },
    ] } }, include: { items: true } });
    const principal = primaryReceipt.items.find(i => i.appointmentComponent === 'service');
    const transport = primaryReceipt.items.find(i => i.appointmentComponent === 'transport');
    const originalPrimary = await p.commission.create({ data: { tenantId, appointmentId: visit.id, staffId: people[0].id, resolvedPrice: 60000, priceSource: 'synthetic-original', splitRate: .5, staffShare: 30000, businessShare: 30000, serviceCategory: 'grooming', completedAt } });
    let mainInput = { tenantId, transactionId: primaryReceipt.id, actor, operationKey: randomUUID(), command: { itemId: principal.id, serviceId: cut.id, staffId: people[1].id, reason: 'Correct the principal professional, preserving original booking' } };
    const componentContext = await service.context(mainInput);
    assert.equal(componentContext.eligibleItemIds.length, 2); assert.deepEqual(componentContext.defaults[principal.id], { serviceId: cut.id, staffId: people[0].id });
    const mainPreview = await service.preview(mainInput); assert.equal(mainPreview.previousStaffShare, 30000); assert.equal(mainPreview.nextStaffShare, 24000);
    mainInput.command.previewToken = mainPreview.previewToken;
    const mainResults = await Promise.all(Array.from({ length: 4 }, () => service.confirm(mainInput)));
    assert.equal(mainResults.filter(r => !r.replayed).length, 1);
    const correctedPrimary = await p.commission.findFirst({ where: { tenantId, appointmentId: visit.id, status: 'active' } });
    assert.equal(correctedPrimary.transactionItemId, null); assert.equal(correctedPrimary.serviceId, cut.id); assert.equal(correctedPrimary.staffId, people[1].id);
    assert.equal(Number(correctedPrimary.staffShare), 24000); assert.equal(correctedPrimary.completedAt.toISOString(), completedAt.toISOString()); assert.equal(correctedPrimary.replacesCommissionId, originalPrimary.id);
    assert.deepEqual(await p.appointment.findUnique({ where: { id: visit.id } }), visit);
    const transportInput = { tenantId, transactionId: primaryReceipt.id, actor, operationKey: randomUUID(), command: { itemId: transport.id, serviceId: null, staffId: null, transportDescription: 'Synthetic pickup and delivery', reason: 'Correct transport label only, preserve the amount and commission' } };
    const transportPreview = await service.preview(transportInput); assert.equal(transportPreview.previousStaffShare, 0); assert.equal(transportPreview.nextStaffShare, 0);
    transportInput.command.previewToken = transportPreview.previewToken; await service.confirm(transportInput);
    assert.deepEqual(await p.commission.findUnique({ where: { id: correctedPrimary.id } }), correctedPrimary);
    const updatedReceipt = await p.transaction.findUnique({ where: { id: primaryReceipt.id }, include: { items: true } });
    assert.equal(Number(updatedReceipt.total), 82000); assert.equal(updatedReceipt.paymentMethod, 'cash'); assert.equal(updatedReceipt.paidAt.toISOString(), paidAt.toISOString());
    for (const originalItem of primaryReceipt.items) { const updated = updatedReceipt.items.find(i => i.id === originalItem.id); assert.equal(String(updated.total), String(originalItem.total)); assert.equal(updated.quantity, originalItem.quantity); }
    assert.equal(updatedReceipt.items.find(i => i.id === transport.id).description, 'Synthetic pickup and delivery');
    assert.deepEqual(await p.appointment.findUnique({ where: { id: visit.id } }), visit);
    mainInput = { ...mainInput, operationKey: randomUUID(), command: { itemId: principal.id, serviceId: bath.id, staffId: null, reason: 'Synthetic principal rollback if audit fails' } };
    mainInput.command.previewToken = (await service.preview(mainInput)).previewToken;
    await assert.rejects(broken.confirm(mainInput), /Synthetic certificate failure/);
    assert.equal((await p.commission.findUnique({ where: { id: correctedPrimary.id } })).status, 'active');
    assert.equal((await p.transactionItem.findUnique({ where: { id: principal.id } })).serviceId, cut.id);
    const mainSettlement = await p.settlement.create({ data: { tenantId, staffId: people[1].id, periodStart: new Date('2026-11-16T05:00:00Z'), periodEnd: new Date('2026-11-17T04:59:59.999Z'), totalAmount: 24000 } });
    await assert.rejects(service.preview(mainInput), error => error.constructor.name === 'CommissionInActiveSettlementError');
    await p.settlement.update({ where: { id: mainSettlement.id }, data: { status: 'voided', voidedAt: new Date(), voidReason: 'Synthetic test cleanup' } });
    await p.dailyClose.create({ data: { tenantId, date: new Date('2026-11-16T00:00:00Z'), incomeTotal: 0, expenseTotal: 0, netAmount: 0, staffBreakdown: {} } });
    await assert.rejects(service.preview(mainInput), error => error.constructor.name === 'CommissionDayClosedError');
    const transportAgain = { ...transportInput, operationKey: randomUUID(), command: { ...transportInput.command, transportDescription: 'Synthetic delivery label' } };
    assert.equal((await service.preview(transportAgain)).nextStaffShare, 0); // Principal's closed day is untouched.
    assert.equal((await service.context(mainInput)).corrections.length, 2);

    const settlement = await p.settlement.create({ data: { tenantId, staffId: people[0].id, periodStart: new Date('2026-11-17T05:00:00Z'), periodEnd: new Date('2026-11-18T04:59:59.999Z'), totalAmount: 5000 } });
    await assert.rejects(service.preview(attempt), error => error.constructor.name === 'CommissionInActiveSettlementError');
    await p.settlement.update({ where: { id: settlement.id }, data: { status: 'voided', voidedAt: new Date(), voidReason: 'Synthetic fixture cleanup' } });
    await p.dailyClose.create({ data: { tenantId, date: new Date('2026-11-17T00:00:00Z'), incomeTotal: 100000, expenseTotal: 0, netAmount: 100000, staffBreakdown: {} } });
    await assert.rejects(service.preview(attempt), error => error.constructor.name === 'CommissionDayClosedError');
    await assert.rejects(service.preview(transportAgain), error => error.constructor.name === 'CommissionDayClosedError');
    assert.equal(await p.domainEvent.count({ where: { tenantId, eventType: { name: TYPE }, payload: { path: ['aggregateId'], equals: receipt.id } } }), 3);
    now = await p.transaction.findUnique({ where: { id: receipt.id } }); assert.equal(Number(now.total), 100000);
  } finally {
    // Audit is append-only. The disposable container/database is discarded, not its history rewritten.
    await p.$disconnect();
  }
});
