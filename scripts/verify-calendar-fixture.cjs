// Read-only calendar browser checks, using the isolated synthetic backend.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyCalendar({page,origin,directory,today}) {
  await page.setViewportSize({width:390,height:844});
  const failures=[];page.on('pageerror',e=>failures.push(e.message));
  await page.goto(origin+'/dashboard/calendar?tenant=fixture-selected&date='+today,{waitUntil:'networkidle'});
  const views=page.getByRole('group',{name:'Vista de agenda',exact:true});
  const clock=page.getByRole('group',{name:'Formato de hora',exact:true});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Vista de agenda"] button[aria-pressed="true"]')?.textContent.trim()==='Día');
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Calendar page fits '+width);
    for(const controls of [views,clock,page.getByRole('group',{name:'Cambiar período de agenda'})]) {
      for(const btn of await controls.getByRole('button').all()) {
        const box=await btn.boundingBox();assert(box && box.width>=44 && box.height>=44,'Calendar touch target '+width);
      }
    }
  }
  await clock.getByRole('button',{name:'24h',exact:true}).click();
  assert.equal(await clock.getByRole('button',{name:'24h',exact:true}).getAttribute('aria-pressed'),'true');
  await views.getByRole('button',{name:'Semana',exact:true}).click();
  await page.getByRole('region',{name:'Calendario de citas'}).waitFor();
  assert.equal(await page.getByRole('region',{name:'Calendario de citas'}).getAttribute('tabindex'),'0');
  await views.getByRole('button',{name:'Mes',exact:true}).click();
  await page.getByRole('button',{name:'Ver agenda del '+today,exact:true}).waitFor();
  await page.getByRole('button',{name:'Ver agenda del '+today,exact:true}).click();
  assert.equal(await views.getByRole('button',{name:'Día',exact:true}).getAttribute('aria-pressed'),'true');
  const days=page.getByRole('group',{name:'Días de la semana'});
  assert.equal(await days.getByRole('button').count(),7);
  assert.equal(await days.locator('button[aria-pressed="true"]').count(),1);
  await views.getByRole('button',{name:'Por profesional',exact:true}).click();
  await page.getByRole('region',{name:'Calendario de citas'}).waitFor();
  assert.equal(failures.length,0,failures.join('\n'));
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await views.getByRole('button',{name:width===390?'Día':'Semana',exact:true}).click();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(directory,'calendar-refined-'+width+'.png')});
  }
  assert.equal(new URL(page.url()).searchParams.get('tenant'),'fixture-selected');
  console.log('PASS calendar: four views, day selection, clock mode, four viewport widths, 44px toolbar controls and tenant continuity');
};
