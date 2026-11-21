// Synthetic-only drill. Not a production deletion tool or delivery endpoint.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { spawnSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const { buildTenantHandover, writeHandover, verifyHandover } = require('./tenant-handover.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
module.exports = async ({ prisma, container, marker, businesses, output, check }) => {
  const db = new URL(process.env.DATABASE_URL);
  assert.equal(db.hostname, '127.0.0.1'); assert.equal(db.pathname, '/onboarding_test');
  assert(/^onboarding-check-[a-f0-9]{12}$/.test(marker)); assert(/^[a-f0-9]{64}$/.test(container));
  const run = (file,args,options={}) => spawnSync(file,args,{windowsHide:true,timeout:90000,maxBuffer:64*1024*1024,...options});
  const docker = args => { const r=run('docker',args); assert.equal(r.status,0,'Disposable Docker operation failed: '+args[0]); return r.stdout; };
  assert.equal(docker(['inspect','--format','{{ index .Config.Labels "mateos.verification" }}',container]).toString().trim(),marker);
  assert.equal((await prisma.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,'onboarding_test');
  const openssl = process.platform==='win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
  assert.equal(run(openssl,['version']).status,0,'OpenSSL must already be available');
  const root=path.resolve(__dirname,'../.cache/tenant-handovers'); fs.mkdirSync(root,{recursive:true});
  assert.equal(fs.realpathSync(root).toLowerCase(),root.toLowerCase());
  const own=fs.mkdtempSync(path.join(root,'protected-drill-'));
  const ownerToken=randomBytes(24).toString('hex'); fs.writeFileSync(path.join(own,'.owner'),ownerToken,{flag:'wx',mode:0o600});
  const file=name=>{assert(/^[a-zA-Z0-9_.-]+$/.test(name));return path.join(own,name);};
  const remove=name=>{const p=file(name);assert.equal(fs.readFileSync(file('.owner'),'utf8'),ownerToken);assert(path.resolve(p).startsWith(own+path.sep));if(fs.existsSync(p)){assert(fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink());fs.unlinkSync(p);}};
  const cryptoRun=(args,input)=>run(openssl,args,{input});
  const cryptoOk=(args,input)=>{const r=cryptoRun(args,input);assert.equal(r.status,0,'OpenSSL operation failed: '+args[0]);return r.stdout;};
  let server,restored,restorePool,restoreName;
  let dump,plaintext,privateKey;
  const evidence={synthetic:true,productionConnected:false,externalRecipient:false,events:[]};
  const record=(action,result)=>evidence.events.push({action,result});
  const suffix=randomBytes(8).toString('hex');
  const fixture={tenantId:'qa-erasure-'+suffix,userId:'qa-erasure-user-'+suffix,petId:'qa-erasure-pet-'+suffix,staffId:'qa-erasure-staff-'+suffix};
  const caseId='HN-QA-ERASURE-'+suffix.toUpperCase();
  const request={tenantId:fixture.tenantId,caseId,operator:'Synthetic drill',verifiedChannel:'registered-email'};
  const witness=async client=>{
    const result={};for(const b of businesses)result[b.tenantId]=hash(JSON.stringify((await buildTenantHandover(client,{...request,tenantId:b.tenantId})).records));return result;
  };
  // This helper accepts only this invocation's fixture and only the two temporary DB names.
  const eraseFixture=async client=>{
    const name=(await client.$queryRawUnsafe('SELECT current_database() AS name'))[0].name;
    assert(name==='onboarding_test'||name===restoreName);
    assert(fixture.tenantId==='qa-erasure-'+suffix);
    await client.$transaction(async tx=>{
      const target=await tx.tenant.findUniqueOrThrow({where:{id:fixture.tenantId}});
      assert.equal(target.slug,fixture.tenantId);
      for(const model of ['appointment','transaction','commission','dailyClose','domainEvent','medicalRecord']){
        const where=model==='medicalRecord'?{pet:{tenantId:fixture.tenantId}}:{tenantId:fixture.tenantId};
        assert.equal(await tx[model].count({where}),0,'Retention review required: '+model);
      }
      assert.equal(await tx.user.count({where:{tenantId:fixture.tenantId}}),1);
      assert.equal(await tx.pet.count({where:{tenantId:fixture.tenantId}}),1);
      assert.equal(await tx.staff.count({where:{tenantId:fixture.tenantId}}),1);
      await tx.pet.delete({where:{id:fixture.petId,tenantId:fixture.tenantId}});
      await tx.user.delete({where:{id:fixture.userId,tenantId:fixture.tenantId}});
      await tx.staffCredential.delete({where:{staffId:fixture.staffId}});
      await tx.staff.delete({where:{id:fixture.staffId,tenantId:fixture.tenantId}});
      await tx.tenant.delete({where:{id:fixture.tenantId}});
    },{isolationLevel:'Serializable'});
    for(const [model,id] of [['tenant',fixture.tenantId],['user',fixture.userId],['pet',fixture.petId],['staff',fixture.staffId]])assert.equal(await client[model].count({where:{id}}),0);
    assert.equal(await client.staffCredential.count({where:{staffId:fixture.staffId}}),0);
  };
  try {
    const before=await witness(prisma);
    await prisma.tenant.create({data:{id:fixture.tenantId,slug:fixture.tenantId,name:'Negocio ficticio elegible para supresión',activeModules:['grooming']}});
    await prisma.user.create({data:{id:fixture.userId,tenantId:fixture.tenantId,name:'CLIENTE-FICTICIO-'+suffix,phone:'555-'+suffix,email:suffix+'@example.test'}});
    await prisma.pet.create({data:{id:fixture.petId,tenantId:fixture.tenantId,ownerId:fixture.userId,name:'MASCOTA-FICTICIA-'+suffix,type:'dog'}});
    await prisma.staff.create({data:{id:fixture.staffId,tenantId:fixture.tenantId,name:'USUARIO-FICTICIO-'+suffix,role:'admin',generatesCommission:false,credential:{create:{email:'staff-'+suffix+'@example.test',passwordHash:'not-a-real-credential-'+suffix,active:false}}}});
    const packet=await buildTenantHandover(prisma,request);
    const sender=path.join(own,'sender'),recipient=path.join(own,'recipient');
    fs.mkdirSync(sender);fs.mkdirSync(recipient);
    // writeHandover requires a direct child of the approved export root.
    const sourceDirectory=path.join(root,'protected-source-'+suffix);
    const artifact=writeHandover(packet,sourceDirectory);
    const names=['data.json','manifest.json','SHA256SUMS'];
    const files=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(sourceDirectory,n)).toString('base64')]));
    plaintext=Buffer.from(JSON.stringify({format:'synthetic-delivery-bundle-v1',files}));
    cryptoOk(['req','-x509','-newkey','rsa:2048','-noenc','-keyout',file('recipient.key'),'-out',file('recipient.crt'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1']);
    cryptoOk(['genpkey','-algorithm','RSA','-pkeyopt','rsa_keygen_bits:2048','-out',file('wrong.key')]);
    const encrypt=bytes=>cryptoOk(['cms','-encrypt','-binary','-aes-256-gcm','-outform','DER',file('recipient.crt')],bytes);
    const decrypt=(bytes,key='recipient.key')=>cryptoRun(['cms','-decrypt','-binary','-inform','DER','-recip',file('recipient.crt'),'-inkey',file(key)],bytes);
    const ciphertext=encrypt(plaintext);fs.writeFileSync(file('package.p7m'),ciphertext,{flag:'wx',mode:0o600});
    assert(!ciphertext.includes(Buffer.from('CLIENTE-FICTICIO-'+suffix)));
    assert.notEqual(decrypt(ciphertext,'wrong.key').status,0);
    const changed=Buffer.from(ciphertext);changed[changed.length-1]^=1;assert.notEqual(decrypt(changed).status,0);
    const token=randomBytes(32).toString('hex');let used=false,expires=Date.now()+300000;
    const certificate=fs.readFileSync(file('recipient.crt'));privateKey=fs.readFileSync(file('recipient.key'));
    server=https.createServer({key:privateKey,cert:certificate},(req,res)=>{
      if(req.url!=='/package'){res.writeHead(404).end();return;}
      if(req.headers.authorization!=='Bearer '+token){res.writeHead(401).end();return;}
      if(used||Date.now()>expires){res.writeHead(410).end();return;}
      used=true;res.writeHead(200,{'Content-Type':'application/pkcs7-mime','Cache-Control':'no-store'});res.end(ciphertext);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address='https://127.0.0.1:'+server.address().port+'/package';
    const download=(authorization,trust=true)=>new Promise((resolve,reject)=>{
      const req=https.get(address,{...(trust?{ca:certificate}:{}),headers:authorization?{Authorization:authorization}:{}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,bytes:Buffer.concat(chunks)}));});req.on('error',reject);req.setTimeout(10000,()=>req.destroy(new Error('HTTPS timeout')));
    });
    await assert.rejects(download(undefined,false));
    assert.equal((await download()).status,401);
    const received=await download('Bearer '+token);assert.equal(received.status,200);assert.equal(hash(received.bytes),hash(ciphertext));
    assert.equal((await download('Bearer '+token)).status,410);
    used=false;expires=Date.now()-1;assert.equal((await download('Bearer '+token)).status,410);
    const decoded=decrypt(received.bytes);assert.equal(decoded.status,0);
    const opened=JSON.parse(decoded.stdout.toString());assert.deepEqual(Object.keys(opened.files).sort(),[...names].sort());
    for(const n of names)fs.writeFileSync(path.join(recipient,n),Buffer.from(opened.files[n],'base64'),{flag:'wx',mode:0o600});
    assert.equal(verifyHandover(recipient).dataSha256,artifact.dataSha256);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(recipient,'data.json'),'utf8')).records,packet.records);
    record('protected-local-delivery',{tlsVerified:true,anonymous:401,reused:410,expired:410,cms:'AES-256-GCM',wrongRecipientRejected:true,tamperingRejected:true,opened:true,dataSha256:artifact.dataSha256});
    check('protected delivery: verified local HTTPS, authenticated one-use/expiring access, recipient-only CMS encryption, opening and integrity; wrong key/tampering rejected');
    await new Promise(resolve=>server.close(resolve));server=undefined;

    // A real dump and restore of this wholly synthetic database, never production.
    dump=docker(['exec',container,'pg_dump','-U','postgres','-d','onboarding_test','-Fc']);
    fs.writeFileSync(file('backup.p7m'),encrypt(dump),{flag:'wx',mode:0o600});dump.fill(0);dump=undefined;
    const {FORMAT,OPERATION,replaySuppressions}=require('./replay-restore-suppressions.cjs');
    const issuedAt=new Date().toISOString();
    const journal={format:FORMAT,registerId:'QA-register-'+suffix,revision:1,issuedAt,validUntil:new Date(Date.now()+3600000).toISOString(),complete:true,entries:[{caseId,operation:OPERATION,decision:'approved',approvedAt:issuedAt,tenantId:fixture.tenantId,userIds:[fixture.userId],petIds:[fixture.petId],staffIds:[fixture.staffId]}]};
    const journalBytes=Buffer.from(JSON.stringify(journal));const journalSha=hash(journalBytes);
    fs.writeFileSync(file('suppression-journal.json'),journalBytes);
    const grooming=businesses.find(b=>b.module==='grooming');
    const commission=await prisma.commission.findFirstOrThrow({where:{tenantId:grooming.tenantId}});
    await assert.rejects(prisma.commission.delete({where:{id:commission.id}}),/Commission history is immutable/);
    assert.deepEqual(await witness(prisma),before);
    await eraseFixture(prisma);
    await assert.rejects(buildTenantHandover(prisma,request),/TENANT_NOT_FOUND/);
    assert.deepEqual(await witness(prisma),before);
    record('source-erasure',{fixtureOnly:true,tenantAbsent:true,contactPetAndCredentialAbsent:true,otherBusinessesUnchanged:true,immutableCommissionDeletionRejected:true});
    check('erasure: only eligible synthetic contact/pet/staff/tenant removed; other businesses unchanged and protected commission history cannot be deleted');
    restoreName='restore_'+suffix;docker(['exec',container,'createdb','-U','postgres',restoreName]);
    const restoredDump=decrypt(fs.readFileSync(file('backup.p7m')));assert.equal(restoredDump.status,0);
    const restoredResult=run('docker',['exec','-i',container,'pg_restore','-U','postgres','--exit-on-error','--no-owner','--no-privileges','-d',restoreName],{input:restoredDump.stdout});restoredDump.stdout.fill(0);assert.equal(restoredResult.status,0,'Synthetic backup restore failed');
    const {Pool}=require('../backend/node_modules/pg');const {PrismaClient}=require('../node_modules/@prisma/client');const {PrismaPg}=require('../backend/node_modules/@prisma/adapter-pg');
    const restoreUrl=new URL(db);restoreUrl.pathname='/'+restoreName;restorePool=new Pool({connectionString:restoreUrl.toString()});restored=new PrismaClient({adapter:new PrismaPg(restorePool,{disposeExternalPool:true})});
    assert.equal(await restored.user.count({where:{id:fixture.userId}}),1);
    assert.equal((await restored.staffCredential.findUniqueOrThrow({where:{staffId:fixture.staffId}})).active,false);
    assert.deepEqual(await witness(restored),before);
    const pg=await restorePool.connect();
    let firstReceipt;
    try {
      const foreignJournal=structuredClone(journal);foreignJournal.entries[0].tenantId='wrong-tenant';
      const wrongBytes=Buffer.from(JSON.stringify(foreignJournal));
      await assert.rejects(replaySuppressions(pg,{bytes:wrongBytes,expectedSha256:hash(wrongBytes),expectedDatabase:restoreName}),/SCOPE_MISMATCH/);
      const blockedJournal=structuredClone(journal);
      blockedJournal.entries.push({caseId:'QA-retention-'+suffix,operation:OPERATION,decision:'approved',approvedAt:issuedAt,tenantId:grooming.tenantId,
        userIds:(await restored.user.findMany({where:{tenantId:grooming.tenantId}})).map(r=>r.id),
        petIds:(await restored.pet.findMany({where:{tenantId:grooming.tenantId}})).map(r=>r.id),
        staffIds:(await restored.staff.findMany({where:{tenantId:grooming.tenantId}})).map(r=>r.id)});
      const blockedBytes=Buffer.from(JSON.stringify(blockedJournal));
      await assert.rejects(replaySuppressions(pg,{bytes:blockedBytes,expectedSha256:hash(blockedBytes),expectedDatabase:restoreName}),/REVIEW_REQUIRED/);
      assert.equal(await restored.user.count({where:{id:fixture.userId}}),1,'Later retention conflict must roll back the earlier suppression');
      assert.deepEqual(await witness(restored),before);
      firstReceipt=await replaySuppressions(pg,{bytes:journalBytes,expectedSha256:journalSha,expectedDatabase:restoreName});
      assert.equal(firstReceipt.verified,true);assert.equal(firstReceipt.entries[0].result,'applied');
      const twice=await replaySuppressions(pg,{bytes:journalBytes,expectedSha256:journalSha,expectedDatabase:restoreName});
      assert.equal(twice.entries[0].result,'already-absent');
    } finally {pg.release();}
    const cli=run(process.execPath,[path.join(__dirname,'replay-restore-suppressions.cjs')],{env:{...process.env,HUELLA_RESTORE_DATABASE_URL:restoreUrl.toString(),HUELLA_RESTORE_SUPPRESSION_JOURNAL:file('suppression-journal.json'),HUELLA_RESTORE_SUPPRESSION_SHA256:journalSha}});
    assert.equal(cli.status,0,'Automatic replay CLI failed: '+cli.stderr.toString().trim());
    assert.equal(JSON.parse(cli.stdout.toString()).entries[0].result,'already-absent');
    assert.deepEqual(await witness(restored),before);
    record('automatic-replay',{verified:true,wrongTenantRejected:true,retentionConflictRollsBackAll:true,idempotent:true,cliVerified:true,journalSha256:journalSha});
    check('automatic replay: approved external register applied, wrong tenant blocked, retention conflict rolls back all entries, second pass and CLI are idempotent');
    const shellDump=decrypt(fs.readFileSync(file('backup.p7m')));assert.equal(shellDump.status,0);
    try {await require('./verify-restore-suppression-shell.cjs')({dump:shellDump.stdout,journalBytes,journalSha,own,check});} finally {shellDump.stdout.fill(0);}
    await assert.rejects(buildTenantHandover(restored,request),/TENANT_NOT_FOUND/);
    record('backup-restore',{encryptedBackup:true,realPgDumpAndRestore:true,oldCopyInitiallyRestoresErasedData:true,restoredOfflineOnly:true,suppressionReapplied:true,fixtureAbsentAfterReplay:true,otherBusinessesUnchanged:true});
    check('restore: real encrypted PostgreSQL backup initially resurrects fictitious data; replay of the external suppression record removes it before any access is enabled');
    for(const directory of [sourceDirectory,recipient]){
      const resolved=fs.realpathSync(directory);assert(resolved.startsWith(root+path.sep));assert(!fs.lstatSync(directory).isSymbolicLink());
      const expected=directory===sourceDirectory?'protected-source-'+suffix:'recipient';assert.equal(path.basename(directory),expected);
      for(const n of names){const p=path.join(resolved,n);assert(fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink());fs.unlinkSync(p);assert(!fs.existsSync(p));}fs.rmdirSync(resolved);
    }
    for(const n of ['backup.p7m','package.p7m','recipient.key','recipient.crt','wrong.key'])remove(n);
    assert(!fs.existsSync(file('backup.p7m'))&&!fs.existsSync(file('recipient.key')));
    plaintext.fill(0);plaintext=undefined;privateKey.fill(0);privateKey=undefined;
    record('copy-removal',{senderPlaintextRemoved:true,recipientPlaintextRemoved:true,encryptedDeliveryAndBackupRemoved:true,keyFilesRemoved:true,physicalMediaSanitizationProven:false});
    check('copy removal: sender/recipient test files, encrypted archive, backup and key files removed; minimal synthetic suppression journal retained');
    fs.writeFileSync(path.join(output,'protected-delivery-erasure.json'),JSON.stringify(evidence,null,2));
    fs.writeFileSync(file('result.json'),JSON.stringify(evidence,null,2));
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    await restored?.$disconnect();if(restorePool&&!restorePool.ending)await restorePool.end();
    // Nonrecursive cleanup of this run's named private files only, also on failure.
    for(const n of ['backup.p7m','package.p7m','recipient.key','recipient.crt','wrong.key'])remove(n);
    dump?.fill(0);plaintext?.fill(0);privateKey?.fill(0);
  }
};
