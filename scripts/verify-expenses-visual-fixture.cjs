// Synthetic expense preparation and history: financial writes are blocked.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyExpenses({page,origin,directory}) {
 const writes=[];
 await page.route('**/api/proxy/**',async route=>{if(route.request().method()!=='GET'){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto(origin+'/dashboard/pos?tab=egreso&tenant=fixture-selected',{waitUntil:'networkidle'});
 const form=page.getByRole('form',{name:'Registrar gasto',exact:true});await form.waitFor();
 const submit=form.getByRole('button',{name:'Registrar gasto',exact:true});await submit.click();
 await page.getByText('Describe en qué se gastó el dinero.',{exact:true}).waitFor();
 assert.equal(await page.locator('#expense-description').evaluate(n=>n===document.activeElement),true);
 await page.locator('#expense-description').fill('Compra de ejemplo con descripción larga para comprobar el resumen');
 await page.locator('#expense-responsible').fill('Responsable de ejemplo con nombre compuesto');
 await page.locator('#expense-amount').fill('12500,50');
 assert.equal(await page.locator('#expense-description').getAttribute('aria-invalid'),'false');
 assert.equal(await page.locator('#expense-amount').getAttribute('aria-invalid'),'false');
 assert.equal(await page.locator('#expense-description-error, #expense-amount-error').count(),0);
 const categories=page.getByRole('group',{name:'Categoría del gasto'});
 assert.equal(await categories.getByRole('button').count(),6);
 await categories.getByRole('button',{name:'Insumos y productos',exact:true}).click();
 await categories.getByRole('button',{name:'Servicios',exact:true}).click();
 await page.getByRole('group',{name:'Medio utilizado para pagar'}).getByRole('button',{name:'Transferencia',exact:true}).click();
 const summary=page.getByRole('complementary',{name:'Resumen del gasto'});
 assert.equal(await summary.getByText('$ 12.500,5',{exact:true}).count(),1);
 for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Expense form fits '+width);
   assert(await categories.evaluate(n=>n.scrollWidth<=n.clientWidth),'Category groups fit '+width);
   for(const btn of await form.getByRole('group',{name:'Categoría del gasto'}).getByRole('button').all()){const r=await btn.boundingBox();assert(r.height>=44);}
 }
 for(const width of [390,1440]) {await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(directory,'expenses-form-'+width+'.png')});await summary.screenshot({path:path.join(directory,'expenses-summary-'+width+'.png')});}
 await page.getByRole('navigation',{name:'Opciones de gastos'}).getByRole('button',{name:'Consultar gastos'}).click();
 const dialog=page.getByRole('dialog',{name:'¿Salir sin guardar el gasto?'});await dialog.waitFor();
 await dialog.getByRole('button',{name:'Seguir editando'}).click();await dialog.waitFor({state:'hidden'});
 assert.equal(await page.locator('#expense-amount').inputValue(),'12500,50');
 await page.getByRole('navigation',{name:'Opciones de gastos'}).getByRole('button',{name:'Consultar gastos'}).click();
 await page.getByRole('dialog',{name:'¿Salir sin guardar el gasto?'}).getByRole('button',{name:'Salir sin guardar',exact:true}).click();
 const history=page.getByRole('region',{name:'Consultar gastos',exact:true});
 const rows=history.getByRole('list',{name:'Gastos encontrados'}).getByRole('listitem');await rows.nth(1).waitFor();
 assert.equal(await rows.count(),2);
 await history.getByRole('combobox',{name:'Estado',exact:true}).selectOption('voided');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Gastos encontrados"]')?.children.length===1);
 await rows.first().getByText('Ver notas y referencia',{exact:true}).click();
 assert.equal(await rows.first().getByText('Otra nota ficticia',{exact:true}).count(),1);
 assert.equal(await rows.first().getByText('Ejemplo anulado por error de digitación; conserva historial',{exact:true}).count(),1);
 await history.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await rows.nth(1).waitFor();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Expense history fits '+width);
 }
 for(const width of [390,1440]) {await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(directory,'expenses-history-'+width+'.png')});}
 assert.equal(writes.length,0,'No expense created or voided');
 console.log('PASS expenses: validation, live summary, dirty-form protection, active/voided history, filters, four widths and zero financial writes');
};
