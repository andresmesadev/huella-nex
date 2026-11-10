// New appointment UI, synthetic GET responses; all business mutations blocked.
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function verifyBooking({page,origin,directory,today}) {
 const writes=[],slots=[],errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 const owner={id:'booking-owner',name:'PropietarioDeEjemploConNombreExtensoParaRevisarElFormulario',phone:'3000000000',pets:[{id:'booking-pet',name:'MascotaDeEjemploConNombreExtensoParaRevisarElFormulario',type:'dog'},{id:'booking-cat',name:'Gata de ejemplo',type:'cat'}]};
 const handler=async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname;
  if(req.method()!=='GET'){writes.push(p);return route.abort();}
  if(p.endsWith('/services'))return route.fulfill({json:[{id:'booking-bath',name:'Peluquería canina y felina',category:'grooming',active:true,requiresAppointment:true},{id:'booking-vaccine',name:'Vacunación',category:'veterinary',active:true,requiresAppointment:true}]});
  if(p.endsWith('/staff'))return route.fulfill({json:[{id:'booking-groomer',name:'PeluqueroDeEjemploConNombreExtensoParaRevisarElFormulario',role:'groomer',active:true},{id:'booking-vet',name:'Veterinaria de ejemplo',role:'vet',active:true}]});
  if(p.endsWith('/clients'))return route.fulfill({json:[owner]});
  if(p.endsWith('/clients/booking-owner'))return route.fulfill({json:owner});
  if(p.endsWith('/available-slots')){slots.push(Object.fromEntries(u.searchParams));return route.fulfill({json:{slots:u.searchParams.get('dateKey')===today?[10,10+20/60,11]:[]}});}
  return route.continue();
 };
 await page.route('**/api/proxy/**',handler);
 const dialog=()=>page.getByRole('dialog').last();
 async function fit(label){for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await dialog().evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));const b=await dialog().boundingBox();assert(b.x>=0&&b.x+b.width<=width+1,label+' fits '+width);assert(await dialog().evaluate(n=>n.scrollWidth<=n.clientWidth),label+' no overflow '+width);const f=await dialog().getByRole('button',{name:'Crear cita',exact:true}).boundingBox();assert(f.y>=b.y&&f.y+f.height<=b.y+b.height+1,'Footer remains visible '+width);if(width===390||width===1440)await page.screenshot({path:path.join(directory,'booking-'+label+'-'+width+'.png')});}}
 try {
  await page.goto(origin+'/dashboard/calendar?tenant=fixture-selected&date='+today,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Nueva cita',exact:true}).first().click();await dialog().locator('#appointment-client').waitFor();
  await fit('empty');
  await dialog().getByRole('button',{name:'Crear cita',exact:true}).click();assert.equal(writes.length,0);
  await dialog().locator('#appointment-client').fill('ejemplo');await dialog().getByRole('button',{name:'Seleccionar '+owner.pets[0].name+' de '+owner.name,exact:true}).click();await dialog().locator('#appointment-pet').selectOption('booking-cat');
  await dialog().locator('#appointment-service').selectOption('booking-bath');await dialog().getByText('Peluquero responsable:',{exact:false}).waitFor();await page.waitForFunction(()=>document.querySelector('#appointment-hour option[value="10"]'));
  assert.equal(slots.at(-1).staffId,'booking-groomer');await dialog().locator('#appointment-hour').selectOption('10');await fit('selected');
  await dialog().locator('#appointment-service').selectOption('booking-vaccine');await dialog().locator('#appointment-professional').selectOption('booking-vet');await page.waitForFunction(()=>!document.querySelector('#appointment-hour').disabled);assert.equal(await dialog().locator('#appointment-hour').inputValue(),'');
  const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);await dialog().locator('#appointment-date').fill(tomorrow.toISOString().slice(0,10));await dialog().getByText('No hay turnos disponibles ese día. Prueba otra fecha.',{exact:true}).waitFor();assert(await dialog().getByRole('button',{name:'Crear cita',exact:true}).isDisabled());
  await dialog().getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Seguir editando',exact:true}).click();assert.equal(await dialog().locator('#appointment-pet').inputValue(),'booking-cat');await dialog().getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Descartar cambios',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(writes.length,0);assert.deepEqual(errors,[]);assert(slots.every(s=>s.tenantId==='fixture-selected'));console.log('PASS booking: four widths, stable footer, pet search/selection, automatic groomer, vaccination, professional availability, hour reset, no slots, dirty guard. Zero business writes.');
 }catch(e){await page.screenshot({path:path.join(directory,'booking-failure.png')});throw e;}finally{await page.unroute('**/api/proxy/**',handler);page.off('pageerror',onError);}
};
