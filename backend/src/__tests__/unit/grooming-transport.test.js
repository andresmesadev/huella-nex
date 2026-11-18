const { resolveAppointmentTotal } = require('../../services/domain/price-resolver.service');
const { prepareTransport, assertTransportCanChange, transportFromPetPreference } = require('../../services/grooming-transport.service');
const { createCompleteAppointmentUseCase } = require('../../contexts/agenda/application/use-cases/complete-appointment.usecase');

const base = { id: 'appointment-a', tenantId: 'tenant-a', userId: 'owner-a', petId: 'pet-a', date: new Date('2026-10-16T15:00:00Z'), serviceType: 'grooming', status: 'in_progress',
  transportMode: 'round_trip', transportPrice: null, pet: { defaultGroomingPrice: 95000, defaultGroomingWithTransportPrice: 103000 }, service: { basePrice: 50000, category: { name: 'grooming' }, priceRules: [] } };
const zone = { id: 'zone-a', name: 'Zona A', tenantId: 'tenant-a', roundTripPrice: 12000, pickupPrice: null, deliveryPrice: 9000 };

test('una nueva visita conserva 60.000 de servicio y añade los 20.000 habituales, sin incluirlos en comisión', async () => {
  const pet = { defaultGroomingPrice: 60000, defaultGroomingTransportMode: 'round_trip', defaultGroomingTransportPrice: 20000 };
  const transport = transportFromPetPreference({ pet, owner: { address: 'Dirección de prueba', neighborhood: 'Barrio de prueba' }, canConfirm: true });
  const prepared = await prepareTransport({ appointment: { ...base, pet }, transport, canConfirm: true }, {});
  expect(prepared.data).toMatchObject({ transportMode: 'round_trip', transportPrice: 20000, transportAddress: 'Dirección de prueba' });
  expect(prepared.quote).toMatchObject({ servicePrice: 60000, transportPrice: 20000, totalPrice: 80000 });
});

test.each([0, null])('la tarifa habitual %p distingue gratuidad de importe pendiente', async fee => {
  const pet = { defaultGroomingPrice: 60000, defaultGroomingTransportMode: 'round_trip', defaultGroomingTransportPrice: fee };
  const transport = transportFromPetPreference({ pet, owner: { address: 'Dirección' }, canConfirm: true });
  const prepared = await prepareTransport({ appointment: { ...base, pet }, transport, canConfirm: true }, {});
  expect(prepared.data.transportPrice).toBe(fee);
  expect(prepared.quote.transportPending).toBe(fee === null);
});

test('una preferencia sin dirección no permite guardar un domicilio incompleto', async () => {
  const pet = { defaultGroomingTransportMode: 'round_trip', defaultGroomingTransportPrice: 20000 };
  const transport = transportFromPetPreference({ pet, canConfirm: true });
  await expect(prepareTransport({ appointment: { ...base, pet }, transport, canConfirm: true }, {})).rejects.toMatchObject({ code: 'GROOMING_TRANSPORT' });
});

test('una dirección completada para esta visita permite guardar el traslado y conserva el acuerdo de la mascota', async () => {
  const pet = { defaultGroomingPrice: 60000, defaultGroomingTransportMode: 'round_trip', defaultGroomingTransportPrice: 20000 };
  const owner = { address: null, neighborhood: null };
  const transport = transportFromPetPreference({ pet, owner, canConfirm: true, contact: { address: 'Calle ficticia 10', neighborhood: 'Barrio de prueba' } });
  const prepared = await prepareTransport({ appointment: { ...base, pet }, transport, canConfirm: true }, {});
  expect(prepared.data).toMatchObject({ transportAddress: 'Calle ficticia 10', transportNeighborhood: 'Barrio de prueba', transportPrice: 20000 });
  expect(prepared.quote.totalPrice).toBe(80000);
  expect(owner).toEqual({ address: null, neighborhood: null });
});

test.each(['none', null])('una dirección explícita no inventa una modalidad cuando la preferencia es %p', mode => {
  expect(() => transportFromPetPreference({ pet: { defaultGroomingTransportMode: mode }, contact: { address: 'Dirección ficticia' } })).toThrow();
});

test('copiar una preferencia no concede permiso para confirmar tarifas', async () => {
  const pet = { defaultGroomingTransportMode: 'pickup', defaultGroomingTransportPrice: 20000 };
  const transport = transportFromPetPreference({ pet, owner: { address: 'Dirección' } });
  const prepared = await prepareTransport({ appointment: { ...base, pet }, transport }, {});
  expect(transport).not.toHaveProperty('amount');
  expect(prepared.data).toMatchObject({ transportMode: 'pickup', transportPrice: null });
});

test('una tarifa aislada no inventa recogida y la llegada al centro no cobra domicilio', async () => {
  expect(transportFromPetPreference({ pet: { defaultGroomingTransportPrice: 20000 }, canConfirm: true })).toBeUndefined();
  const transport = transportFromPetPreference({ pet: { defaultGroomingTransportMode: 'none', defaultGroomingTransportPrice: 20000 }, canConfirm: true });
  const prepared = await prepareTransport({ appointment: base, transport, canConfirm: true }, {});
  expect(prepared.quote.transportPrice).toBe(0);
});

test('un importe independiente de domicilio no cambia al cambiar el precio del servicio', () => {
  const appointment = { ...base, pet: { ...base.pet, defaultGroomingTransportPrice: 8000 }, finalPrice: 100000 };
  expect(resolveAppointmentTotal(appointment, zone)).toMatchObject({ servicePrice: 100000, transportReferencePrice: 8000, quotedTotalPrice: 108000 });
  expect(resolveAppointmentTotal({ ...appointment, transportMode: 'pickup' }, zone).transportReferencePrice).toBeNull();
});

test('respeta el total particular antes de la zona y separa 95.000 de peluquería y 8.000 de transporte', () => {
  const pending = resolveAppointmentTotal(base, zone);
  expect(pending).toMatchObject({ servicePrice: 95000, transportReferencePrice: 8000, transportReferenceSource: 'pet_agreement', transportPending: true, totalPrice: null });
  const confirmed = resolveAppointmentTotal({ ...base, transportPrice: 8000 });
  expect(confirmed).toMatchObject({ finalPrice: 95000, servicePrice: 95000, transportPrice: 8000, totalPrice: 103000 });
});

test('un total con domicilio aislado no inventa base de comisión a partir del catálogo', () => {
  const result = resolveAppointmentTotal({ ...base, pet: { defaultGroomingPrice: null, defaultGroomingWithTransportPrice: 103000 } }, zone);
  expect(result.transportReferencePrice).toBeNull(); expect(result.totalPrice).toBeNull();
  expect(result.agreedWithTransportTotal).toBe(103000);
});

test('ningún trayecto único se cobra a la mitad de ida y vuelta ni usa automáticamente el total pactado', () => {
  expect(resolveAppointmentTotal({ ...base, transportMode: 'pickup' }, zone).transportReferencePrice).toBeNull();
  expect(resolveAppointmentTotal({ ...base, transportMode: 'delivery' }, zone).transportReferencePrice).toBe(9000);
});

test('precio cero confirmado y traslado al centro son conocidos; transporte pendiente no es gratuito', () => {
  expect(resolveAppointmentTotal({ ...base, transportPrice: 0 }).totalPrice).toBe(95000);
  expect(resolveAppointmentTotal({ ...base, transportMode: 'none' }).totalPrice).toBe(95000);
  expect(resolveAppointmentTotal(base).totalPrice).toBeNull();
});

test('una referencia de zona no se aplica hasta la confirmación explícita', async () => {
  const client = { groomingTransportZone: { findFirst: jest.fn().mockResolvedValue(zone) } };
  const result = await prepareTransport({ appointment: base, transport: { mode: 'round_trip', address: 'Dirección confirmada', zoneId: zone.id }, canConfirm: true }, client);
  expect(result.data.transportPrice).toBeNull();
  const confirmed = await prepareTransport({ appointment: base, transport: { mode: 'round_trip', address: 'Dirección confirmada', zoneId: zone.id, confirmed: true }, canConfirm: true }, client);
  expect(confirmed.data).toMatchObject({ transportPrice: 8000, transportPriceSource: 'pet_agreement', transportZoneName: 'Zona A' });
});

test('el equipo confirma excepciones sin multiplicar el valor por mascotas', async () => {
  const result = await prepareTransport({ appointment: base, canConfirm: true, transport: { mode: 'round_trip', address: 'Dirección confirmada', amount: 17000, confirmed: true, scope: 'Incluye Luna y Toby' } }, {});
  expect(result.data.transportPrice).toBe(17000);
  expect(result.quote.totalPrice).toBe(112000);
});

test('recepción puede solicitar domicilio pendiente pero no confirmar importes', async () => {
  expect((await prepareTransport({ appointment: base, transport: { mode: 'pickup', address: 'Dirección' } }, {})).data.transportPrice).toBeNull();
  await expect(prepareTransport({ appointment: base, transport: { mode: 'pickup', address: 'Dirección', amount: 0, confirmed: true } }, {})).rejects.toMatchObject({ status: 403 });
});

test('una zona de otro establecimiento no aporta tarifa', async () => {
  const findFirst = jest.fn().mockResolvedValue(null);
  await expect(prepareTransport({ appointment: base, canConfirm: true, transport: { mode: 'round_trip', address: 'Dirección', zoneId: 'foreign' } }, { groomingTransportZone: { findFirst } })).rejects.toMatchObject({ status: 404 });
  expect(findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', tenantId: 'tenant-a', active: true } });
});

test('compartir domicilio lo cobra una sola cita y exige mismo propietario, fecha y establecimiento', async () => {
  const parent = { ...base, id: 'parent', transportPrice: 8000 };
  const result = await prepareTransport({ appointment: base, canConfirm: true, transport: { mode: 'shared', sharedWithId: parent.id } }, { appointment: { findFirst: jest.fn().mockResolvedValue(parent) } });
  expect(result.data).toMatchObject({ transportPrice: 0, transportSharedWithId: 'parent' });
  expect(result.quote.totalPrice).toBe(95000);
  await expect(prepareTransport({ appointment: base, canConfirm: true, transport: { mode: 'shared', sharedWithId: base.id } }, {})).rejects.toMatchObject({ status: 422 });
  await expect(prepareTransport({ appointment: base, canConfirm: true, transport: { mode: 'shared', sharedWithId: 'foreign' } }, { appointment: { findFirst: jest.fn().mockResolvedValue(null) } })).rejects.toMatchObject({ status: 422 });
});

test('un cobro que cubre otras citas no se retira ni vuelve a pendiente', async () => {
  await expect(assertTransportCanChange({ appointment: { count: jest.fn().mockResolvedValue(1) } }, base, { transportMode: 'none', transportPrice: null })).rejects.toMatchObject({ status: 422 });
});

test('completar congela peluquería y transporte, y publica bases distintas para comisión y cobro', async () => {
  const appointment = { ...base, transportPrice: 8000 };
  const repository = { findById: jest.fn().mockResolvedValue(appointment), markCompleted: jest.fn().mockResolvedValue({ ...appointment, status: 'completed' }) };
  const publish = jest.fn(); const context = { tx: {} };
  const execute = createCompleteAppointmentUseCase({ appointmentRepository: repository, priceResolution: { resolve: resolveAppointmentTotal }, unitOfWork: { run: fn => fn(context) }, eventPublisher: { publish } });
  await execute({ tenantId: base.tenantId, appointmentId: base.id });
  expect(repository.markCompleted).toHaveBeenCalledWith(base.id, expect.any(Date), 95000, context, 8000);
  expect(publish).toHaveBeenCalledWith('CitaCompletada', expect.objectContaining({ resolvedPrice: 95000, totalPrice: 103000, transportPrice: 8000 }), context);
});

test('no completa ni crea hechos financieros mientras el transporte esté pendiente', async () => {
  const markCompleted = jest.fn(), publish = jest.fn();
  const execute = createCompleteAppointmentUseCase({ appointmentRepository: { findById: async () => base, markCompleted }, priceResolution: { resolve: resolveAppointmentTotal }, unitOfWork: { run: fn => fn({}) }, eventPublisher: { publish } });
  await expect(execute({ tenantId: base.tenantId, appointmentId: base.id })).rejects.toThrow();
  expect(markCompleted).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled();
});

test('persiste barrio por separado y lo limpia cuando la mascota viene al centro', async () => {
  const result = await prepareTransport({ appointment: base, canConfirm: true, transport: {
    mode: 'round_trip', address: 'Dirección de prueba', neighborhood: '  Barrio de prueba  ', amount: 0, confirmed: true,
  } }, {});
  expect(result.data).toMatchObject({ transportAddress: 'Dirección de prueba', transportNeighborhood: 'Barrio de prueba', transportPrice: 0 });
  const none = await prepareTransport({ appointment: { ...base, ...result.data }, transport: { mode: 'none' } }, {});
  expect(none.data).toMatchObject({ transportNeighborhood: null, transportAddress: null });
});

test('un consumidor anterior sin barrio conserva el dato existente; vacío explícito lo borra', async () => {
  const appointment = { ...base, transportNeighborhood: 'Barrio anterior' };
  const transport = { mode: 'round_trip', address: 'Dirección', confirmed: true };
  const kept = await prepareTransport({ appointment, transport, canConfirm: true }, {});
  expect(kept.data.transportNeighborhood).toBe('Barrio anterior');
  const cleared = await prepareTransport({ appointment, transport: { ...transport, neighborhood: '' }, canConfirm: true }, {});
  expect(cleared.data.transportNeighborhood).toBeNull();
});

test.each([123, 'x'.repeat(201)])('rechaza barrio inválido sin afectar el contrato de precios', async neighborhood => {
  await expect(prepareTransport({ appointment: base, transport: { mode: 'round_trip', address: 'Dirección', neighborhood } }, {})).rejects.toMatchObject({ status: 400 });
});
