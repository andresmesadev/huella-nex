const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyBasicGrooming({ prisma, base, context, page, output, check, tenantId, reviewFixture }) {
  const db = new URL(process.env.DATABASE_URL);
  assert.equal(db.hostname, '127.0.0.1');
  assert.equal(db.pathname, '/onboarding_test');
  reviewFixture.assertLocalUrl(base);

  const apiPath = '/api/proxy/dashboard';
  async function api(method, route, data, expected = 200) {
    const options = data === undefined ? {} : { data };
    const response = await context.request[method](base + apiPath + route, options);
    assert.equal(response.status(), expected, await response.text());
    return response.json();
  }

  async function clickAndCheck(locator, route, method, expected) {
    const [response] = await Promise.all([
      page.waitForResponse(r => new URL(r.url()).pathname === apiPath + route && r.request().method() === method),
      locator.click(),
    ]);
    assert.equal(response.status(), expected, await response.text());
    return response.json();
  }

  const screenshot = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
  const hours = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => [
    day, { active: day !== 'sun', open: '09:00', close: '17:00' },
  ]));
  // Set the commercial state only on the fresh tenant in the disposable database.
  const fixture = await prisma.tenant.update({
    where: { id: tenantId, plan: 'free' },
    data: { plan: 'basic', subscriptionStatus: 'trialing' },
  });
  assert.equal(fixture.stripeSubscriptionId, null);
  await api('put', '/tenant/config', { activeModules: ['grooming'] });
  await api('put', '/tenant/profile', { businessHours: hours });

  const access = await api('get', '/access');
  assert.equal(access.role, 'admin');
  assert.deepEqual(access.activeModules, ['grooming']);
  assert(access.capabilities.agenda && access.capabilities.cash);
  assert.equal(access.capabilities.retail, false);
  assert.equal(access.capabilities.inventory_read, true);
  assert(!access.navigation.includes('/dashboard/inventory'));
  check('Básico ficticio: agenda y caja disponibles, Pet Shop e Inventario fuera de la navegación');

  await prisma.eventType.createMany({
    data: [
      ['StaffRegistrado', 'Staff'], ['ServicioCreado', 'Servicios'], ['ServicioActualizado', 'Servicios'], ['CitaCompletada', 'Agenda'],
      ['CobroRegistrado', 'Finanzas'], ['CobroLiquidado', 'Finanzas'], ['GastoRegistrado', 'Finanzas'],
      ['CierreDíaGenerado', 'Finanzas'], ['ComisiónRegistrada', 'Staff'],
    ].map(([name, originContext]) => ({ name, originContext })),
    skipDuplicates: true,
  });
  const staff = await api('post', '/staff', { name: 'Peluquera de prueba', role: 'groomer' }, 201);
  const service = (name) => api('post', '/services', {
    name, category: 'grooming', duration: 90, basePrice: null, requiresAppointment: true, appliesCommissionSplit: false,
  }, 201);
  const dogService = await service('Peluquería canina QA');
  const catService = await service('Peluquería felina QA');
  assert.equal(await prisma.service.count({
    where: { tenantId, id: { in: [dogService.id, catService.id] }, duration: 90, basePrice: null, appliesCommissionSplit: false },
  }), 2);

  const { owner, pets } = await api('post', '/clients/with-pets', {
    name: 'Cliente de peluquería QA', phone: '000000006502',
    pets: [{ name: 'Nube QA', type: 'dog' }, { name: 'Mota QA', type: 'cat' }, { name: 'Luna QA', type: 'dog' }],
  }, 201);
  const slots = async dateKey => {
    const query = new URLSearchParams({ dateKey, serviceId: dogService.id, staffId: staff.id });
    return (await api('get', '/appointments/available-slots?' + query)).slots.map(hour => Math.round(hour * 60));
  };
  const saturday = '2099-01-03';
  const reception = await slots(saturday);
  assert.deepEqual(reception, Array.from({ length: 24 }, (_, i) => 540 + i * 20));
  assert.deepEqual(await slots('2099-01-04'), []);
  assert.deepEqual(await slots('2099-01-05'), reception);
  const appointment = (pet, chosenService, hour, expected = 201) => api('post', '/appointments', {
    userId: owner.id, petId: pet.id, serviceId: chosenService.id, staffId: staff.id, dateKey: saturday, hour,
  }, expected);
  const first = await appointment(pets[0], dogService, 9);
  assert((await slots(saturday)).includes(560));
  const second = await appointment(pets[1], catService, 9 + 20 / 60);
  const rows = await prisma.appointment.findMany({ where: { tenantId, id: { in: [first.id, second.id] } }, include: { service: true } });
  assert.equal(rows.length, 2);
  assert(rows.every(row => row.staffId === staff.id && row.service.duration === 90));
  await appointment(pets[2], dogService, 17, 409);
  check('Con solo el horario habitual, la última recepción es 16:40 y se pueden cruzar servicios de 90 minutos');

  await page.goto(base + '/dashboard/settings?tab=agenda');
  const hoursForm = page.getByRole('form', { name: 'Horario habitual y horarios por área' });
  await hoursForm.getByLabel('Configurar horario propio de peluquería', { exact: true }).check();
  const groomingHours = hoursForm.getByRole('region', { name: 'Horario de peluquería' });
  await groomingHours.getByLabel('Peluquería: cierre Lunes', { exact: true }).fill('17:20');
  await groomingHours.getByRole('button', { name: 'Copiar lunes a días abiertos', exact: true }).click();
  await clickAndCheck(hoursForm.getByRole('button', { name: 'Guardar horarios', exact: true }), '/tenant/profile', 'PUT', 200);
  await page.reload();
  const savedHours = (await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { businessHours: true } })).businessHours;
  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
    assert.deepEqual(savedHours[day], { active: true, open: '09:00', close: '17:00' });
    assert.deepEqual(savedHours.services.grooming[day], { active: true, open: '09:00', close: '17:20' });
  }
  await groomingHours.getByLabel('Peluquería: cierre Sábado', { exact: true }).waitFor();
  assert.equal(await groomingHours.getByLabel('Peluquería: cierre Sábado', { exact: true }).inputValue(), '17:20');
  assert.deepEqual(await slots('2099-01-05'), [...reception, 1020]);
  assert.deepEqual(await slots('2099-01-04'), []);
  await screenshot('horarios-separados');
  await page.goto(base + '/dashboard/calendar?new=1&date=' + saturday);
  const lateBooking = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Nueva cita', exact: true }) });
  await lateBooking.getByLabel('Propietario o mascota', { exact: true }).fill('Luna QA');
  await lateBooking.getByRole('button', { name: 'Seleccionar Luna QA de Cliente de peluquería QA', exact: true }).click();
  await lateBooking.locator('#appointment-service').selectOption(dogService.id);
  await lateBooking.locator('#appointment-date').fill(saturday);
  await lateBooking.locator('#appointment-hour').selectOption('17');
  await screenshot('agenda-turno-17');
  const late = await clickAndCheck(lateBooking.getByRole('button', { name: 'Crear cita', exact: true }), '/appointments', 'POST', 201);
  assert.equal(late.date, saturday + 'T22:00:00.000Z');
  await page.goto(base + '/dashboard/calendar?date=' + saturday);
  const timeGrid = page.getByRole('region', { name: 'Calendario de citas' });
  await timeGrid.getByText(/^(17:00|5:00 pm)$/).waitFor();
  await timeGrid.getByRole('button', { name: /^Luna QA, propietario Cliente de peluquería QA,/ }).waitFor();
  const nav = page.getByRole('navigation', { name: 'Navegación del dashboard' });
  await nav.getByRole('link', { name: 'Agenda', exact: true }).waitFor();
  assert.equal(await nav.getByRole('link', { name: 'Inventario', exact: true }).count(), 0);
  await screenshot('agenda-cuadricula-17');
  check('La cuadrícula muestra la franja de las 17:00 y su cita; el menú de Peluquería oculta Inventario');
  await appointment(pets[2], dogService, 17 + 20 / 60, 409);
  assert((await slots(saturday)).includes(580));
  check('Horario propio guardado desde Configuración: local hasta 17:00, Peluquería hasta 17:20, cita a las 17:00 creada desde Agenda y 17:20 rechazada');

  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  await page.goto(base + '/dashboard/calendar?new=1&date=' + date);
  const booking = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Nueva cita', exact: true }) });
  await booking.getByLabel('Propietario o mascota', { exact: true }).fill('Nube QA');
  await booking.getByRole('button', { name: 'Seleccionar Nube QA de Cliente de peluquería QA', exact: true }).click();
  await booking.locator('#appointment-service').selectOption(dogService.id);
  await booking.locator('#appointment-date').fill(date);
  await booking.locator('#appointment-hour').selectOption('9');
  await screenshot('agenda');
  const visit = await clickAndCheck(booking.getByRole('button', { name: 'Crear cita', exact: true }), '/appointments', 'POST', 201);

  const visitUrl = '/appointments/' + visit.id;
  if (visit.status !== 'arrived') await api('patch', visitUrl, { status: 'arrived' });
  await api('patch', visitUrl, { status: 'in_progress' });
  await api('post', visitUrl + '/complete', {}, 422);
  assert.equal(await prisma.transaction.count({ where: { tenantId, appointmentId: visit.id } }), 0);
  await api('patch', visitUrl + '/agreed-price', { price: 65000 });
  await api('post', visitUrl + '/complete', {});
  const charge = await prisma.transaction.findFirstOrThrow({ where: { tenantId, appointmentId: visit.id } });
  assert.equal(Number(charge.total), 65000);
  assert.equal(charge.paidAt, null);
  const allocations = await prisma.commission.findMany({ where: { tenantId, appointmentId: visit.id } });
  assert.equal(allocations.length, 1);
  assert.equal(Number(allocations[0].staffShare), 0);
  assert.equal(Number(allocations[0].businessShare), 65000);
  check('Cita creada desde Agenda: requiere precio acordado antes de finalizar, genera un cobro pendiente de 65000 y cero comisión a la profesional');

  await page.goto(base + '/dashboard');
  await page.getByRole('link', { name: 'Registrar pago: Nube QA', exact: true }).click();
  await page.getByText('Cobro de la cita', { exact: true }).waitFor();
  await page.getByRole('group', { name: 'Método de pago', exact: true }).getByRole('button', { name: 'Efectivo + transferencia', exact: true }).click();
  await page.locator('#pos-mixed-cash').fill('35000');
  await page.locator('#pos-mixed-transfer').fill('30000');
  await page.getByRole('button', { name: 'Recibí el valor exacto', exact: true }).click();
  await screenshot('cobro');
  await clickAndCheck(page.getByRole('button', { name: 'Confirmar cobro', exact: true }), '/transactions', 'POST', 201);
  await page.getByRole('heading', { name: 'Cobro registrado', exact: true }).waitFor();
  const paid = await prisma.transaction.findUniqueOrThrow({ where: { id: charge.id } });
  assert(paid.paidAt);
  assert.equal(paid.paymentMethod, 'mixed');
  assert.equal(Number(paid.cashAmount), 35000);
  assert.equal(Number(paid.transferAmount), 30000);
  await api('get', '/cash/appointments/' + visit.id + '/checkout', undefined, 409);
  assert.equal(await prisma.transaction.count({ where: { tenantId, appointmentId: visit.id } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { tenantId } }), 0);
  check('Caja: cobro único desde el navegador por 35000 en efectivo y 30000 en transferencia, sin movimientos de inventario');

  await api('put', '/cash/opening', { date, amount: 20000 });
  await api('post', '/expenses', {
    amount: 5000, category: 'other', description: 'Insumos de prueba', responsible: 'Administradora QA', paymentMethod: 'cash',
  }, 201);
  await page.goto(base + '/dashboard/pos?tab=caja&date=' + date);
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.getByRole('region', { name: 'Cierre del día y comisiones', exact: true });
  await panel.getByRole('button', { name: 'Cerrar día', exact: true }).click();
  const closeDialog = page.getByRole('dialog', { name: 'Guardar cierre del día', exact: true });
  await closeDialog.getByLabel('Efectivo que dejas para la siguiente jornada (COP)', { exact: true }).fill('20000');
  await clickAndCheck(closeDialog.getByRole('button', { name: 'Confirmar cierre del día', exact: true }), '/daily-close', 'POST', 201);
  await page.reload();
  await page.getByRole('button', { name: 'Día cerrado', exact: true }).waitFor();
  const close = await prisma.dailyClose.findFirstOrThrow({ where: { tenantId, date: new Date(date + 'T00:00:00Z') } });
  assert.equal(Number(close.incomeTotal), 65000);
  assert.equal(Number(close.expenseTotal), 5000);
  assert.equal(Number(close.netAmount), 60000);
  assert.equal(Number(close.openingCashAmount), 20000);
  assert.equal(Number(close.retainedCashAmount), 20000);
  await api('post', '/daily-close', { date }, 409);
  const history = await api('get', '/financial-history?' + new URLSearchParams({ from: date, to: date }));
  assert.equal(history.days[0].staffCommissionTotal, 0);
  assert.equal(history.days[0].netAfterCommissions, 60000);
  assert.equal(reviewFixture.stripeCalls.length, 0);
  await screenshot('cierre-movil');
  check('Cierre móvil persistido: ingreso 65000, gasto 5000, saldo 60000 y base retenida 20000; segundo cierre rechazado');

  await page.goto(base + '/dashboard/inventory');
  await page.waitForURL(base + '/dashboard');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await api('put', '/tenant/config', { activeModules: ['grooming', 'retail'] });
  assert((await api('get', '/access')).navigation.includes('/dashboard/inventory'));
  await page.goto(base + '/dashboard/inventory');
  await page.getByRole('navigation', { name: 'Navegación del dashboard' }).getByRole('link', { name: 'Inventario', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  check('Inventario aparece al activar Pet Shop y la ruta directa vuelve a Inicio si Pet Shop está apagado');

  fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({
    date, synthetic: true, plan: 'basic', localTrialFixture: true, externalAcceptance: false, activeModules: access.activeModules,
    inventoryVisibleWithoutRetail: false, inventoryVisibleWithRetail: true, stockMovements: 0, staffCommission: 0, internalAllocationRows: 1, receptionIntervalMinutes: 20, durationMinutes: 90,
    generalClosing: '17:00', groomingClosing: '17:20', lastStartWithGeneralHours: '16:40',
    lastStartWithGroomingHours: '17:00', acceptsStartAt17: true, acceptsStartAt1720: false, allowsOverlapsForSameStaff: true,
    income: 65000, cash: 35000, transfer: 30000, expense: 5000, net: 60000, opening: 20000, retained: 20000,
    expectedCashBeforeWithdrawal: 50000, stripeCalls: reviewFixture.stripeCalls.length,
  }, null, 2) + '\n');
};
