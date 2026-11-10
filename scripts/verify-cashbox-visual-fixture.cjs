// Synthetic cashbox and confirmation preview only; all financial writes blocked.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyCash({page,origin,directory,onClosed}) {
 const writes=[];
 await page.route('**/api/proxy/**',async route=>{if(route.request().method()!=='GET'){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto(origin+'/dashboard/pos?tab=caja&tenant=fixture-selected',{waitUntil:'networkidle'});
 const operational=page.getByRole('region',{name:'Cobros operativos',exact:true});
 await operational.getByText('Total de los cobros encontrados:',{exact:false}).waitFor();
 const close=page.getByRole('region',{name:'Cierre del día y comisiones',exact:true});
 await close.getByText('$ 14.000',{exact:true}).first().waitFor();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Cashbox fits '+width);
  await close.getByRole('button',{name:'Cerrar día',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Guardar cierre del día',exact:true});await dialog.waitFor();
  await dialog.evaluate(async node=>{await Promise.all(node.getAnimations().map(a=>a.finished.catch(()=>{})));});
  await dialog.getByRole('spinbutton',{name:'Efectivo que dejas para la siguiente jornada (COP)'}).fill('');
  const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'Close dialog fits '+width);
  const confirmation=dialog.getByRole('button',{name:'Confirmar cierre del día',exact:true});assert(await confirmation.isDisabled());
  await dialog.getByRole('spinbutton',{name:'Efectivo que dejas para la siguiente jornada (COP)'}).fill('100000');
  assert(await confirmation.isEnabled());
  assert(await dialog.getByText('$ 42.000,25',{exact:true}).count());
  if(width===390) await dialog.screenshot({path:path.join(directory,'cash-close-mobile.png')});
  await dialog.getByRole('button',{name:'Volver a revisar',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
 }
 await close.getByText('Consultar comisiones por período',{exact:true}).click();
 await close.getByRole('combobox',{name:'Período de comisiones'}).selectOption('week');
 await close.getByRole('button',{name:'Consultar comisiones',exact:true}).click();
 await close.getByRole('list',{name:'Comisiones del período'}).waitFor();
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));
  if(width===1440) {const a=await close.getByRole('button',{name:'Consultar comisiones',exact:true}).boundingBox();const b=await close.getByLabel('Comisiones hasta',{exact:true}).boundingBox().catch(()=>null);if(b)assert(Math.abs(a.y+a.height-b.y-b.height)<2,'Period controls align');}
  await close.screenshot({path:path.join(directory,'cash-panel-'+width+'.png')});
 }
 onClosed();await page.reload({waitUntil:'networkidle'});
 assert(await page.getByRole('button',{name:'Día cerrado',exact:true}).isDisabled());
 assert.equal(writes.length,0,'No close, expense or financial write attempted');
 console.log('PASS cashbox: received totals, commissions, retained cash validation, four viewport widths, closed-day lock and zero financial writes');
};
