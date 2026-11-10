// Isolated browser scenarios. Fake backend + separate production frontend;
// no database connection, business writes, or changes to running dev servers.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { effectiveAccess } = require('../backend/src/services/dashboard-access.service');
const backendPort = 3030, frontendPort = 3031, origin = `http://localhost:${frontendPort}`;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const directory = path.join(__dirname, '../.cache/home-verification');
fs.mkdirSync(directory, { recursive: true });
let mode = { modules: ['veterinary', 'grooming', 'retail'], fail: false, empty: false, partial: false };
let calls = [];
const appointment = (id, category, status, record = false) => ({ id, date: `${today}T10:00:00-05:00`, status, serviceType: category === 'grooming' ? 'bath' : 'vet', serviceCategory: category, serviceName: category === 'grooming' ? 'Baño básico' : 'Consulta veterinaria', petName: `Mascota ${id}`, petType: 'dog', clientName: 'Propietario de prueba', clientPhone: '0000000000', petId: 'pet-' + id, staffId: category === 'grooming' ? 'groomer' : 'vet', staffName: 'Profesional de prueba', finalPrice: 66000, priceResolution: null, startedAt: null, endedAt: null, hasMedicalRecord: record, groomingDeliveredAt: null, groomingNotes: '', groomingNotesVersion: 0 });
const backend = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const role = req.headers['x-staff-id'] || 'admin';
  const tenant = req.headers['x-tenant-id'] || 'fixture-tenant';
  const access = effectiveAccess({ type: role, staffId: role === 'admin' ? null : role }, mode.modules);
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/internal/staff-login') {
    let body = ''; for await (const chunk of req) body += chunk;
    const { email, password } = JSON.parse(body), requestedRole = email.split('@')[0];
    if (!['vet', 'groomer', 'receptionist'].includes(requestedRole) || password !== 'fixture-only-password') return send({}, 401);
    return send({ staffId: requestedRole, tenantId: 'fixture-tenant', name: requestedRole, email, role: requestedRole, sessionVersion: 1 });
  }
  if (req.method !== 'GET') return send({ error: 'Fixture is read-only' }, 405);
  calls.push({ path: url.pathname.replace('/api/dashboard', ''), tenant, role, status: url.searchParams.get('status') });
  if (mode.finalVisual) { const fixture=require('./verify-final-surfaces-fixture.cjs').read(url); if(fixture!==undefined)return send(fixture); }
  if (mode.followupVisual) { const fixture=require('./verify-followup-visual-fixture.cjs').read(url); if(fixture!==undefined)return send(fixture); }
  if (url.pathname.endsWith('/access')) return send(access);
  if (url.pathname.endsWith('/tenant/profile')) return send({id:tenant,name:'Establecimiento ficticio',slug:'fixture',phone:'0000000000',contactPhone:null,email:null,description:null,address:null,logoUrl:null,businessHours:null,plan:'professional',activeModules:mode.modules});
  if (mode.fail && /\/inventory\/products|\/cash\/operational|\/metrics\/cashbox/.test(url.pathname)) return send({ error: 'Simulated read failure' }, 503);
  let rows = mode.empty ? [] : [appointment('historia', 'veterinary', 'completed'), appointment('entrega', 'grooming', 'completed'), ...Array.from({ length: 8 }, (_, i) => appointment('espera-' + i, 'veterinary', 'arrived'))];
  if (mode.extended) rows.push(...Array.from({ length: 3 }, (_, i) => appointment("adicional-" + i, "veterinary", "arrived")));
  if (mode.stress) {
    Object.assign(rows.find(row => row.id === 'historia'), { payment: { status: 'paid', total: 66000 } });
    Object.assign(rows.find(row => row.id === 'entrega'), { payment: { status: 'pending', total: 66000 }, priceResolution: { servicePrice: 48000, source: 'manual_override' }, transport: { price: 18000, pending: false } });
    Object.assign(rows.find(row => row.id === 'espera-0'), { petName: 'Mascota de ejemplo con nombre muy largo para revisión', clientName: 'Propietario de ejemplo con dos apellidos y nombre compuesto', staffName: 'Profesional de ejemplo con nombre compuesto', serviceName: 'Consulta de seguimiento para revisión de tratamiento y cuidados' });
  }
  rows = rows.filter(row => mode.modules.includes(row.serviceCategory) && (role === 'admin' || role === 'receptionist' || row.serviceCategory === (role === 'vet' ? 'veterinary' : 'grooming')));
  if (url.pathname.endsWith('/appointments/today')) return send(rows);
  if (url.pathname.endsWith('/appointments/week')) {
    const start=new Date(today+'T12:00:00Z'); start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
    const mondayYmd=start.toISOString().slice(0,10);const end=new Date(start);end.setUTCDate(end.getUTCDate()+7);
    return send({appointments:rows,mondayYmd,weekStart:mondayYmd+'T00:00:00-05:00',weekEnd:end.toISOString().slice(0,10)+'T00:00:00-05:00'});
  }
  if (url.pathname.endsWith('/appointments/month')) return send({appointments:rows});
  if (mode.servicesVisual && url.pathname.endsWith('/services')) return send(require('./verify-services-visual-fixture.cjs').services);
  if (url.pathname.endsWith('/grooming/appointments')) return send({ appointments: rows.filter(row => row.serviceCategory === 'grooming'), hasMore: mode.partial });
  if (url.pathname.endsWith('/conversations')) return send({ data: mode.empty ? [] : [{ id: 'chat', name: 'Cliente de prueba', requires_human_attention: true, updatedAt: new Date().toISOString() }], pagination: { page: 1, limit: 2, total: mode.empty ? 0 : 1, totalPages: 1 } });
  if(mode.expenseVisual && url.pathname.endsWith('/expenses')) {
    let data=[{id:'expense-active',description:'Compra de insumos de ejemplo con descripción larga para revisión',responsible:'Responsable de ejemplo con nombre compuesto',category:'supplies',paymentMethod:'cash',amount:12500.5,date:today+'T10:00:00-05:00',notes:'Nota ficticia de revisión',status:'active',voidReason:null,voidedAt:null},{id:'expense-void',description:'Registro de ejemplo anulado',responsible:'Responsable de ejemplo',category:'other',paymentMethod:'transfer',amount:5000,date:today+'T09:00:00-05:00',notes:'Otra nota ficticia',status:'voided',voidReason:'Ejemplo anulado por error de digitación; conserva historial',voidedAt:today+'T10:00:00-05:00'}];
    const status=url.searchParams.get('status'),category=url.searchParams.get('category'),search=url.searchParams.get('search')||'';
    data=data.filter(row=>(!status||status==='all'||row.status===status)&&(!category||category==='all'||row.category===category)&&[row.description,row.responsible].join(' ').toLowerCase().includes(search.toLowerCase()));
    return send({data,total:data.length,page:1,pageSize:10,totalPages:1,summary:{activeCount:data.filter(r=>r.status==='active').length,voidedCount:data.filter(r=>r.status==='voided').length,activeTotal:data.filter(r=>r.status==='active').reduce((s,r)=>s+r.amount,0)}});
  }
  if(mode.cashVisual) {
    const stamp=today+'T10:00:00-05:00';
    const tx={id:'cash-visual',total:66000.3,paymentMethod:'cash',status:'active',origin:'manual_pos_sale',paymentStatus:'paid',paidAt:stamp,clientName:'Cliente de ejemplo',clientPhone:null,petName:'Mascota de ejemplo',petType:'dog',notes:null,recordedBy:{id:'admin',name:'Administrador de ejemplo'},items:[{id:'item-visual',description:'Servicio de ejemplo',quantity:1,unitPrice:66000.3,total:66000.3}]};
    const expense={id:'expense-visual',category:'other',description:'Gasto de ejemplo',amount:10000.05,paymentMethod:'cash',notes:null,date:stamp,responsible:'Responsable de ejemplo'};
    if(url.pathname.endsWith('/metrics/cashbox')) return send({date:today,totalIncome:66000.3,totalExpenses:10000.05,netBalance:56000.25,transactionCount:1,expenseCount:1,incomeByMethod:[{method:'cash',count:1,total:66000.3}],expensesByCategory:[{category:'other',count:1,total:10000.05}],transactions:[tx],expenses:[expense]});
    if(url.pathname.endsWith('/financial-history')) return send({days:[{date:url.searchParams.get('from')||today,closed:!!mode.closedVisual,incomeTotal:66000.3,expenseTotal:10000.05,netAmount:56000.25,staffCommissionTotal:14000,netAfterCommissions:42000.25,staffBreakdown:[{staffId:'groomer',count:1,staffShare:14000,businessShare:14000}]}]});
    if(url.pathname.endsWith('/staff')) return send([{id:'groomer',name:'Profesional de ejemplo con nombre compuesto'}]);
    if(url.pathname.endsWith('/cash/operational')) return send({date:today,scope:url.searchParams.get('scope')||'day',data:[tx],transactions:[tx],total:1,page:1,pageSize:10,totalPages:1,summary:{activeCount:1,voidedCount:0,activeTotal:66000.3},toReview:[],totalRegistered:66000.3,hasMore:false,pendingCount:0,summaryCash:{methods:{cash:{count:1,cents:6600030},transfer:{count:0,cents:0},card:{count:0,cents:0},other:{count:0,cents:0}},reviewCount:0,reviewCents:0,pendingCents:0,mixedCount:0}});
  }
  if (url.pathname.endsWith('/cash/catalog')) return send([{id:'service-visual',name:'Servicio de catálogo de ejemplo con descripción larga',category:'veterinary',price:50000,priceSource:'service_base_price',appliesCommissionSplit:false}]);
  if (url.pathname.endsWith('/cash/context')) return send({draftScope:'fixture-only-sale'});
  if (url.pathname.endsWith('/cash/opening')) return send({date:today,closed:false,opening:{amount:100000,sourceDailyCloseId:null,updatedAt:new Date().toISOString()},suggestion:null,openingCashAmount:null,retainedCashAmount:null});
  if (url.pathname.endsWith('/cash/operational')) return send({ toReview: mode.empty ? [] : ['charge'], transactions: [], date: today, hasMore: mode.partial, totalRegistered: 0 });
  if (url.pathname.endsWith('/inventory/products')) return send({ data: mode.empty ? [] : [{ id: 'product', name: 'Producto de prueba', available: '0', physical: '0', expired: '0', uses: ['retail'], active: true, stockMinimum: 1, lowStock: true, lots: [] }], nextCursor: mode.partial ? 'cursor' : null });
  if (url.pathname.endsWith('/next-actions/upcoming')) return send(mode.empty ? [] : [{ id: 'follow', petId: 'pet-follow', petName: 'Control pendiente', type: mode.modules.includes('veterinary') ? 'control' : 'grooming', dueAt: `${today}T05:00:00Z` }]);
  if (url.pathname.endsWith('/metrics/cashbox')) return send({ transactions: mode.empty ? [] : [{ total: 66000.3 }], expenses: mode.empty ? [] : [{ amount: 10000.05 }] });
  return send([]);
});

(async () => {
  await new Promise((resolve, reject) => { backend.once('error', reject); backend.listen(backendPort, '127.0.0.1', resolve); });
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(frontendPort)], {
    cwd: path.join(__dirname, '../frontend'), env: { ...process.env, NEXT_VERIFY_BUILD: '1', API_URL: `http://127.0.0.1:${backendPort}`, NEXTAUTH_URL: origin, NEXTAUTH_SECRET: 'fixture-only-home-secret', AUTH_TRUST_HOST: 'true', INTERNAL_API_SECRET: 'fixture-only-home-token', ADMIN_EMAIL: 'admin@fixture.invalid', ADMIN_PASSWORD: 'fixture-only-password' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let diagnostics = ''; server.stdout.on('data', d => diagnostics = (diagnostics + d).slice(-1500)); server.stderr.on('data', d => diagnostics = (diagnostics + d).slice(-1500));
  let browser;
  try {
    for (let i = 0; i < 60; i++) { try { const r = await fetch(origin + '/login'); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    async function scenario(role, modules, options = {}) {
      mode = { modules, empty: false, fail: false, partial: false, ...options }; calls = [];
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const request = context.request;
        const { csrfToken } = await (await request.get(origin + '/api/auth/csrf')).json();
        await request.post(origin + '/api/auth/callback/credentials', { maxRedirects: 0, form: { csrfToken, email: role + '@fixture.invalid', password: 'fixture-only-password', callbackUrl: origin + '/dashboard', json: 'true' } });
        assert.equal((await (await request.get(origin + '/api/auth/session')).json()).user?.role, role);
        calls = [];
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(origin + '/dashboard?tenant=fixture-selected', { waitUntil: 'networkidle' });
        await page.getByRole('heading', { name: 'Necesita atención', exact: true }).waitFor().catch(async error => { console.error('Fixture page:', page.url(), (await page.locator('body').innerText()).slice(0, 1200)); throw error; });
        if(process.argv.includes('--final-surfaces-only')) { await require('./verify-final-surfaces-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--followup-visual-only')) { await require('./verify-followup-visual-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--business-visual-only')) { await require('./verify-business-visual-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--hours-visual-only')) { await require('./verify-hours-visual-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--services-visual-only')) { await require('./verify-services-visual-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--staff-visual-only')) { await require('./verify-staff-visual-fixture.cjs')({page,origin,directory}); return; }
        if(process.argv.includes('--booking-visual-only')) { await require('./verify-booking-visual-fixture.cjs')({page,origin,directory,today}); return; }
        if(process.argv.includes('--grooming-visual-only')) { await require('./verify-grooming-visual-fixture.cjs')({page,origin,directory,today}); return; }
        if(process.argv.includes('--clinical-visual-only')) { await require('./verify-clinical-visual-fixture.cjs')({page,origin,directory,today}); return; }
        if(process.argv.includes('--contacts-visual-only')) { await require('./verify-contacts-visual-fixture.cjs')({page,origin,directory,today}); return; }
        if(process.argv.includes('--inventory-visual-only')) { await require('./verify-inventory-visual-fixture.cjs')({page,origin,directory,today}); return; }
        const access = effectiveAccess({ type: role, staffId: role }, modules), c = access.capabilities;
        assert.equal(await page.getByRole('heading', { name: 'Resultados del negocio · hoy' }).count(), c.finance ? 1 : 0, 'Financial visibility: ' + role);
        assert.equal(await page.getByRole('heading', { name: 'Agenda de hoy', exact: true }).count(), c.agenda ? 1 : 0, 'Agenda visibility: ' + role);
        assert.equal(await page.getByRole('link', { name: /Nueva cita.*Agendar manualmente/ }).count(), c.schedule ? 1 : 0, 'Scheduling visibility: ' + role);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(errors.length, 0, errors.join('\n'));
        assert.equal(await page.locator('main time[datetime]').filter({ hasText: 'Consultado a las' }).count(), 1, 'Consulta fechada junto a la actualización');
        assert.equal(await page.getByText(/^Actualización parcial · algunas lecturas no están disponibles\.$/).count(), options.fail ? 1 : 0);
        if (options.fail) {
          assert(await page.getByText('No disponible. Actualiza Inicio para comprobar este pendiente.', { exact: true }).count() > 0);
          assert.equal(await page.getByRole('heading', { name: 'Sin pendientes en esta consulta' }).count(), 0);
          assert.equal(await page.getByText('Resultados no disponibles. Actualiza Inicio para comprobarlos.', { exact: true }).count(), 1);
        } else if (options.empty) {
          assert.equal(await page.getByRole('heading', { name: 'Sin pendientes en esta consulta' }).count(), 1);
        } else {
          assert.equal(await page.getByRole('link', { name: /Historias clínicas de hoy/, includeHidden: true }).count(), c.clinical ? 1 : 0);
          assert.equal(await page.getByRole('link', { name: /Entregas de peluquería/, includeHidden: true }).count(), c.grooming ? 1 : 0);
          assert.equal(await page.getByRole('link', { name: /Confirmar métodos de pago/, includeHidden: true }).count(), c.cash ? 1 : 0);
          if (c.agenda && modules.includes('veterinary') && role !== 'groomer') {
            // The fixture has nine veterinary visits and one grooming visit;
            // the current agenda page shows up to ten, respecting role/module gates.
            const expectedVisits = 9 + (modules.includes('grooming') && ['admin', 'receptionist'].includes(role) ? 1 : 0);
            assert.equal(await page.getByRole('button', { name: /Abrir cita de/ }).count(), expectedVisits);
          }
          if (options.partial) assert(await page.getByText('1 en lista', { exact: true }).count() > 0);
          const expectedFirst = { admin: 'Unidades vencidas', receptionist: 'WhatsApp necesita al equipo', vet: 'Historias clínicas de hoy', groomer: 'Entregas de peluquería' }[role];
          assert.equal(await page.locator('article[data-home-task]').first().getAttribute('data-home-task'), expectedFirst, 'Orden de pendientes del perfil');
        }
        const tasks=page.locator('article[data-home-task]');
        const warningCount=await page.locator('article[data-home-task][data-unavailable="true"]').count();
        if(warningCount) await page.getByText(new RegExp('^'+warningCount+' revisi[oó]n(?:es)? no disponible')).waitFor();
        assert(await page.locator('article[data-home-task]:visible').count()<=3,'Móvil muestra una página corta');
        const seen=new Set();
        const remember=async()=>{for(const id of await page.locator('article[data-home-task]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.homeTask)))seen.add(id)};
        await remember();
        const pager=page.getByRole('navigation',{name:'Páginas de prioridades'});
        if(await pager.count()) {
          const numbers=pager.getByRole('button',{name:/^Página [0-9]+ de prioridades$/});
          for(let i=1;i<await numbers.count();i++){await numbers.nth(i).focus();await page.keyboard.press('Enter');await remember();}
          await numbers.first().click();
        }
        assert.equal(seen.size,await tasks.count(),'Todas las prioridades y errores son accesibles por páginas');
        if (role === 'admin' && modules.length === 3 && !options.fail && !options.empty && !options.partial) {
          const stamp = page.locator('main time[datetime]').filter({ hasText: 'Consultado a las' });
          const previous = await stamp.getAttribute('datetime');
          await page.getByRole('button', { name: 'Actualizar Inicio', exact: true }).first().click();
          await page.waitForFunction(before => [...document.querySelectorAll('main time[datetime]')].some(node => node.textContent.includes('Consultado a las') && node.getAttribute('datetime') > before), previous);
          console.log('PASS refresh: consultation timestamp advances after server reads');
        }
        assert.equal(errors.length, 0, errors.join('\n'));
        if (role === 'admin' && modules.length === 3 && !options.fail && !options.empty && !options.partial) {
          await require('./verify-dashboard-navigation-fixture.cjs')({ page, directory });
          const agenda = page.locator('#agenda-de-hoy');
          mode.stress=true;
          await agenda.getByRole('button', { name: 'Actualizar ahora', exact: true }).click();
          await agenda.getByText('Cobrado: $ 66.000', { exact: true }).waitFor();
          assert.equal(await agenda.getByRole('link', { name: 'Registrar pago: Mascota entrega', exact:true }).count(), 1);
          assert.equal(await agenda.getByRole('link', { name: 'Ver pago: Mascota historia', exact:true }).count(), 1);
          assert.equal(await agenda.getByText('Pendiente de pago', {exact:true}).count(), 1);
          assert(await agenda.getByText(/Servicio:/).filter({hasText:'48.000'}).count() > 0);
          assert(await agenda.getByText('Domicilio: $ 18.000', {exact:true}).count() > 0);
          const opening = agenda.getByRole('button', { name: /Abrir cita de/ });
          assert(await agenda.evaluate((el, statusId) => !!(el.compareDocumentPosition(document.getElementById(statusId)) & Node.DOCUMENT_POSITION_FOLLOWING), 'service-status-heading'), 'Agenda comes before technical service status');
          for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Home fits ' + width);
            const filters=agenda.getByRole('button', { name: /^(Todas las citas|Por revisar)/ });
            for (const filter of await filters.all()) assert((await filter.boundingBox()).height >= 44);
            const first=opening.first();
            assert(await first.evaluate(el => el.scrollWidth <= el.clientWidth), 'Appointment content fits ' + width);
          }
          await page.getByRole('button', { name: 'En espera: 8 citas', exact: true }).click();
          assert.equal(await opening.count(), 8);
          await page.getByRole('button', { name: 'Terminadas: 2 citas', exact: true }).click();
          assert.equal(await opening.count(), 2);
          await agenda.getByRole('button', { name: 'Todas las citas', exact: true }).click();
          assert.equal(await opening.count(), 10);
          mode.extended=true;
          await agenda.getByRole('button', { name: 'Actualizar ahora', exact: true }).click();
          await agenda.getByText('1–10 de 13 citas en este filtro', { exact: true }).waitFor();
          await agenda.getByRole('button', { name: 'Página siguiente de citas' }).click();
          assert.equal(await opening.count(), 3);
          await agenda.getByRole('button', { name: 'Página anterior de citas' }).click();
          assert.equal(await opening.count(), 10);
          mode.extended=false;
          await agenda.getByRole('button', { name: 'Actualizar ahora', exact: true }).click();
          await agenda.getByText('10 citas en este filtro', { exact: true }).waitFor();
          for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(() => window.scrollTo(0,0));
            await page.screenshot({ path: path.join(directory, 'home-refined-' + width + '.png'), fullPage: true });
            await page.screenshot({ path: path.join(directory, 'home-viewport-' + width + '.png') });
            await agenda.screenshot({ path: path.join(directory, 'agenda-refined-' + width + '.png') });
          }
          mode.stress=false;
          await page.setViewportSize({ width:390, height:844 });
          console.log('PASS daily agenda: responsive layout, touch filters, state selection, 13 appointments across two pages, operational content before technical status');
        }
        const links = await page.locator('main a[href^="/dashboard"]').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')));
        assert(links.every(href => new URL(href, 'http://test').searchParams.get('tenant') === 'fixture-selected'), 'Every home destination preserves selected tenant');
        if (!c.clinical) assert(!calls.some(x => x.path === '/appointments/week'));
        if (!c.grooming) assert(!calls.some(x => x.path === '/grooming/appointments'));
        if (!c.cash) assert(!calls.some(x => x.path === '/cash/operational'));
        if (!c.finance) assert(!calls.some(x => x.path === '/metrics/cashbox'));
        const badScope = calls.filter(x => x.tenant !== (role === 'admin' ? 'fixture-selected' : 'fixture-tenant'));
        assert.equal(badScope.length, 0, 'Tenant remains derived from authenticated identity: ' + JSON.stringify(badScope));
        await page.screenshot({ path: path.join(directory, `fixture-${role}-${modules.join('-')}${options.fail ? '-failure' : options.empty ? '-empty' : options.partial ? '-partial' : ''}.png`), fullPage: true });
        if(role==='admin' && modules.length===3 && !options.empty && !options.fail && !options.partial) { await require('./verify-calendar-fixture.cjs')({page,origin,directory,today}); await require('./verify-pos-visual-fixture.cjs')({page,origin,directory}); mode.cashVisual=true; await require('./verify-cashbox-visual-fixture.cjs')({page,origin,directory,onClosed:()=>{mode.closedVisual=true;}}); mode.cashVisual=false; mode.closedVisual=false; mode.expenseVisual=true; await require('./verify-expenses-visual-fixture.cjs')({page,origin,directory}); mode.expenseVisual=false; await require('./verify-history-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-reports-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-inventory-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-contacts-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-clinical-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-grooming-visual-fixture.cjs')({page,origin,directory,today}); await require('./verify-booking-visual-fixture.cjs')({page,origin,directory,today}); }
        console.log(`PASS fixture ${role}/${modules.join('+')}: role visibility, tenant isolation, source gates, mobile layout${options.fail ? ', partial failure' : options.empty ? ', empty state' : options.partial ? ', partial lists' : ''}`);
      } finally { await context.close(); }
    }
    if(process.argv.includes('--final-surfaces-only')) { await scenario('admin',['veterinary','grooming','retail'],{finalVisual:true}); return; }
    if(process.argv.includes('--followup-visual-only')) { await scenario('admin',['veterinary','grooming','retail'],{followupVisual:true}); return; }
    if(process.argv.includes('--business-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--hours-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--services-visual-only')) { await scenario('admin',['veterinary','grooming','retail'],{servicesVisual:true}); return; }
    if(process.argv.includes('--staff-visual-only')) { mode.staffVisual=true;await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--booking-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--grooming-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--clinical-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--contacts-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    if(process.argv.includes('--inventory-visual-only')) { await scenario('admin',['veterinary','grooming','retail']); return; }
    for (const role of ['admin', 'receptionist', 'vet', 'groomer']) await scenario(role, ['veterinary', 'grooming', 'retail']);
    for (const modules of [['retail'], ['veterinary'], ['grooming'], ['veterinary', 'retail'], ['grooming', 'retail'], ['veterinary', 'grooming']]) await scenario('admin', modules);
    await scenario('admin', ['veterinary', 'grooming', 'retail'], { empty: true });
    await scenario('admin', ['veterinary', 'grooming', 'retail'], { fail: true });
    await scenario('admin', ['veterinary', 'grooming', 'retail'], { partial: true });
  } catch (error) { throw new Error(error.stack + '\n' + diagnostics); }
  finally { if (browser) await browser.close(); if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill('SIGTERM'); await stopped; } await new Promise(resolve => backend.close(resolve)); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
