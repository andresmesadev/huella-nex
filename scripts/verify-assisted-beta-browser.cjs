// Assisted closed-beta critical path. Local disposable harness only.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
module.exports = async ({ prisma, base, page, context, tenantId, output, check }) => {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const api = async (method, route, data, status = 200) => {
    const r = await context.request[method](base + '/api/proxy/dashboard' + route, data === undefined ? {} : { data });
    assert.equal(r.status(), status, await r.text()); return r.json();
  };
  const screenshot = async name => {
    await page.screenshot({ path: path.join(output, 'beta-' + name + '.png'), fullPage: true, animations: 'disabled' });
    fs.writeFileSync(path.join(output, 'beta-' + name + '.txt'), await page.locator('body').ariaSnapshot());
  };
  const clickResponse = async (locator, endpoint, method, status) => {
    const [r] = await Promise.all([
      page.waitForResponse(r => new URL(r.url()).pathname.endsWith(endpoint) && r.request().method() === method),
      locator.click(),
    ]);
    assert.equal(r.status(), status, await r.text()); return r.json();
  };
  try {
    await prisma.eventType.createMany({ data: [
      ['StaffRegistrado','Staff'], ['StaffActualizado','Staff'], ['ServicioCreado','Servicios'],
      ['ServicioActualizado','Servicios'], ['CitaCompletada','Agenda'], ['ComisiónRegistrada','Staff'],
      ['ComisiónAnulada','Staff'], ['CobroRegistrado','Finanzas'], ['CobroLiquidado','Finanzas'],
      ['GastoRegistrado','Finanzas'], ['CierreDíaGenerado','Finanzas'],
    ].map(([name, originContext]) => ({ name, originContext })), skipDuplicates: true });
    const hours = Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(d => [d, { active:true, open:'00:00', close:'23:59' }]));
    await api('put','/tenant/profile',{ businessHours:hours });
    await api('put','/tenant/config',{activeModules:['veterinary','grooming','retail']});
    const staff = await api('post','/staff',{name:'Profesional beta',role:'groomer'},201);
    await api('put',`/staff/${staff.id}/contract`,{contractType:'service',commissionRate:0.4});
    const service = await api('post','/services',{name:'Baño beta',category:'grooming',duration:20,basePrice:60000,requiresAppointment:true,appliesCommissionSplit:true},201);
    await api('post','/clients/with-pets',{name:'Cliente beta ficticio',phone:'5550000088',pets:[{name:'Mascota beta',type:'dog'}]},201);
    const pet = await prisma.pet.findFirstOrThrow({where:{tenantId,name:'Mascota beta'}});
    await prisma.pet.update({where:{id:pet.id},data:{defaultGroomingPrice:60000,defaultGroomingTransportMode:'none'}});
    const product = await prisma.inventoryProduct.create({data:{tenantId,name:'Champú beta',category:'Higiene',internalCode:'BETA-SHAMPOO',internalCodeKey:'beta-shampoo',presentation:'Frasco',uses:['retail'],referenceCost:2000,salePrice:5000,lotPolicy:'untracked'}});
    const lot = await prisma.inventoryLot.create({data:{tenantId,productId:product.id,groupKind:'untracked',balancePhysical:5,firstReceivedAt:new Date()}});
    check('assisted beta fixture: separate synthetic customer, 60000 service, 40% professional and five stock units; providers disabled by harness');

    await page.goto(base + '/dashboard/calendar?new=1&date=' + date);
    const booking = page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Nueva cita',exact:true})});
    await booking.getByLabel('Propietario o mascota',{exact:true}).fill('Cliente beta ficticio');
    await booking.getByRole('button',{name:'Seleccionar Mascota beta de Cliente beta ficticio',exact:true}).click();
    await booking.locator('#appointment-service').selectOption(service.id);
    await booking.locator('#appointment-date').fill(date);
    await page.waitForFunction(()=>{const e=document.querySelector('#appointment-hour');return e&&!e.disabled&&Array.from(e.options).some(o=>o.value==='0');});
    await booking.locator('#appointment-hour').selectOption('0');
    await screenshot('01-booking');
    const appt = await clickResponse(booking.getByRole('button',{name:'Crear cita',exact:true}),'/appointments','POST',201);
    assert.equal(appt.status,'arrived');
    assert.equal((await prisma.appointment.findUniqueOrThrow({where:{id:appt.id}})).staffId,staff.id);
    check('browser creates today appointment at a past reception time, assigns the professional and persists arrived status');
    await page.goto(base + '/dashboard');
    await clickResponse(page.getByRole('button',{name:'En atención: Mascota beta',exact:true}),`/appointments/${appt.id}`,'PATCH',200);
    await page.getByRole('button',{name:'Finalizar: Mascota beta',exact:true}).click();
    await clickResponse(page.getByRole('alertdialog').getByRole('button',{name:'Confirmar',exact:true}),`/appointments/${appt.id}/complete`,'POST',200);
    const charge = await prisma.transaction.findFirstOrThrow({where:{tenantId,appointmentId:appt.id}});
    assert.equal(charge.paidAt,null); assert.equal(Number(charge.total),60000);
    check('browser starts and completes the appointment; completion creates a pending charge without counting received income');
    await page.getByRole('link',{name:'Registrar pago: Mascota beta',exact:true}).click();
    await page.getByText('Cobro de la cita',{exact:true}).waitFor();
    const cart = page.locator('section').filter({has:page.getByRole('heading',{name:'Carrito',exact:true})});
    await cart.getByRole('button',{name:'Agregar domicilio',exact:true}).click();
    await page.getByRole('textbox',{name:'Precio del artículo 2',exact:true}).fill('10000');
    await cart.getByRole('button',{name:'Listo',exact:true}).click();
    await page.getByRole('combobox',{name:'Buscar artículo',exact:true}).fill(product.name);
    await page.getByRole('option').filter({hasText:product.name}).click();
    await page.getByRole('group',{name:'Método de pago',exact:true}).getByRole('button',{name:'Efectivo + transferencia',exact:true}).click();
    await page.locator('#pos-mixed-cash').fill('40000');
    await page.locator('#pos-mixed-transfer').fill('35000');
    await page.getByRole('button',{name:'Recibí el valor exacto',exact:true}).click();
    await page.reload();
    await page.getByText('Recuperamos la venta que dejaste en preparación.',{exact:true}).waitFor();
    assert.equal(await page.locator('#pos-mixed-cash').inputValue(),'40000');
    assert.equal(await page.locator('#pos-mixed-transfer').inputValue(),'35000');
    await screenshot('02-payment');
    await clickResponse(page.getByRole('button',{name:'Confirmar cobro',exact:true}),'/transactions','POST',201);
    await page.getByRole('heading',{name:'Cobro registrado',exact:true}).waitFor();
    const paid = await prisma.transaction.findUniqueOrThrow({where:{id:charge.id}});
    assert(paid.paidAt); assert.equal(paid.paymentMethod,'mixed'); assert.equal(Number(paid.total),75000);
    assert.equal(Number(paid.cashAmount),40000); assert.equal(Number(paid.transferAmount),35000);
    assert.equal(await prisma.transaction.count({where:{tenantId,appointmentId:appt.id}}),1);
    assert.equal(Number((await prisma.inventoryLot.findUniqueOrThrow({where:{id:lot.id}})).balancePhysical),4);
    const commissions = await prisma.commission.findMany({where:{tenantId,appointmentId:appt.id,status:'active'}});
    assert.equal(commissions.length,1); assert.equal(Number(commissions[0].staffShare),24000);
    assert.equal(await prisma.inventoryMovement.count({where:{tenantId,productId:product.id,kind:'sale'}}),1);
    await page.goto(base + '/dashboard'); await page.reload();
    await page.getByText('Cobrado: $ 75.000',{exact:true}).waitFor();
    assert.equal((await context.request.get(base + '/api/proxy/dashboard/cash/appointments/' + appt.id + '/checkout')).status(),409);
    await screenshot('03-paid');
    check('browser confirms 75000 mixed payment (40000 cash/35000 transfer), recovers draft, reserves 24000 commission only on service, and removes one stock unit exactly once');

    await page.goto(base + '/dashboard/pos?tab=egreso');
    await page.locator('#expense-description').fill('Insumos beta ficticios');
    await page.locator('#expense-responsible').fill('Administradora beta');
    await page.locator('#expense-amount').fill('5000');
    await clickResponse(page.getByRole('form',{name:'Registrar gasto',exact:true}).getByRole('button',{name:'Registrar gasto',exact:true}),'/expenses','POST',201);
    await page.goto(base + '/dashboard/pos?tab=caja&date=' + date);
    const opening = page.getByRole('region',{name:'Dinero base de caja',exact:true});
    await opening.getByLabel('Base de efectivo (COP)',{exact:true}).fill('20000');
    await clickResponse(opening.getByRole('button',{name:'Confirmar base',exact:true}),'/cash/opening','PUT',200);
    const panel = page.getByRole('region',{name:'Cierre del día y comisiones',exact:true});
    await panel.getByRole('button',{name:'Cerrar día',exact:true}).click();
    const dialog = page.getByRole('dialog',{name:'Guardar cierre del día',exact:true});
    await dialog.getByLabel('Efectivo que dejas para la siguiente jornada (COP)',{exact:true}).fill('20000');
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.match(await dialog.innerText(), /46\.000/);
    await screenshot('04-close-review');
    await clickResponse(dialog.getByRole('button',{name:'Confirmar cierre del día',exact:true}),'/daily-close','POST',201);
    await dialog.waitFor({state:'hidden'});
    await page.reload();
    const close = await prisma.dailyClose.findFirstOrThrow({where:{tenantId,date:new Date(date+'T00:00:00Z')}});
    assert.equal(Number(close.incomeTotal),75000); assert.equal(Number(close.expenseTotal),5000);
    const expense = await prisma.expense.findFirstOrThrow({where:{tenantId,description:'Insumos beta ficticios'}});
    assert.equal(Number(expense.amount),5000); assert.equal(expense.paymentMethod,'cash');
    assert.equal(Number(close.netAmount),70000); assert.equal(Number(close.openingCashAmount),20000); assert.equal(Number(close.retainedCashAmount),20000);
    await screenshot('05-closed');
    assert.equal((await context.request.post(base+'/api/proxy/dashboard/daily-close',{data:{date,expectedOpeningCashAmount:20000,retainedCashAmount:20000}})).status(),409);
    const evidence={date,synthetic:true,execution:'production build; real Chrome; authenticated UI mutations',fixture:'customer, pet, staff, service, stock via authenticated API/Prisma',income:75000,cashReceived:40000,transferReceived:35000,expense:5000,commissionReserve:24000,balanceAfterReserve:46000,opening:20000,retained:20000,expectedPhysicalCashBeforeCommissionPayout:55000,stockBefore:5,stockAfter:4,externalAcceptance:false};
    fs.writeFileSync(path.join(output,'assisted-beta-browser.json'),JSON.stringify(evidence,null,2));
    check('browser records expense and base, confirms mobile close, persists 75000 income/5000 expense/24000 commission reserve after reload and rejects a duplicate close');
    await page.setViewportSize({width:1440,height:1000});
  } catch(error) { await screenshot('failure').catch(()=>{}); throw error; }
};
