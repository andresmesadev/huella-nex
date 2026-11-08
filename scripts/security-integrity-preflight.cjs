// Explicit connection only. Never changes data or creates database objects.
const {preflightQueries}=require('./security-integrity-contract.cjs');
async function checkIntegrity(db) {
 const result=[];
 for(const q of preflightQueries())result.push({name:q.name,...(await db.query(q.sql)).rows[0]});
 return result;
}
module.exports={checkIntegrity};
if(require.main===module){
 const {Client}=require('../backend/node_modules/pg');
 const url=process.env.SECURITY_PREFLIGHT_DATABASE_URL;
 if(!url)throw Error('SECURITY_PREFLIGHT_DATABASE_URL is required; DATABASE_URL is never used implicitly');
 const db=new Client({connectionString:url,options:'-c default_transaction_read_only=on -c statement_timeout=15000',connectionTimeoutMillis:5000});
 (async()=>{await db.connect();try{await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const results=await checkIntegrity(db);await db.query('ROLLBACK');console.log(JSON.stringify({readOnly:true,results},null,2));if(results.some(x=>x.violations))process.exitCode=2;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
}
