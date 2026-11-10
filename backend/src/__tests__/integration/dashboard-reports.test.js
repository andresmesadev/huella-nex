const express = require('express');
const request = require('supertest');
jest.mock('../../lib/prisma', () => ({
  tenant: { findUnique: jest.fn() }, transaction: { aggregate: jest.fn(), groupBy: jest.fn() }, transactionItem: { aggregate: jest.fn() },
  expense: { aggregate: jest.fn() }, user: { count: jest.fn() }, appointment: { count: jest.fn(), findMany: jest.fn() }, $transaction: jest.fn(),
  commission: { groupBy: jest.fn(), aggregate: jest.fn() }, staff: { findMany: jest.fn() },
}));
const prisma = require('../../lib/prisma');
const { allowVeterinaryDashboard } = require('../../middleware/allowVeterinaryDashboard');
const routes = require('../../routes/dashboard/reports.routes');
const { readReportPeriod, readReportYear, metric } = require('../../routes/dashboard/report-period');
function app(role = 'admin', tenantId = 'tenant-a') {
  const app = express();
  app.use((req, res, next) => { req.tenant = { tenantId }; req.actor = { type: role, email: 'reports@example.invalid' }; next(); });
  app.use(allowVeterinaryDashboard, routes); return app;
}
const aggregate = (total, count = 1) => ({ _sum: { total, amount: total, quantity: count }, _count: { _all: count } });
beforeEach(() => {
  jest.resetAllMocks();
  prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-a', name: 'Mateos prueba', activeModules: ['veterinary', 'retail', 'grooming'] });
  prisma.$transaction.mockImplementation(queries => Promise.all(queries));
  prisma.transaction.aggregate.mockResolvedValue(aggregate('12500.29'));
  prisma.expense.aggregate.mockResolvedValue(aggregate('5000.10'));
  prisma.appointment.count.mockResolvedValue(2); prisma.user.count.mockResolvedValue(1);
  prisma.appointment.findMany.mockResolvedValue([{ petId: 'pet-a' }, { petId: null }]);
  prisma.commission.groupBy.mockResolvedValue([]); prisma.commission.aggregate.mockResolvedValue({ _sum: { staffShare: null } }); prisma.staff.findMany.mockResolvedValue([]);
});

test('reports deduct the recorded professional share once, preserving movements and historical contract decisions', async () => {
  prisma.commission.groupBy.mockResolvedValue([{ staffId: 'staff-a', _sum: { staffShare: '2000.25' }, _count: { _all: 2 } }]);
  prisma.commission.aggregate.mockResolvedValue({ _sum: { staffShare: '100' } });
  prisma.staff.findMany.mockResolvedValue([{ id: 'staff-a', name: 'Profesional de prueba' }]);
  const response = await request(app()).get('/reports/summary');
  expect(response.status).toBe(200); expect(response.body.difference.value).toBe(7500.19);
  expect(response.body.professionalShare.value).toBe(2000.25); expect(response.body.afterProfessionalShare.value).toBe(5499.94);
  expect(response.body.professionals).toEqual([{ staffId: 'staff-a', name: 'Profesional de prueba', amount: 2000.25, count: 2 }]);
  expect(prisma.commission.groupBy.mock.calls[0][0].where).toEqual(expect.objectContaining({ tenantId: 'tenant-a', status: 'active', completedAt: expect.any(Object) }));
  expect(prisma.commission.groupBy.mock.calls[0][0].where).not.toHaveProperty('staff');
});

test('límites de Bogotá: antes de medianoche, febrero bisiesto y semanas entre años', () => {
  const before = new Date('2026-01-01T04:59:59Z');
  expect(readReportPeriod({}, before).current.start.toISOString()).toBe('2025-12-01T05:00:00.000Z');
  expect(readReportYear({}, before)).toBe(2025);
  const leap = readReportPeriod({ offset: '-1' }, new Date('2024-03-05T15:00:00Z'));
  expect(leap.current.end.toISOString()).toBe('2024-03-01T05:00:00.000Z');
  expect((leap.current.end - leap.current.start) / 86400000).toBe(29);
  const week = readReportPeriod({ period: 'week' }, new Date('2026-01-01T15:00:00Z'));
  expect(week.current.start.toISOString()).toBe('2025-12-29T05:00:00.000Z');
  expect(week.current.end.toISOString()).toBe('2026-01-05T05:00:00.000Z');
  expect(week.year).toBe(2025); expect(week.metadata.partial).toBe(true);
  expect(metric('0.30', '0.10', true).delta).toBe(0.2);
  expect(metric(10, 0).pct).toBeNull();
});

test('resumen aplica estado activo, tenant autenticado y centavos; mascotas sin expediente no suman', async () => {
  const response = await request(app()).get('/reports/summary?period=month&offset=0&tenantId=tenant-other');
  expect(response.status).toBe(200);
  expect(response.body.establishment).toMatchObject({ id: 'tenant-a', name: 'Mateos prueba' });
  expect(response.body).toMatchObject({ revenue: { value: 12500.29 }, expenses: { value: 5000.1 }, difference: { value: 7500.19 }, petsAttended: { value: 1 } });
  for (const mock of [prisma.transaction.aggregate, prisma.expense.aggregate]) for (const [query] of mock.mock.calls) expect(query.where).toMatchObject({ tenantId: 'tenant-a', status: 'active' });
  for (const [query] of prisma.appointment.count.mock.calls) expect(query.where.status.notIn).toEqual(['cancelled', 'no_show']);
  expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
});

test('comparación equivalente usa días de Bogotá y respeta semanas y fin de año', () => {
  const month = readReportPeriod({ comparison: 'equivalent' }, new Date('2026-10-04T04:59:59Z'));
  expect(month.current.end.toISOString()).toBe('2026-10-04T05:00:00.000Z');
  expect(month.prev.end.toISOString()).toBe('2026-09-04T05:00:00.000Z');
  expect(month.metadata.comparisonClamped).toBe(false);
  const week = readReportPeriod({ comparison: 'equivalent', period: 'week' }, new Date('2026-01-01T15:00:00Z'));
  expect(week.current.end.toISOString()).toBe('2026-01-02T05:00:00.000Z');
  expect(week.prev.end.toISOString()).toBe('2025-12-26T05:00:00.000Z');
  const year = readReportPeriod({ comparison: 'equivalent', period: 'year' }, new Date('2026-01-01T15:00:00Z'));
  expect(year.prev.end.toISOString()).toBe('2025-01-02T05:00:00.000Z');
});

test('comparación equivalente hace explícito el ajuste de meses cortos y febrero bisiesto', () => {
  const march = readReportPeriod({ comparison: 'equivalent' }, new Date('2026-03-31T15:00:00Z'));
  expect(march.prev.end.toISOString()).toBe('2026-03-01T05:00:00.000Z');
  expect(march.metadata.comparisonClamped).toBe(true);
  const leap = readReportPeriod({ comparison: 'equivalent', period: 'year' }, new Date('2024-02-29T15:00:00Z'));
  expect(leap.prev.end.toISOString()).toBe('2023-03-01T05:00:00.000Z');
  expect(leap.metadata.comparisonClamped).toBe(true);
  const february = readReportPeriod({ comparison: 'equivalent', offset: '-1' }, new Date('2026-03-15T15:00:00Z'));
  expect(february.current.end.toISOString()).toBe('2026-03-01T05:00:00.000Z');
  expect(february.prev.end.toISOString()).toBe('2026-01-29T05:00:00.000Z');
  expect(february.metadata.partial).toBe(false);
});

test('las rutas comparten fechas equivalentes y rechazan comparaciones ambiguas', async () => {
  const response = await request(app()).get('/reports/summary?comparison=equivalent');
  expect(response.status).toBe(200);
  expect(response.body.comparison).toBe('equivalent');
  for (const [query] of prisma.transaction.aggregate.mock.calls) expect(query.where.tenantId).toBe('tenant-a');
  expect(prisma.transaction.aggregate.mock.calls[0][0].where.paidAt.lt.toISOString()).toBe(response.body.rangeEnd);
  expect(prisma.transaction.aggregate.mock.calls[1][0].where.paidAt.lt.toISOString()).toBe(response.body.previousRangeEnd);
  for (const path of ['summary', 'services', 'breakdown']) for (const query of ['comparison=invalid', 'comparison=full&comparison=equivalent']) expect((await request(app()).get(`/reports/${path}?${query}`)).status).toBe(400);
});

test.each(['receptionist', 'vet', 'groomer'])('%s no tiene acceso a las cifras administrativas', async role => {
  for (const path of ['summary', 'services', 'breakdown', 'revenue-by-month', 'clients-retention']) expect((await request(app(role)).get('/reports/' + path)).status).toBe(403);
  expect(prisma.transaction.aggregate).not.toHaveBeenCalled();
});

test('rechaza períodos mal formados, futuros y sin tenant antes de consultar importes', async () => {
  for (const query of ['period=day', 'offset=1', 'offset=1.5', 'offset=wat', 'offset=-1201', 'offset=0&offset=-1']) expect((await request(app()).get('/reports/summary?' + query)).status).toBe(400);
  for (const query of ['year=9999', 'year=bad', 'year=2026&year=2025']) expect((await request(app()).get('/reports/revenue-by-month?' + query)).status).toBe(400);
  expect((await request(app('admin', null)).get('/reports/summary')).status).toBe(400);
  expect(prisma.transaction.aggregate).not.toHaveBeenCalled();
});

test('ranking usa exclusivamente citas completadas y acepta nombres arbitrarios sin colisiones', async () => {
  prisma.appointment.findMany.mockResolvedValue([{ service: { name: '__proto__' } }, { service: { name: '__proto__' } }, { serviceType: 'Baño' }]);
  const response = await request(app()).get('/reports/services?period=week&offset=-1');
  expect(response.status).toBe(200); expect(response.body).toEqual([{ name: '__proto__', count: 2 }, { name: 'Baño', count: 1 }]);
  expect(prisma.appointment.findMany.mock.calls[0][0].where).toMatchObject({ tenantId: 'tenant-a', status: 'completed' });
});

test('gráfico anual usa doce meses activos, límites inclusivo/exclusivo y año del período', async () => {
  const response = await request(app()).get('/reports/revenue-by-month?year=2025');
  expect(response.status).toBe(200); expect(response.body).toHaveLength(12);
  expect(response.body[0]).toEqual({ year: 2025, month: 1, revenue: 12500.29 });
  const first = prisma.transaction.aggregate.mock.calls[0][0].where;
  expect(first).toMatchObject({ tenantId: 'tenant-a', status: 'active' });
  expect(first.paidAt.gte.toISOString()).toBe('2025-01-01T05:00:00.000Z'); expect(first.paidAt.lt.toISOString()).toBe('2025-02-01T05:00:00.000Z');
});

test('desglose preserva método por revisar, desconocidos, tipos y diferencias sin detalle', async () => {
  prisma.transaction.groupBy.mockResolvedValue([{ paymentMethod: 'cash', ...aggregate('10.10') }, { paymentMethod: 'legacy-method', ...aggregate('30.30') }]);
  prisma.transaction.aggregate.mockResolvedValueOnce(aggregate('30.30')).mockResolvedValueOnce(aggregate('70.70', 3));
  prisma.transactionItem.aggregate.mockResolvedValueOnce(aggregate('10.10')).mockResolvedValueOnce(aggregate('30.30')).mockResolvedValueOnce(aggregate('20.20'));
  const response = await request(app()).get('/reports/breakdown');
  expect(response.status).toBe(200); expect(response.body.unallocatedTotal).toBe(10.1);
  expect(response.body.byMethod.find(row => row.method === 'review')).toMatchObject({ total: 30.3, count: 1 });
  expect(response.body.byMethod.find(row => row.method === 'cash').total).toBe(10.1);
  expect(response.body.byMethod.find(row => row.method === 'unclassified').total).toBe(30.3);
  const groupWhere = prisma.transaction.groupBy.mock.calls[0][0].where;
  expect(groupWhere).toMatchObject({ tenantId: 'tenant-a', status: 'active', NOT: { origin: 'system_appointment_completed', recordedActorId: null } });
  for (const [query] of prisma.transactionItem.aggregate.mock.calls) expect(query.where.AND[0]).toMatchObject({ transaction: { is: { tenantId: 'tenant-a', status: 'active' } } });
  expect(prisma.transactionItem.aggregate.mock.calls[1][0].where.AND[1]).toMatchObject({ productId: null, OR: [{ itemKind: 'service' }, { itemKind: { notIn: ['product', 'service'] }, transaction: { is: { origin: 'system_appointment_completed' } } }] });
});

test('actividad mantiene el contexto de seis meses y no promete clientes recurrentes', async () => {
  const response = await request(app()).get('/reports/clients-retention?period=year&offset=-1');
  expect(response.status).toBe(200); expect(response.body).toHaveLength(6);
  expect(response.body[0]).toMatchObject({ newClients: 1, returningVisits: 2 });
  for (const [query] of prisma.appointment.count.mock.calls) expect(query.where).toMatchObject({ tenantId: 'tenant-a', status: { notIn: ['cancelled', 'no_show'] } });
});

test('un error de base produce error HTTP sin devolver ceros como cifras válidas', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  prisma.transaction.aggregate.mockRejectedValue(new Error('offline'));
  try { expect((await request(app()).get('/reports/summary')).status).toBe(500); }
  finally { spy.mockRestore(); }
});


test('rango personalizado incluye ambos días de Bogotá y compara igual duración sin solapar', () => {
  const result = readReportPeriod({ period: 'custom', from: '2026-10-11', to: '2026-11-11' }, new Date('2026-11-20T15:00:00Z'));
  expect(result.current.start.toISOString()).toBe('2026-10-11T05:00:00.000Z');
  expect(result.current.end.toISOString()).toBe('2026-11-12T05:00:00.000Z');
  expect(result.prev.start.toISOString()).toBe('2026-09-09T05:00:00.000Z');
  expect(result.prev.end.toISOString()).toBe(result.current.start.toISOString());
  expect(result.current.end - result.current.start).toBe(result.prev.end - result.prev.start);
  expect(result.metadata).toMatchObject({ period: 'custom', comparison: 'full', partial: false, year: 2026 });
  const leap = readReportPeriod({ period: 'custom', from: '2024-02-29', to: '2024-02-29' }, new Date('2026-11-20T15:00:00Z'));
  expect(leap.current.end.toISOString()).toBe('2024-03-01T05:00:00.000Z');
  expect(leap.current.end - leap.current.start).toBe(86400000);
  const year = readReportPeriod({ period: 'custom', from: '2024-01-01', to: '2024-12-31' }, new Date('2026-11-20T15:00:00Z'));
  expect(year.current.end - year.current.start).toBe(366 * 86400000);
  expect(readReportYear({ period: 'custom', from: '2025-12-20', to: '2026-01-10' }, new Date('2026-11-20T15:00:00Z'))).toBe(2025);
});

test('rango personalizado aplica fechas a ingresos, gastos, comisiones y servicios con tenant autenticado', async () => {
  const query='period=custom&from=2026-10-11&to=2026-11-11&tenantId=tenant-other';
  const response=await request(app()).get('/reports/summary?'+query);
  expect(response.status).toBe(200);
  const bounds={gte:new Date('2026-10-11T05:00:00Z'),lt:new Date('2026-11-12T05:00:00Z')};
  expect(prisma.transaction.aggregate.mock.calls[0][0].where).toMatchObject({tenantId:'tenant-a',status:'active',paidAt:bounds});
  expect(prisma.expense.aggregate.mock.calls[0][0].where).toMatchObject({tenantId:'tenant-a',status:'active',date:bounds});
  expect(prisma.commission.groupBy.mock.calls[0][0].where).toMatchObject({tenantId:'tenant-a',status:'active',completedAt:bounds});
  expect(prisma.appointment.count.mock.calls[0][0].where.date).toEqual(bounds);
  prisma.appointment.findMany.mockResolvedValue([]);
  expect((await request(app()).get('/reports/services?'+query)).status).toBe(200);
  expect(prisma.appointment.findMany.mock.calls.at(-1)[0].where).toMatchObject({tenantId:'tenant-a',status:'completed',date:bounds});
});

test('rangos incompletos, imposibles, ambiguos, invertidos o excesivos no consultan datos', async () => {
  const invalid=['from=2026-10-11','from=2026-10-12&to=2026-10-11','from=2026-02-30&to=2026-03-01','from=2025-01-01&to=2026-01-02','from=9999-01-01&to=9999-01-02','from=2026-10-11&from=2026-10-12&to=2026-11-11','from=2026-10-11&to=2026-11-11&offset=-1','from=2026-10-11&to=2026-11-11&comparison=equivalent'];
  for(const endpoint of ['summary','services','breakdown','revenue-by-month'])for(const query of invalid)expect((await request(app()).get('/reports/'+endpoint+'?period=custom&'+query)).status).toBe(400);
  expect(prisma.transaction.aggregate).not.toHaveBeenCalled();expect(prisma.commission.groupBy).not.toHaveBeenCalled();
});


test('desglose personalizado filtra métodos y artículos con los mismos límites inclusivos', async () => {
 prisma.transaction.groupBy.mockResolvedValue([{paymentMethod:'cash',...aggregate('10.10')}]);
 prisma.transaction.aggregate.mockResolvedValue(aggregate('10.10'));
 prisma.transactionItem.aggregate.mockResolvedValue(aggregate('10.10'));
 const response=await request(app()).get('/reports/breakdown?period=custom&from=2026-10-11&to=2026-11-11');
 expect(response.status).toBe(200);
 const paidAt={gte:new Date('2026-10-11T05:00:00Z'),lt:new Date('2026-11-12T05:00:00Z')};
 expect(prisma.transaction.groupBy.mock.calls[0][0].where.paidAt).toEqual(paidAt);
 for(const [query] of prisma.transactionItem.aggregate.mock.calls)expect(query.where.AND[0].transaction.is).toMatchObject({tenantId:'tenant-a',status:'active',paidAt});
 expect(response.body).toMatchObject({period:'custom',rangeStart:'2026-10-11T05:00:00.000Z',rangeEnd:'2026-11-12T05:00:00.000Z'});
});
