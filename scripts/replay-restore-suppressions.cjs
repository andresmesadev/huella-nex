// Restore-only helper. No application .env, provider access or production URL fallback.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const FORMAT = 'huella-restore-suppressions-v1';
const OPERATION = 'erase-unreferenced-tenant-v1';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const quote = value => '"' + value.replaceAll('"','""') + '"';
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function validateJournal(bytes, expectedSha256, now = Date.now()) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 1024*1024 || !/^[a-f0-9]{64}$/.test(expectedSha256 || '')) fail('RESTORE_SUPPRESSION_TRUST_REQUIRED');
  if (createHash('sha256').update(bytes).digest('hex') !== expectedSha256) fail('RESTORE_SUPPRESSION_INTEGRITY_FAILED');
  let journal; try { journal = JSON.parse(bytes.toString('utf8')); } catch { fail('RESTORE_SUPPRESSION_FORMAT'); }
  if (!exactKeys(journal,['format','registerId','revision','issuedAt','validUntil','complete','entries']) || journal.format !== FORMAT || !identifier(journal.registerId) || !Number.isSafeInteger(journal.revision) || journal.revision<1 || journal.complete!==true || !Array.isArray(journal.entries) || journal.entries.length>500) fail('RESTORE_SUPPRESSION_FORMAT');
  const issued=Date.parse(journal.issuedAt),until=Date.parse(journal.validUntil);
  if (!Number.isFinite(issued)||!Number.isFinite(until)||issued>now+300000||until<=now||until<=issued||until-issued>86400000) fail('RESTORE_SUPPRESSION_EXPIRED');
  const tenants=new Set(),cases=new Set();
  for (const entry of journal.entries) {
    if (!exactKeys(entry,['caseId','operation','decision','approvedAt','tenantId','userIds','petIds','staffIds']) || !identifier(entry.caseId)||cases.has(entry.caseId)||entry.operation!==OPERATION||entry.decision!=='approved'||!Number.isFinite(Date.parse(entry.approvedAt))||Date.parse(entry.approvedAt)>issued||!identifier(entry.tenantId)||tenants.has(entry.tenantId)) fail('RESTORE_SUPPRESSION_UNREVIEWED_ENTRY');
    cases.add(entry.caseId);tenants.add(entry.tenantId);
    const allIds=new Set([entry.tenantId]);
    for (const key of ['userIds','petIds','staffIds']) {
      if (!Array.isArray(entry[key])||entry[key].length>1000||entry[key].some(id=>!identifier(id)||allIds.has(id))) fail('RESTORE_SUPPRESSION_SCOPE_REQUIRED');
      for(const id of entry[key]){if(allIds.has(id))fail('RESTORE_SUPPRESSION_SCOPE_REQUIRED');allIds.add(id);}
    }
  }
  return journal;
}
const targetAllowed = name => name==='mateos_restore_drill' || /^restore_[a-f0-9]{16}$/.test(name);
async function replaySuppressions(client,{bytes,expectedSha256,expectedDatabase}) {
  const journal=validateJournal(bytes,expectedSha256);
  if (!targetAllowed(expectedDatabase)) fail('RESTORE_SUPPRESSION_TARGET_REQUIRED');
  const current=await client.query('SELECT current_database() AS name');
  if (current.rows[0]?.name!==expectedDatabase) fail('RESTORE_SUPPRESSION_TARGET_MISMATCH');
  const receipts=[];
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[journal.registerId]);
    const relations=(await client.query(`SELECT src.relname AS source_table,sa.attname AS source_column,dst.relname AS target_table,da.attname AS target_column
      FROM pg_constraint fk JOIN pg_class src ON src.oid=fk.conrelid JOIN pg_namespace sn ON sn.oid=src.relnamespace
      JOIN pg_class dst ON dst.oid=fk.confrelid JOIN pg_namespace dn ON dn.oid=dst.relnamespace
      CROSS JOIN LATERAL unnest(fk.conkey,fk.confkey) AS cols(source_num,target_num)
      JOIN pg_attribute sa ON sa.attrelid=src.oid AND sa.attnum=cols.source_num
      JOIN pg_attribute da ON da.attrelid=dst.oid AND da.attnum=cols.target_num
      WHERE fk.contype='f' AND sn.nspname='public' AND dn.nspname='public' AND dst.relname=ANY($1::text[])`,[['Tenant','User','Pet','Staff']])).rows;
    const scoped=(await client.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenantId'")).rows;
    for (const entry of journal.entries) {
      const plan={Tenant:{pk:'id',ids:[entry.tenantId]},User:{pk:'id',ids:entry.userIds},Pet:{pk:'id',ids:entry.petIds},Staff:{pk:'id',ids:entry.staffIds},StaffCredential:{pk:'staffId',ids:entry.staffIds}};
      let present=0;
      for (const table of ['Tenant','User','Pet','Staff']) {
        const p=plan[table];const cols=table==='Tenant'?'"id"':'"id","tenantId"';
        const rows=(await client.query(`SELECT ${cols} FROM public.${quote(table)} WHERE "id"::text=ANY($1::text[]) FOR UPDATE`,[p.ids])).rows;
        present+=rows.length;
        if(table!=='Tenant'&&rows.some(r=>r.tenantId!==entry.tenantId))fail('RESTORE_SUPPRESSION_SCOPE_MISMATCH');
      }
      // Reject any record outside the exact reviewed deletion set, even on SET NULL relations.
      for(const {table_name:table} of scoped){
        const p=plan[table];
        const r=await client.query(`SELECT 1 FROM public.${quote(table)} WHERE "tenantId"=$1${p?` AND NOT (${quote(p.pk)}::text=ANY($2::text[]))`:''} LIMIT 1`,p?[entry.tenantId,p.ids]:[entry.tenantId]);
        if(r.rowCount)fail('RESTORE_SUPPRESSION_RETENTION_REVIEW_REQUIRED');
      }
      for(const ref of relations){
        const target=plan[ref.target_table];if(ref.target_column!==target.pk)fail('RESTORE_SUPPRESSION_SCHEMA_REVIEW_REQUIRED');
        const source=plan[ref.source_table];
        const r=await client.query(`SELECT 1 FROM public.${quote(ref.source_table)} WHERE ${quote(ref.source_column)}::text=ANY($1::text[])${source?` AND NOT (${quote(source.pk)}::text=ANY($2::text[]))`:''} LIMIT 1`,source?[target.ids,source.ids]:[target.ids]);
        if(r.rowCount)fail('RESTORE_SUPPRESSION_REFERENCES_REVIEW_REQUIRED');
      }
      const credentials=(await client.query('SELECT "staffId" FROM public."StaffCredential" WHERE "staffId"::text=ANY($1::text[])',[entry.staffIds])).rowCount;
      if(!present&&credentials)fail('RESTORE_SUPPRESSION_ORPHAN_REVIEW_REQUIRED');
      for(const table of ['Pet','User','StaffCredential','Staff','Tenant']){
        const p=plan[table];await client.query(`DELETE FROM public.${quote(table)} WHERE ${quote(p.pk)}::text=ANY($1::text[])`,[p.ids]);
      }
      for(const [table,p] of Object.entries(plan)){
        if((await client.query(`SELECT 1 FROM public.${quote(table)} WHERE ${quote(p.pk)}::text=ANY($1::text[]) LIMIT 1`,[p.ids])).rowCount)fail('RESTORE_SUPPRESSION_VERIFICATION_FAILED');
      }
      receipts.push({caseId:entry.caseId,result:present?'applied':'already-absent'});
    }
    validateJournal(bytes,expectedSha256);
    await client.query('COMMIT');
    return {format:'huella-restore-suppression-receipt-v1',journalSha256:expectedSha256,registerId:journal.registerId,revision:journal.revision,verified:true,entries:receipts};
  } catch(error) { await client.query('ROLLBACK').catch(()=>{});throw error; }
}
async function main(){
  const journalFile=process.env.HUELLA_RESTORE_SUPPRESSION_JOURNAL,sha=process.env.HUELLA_RESTORE_SUPPRESSION_SHA256;
  if(!journalFile||!sha)fail('RESTORE_SUPPRESSION_TRUST_REQUIRED');
  const bytes=fs.readFileSync(journalFile);validateJournal(bytes,sha);
  let target;try{target=new URL(process.env.HUELLA_RESTORE_DATABASE_URL);}catch{fail('RESTORE_SUPPRESSION_TARGET_REQUIRED');}
  const database=target.pathname.slice(1);
  if(target.protocol!=='postgresql:'||target.hostname!=='127.0.0.1'||!targetAllowed(database)||target.username!=='postgres'||target.search||target.hash)fail('RESTORE_SUPPRESSION_TARGET_REQUIRED');
  const {Client}=require('../backend/node_modules/pg');
  const client=new Client({connectionString:target.toString(),connectionTimeoutMillis:5000});
  try{await client.connect();console.log(JSON.stringify(await replaySuppressions(client,{bytes,expectedSha256:sha,expectedDatabase:database})));}finally{await client.end();}
}
if(require.main===module)main().catch(error=>{console.error(/^RESTORE_SUPPRESSION_[A-Z_]+$/.test(error.code||error.message)?error.code||error.message:'RESTORE_SUPPRESSION_FAILED_REVIEW_REQUIRED');process.exitCode=1;});
module.exports={validateJournal,replaySuppressions,FORMAT,OPERATION};
