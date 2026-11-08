const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {Client}=require('../backend/node_modules/pg');
const url=process.env.SECURITY_INTEGRITY_TEST_DATABASE_URL || process.env.DATABASE_URL;
const target=new URL(url||'http://invalid');
assert(['127.0.0.1','localhost'].includes(target.hostname) && ['/mateos_dev','/huella_migration_check'].includes(target.pathname),'Only an explicitly named local test database is allowed');
let context;
const db=new Client({connectionString:url});
const cases=[];let n=0;
async function probe(name,sql,code=null,classification='protection'){
 return context.test(name,async()=>{
 const save='probe_'+(++n);await db.query('SAVEPOINT '+save);let error=null;
 try{await db.query(sql);await db.query('SET CONSTRAINTS ALL IMMEDIATE');}catch(e){error=e;}
 await db.query('ROLLBACK TO SAVEPOINT '+save);await db.query('RELEASE SAVEPOINT '+save);
 assert.equal(error?.code||null,code,name+': '+(error?.message||'accepted'));
 const r={name,classification,observed:code?'rejected':'accepted',sqlstate:code,expected:true};cases.push(r);console.log(JSON.stringify(r));
 });
}
test('Security integrity: real migrated PostgreSQL boundaries and compatibility',async t=>{context=t;await db.connect();try{
 const id=(await db.query('SELECT current_database() AS db,current_user AS role')).rows[0];assert.equal('/'+id.db,target.pathname);await db.query('BEGIN');
 await db.query(`
 INSERT INTO "Tenant"(id,name,slug,"updatedAt") VALUES ('audit-a','Synthetic A','audit-a',now()),('audit-b','Synthetic B','audit-b',now());
 INSERT INTO "User"(id,"tenantId",phone) VALUES ('audit-user-a','audit-a','573000000001'),('audit-user-b','audit-b','573000000002');
 INSERT INTO "Staff"(id,"tenantId",name,role,"updatedAt") VALUES ('audit-staff-a','audit-a','Synthetic A','groomer',now()),('audit-staff-b','audit-b','Synthetic B','groomer',now());
 INSERT INTO "Pet"(id,"tenantId","ownerId",name,type) VALUES ('audit-pet-a','audit-a','audit-user-a','Synthetic pet','dog');
 INSERT INTO "ServiceCategory"(id,"tenantId",name) VALUES ('audit-category-a','audit-a','Synthetic category');
 INSERT INTO "Service"(id,"tenantId",name,"categoryId",duration,"updatedAt") VALUES ('audit-service-a','audit-a','Synthetic service','audit-category-a',60,now());
 INSERT INTO "Appointment"(id,"tenantId","userId","petId","petName","petType","serviceType","serviceId","staffId","availabilityBucket",date) VALUES ('audit-appt-a','audit-a','audit-user-a','audit-pet-a','Synthetic pet','dog','grooming','audit-service-a','audit-staff-a','grooming','2028-01-05T15:00:00Z');
 INSERT INTO "Commission"(id,"tenantId","appointmentId","staffId","resolvedPrice","priceSource","splitRate","staffShare","businessShare","serviceCategory","completedAt") VALUES ('audit-commission-a','audit-a','audit-appt-a','audit-staff-a',100,'synthetic',0.5,50,50,'grooming',now());
 INSERT INTO "Transaction"(id,"tenantId","appointmentId",total,"paymentMethod",origin) VALUES ('audit-tx-a','audit-a','audit-appt-a',100,'cash','system_appointment_completed');
 INSERT INTO "TransactionItem"(id,"transactionId",description,quantity,"unitPrice",total) VALUES ('audit-item-a','audit-tx-a','Synthetic item',1,100,100);
 INSERT INTO "Channel"(id,type) VALUES ('audit-channel-a','synthetic-audit');
 INSERT INTO "InventoryProduct"(id,"tenantId",name,category,"internalCode","internalCodeKey",presentation,uses,"referenceCost","salePrice","lotPolicy","updatedAt") VALUES ('audit-product-a','audit-a','Synthetic product','Synthetic','AUDIT','audit','unit',ARRAY['retail'],1,2,'untracked',now());
 INSERT INTO "InventoryLot"(id,"tenantId","productId","groupKind","firstReceivedAt","updatedAt") VALUES ('audit-lot-a','audit-a','audit-product-a','untracked',now(),now());
 INSERT INTO "InventoryOperation"(id,"tenantId","principalKey",kind,"requestKey","contractVersion","payloadHash","actorId","actorName","actorRole","confirmedAt","resultKind","resultProductId") VALUES ('audit-operation-a','audit-a','synthetic','create_product','00000000-0000-4000-8000-000000000001',1,repeat('1',64),'synthetic','Synthetic','admin',now(),'product','audit-product-a');
 INSERT INTO "MedicalRecord"(id,"petId",type,title,"updatedAt") VALUES ('audit-record-a','audit-pet-a','synthetic','Synthetic',now());
 INSERT INTO "MedicalRecordRevision"(id,"recordId",version,"before","after",reason,"actorType","actorName") VALUES ('audit-revision-a','audit-record-a',1,'{}','{}','Synthetic','admin','Synthetic');
 INSERT INTO "EventType"(id,name,"originContext") VALUES ('audit-event-type','SyntheticAuditType','synthetic');
 INSERT INTO "DomainEvent"(id,"tenantId","eventTypeId",payload,origin,"occurredAt") VALUES ('audit-event-a','audit-a','audit-event-type','{}','synthetic',now());
 `);
 await probe('Only one active commission per appointment',`INSERT INTO "Commission" SELECT 'audit-commission-duplicate',"tenantId","appointmentId","staffId","resolvedPrice","priceSource","splitRate","staffShare","businessShare","serviceCategory","completedAt","createdAt","replacesCommissionId",status,"voidReason","voidedAt","transactionItemId","serviceId" FROM "Commission" WHERE id='audit-commission-a'`,'23505');
 await probe('Void and replacement commission remain allowed',`UPDATE "Commission" SET status='voided',"voidReason"='Synthetic correction',"voidedAt"=now() WHERE id='audit-commission-a'; INSERT INTO "Commission" SELECT 'audit-commission-replacement',"tenantId","appointmentId","staffId","resolvedPrice","priceSource","splitRate","staffShare","businessShare","serviceCategory","completedAt","createdAt",'audit-commission-a','active',NULL,NULL,"transactionItemId","serviceId" FROM "Commission" WHERE id='audit-commission-a'`,null);
 await probe('Only one active charge per appointment and origin',`INSERT INTO "Transaction"(id,"tenantId","appointmentId",total,origin) VALUES ('audit-tx-duplicate','audit-a','audit-appt-a',100,'system_appointment_completed')`,'23505');
 await probe('Only one global channel per type',`INSERT INTO "Channel"(id,type) VALUES ('audit-channel-duplicate','synthetic-audit')`,'23505');
 await probe('Inventory lot cannot reference another tenant product',`INSERT INTO "InventoryLot"(id,"tenantId","productId","groupKind","firstReceivedAt","updatedAt") VALUES ('audit-lot-foreign','audit-b','audit-product-a','untracked',now(),now())`,'23514');
 await probe('Only one untracked lot per product',`INSERT INTO "InventoryLot"(id,"tenantId","productId","groupKind","firstReceivedAt","updatedAt") VALUES ('audit-lot-duplicate','audit-a','audit-product-a','untracked',now(),now())`,'23505');
 await probe('Negative inventory minimum is rejected',`UPDATE "InventoryProduct" SET "stockMinimum"=-1 WHERE id='audit-product-a'`,'23514');
 await probe('Inventory operation evidence is immutable',`UPDATE "InventoryOperation" SET "actorName"='Changed' WHERE id='audit-operation-a'`,'23514');
 await probe('Mixed payment must add up to total',`INSERT INTO "Transaction"(id,"tenantId",total,"paymentMethod","cashAmount","transferAmount") VALUES ('audit-tx-mixed','audit-a',100,'mixed',10,20)`,'23514');
 await probe('Staff service contract percentage is bounded',`UPDATE "Staff" SET "contractType"='service',"commissionRate"=1.2 WHERE id='audit-staff-a'`,'23514');
 await probe('Shared transport must stay within the tenant',`INSERT INTO "Appointment"(id,"tenantId","userId","petName","petType","serviceType",date,"transportMode","transportPrice","transportSharedWithId") VALUES ('audit-appt-foreign','audit-b','audit-user-b','Synthetic','dog','grooming','2028-01-06T15:00:00Z','shared',0,'audit-appt-a')`,'23503');
 await probe('Database rejects commission staff from another tenant',`UPDATE "Commission" SET "staffId"='audit-staff-b' WHERE id='audit-commission-a'`,'23514','security-regression');
 await probe('Database rejects client session for foreign tenant user',`INSERT INTO "ClientSession"(id,"tenantId","userId","tokenHash","expiresAt") VALUES ('audit-session-foreign','audit-a','audit-user-b','synthetic-session-hash',now()+interval '1 hour')`,'23514','security-regression');
 await probe('Database rejects pet owner from another tenant',`UPDATE "Pet" SET "ownerId"='audit-user-b' WHERE id='audit-pet-a'`,'23514','security-regression');
 await probe('Database rejects medical record staff from another tenant',`UPDATE "MedicalRecord" SET "staffId"='audit-staff-b' WHERE id='audit-record-a'`,'23514','security-regression');
 await probe('Database rejects rewriting historical clinical revision',`UPDATE "MedicalRecordRevision" SET "after"='{"syntheticChanged":true}' WHERE id='audit-revision-a'`,'23514','security-regression');
 await probe('Domain event without PublicationIntent is append-only',`UPDATE "DomainEvent" SET payload='{"syntheticChanged":true}' WHERE id='audit-event-a'`,'23514','security-regression');
 await probe('Commission percentage and shares cannot be rewritten',`UPDATE "Commission" SET "splitRate"=1.5,"staffShare"=-1,"businessShare"=0 WHERE id='audit-commission-a'`,'23514','security-regression');
 await probe('Database rejects reversed staff absence dates',`INSERT INTO "StaffAvailability"(id,"staffId",type,"startAt","endAt") VALUES ('audit-absence-reversed','audit-staff-a','planned_absence','2028-01-06','2028-01-05')`,'23514','security-regression');
 await probe('Database rejects reversed settlement period',`INSERT INTO "Settlement"(id,"tenantId","staffId","periodStart","periodEnd","totalAmount") VALUES ('audit-settlement-reversed','audit-a','audit-staff-a','2028-02-01','2028-01-01',100)`,'23514','security-regression');
 await probe('Non-product legacy item enforces quantity and total equation',`UPDATE "TransactionItem" SET quantity=0,"unitPrice"=-1,total=100 WHERE id='audit-item-a'`,'23514','security-regression');
 await probe('Null-scope owner cannot bypass tenant validation',`INSERT INTO "Pet"(id,"ownerId",name,type) VALUES ('audit-pet-null','audit-user-a','Synthetic','dog')`,'23514');
 await probe('Parent tenant reassignment is rejected',`UPDATE "User" SET "tenantId"='audit-b' WHERE id='audit-user-a'`,'23514');
 await probe('Clinical pet identity cannot change',`UPDATE "MedicalRecord" SET "petId"='missing-pet' WHERE id='audit-record-a'`,'23514');
 await probe('Legacy line source cannot move to another transaction',`UPDATE "TransactionItem" SET "transactionId"='missing-tx' WHERE id='audit-item-a'`,'23514');
 await probe('Own client session remains valid',`INSERT INTO "ClientSession"(id,"tenantId","userId","tokenHash","expiresAt") VALUES ('audit-session-own','audit-a','audit-user-a','synthetic-own',now()+interval '1 hour')`);
 await probe('Legacy item without tenant keeps its transaction scope',`INSERT INTO "Commission"(id,"tenantId","transactionItemId","serviceId","staffId","resolvedPrice","priceSource","splitRate","staffShare","businessShare","serviceCategory","completedAt") VALUES ('audit-line-commission','audit-a','audit-item-a','audit-service-a','audit-staff-a',0,'synthetic',0.5,0,0,'grooming',now())`);
 await probe('New commission invalid split is rejected independently of history guard',`INSERT INTO "Commission"(id,"tenantId","transactionItemId","serviceId","staffId","resolvedPrice","priceSource","splitRate","staffShare","businessShare","serviceCategory","completedAt") VALUES ('audit-line-invalid','audit-a','audit-item-a','audit-service-a','audit-staff-a',100,'synthetic',1.5,-1,0,'grooming',now())`,'23514');
 await probe('Clinical revision deletion is rejected',`DELETE FROM "MedicalRecordRevision" WHERE id='audit-revision-a'`,'23514');
 await probe('Event deletion is rejected',`DELETE FROM "DomainEvent" WHERE id='audit-event-a'`,'23514');
 await probe('Event truncate cannot bypass append-only history',`SET CONSTRAINTS ALL IMMEDIATE; TRUNCATE "DomainEvent" CASCADE`,'23514');
 await probe('Commission truncate cannot erase history',`TRUNCATE "Commission" CASCADE`,'23514');
 await probe('No-op immutable history updates remain allowed',`UPDATE "DomainEvent" SET payload=payload WHERE id='audit-event-a'`);
 await probe('Inclusive financial period may contain a single day',`INSERT INTO "FinancialPeriod"(id,"tenantId","periodStart","periodEnd","incomeTotal","expenseTotal","netAmount",breakdown) VALUES ('audit-period-day','audit-a','2028-01-01','2028-01-01',0,0,0,'{}')`);
 await probe('Zero-priced non-product item is valid',`UPDATE "TransactionItem" SET quantity=1,"unitPrice"=0,total=0 WHERE id='audit-item-a'`);
 await probe('Valid weekly schedule remains valid',`INSERT INTO "StaffAvailability"(id,"staffId",type,weekday,"startTime","endTime") VALUES ('audit-weekly','audit-staff-a','base_schedule',1,'09:15','15:30')`);
 await probe('Null schedule clock does not pass CHECK via SQL null',`INSERT INTO "StaffAvailability"(id,"staffId",type,weekday,"startTime","endTime") VALUES ('audit-weekly-null','audit-staff-a','base_schedule',1,NULL,'15:30')`,'23514');
 await probe('Global category remains shared; tenant-owned services remain scoped',`INSERT INTO "ServiceCategory"(id,name) VALUES ('audit-global-category','Synthetic global'); INSERT INTO "Service"(id,"tenantId",name,"categoryId",duration,"updatedAt") VALUES ('audit-global-category-service','audit-a','Synthetic','audit-global-category',60,now())`);
 await probe('Legacy NULL-owned user and pet remain compatible',`INSERT INTO "User"(id,phone) VALUES ('audit-legacy-user','573111111111'); INSERT INTO "Pet"(id,"ownerId",name,type) VALUES ('audit-legacy-pet','audit-legacy-user','Synthetic legacy','dog')`);
 await db.query('ROLLBACK');
 const remaining=(await db.query("SELECT count(*)::int AS n FROM \"Tenant\" WHERE id IN ('audit-a','audit-b')")).rows[0].n;assert.equal(remaining,0);
 await context.test('Concurrent session lock fences parent scope reassignment',async()=>{
 const suffix=randomUUID(),a='audit-concurrent-a-'+suffix,b='audit-concurrent-b-'+suffix,u='audit-concurrent-u-'+suffix;
 await db.query('INSERT INTO "Tenant"(id,name,slug,"updatedAt") VALUES ($1,$1,$1,now()),($2,$2,$2,now())',[a,b]);
 await db.query('INSERT INTO "User"(id,"tenantId",phone) VALUES ($1,$2,$1)',[u,a]);
 const peer=new Client({connectionString:url});await peer.connect();
 try {await db.query('BEGIN');await db.query(`INSERT INTO "ClientSession"(id,"tenantId","userId","tokenHash","expiresAt") VALUES ($1,$2,$3,$1,now()+interval '1 hour')`,[suffix,a,u]);
 await peer.query('BEGIN');await peer.query("SET LOCAL lock_timeout='200ms'");
 await assert.rejects(peer.query('UPDATE "User" SET "tenantId"=$1 WHERE id=$2',[b,u]),{code:'55P03'});await peer.query('ROLLBACK');await db.query('COMMIT');
 await assert.rejects(peer.query('UPDATE "User" SET "tenantId"=$1 WHERE id=$2',[b,u]),{code:'23514'});
 }finally{await peer.query('ROLLBACK');await peer.end();await db.query('ROLLBACK');}
 });
 }finally{try{await db.query('ROLLBACK');}catch{}await db.end();}});

test('Forward migration aborts atomically on inconsistent history and preserves valid legacy data',async()=>{
 const fs=require('node:fs'),path=require('node:path');
 const admin=new Client({connectionString:url});await admin.connect();
 const database='huella_integrity_upgrade_'+randomUUID().replaceAll('-','');
 assert(/^huella_integrity_upgrade_[a-f0-9]{32}$/.test(database));
 const isolated=new URL(url);isolated.pathname='/'+database;
 let upgrade;
 try {
  await admin.query('CREATE DATABASE "'+database+'"');
  upgrade=new Client({connectionString:isolated.toString()});await upgrade.connect();
  const root=path.join(__dirname,'../prisma/migrations'),name='20261108070000_security_integrity_guards';
  for(const m of fs.readdirSync(root).sort().filter(m=>m<name && fs.existsSync(path.join(root,m,'migration.sql'))))await upgrade.query(fs.readFileSync(path.join(root,m,'migration.sql'),'utf8'));
  await upgrade.query(`INSERT INTO "Tenant"(id,name,slug,"updatedAt") VALUES ('old-a','Synthetic A','old-a',now()),('old-b','Synthetic B','old-b',now());
    INSERT INTO "User"(id,"tenantId",phone) VALUES ('old-user-a','old-a','573111111110'),('old-user-b','old-b','573111111111');
    INSERT INTO "User"(id,phone) VALUES ('legacy-user','573111111112');
    INSERT INTO "Pet"(id,"tenantId","ownerId",name,type) VALUES ('old-pet','old-a','old-user-b','Synthetic','dog');
    INSERT INTO "Pet"(id,"ownerId",name,type) VALUES ('legacy-pet','legacy-user','Legacy','dog');
    INSERT INTO "Transaction"(id,"tenantId",total) VALUES ('old-sale','old-a',100);
    INSERT INTO "TransactionItem"(id,"transactionId",description,quantity,"unitPrice",total) VALUES ('legacy-item','old-sale','Legacy',1,100,100);`);
  const migration=fs.readFileSync(path.join(root,name,'migration.sql'),'utf8');
  await assert.rejects(upgrade.query(migration),{code:'23514'});await upgrade.query('ROLLBACK');
  assert.equal((await upgrade.query("SELECT to_regprocedure('public.security_integrity_scope(text,jsonb)') AS guard")).rows[0].guard,null,'Failed upgrade must not install partial guards');
  // Repair only this deliberately invalid synthetic fixture, never real history.
  await upgrade.query(`UPDATE "Pet" SET "ownerId"='old-user-a' WHERE id='old-pet'`);
  const snapshot=async()=>JSON.stringify((await upgrade.query(`SELECT (SELECT json_agg(t ORDER BY id) FROM "Pet" t) AS pets,(SELECT json_agg(t ORDER BY id) FROM "TransactionItem" t) AS items`)).rows);
  const before=await snapshot();await upgrade.query(migration);assert.equal(await snapshot(),before);
  await assert.rejects(upgrade.query(`UPDATE "Pet" SET "ownerId"='old-user-b' WHERE id='old-pet'`),{code:'23514'});
 }finally{
  if(upgrade)await upgrade.end();
  // Exact UUID database created above; never drop the configured test database.
  await admin.query('DROP DATABASE IF EXISTS "'+database+'"');await admin.end();
 }
});
