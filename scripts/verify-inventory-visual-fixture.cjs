// Inventory visual review uses only in-memory GET fixtures; all business writes are blocked.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyInventory({page,origin,directory,today}) {
 const writes=[],reads=[];
 const product={id:'inventory-visual',name:'ProductoDeEjemploConNombreExtensoSinEspaciosParaRevisarLaFicha',internalCode:'V-001',barcode:'000123456789',category:'Insumos de ejemplo',presentation:'Frasco de 250 ml con descripción de ejemplo',uses:['retail','veterinary','grooming'],active:true,lotPolicy:'lot_expiry',referenceCost:12000.5,salePrice:18000.75,stockMinimum:2,metadataVersion:1,priceVersion:1,stockRevision:1,available:'11',physical:'11',expired:'0',lowStock:false,lots:[{id:'lot-visual',lotCode:'LOTE-DE-EJEMPLO-CON-NOMBRE-MUY-EXTENSO-SIN-ESPACIOS-PARA-REVISAR',expiresOn:'2030-01-01',physical:11,available:11,expiresSoon:false}]};
 const empty={...product,id:'inventory-empty',name:'Producto sin existencias de ejemplo',available:'0',physical:'0',lots:[],lowStock:true,lotPolicy:'untracked',uses:['veterinary'],salePrice:null};
 const inactive={...empty,id:'inventory-inactive',name:'Producto desactivado de ejemplo',active:false};
 const extra={...product,id:'inventory-extra',name:'Producto de la página siguiente'};
 const movements=[{id:'entry-visual',operationId:'operation-entry',kind:'entry',quantity:11,stockDelta:11,balanceAfter:11,occurredAt:today+'T10:00:00-05:00',actorName:'ResponsableDeEjemploConNombreExtensoSinEspaciosParaRevisar',reason:'Entrada de ejemplo con nota larga para comprobar la lectura del historial.',lotCodeSnapshot:product.lots[0].lotCode,presentationSnapshot:product.presentation,entryUnitCost:'12000.50',entryCorrected:false}];
 const handler=async route=>{
  const req=route.request(),url=new URL(req.url());if(req.method()!=='GET'){writes.push(url.pathname);return route.abort();}
  if(!url.pathname.includes('/inventory/'))return route.continue();
  reads.push({path:url.pathname,tenant:url.searchParams.get('tenantId')});
  if(url.pathname.endsWith('/context'))return route.fulfill({json:{scope:'fixture-only-inventory'}});
  if(url.pathname.endsWith('/movements'))return route.fulfill({json:{data:movements,nextCursor:null}});
  if(url.pathname.endsWith('/products')){
   let rows=url.searchParams.get('cursor')?[extra]:[product,empty,...(url.searchParams.get('includeInactive')==='1'?[inactive]:[])];
   const search=(url.searchParams.get('search')||'').toLowerCase(),use=url.searchParams.get('use'),status=url.searchParams.get('status');
   rows=rows.filter(p=>(!search||p.name.toLowerCase().includes(search)||p.internalCode.toLowerCase().includes(search))&&(!use||p.uses.includes(use))&&(!status||status==='low'&&p.lowStock));
   return route.fulfill({json:{data:rows,nextCursor:!search&&!use&&!status&&!url.searchParams.get('cursor')?'inventory-next':null}});
  }
  return route.fulfill({json:[]});
 };
 await page.route('**/api/proxy/**',handler);
 const dialog=()=>page.getByRole('dialog').last();
 async function closeEditor(){await dialog().locator('[data-slot="dialog-footer"]').getByRole('button',{name:'Cancelar',exact:true}).click();const guard=page.getByRole('alertdialog');await guard.waitFor();await guard.getByRole('button',{name:'Descartar cambios',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});}
 async function fitForm(label){
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:720});const d=dialog();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await d.evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));const box=await d.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,label+' fits '+width);assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth),label+' content fits');const footer=await d.locator('[data-slot="dialog-footer"]').boundingBox();assert(footer.y>=0&&footer.y+footer.height<=721,label+' fixed footer fits');const body=d.locator('[data-form-body]');await body.evaluate(n=>{n.scrollTop=n.scrollHeight;});const after=await d.locator('[data-slot="dialog-footer"]').boundingBox();assert(Math.abs(after.y-footer.y)<1,'Footer stays fixed');}
  await page.setViewportSize({width:390,height:720});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await dialog().evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));await dialog().locator('[data-form-body]').evaluate(n=>{n.scrollTop=0;});await page.screenshot({path:path.join(directory,'inventory-'+label+'-390.png')});
 }
 try {
  await page.goto(origin+'/dashboard/inventory?tenant=fixture-selected',{waitUntil:'networkidle'});
  await page.getByText('2 productos en esta página',{exact:true}).waitFor();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Inventory fits '+width);const cards=page.locator('[data-inventory-cards]');assert.equal(await cards.isVisible(),width<1280);for(const btn of await page.getByRole('group',{name:'Filtrar por estado de existencias'}).getByRole('button').all()){assert((await btn.boundingBox()).height>=44);}}
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(directory,'inventory-list-'+width+'.png')});}
  await page.getByRole('button',{name:'Siguientes productos',exact:true}).click();await page.getByRole('button',{name:extra.name,exact:true}).waitFor();await page.getByRole('button',{name:'Primera página',exact:true}).click();await page.getByText('2 productos en esta página',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Necesitan reposición',exact:true}).click();await page.getByText('1 productos en esta página',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await page.getByText('2 productos en esta página',{exact:true}).waitFor();
  await page.getByRole('textbox',{name:'Buscar producto',exact:true}).fill('sin coincidencia');await page.getByRole('heading',{name:'No hay productos con estos filtros'}).waitFor();await page.getByRole('button',{name:'Ver todos los productos',exact:true}).click();await page.getByText('2 productos en esta página',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:product.name,exact:true}).click();await dialog().getByRole('tab',{name:'Lotes (1)',exact:true}).click();await dialog().getByRole('heading',{name:'Existencias por lote'}).waitFor();assert.equal(await dialog().getByRole('heading',{name:product.lots[0].lotCode,exact:true}).count(),1);
  await dialog().getByRole('tab',{name:'Movimientos',exact:true}).click();await dialog().getByRole('button',{name:'Corregir cantidad y costo',exact:true}).waitFor();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:720});await dialog().evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));assert(await dialog().evaluate(n=>n.scrollWidth<=n.clientWidth),'Detail fits '+width);const footer=await dialog().locator('[data-slot="dialog-footer"]').boundingBox();assert(footer.y+footer.height<=721,'Detail footer fits '+width+' '+JSON.stringify(footer));}
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(directory,'inventory-movements-390.png')});
  await dialog().getByRole('button',{name:'Corregir cantidad y costo',exact:true}).click();await page.locator('#entry-correction-quantity').fill('9');await page.locator('#entry-correction-cost').fill('13000,50');await page.locator('#entry-correction-reason').fill('Corrección de ejemplo sin guardar');await fitForm('correction');await closeEditor();
  await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:'Entrada',exact:true}).first().click();await page.locator('#stock-quantity').fill('3');await page.locator('#stock-cost').fill('12000,50');await page.locator('#stock-lotCode').fill('LOTE-EJEMPLO');await page.locator('#stock-expiresOn').fill('2030-01-01');
  assert.equal(await dialog().getByText('14',{exact:true}).count(),1);await fitForm('entry');
  await dialog().locator('[data-slot="dialog-footer"]').getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Seguir editando',exact:true}).click();assert.equal(await page.locator('#stock-quantity').inputValue(),'3');await closeEditor();
  await page.getByRole('button',{name:product.name,exact:true}).click();await dialog().getByRole('button',{name:'Editar',exact:true}).click();assert.equal(await page.locator('#product-initialQuantity').count(),0,'Editing cannot create initial stock');assert(await page.locator('#product-presentation').isDisabled());assert.equal(await page.locator('#product-referenceCost').inputValue(),'12000.5');await page.locator('#product-name').fill('Nombre ficticio editado sin guardar');await fitForm('product-edit');await closeEditor();
  await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();await dialog().getByRole('button',{name:'Guardar producto',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='product-name');
  await page.locator('#product-name').fill('Producto nuevo de ejemplo sin guardar');await page.locator('#product-internalCode').fill('EX-001');await page.locator('#product-category').fill('Ejemplo');await page.locator('#product-presentation').fill('Frasco de 250 ml');await page.locator('#product-use-retail').check();await page.locator('#product-referenceCost').fill('12000,50');await page.locator('#product-salePrice').fill('18000,75');await page.locator('#product-initialQuantity').fill('10');await page.locator('#product-lotPolicy').selectOption('lot_expiry');await page.locator('#product-initialLot').fill('LOTE-INICIAL');await page.locator('#product-initialExpiry').fill('2030-01-01');await fitForm('product');await closeEditor();
  await page.setViewportSize({width:390,height:900});await page.getByRole('checkbox',{name:'Incluir desactivados'}).check();await page.getByRole('button',{name:inactive.name,exact:true}).waitFor();await page.getByRole('button',{name:inactive.name,exact:true}).click();assert.equal(await dialog().getByRole('button',{name:'Eliminar',exact:true}).count(),1);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  assert(reads.every(r=>r.tenant==='fixture-selected'));assert.equal(writes.length,0,'No inventory movement, product creation or removal submitted');
  console.log('PASS inventory: responsive cards/table, filters, pagination, lots/history, entry and initial-stock preparation, quantity/cost correction, dirty guard, inactive removal access, four widths and zero business writes');
 } catch(error) {await page.screenshot({path:path.join(directory,'inventory-failure.png')});throw error;} finally {await page.unroute('**/api/proxy/**',handler);}
};
