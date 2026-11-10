// Report reads, export and preview use synthetic records; business writes are blocked.
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function verifyReports({page,origin,directory,today}) {
 let failSummary=false,empty=false;const writes=[],reads=[];
 const handler=async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()!=='GET'){writes.push(url.pathname);return route.abort();}
  if(!url.pathname.includes('/reports/'))return route.continue();
  reads.push({path:url.pathname,tenant:url.searchParams.get('tenantId'),period:url.searchParams.get('period'),offset:url.searchParams.get('offset'),comparison:url.searchParams.get('comparison'),from:url.searchParams.get('from'),to:url.searchParams.get('to')});
  if(failSummary&&url.pathname.endsWith('/summary'))return route.fulfill({status:503,json:{error:'Synthetic read failure'}});
  const year=Number(today.slice(0,4)),amount=n=>empty?0:n,point=n=>({value:amount(n),prev:0,delta:amount(n),pct:null});
  const meta={period:url.searchParams.get('period')||'month',offset:Number(url.searchParams.get('offset')||0),comparison:url.searchParams.get('comparison')||'full',comparisonClamped:false,rangeStart:year+'-01-01T05:00:00Z',rangeEnd:(year+1)+'-01-01T05:00:00Z',previousRangeStart:(year-1)+'-01-01T05:00:00Z',previousRangeEnd:year+'-01-01T05:00:00Z',asOf:today+'T12:00:00-05:00',partial:false,year};
  if(meta.period==='custom'){meta.rangeStart=url.searchParams.get('from')+'T00:00:00-05:00';meta.rangeEnd=new Date(Date.parse(url.searchParams.get('to')+'T00:00:00-05:00')+86400000).toISOString();meta.previousRangeEnd=meta.rangeStart;meta.previousRangeStart=new Date(2*Date.parse(meta.rangeStart)-Date.parse(meta.rangeEnd)).toISOString();meta.year=Number(url.searchParams.get('from').slice(0,4));}
  const summary={...meta,establishment:{id:'fixture-selected',name:'CentroDeEjemploConNombreExtensoParaComprobarLaImpresión'},revenue:point(494000.25),expenses:point(10000.05),difference:point(484000.2),professionalShare:point(117000),afterProfessionalShare:point(367000.2),professionals:empty?[]:[{staffId:'worker',name:'ProfesionalDeEjemploConNombreMuyExtensoSinEspaciosParaRevisión',amount:117000,count:4}],appointments:point(4),newClients:point(2),petsAttended:point(4),transactionCount:amount(1)};
  const breakdown={...meta,total:amount(494000.25),count:amount(1),mixedCount:amount(1),unallocatedTotal:0,byMethod:['cash','transfer','card','other','review','unclassified'].map((method,i)=>({method,count:amount(i<2?1:0),total:amount(i===0?194000.25:i===1?300000:0)})),byKind:['product','service','unclassified'].map((kind,i)=>({kind,quantity:amount(i<2?1:0),lines:amount(i<2?1:0),total:amount(i===0?194000.25:i===1?300000:0)}))};
  const json=url.pathname.endsWith('/summary')?summary:url.pathname.endsWith('/breakdown')?breakdown:url.pathname.endsWith('/services')?(empty?[]:[{name:'ServicioDeEjemploConNombreMuyLargoSinEspaciosParaRevisión',count:4}]):url.pathname.endsWith('/revenue-by-month')?Array.from({length:12},(_,i)=>({month:i+1,year,revenue:amount(i===0?494000.25:0)})):Array.from({length:6},(_,i)=>({label:['Jun','Jul','Ago','Sep','Oct','Nov'][i],newClients:amount(1),returningVisits:amount(2)}));
  return route.fulfill({json});
 };
 await page.route('**/api/proxy/**',handler);
 try {
  await page.goto(origin+'/dashboard/pos?tab=reportes&tenant=fixture-selected',{waitUntil:'networkidle'});
  const controls=page.getByRole('region',{name:'Período de reportes',exact:true}),summary=page.getByRole('region',{name:'Resumen del período',exact:true});
  await summary.getByText('$ 494.000,25',{exact:true}).waitFor();
  assert.equal(await summary.getByText('$ 117.000',{exact:true}).count(),2);
  assert.equal(await summary.getByText('$ 367.000,20',{exact:true}).count(),1);
  assert.equal(await controls.getByRole('button',{name:'Mes siguiente',exact:true}).isDisabled(),true);
  await controls.getByRole('button',{name:'Mes anterior',exact:true}).click();
  await controls.getByRole('button',{name:'Volver al período actual',exact:true}).waitFor();
  await controls.getByRole('button',{name:'Volver al período actual',exact:true}).click();
  await controls.getByRole('button',{name:'Semana',exact:true}).click();
  await controls.getByRole('combobox',{name:'Comparar con'}).selectOption('equivalent');
  await page.waitForFunction(()=>document.querySelector('button[aria-label="Semana siguiente"]')?.disabled);
  await summary.getByText('$ 494.000,25',{exact:true}).waitFor();
  const income=summary.getByRole('link',{name:'Ver ingresos',exact:true});
  await page.waitForFunction(()=>document.querySelector('a[href*="source=reports"][href*="detail=income"]')?.getAttribute('href').includes('comparison=equivalent'));
  const detail=new URL(await income.getAttribute('href'),origin);assert.equal(detail.searchParams.get('tenant'),'fixture-selected');assert.equal(detail.searchParams.get('reportPeriod'),'week');
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Reports fit '+width);
   for(const button of await controls.getByRole('button').all()){const box=await button.boundingBox();assert(box.height>=44,'Report controls have touch targets');}
  }
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(directory,'reports-'+width+'.png')});await summary.screenshot({path:path.join(directory,'reports-summary-'+width+'.png')});}
  const downloadPromise=page.waitForEvent('download');await controls.getByRole('button',{name:'Exportar Excel',exact:true}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.xlsx$/);assert.equal(await download.failure(),null);
  await controls.getByRole('button',{name:'Vista de impresión',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Vista de impresión del reporte',exact:true}),document=dialog.getByRole('article',{name:'Reporte para imprimir'});await document.waitFor();
  assert.equal(await document.getByText('Parte generada:',{exact:false}).count(),1);
  for(const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});await dialog.evaluate(async n=>Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{}))));
   const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'Preview fits '+width);
   assert(await document.evaluate(n=>n.scrollWidth<=n.clientWidth),'Print content fits '+width);
   const print=await dialog.getByRole('button',{name:'Imprimir reporte',exact:true}).boundingBox();assert(print.y>=box.y&&print.y+print.height<=box.y+box.height+1,'Print action stays visible');
  }
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(directory,'reports-print-390.png')});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await controls.getByRole('button',{name:'Por fechas',exact:true}).click();
  const form=controls.getByRole('form',{name:'Rango de fechas del reporte'});
  const year=today.slice(0,4),from=year+'-10-11',to=year+'-11-11';
  await form.getByLabel('Desde',{exact:true}).fill(to);await form.getByLabel('Hasta',{exact:true}).fill(from);await form.getByRole('button',{name:'Consultar fechas',exact:true}).click();await controls.getByRole('alert').waitFor();
  await form.getByLabel('Desde',{exact:true}).fill(from);await form.getByLabel('Hasta',{exact:true}).fill(to);await form.getByRole('button',{name:'Consultar fechas',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('a[href*="source=reports"][href*="detail=income"]')?.getAttribute('href').includes('reportPeriod=custom'));
  const customDetail=new URL(await summary.getByRole('link',{name:'Ver ingresos',exact:true}).getAttribute('href'),origin);assert.equal(customDetail.searchParams.get('from'),from);assert.equal(customDetail.searchParams.get('to'),to);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Custom date range fits '+width);}
  await page.setViewportSize({width:390,height:900});await controls.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'reports-custom-390.png')});
  assert(reads.some(r=>r.period==='custom'&&r.from===from&&r.to===to));
  await controls.getByRole('button',{name:'Vista de impresión',exact:true}).click();await dialog.waitFor();
  assert.equal(await document.getByText(/^11.*oct.*11.*nov/).count(),1);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  const customDownloadPromise=page.waitForEvent('download');await controls.getByRole('button',{name:'Exportar Excel',exact:true}).click();assert.match((await customDownloadPromise).suggestedFilename(),/10-11.*11-11/);
  failSummary=true;await controls.getByRole('button',{name:'Actualizar reportes',exact:true}).click();
  await summary.getByRole('alert').waitFor();assert.equal(await controls.getByRole('button',{name:'Exportar Excel',exact:true}).isDisabled(),true);assert.equal(await summary.getByText('$ 494.000,25',{exact:true}).count(),0);
  failSummary=false;await summary.getByRole('button',{name:'Reintentar',exact:true}).click();await summary.getByText('$ 494.000,25',{exact:true}).waitFor();
  empty=true;await controls.getByRole('button',{name:'Actualizar reportes',exact:true}).click();await page.getByText('No hay ingresos activos registrados en este año.',{exact:true}).waitFor();await page.getByText('No hay citas completadas en este período.',{exact:true}).waitFor();
  assert(reads.some(r=>r.period==='month'&&r.offset==='-1'));assert(reads.some(r=>r.period==='week'&&r.comparison==='equivalent'));assert(reads.every(r=>r.tenant==='fixture-selected'));
  assert.equal(writes.length,0,'No financial writes from report review');
  console.log('PASS reports: totals and commission reserve, periods, tenant detail links, Excel, print preview, empty/retry states, four widths and zero financial writes');
 } finally {await page.unroute('**/api/proxy/**',handler);}
};
