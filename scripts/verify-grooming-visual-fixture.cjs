// Synthetic browser flow: every mutation is fulfilled in memory, never sent to a database.
const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async function verifyGrooming({page, origin, directory, today}) {
 const mutations=[], unexpected=[], errors=[];
 const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 const make=(id,status)=>({id,date:today+'T12:00:00-05:00',status,serviceType:'bath',serviceCategory:'grooming',serviceName:'Peluquería de ejemplo',petName:'Ejemplo '+id,petType:'dog',petId:'grooming-pet',clientName:'PropietarioDeEjemploConNombreExtensoParaRevisarElDiseño',clientPhone:'3000000000',staffId:'groomer',staffName:'Peluquero de ejemplo',finalPrice:60000,hasResolvedPrice:true,priceResolution:{servicePrice:60000},groomingNotes:'',groomingNotesVersion:0,groomingDeliveredAt:null});
 const visits=[{...make('llegada','confirmed'),date:new Date(Date.now()+300000).toISOString()},make('espera','arrived'),make('corte','in_progress'),make('lista','completed'),{...make('sinprecio','in_progress'),finalPrice:null,hasResolvedPrice:false,priceResolution:null}];
 const handler=async route=>{const req=route.request(),url=new URL(req.url()),pathname=url.pathname;
  if(req.method()!=='GET') {
   const id=pathname.match(/appointments\/([^/]+)/)?.[1],visit=visits.find(v=>v.id===id);
   if(visit && ((req.method()==='PATCH' && pathname.endsWith('/'+id)) || (req.method()==='PUT' && pathname.endsWith('/notes')) || (req.method()==='POST' && /\/(complete|delivery)$/.test(pathname)))) {
    mutations.push({method:req.method(),path:pathname,tenant:url.searchParams.get('tenantId')});
    const body=req.postDataJSON();
    if(pathname.endsWith('/notes')) {assert.equal(body.expectedVersion,visit.groomingNotesVersion);visit.groomingNotes=body.notes;visit.groomingNotesVersion++;}
    else if(pathname.endsWith('/complete'))visit.status='completed';
    else if(pathname.endsWith('/delivery'))visit.groomingDeliveredAt=new Date().toISOString();
    else visit.status=body.status;
    return route.fulfill({json:visit});
   }
   unexpected.push(pathname);return route.abort();
  }
  if(pathname.endsWith('/staff'))return route.fulfill({json:[{id:'groomer',name:'Peluquero de ejemplo',role:'groomer',active:true}]});
  if(pathname.endsWith('/grooming/appointments'))return route.fulfill({json:{appointments:visits,hasMore:false}});
  if(pathname.endsWith('/pets/grooming-pet'))return route.fulfill({json:{breed:'Raza de ejemplo',operationalAlerts:'Cuidado ficticio: piel sensible; revisar antes de empezar.',owner:{name:'Propietario de ejemplo',phone:'3000000000'}}});
  if(pathname.includes('/grooming/pets/'))return route.fulfill({json:{visits:[],nextCursor:null}});
  return route.continue();
 };
 await page.route('**/api/proxy/**',handler);
 const row=id=>page.locator('article').filter({has:page.getByRole('heading',{name:'Ejemplo '+id,exact:true})});
 const dialog=()=>page.getByRole('dialog').last();
 async function fit(label){for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(await dialog().count()){await dialog().evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));const box=await dialog().boundingBox();assert(box.x>=0 && box.x+box.width<=width+1,label+' fits '+width);assert(await dialog().evaluate(n=>n.scrollWidth<=n.clientWidth),label+' content fits '+width);if(width>=768 && ['appointment-detail','veterinary-detail'].includes(label)){const boxes=await dialog().locator('[data-appointment-cards]').evaluate(n=>Array.from(n.children).map(c=>{const r=c.getBoundingClientRect();return {w:r.width,h:r.height,y:r.y};}));assert.equal(boxes.length,2);assert(Math.abs(boxes[0].w-boxes[1].w)<2,label+' equal widths');assert(Math.abs(boxes[0].h-boxes[1].h)<2,label+' equal heights');assert(Math.abs(boxes[0].y-boxes[1].y)<2,label+' aligned tops');}}else assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),label+' page fits '+width);if(width===390 || width===1440)await page.screenshot({path:path.join(directory,'grooming-'+label+'-'+width+'.png')});}}
 try {
  await page.goto(origin+'/dashboard/peluqueria?tenant=fixture-selected&q=Ejemplo',{waitUntil:'networkidle'});
  await row('espera').waitFor();
  assert.equal(await page.getByRole('group',{name:'Modo de peluquería',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Vista completa',exact:true}).count(),0);
  assert.equal(await page.locator('#grooming-staff').isVisible(),false);
  await fit('quick');
  await row('llegada').getByRole('button',{name:'Registrar llegada',exact:true}).click();await row('llegada').getByRole('button',{name:'Preparar atención',exact:true}).waitFor();
  await row('sinprecio').getByRole('button',{name:'Acciones',exact:true}).click();await page.getByRole('menuitem',{name:'Colocar precio',exact:true}).waitFor();await page.getByRole('menuitem',{name:'Cuidados y notas',exact:true}).waitFor();await page.keyboard.press('Escape');
  await page.locator('summary').filter({hasText:'Más filtros'}).click();await page.locator('#grooming-staff').waitFor();
  await page.locator('summary').filter({hasText:'Más filtros'}).click();assert.equal(await page.locator('#grooming-staff').isVisible(),false);
  await row('corte').getByRole('button',{name:'Acciones',exact:true}).click();await page.getByRole('menuitem',{name:'Ver cita',exact:true}).click();await dialog().getByRole('heading',{name:'Datos de la cita',exact:true}).waitFor();
  await fit('appointment-detail');
  const other=dialog().locator('details').filter({has:page.locator('summary').filter({hasText:'Otras acciones'})});
  if(await other.count()){assert.equal(await other.getAttribute('open'),null);await other.locator('summary').click();}
  await dialog().getByRole('button',{name:'Cambiar precio',exact:true}).click();await dialog().locator('#appointment-price').fill('62000');await fit('appointment-price');
  await page.keyboard.press('Escape');await page.getByRole('alertdialog').getByRole('button',{name:'Seguir editando',exact:true}).click();assert.equal(await dialog().locator('#appointment-price').inputValue(),'62000');await page.keyboard.press('Escape');await page.getByRole('alertdialog').getByRole('button',{name:'Descartar cambios',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await row('espera').getByRole('button',{name:'Acciones',exact:true}).click();await page.getByRole('menuitem',{name:'Ver cita',exact:true}).click();const extra=dialog().locator('details').filter({has:page.locator('summary').filter({hasText:'Otras acciones'})});assert.equal(await extra.getByRole('button',{name:'No asistió',exact:true}).isVisible(),false);await extra.locator('summary').click();await extra.getByRole('button',{name:'No asistió',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar',exact:true}).click();await dialog().getByRole('button',{name:'Cerrar ficha',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await row('espera').getByRole('button',{name:'Preparar atención',exact:true}).click();
  await dialog().getByText('Cuidado ficticio: piel sensible; revisar antes de empezar.',{exact:true}).waitFor();
  assert.equal(await dialog().locator('#grooming-notes').isVisible(),false);
  await fit('prepare');
  await dialog().getByText('Notas de esta visita (opcionales)',{exact:true}).click();await dialog().locator('#grooming-notes').fill('Nota ficticia guardada solo en memoria.');
  assert(await dialog().getByRole('button',{name:'Iniciar baño o corte',exact:true}).isDisabled());
  await dialog().getByRole('button',{name:'Cerrar',exact:true}).first().click();await dialog().getByRole('button',{name:'Seguir escribiendo',exact:true}).click();
  await dialog().getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Tienes cambios sin guardar',{exact:true}).waitFor({state:'hidden'});
  await dialog().getByRole('button',{name:'Iniciar baño o corte',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await row('espera').getByRole('button',{name:'Terminar servicio',exact:true}).waitFor();
  await row('sinprecio').getByRole('button',{name:'Terminar servicio',exact:true}).click();
  assert(await dialog().getByRole('button',{name:'Terminar servicio',exact:true}).isDisabled());
  await dialog().getByRole('button',{name:'Volver',exact:true}).click();
  await row('corte').getByRole('button',{name:'Terminar servicio',exact:true}).click();await fit('finish');
  assert(await dialog().getByRole('button',{name:'Terminar servicio',exact:true}).isEnabled());
  await dialog().getByRole('button',{name:'Terminar servicio',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await row('corte').getByRole('button',{name:'Registrar entrega',exact:true}).waitFor();
  await row('corte').getByRole('button',{name:'Registrar entrega',exact:true}).click();await dialog().getByRole('button',{name:'Confirmar entrega al propietario',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await row('corte').getByText('Entregadas',{exact:true}).waitFor();
  await page.goto(origin+'/dashboard?tenant=fixture-selected',{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Abrir cita de Mascota historia,/}).click();await dialog().getByRole('region',{name:'Cobro de la atención',exact:true}).waitFor();await fit('veterinary-detail');assert.equal(await dialog().getByRole('region',{name:'Domicilio de peluquería',exact:true}).count(),0);await dialog().getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  assert.equal(mutations.length,5);assert(mutations.every(m=>m.tenant==='fixture-selected'));assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  console.log('PASS grooming: quick-only, expandable filters, optional notes and dirty guard, care visible before starting, price guard, completion independent from delivery, four widths. Five simulated in-memory mutations; zero database writes.');
 }catch(error){await page.screenshot({path:path.join(directory,'grooming-failure.png')});throw error;}finally{await page.unroute('**/api/proxy/**',handler);page.off('pageerror',onError);}
};
