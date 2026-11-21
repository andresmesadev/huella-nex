// Real shell-pipeline verification, called only by the disposable synthetic drill.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {spawnSync}=require('node:child_process');const {createHash}=require('node:crypto');
module.exports=async({dump,journalBytes,journalSha,own,check})=>{
  const repo=path.resolve(__dirname,'..');assert(own.startsWith(path.join(repo,'.cache','tenant-handovers')+path.sep));assert(path.basename(own).startsWith('protected-drill-'));assert(!fs.lstatSync(own).isSymbolicLink());
  const ageDir=path.join(repo,'.cache/tools/age-1.3.2/age');
  const age=process.platform==='win32'?path.join(ageDir,'age.exe'):'age';
  const keygen=process.platform==='win32'?path.join(ageDir,'age-keygen.exe'):'age-keygen';
  const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
  const gitPath=p=>process.platform==='win32'?'/'+p[0].toLowerCase()+p.slice(2).replaceAll('\\','/'):p;
  const run=(cmd,args,opts={})=>spawnSync(cmd,args,{windowsHide:true,timeout:180000,maxBuffer:16*1024*1024,...opts});
  const key=path.join(own,'age-test.key'),cipher=path.join(own,'database.dump.age'),sums=path.join(own,'SHA256SUMS'),journal=path.join(own,'shell-suppression-journal.json');
  try {
    const generated=run(keygen,['-o',key]);assert.equal(generated.status,0,'Test age key generation failed');
    const pub=run(keygen,['-y',key]);assert.equal(pub.status,0);
    const encrypted=run(age,['-r',pub.stdout.toString().trim()],{input:dump});assert.equal(encrypted.status,0);
    fs.writeFileSync(cipher,encrypted.stdout,{flag:'wx',mode:0o600});fs.writeFileSync(sums,createHash('sha256').update(encrypted.stdout).digest('hex')+'  database.dump.age\n');fs.writeFileSync(journal,journalBytes);
    const env={...process.env,PATH:ageDir+path.delimiter+process.env.PATH,HUELLA_RESTORE_SUPPRESSION_JOURNAL:gitPath(journal),HUELLA_RESTORE_SUPPRESSION_SHA256:journalSha,HUELLA_RESTORE_REPLAY_IMAGE:'huella-nex-r2-drill-backend:local',MATEOS_RESTORE_KEEP_CONTAINER:'false'};
    const args=[path.join(repo,'scripts/restore-database-drill.sh'),gitPath(own),gitPath(key)];
    const missing=run(bash,args,{env:{...env,HUELLA_RESTORE_SUPPRESSION_JOURNAL:''}});assert.notEqual(missing.status,0);assert(!missing.stdout.toString().includes('restore drill passed'));
    const corrupt=run(bash,args,{env:{...env,HUELLA_RESTORE_SUPPRESSION_SHA256:'0'.repeat(64)}});assert.notEqual(corrupt.status,0);assert(!corrupt.stdout.toString().includes('restore drill passed'));
    const result=run(bash,args,{env});
    if(result.status!==0){const lines=result.stderr.toString().split('\n').filter(l=>!/AGE-SECRET-KEY/.test(l));throw Error('Synthetic shell restore failed: '+lines.slice(-10).join('\n'));}
    const text=result.stdout.toString();assert(text.includes('restore suppression replay verified'));assert(text.includes('restore drill passed'));
    const receipt=text.split('\n').find(l=>l.startsWith('{')&&l.includes('huella-restore-suppression-receipt-v1'));assert(receipt);assert.equal(JSON.parse(receipt).entries[0].result,'applied');
    check('restore shell: real age backup, offline PostgreSQL and mandatory helper replay pass; missing or corrupt register prevents restoration success');
  } finally {
    for(const file of [key,cipher,sums,journal]){assert(path.dirname(file)===own);if(fs.existsSync(file)){assert(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink());fs.unlinkSync(file);}}
  }
};
