// Synthetic history and receipt review; every business write is blocked.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyHistory({page,origin,directory,today}) {
 const writes=[];
 const data=Array.from({length:12},(_,i)=>({id:'history-example-'+i,tenantId:'fixture-selected',total:100000,paymentMethod:i===0?'mixed':'cash',cashAmount:i===0?40000:null,transferAmount:i===0?60000:null,status:i===11?'voided':'active',voidReason:i===11?'Ejemplo anulado; conserva el registro':null,origin:'manual_pos_sale',paymentStatus:'paid',paidAt:today+'T11:00:00-05:00',clientName:i===0?'ClienteDeEjemploConNombreExtensoSinEspaciosParaComprobarElAjuste':'Cliente de ejemplo '+i,petName:'Mascota con nombre largo de ejemplo',clientPhone:null,notes:'Nota de ejemplo para revisar el comprobante',recordedBy:{id:'admin',name:'Responsable de ejemplo con nombre compuesto'},items:Array.from({length:5},(_,j)=>({id:`item-${i}-${j}`,description:'ArtículoDeEjemploConNombreExtensoSinEspaciosParaRevisión '+j,quantity:1,unitPrice:20000,total:20000}))}));
 const handler=async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()!=='GET'){writes.push(url.pathname);return route.abort();}
  if(!url.pathname.endsWith('/transactions'))return route.continue();
  let filtered=data.filter(r=>(!url.searchParams.get('status')||url.searchParams.get('status')==='all'||r.status===url.searchParams.get('status'))&&(!url.searchParams.get('method')||url.searchParams.get('method')==='all'||r.paymentMethod===url.searchParams.get('method'))&&r.clientName.toLowerCase().includes((url.searchParams.get('search')||'').toLowerCase()));
  const pageSize=Number(url.searchParams.get('pageSize')||10),number=Number(url.searchParams.get('page')||1);
  return route.fulfill({json:{data:filtered.slice((number-1)*pageSize,number*pageSize),page:number,pageSize,total:filtered.length,totalPages:Math.max(1,Math.ceil(filtered.length/pageSize)),summary:{activeCount:filtered.filter(r=>r.status==='active').length,voidedCount:filtered.filter(r=>r.status==='voided').length,activeTotal:filtered.filter(r=>r.status==='active').reduce((s,r)=>s+r.total,0)}}});
 };
 await page.route('**/api/proxy/**',handler);
 try {
  await page.goto(origin+'/dashboard/pos?tab=historial&tenant=fixture-selected',{waitUntil:'networkidle'});
  const history=page.getByRole('region',{name:'Historial de cobros',exact:true}),list=history.getByRole('list',{name:'Operaciones encontradas'}),rows=list.locator(':scope > li');
  await rows.nth(9).waitFor();assert.equal(await rows.count(),10);
  await history.getByRole('button',{name:'Página siguiente'}).click();await rows.nth(1).waitFor();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Operaciones encontradas"]')?.children.length===2);
  await history.getByRole('button',{name:'Página anterior'}).click();await rows.nth(9).waitFor();
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'History fits '+width);
   assert((await rows.first().getByRole('button',{name:'Comprobante',exact:true}).boundingBox()).height>=44);
  }
  for(const width of [390,1440]) {await page.setViewportSize({width,height:900});await history.getByRole('group',{name:'Periodos rápidos'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'history-filters-'+width+'.png')});await rows.first().screenshot({path:path.join(directory,'history-row-'+width+'.png')});}
  await history.getByRole('combobox',{name:'Método de pago',exact:true}).selectOption('mixed');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Operaciones encontradas"]')?.children.length===1);
  const trigger=rows.first().getByRole('button',{name:'Comprobante',exact:true});await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Detalle de operación',exact:true});await dialog.waitFor();
  await dialog.getByRole('button',{name:'Imprimir',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('[role="dialog"] button')).find(n=>n.textContent.includes('Imprimir'))?.disabled);
  const receipt=dialog.getByRole('article',{name:'Comprobante guardado'});
  assert.equal(await receipt.getByText('Parte en efectivo',{exact:true}).count(),1);
  assert.equal(await receipt.getByText('$ 40.000',{exact:true}).count(),1);
  assert.equal(await receipt.getByText('$ 60.000',{exact:true}).count(),1);
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   await dialog.evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));
   const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'Receipt fits '+width);
   assert(await receipt.evaluate(n=>n.scrollWidth<=n.clientWidth),'Receipt content fits '+width);
   await dialog.getByRole('button',{name:'Cerrar',exact:true}).first().scrollIntoViewIfNeeded();
   const button=await dialog.getByRole('button',{name:'Cerrar',exact:true}).first().boundingBox();assert(button.y>=box.y&&button.y+button.height<=box.y+box.height+1);
  }
  await page.setViewportSize({width:390,height:900});
  await receipt.evaluate(n=>{n.parentElement.scrollTop=n.parentElement.scrollHeight;});await page.screenshot({path:path.join(directory,'receipt-payment-390.png')});
  await receipt.getByRole('heading',{name:'Comprobante de cobro'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'receipt-items-390.png')});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await history.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await rows.nth(9).waitFor();
  await history.getByRole('combobox',{name:'Estado',exact:true}).selectOption('voided');
  await rows.first().getByRole('button',{name:'Comprobante',exact:true}).click();await dialog.waitFor();
  assert.equal(await dialog.getByText('VENTA ANULADA',{exact:true}).count(),1);
  assert.equal(await dialog.getByText('Ejemplo anulado; conserva el registro',{exact:true}).count(),1);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(writes.length,0,'No sale, payment or cancellation submitted');
  console.log('PASS history: pagination, payment/status filters, mixed and voided receipts, long names, four widths and zero financial writes');
 } finally {await page.unroute('**/api/proxy/**',handler);}
};
