// Synthetic checkout preparation only: never confirms a sale.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyPos({page,origin,directory}) {
 const writes=[];
 await page.route('**/api/proxy/**',async route=>{if(route.request().method()!=='GET'){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto(origin+'/dashboard/pos?tab=venta&tenant=fixture-selected',{waitUntil:'networkidle'});
 const form=page.getByRole('form',{name:'Preparar y cobrar venta'});
 await form.waitFor();
 const catalog=page.getByRole('group',{name:'Catálogo para la venta',exact:true});
 assert.equal(await catalog.getByRole('button',{name:'Todos',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#pos-catalog-search').count(),1);
 await catalog.getByRole('button',{name:'Servicios',exact:true}).click();
 await page.locator('#pos-catalog-search').fill('Servicio de catálogo');
 const result=page.getByRole('option',{name:/Servicio de catálogo de ejemplo/});await result.waitFor();
 await page.setViewportSize({width:320,height:900});
 assert(await result.evaluate(n=>n.scrollWidth<=n.clientWidth),'Long catalog result fits mobile');
 await result.screenshot({path:path.join(directory,'pos-catalog-320.png')});
 await page.locator('#pos-catalog-search').press('Escape');
 await catalog.getByRole('button',{name:'Todos',exact:true}).click();
 await page.getByText('Ingreso manual de un artículo',{exact:true}).click();
 await page.getByRole('button',{name:'Servicio manual',exact:true}).click();
 await page.getByRole('textbox',{name:'Descripción del artículo 1'}).fill('Servicio de ejemplo con descripción larga para comprobar el carrito');
 await page.getByRole('textbox',{name:'Precio del artículo 1'}).fill('50000');
 await page.getByRole('button',{name:'Listo',exact:true}).click();
 const cart=page.getByRole('list',{name:'Artículos del carrito'});
 assert.equal(await cart.getByRole('listitem').count(),1);
 const quantity=page.getByRole('textbox',{name:'Cantidad del artículo 1'});
 await page.getByRole('button',{name:/Agregar una unidad de Servicio de ejemplo/}).click();assert.equal(await quantity.inputValue(),'2');
 await page.getByRole('button',{name:/Quitar una unidad de Servicio de ejemplo/}).click();assert.equal(await quantity.inputValue(),'1');
 const payments=page.getByRole('group',{name:'Método de pago',exact:true});
 await payments.getByRole('button',{name:'Efectivo + transferencia',exact:true}).click();
 await page.getByRole('textbox',{name:'Parte en efectivo (COP)'}).fill('20000');
 await page.getByRole('textbox',{name:'Parte en transferencia (COP)'}).fill('30000');
 await page.getByRole('textbox',{name:'Efectivo recibido (COP)'}).fill('20000');
 await page.getByText('Asignado: $ 50.000 de $ 50.000.',{exact:true}).waitFor();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'POS fits '+width);
  for(const button of await payments.getByRole('button').all()) {const r=await button.boundingBox();assert(r.width>=44&&r.height>=44);}
  const row=cart.getByRole('listitem').first();
  assert(await row.evaluate(n=>n.scrollWidth<=n.clientWidth),'Cart row fits '+width);
  const remove=await page.getByRole('button',{name:'Quitar artículo 1',exact:true}).boundingBox();assert(remove.width>=44&&remove.height>=44);
 }
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(directory,'pos-refined-'+width+'.png')});
  await cart.screenshot({path:path.join(directory,'pos-cart-'+width+'.png')});
 }
 assert.equal(writes.length,0,'No checkout write attempted');
 console.log('PASS POS: unified search, initial All filter, cart quantity, mixed split, four viewport widths, touch controls and zero sale writes');
};
