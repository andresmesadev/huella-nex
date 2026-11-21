// Synthetic custody rehearsal only. No database, providers or real register.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { validateJournal, FORMAT } = require('./replay-restore-suppressions.cjs');
const root = path.resolve(__dirname, '../.cache/suppression-custody');
fs.mkdirSync(root, { recursive: true });
assert.equal(fs.realpathSync(root).toLowerCase(), root.toLowerCase());
const own = fs.mkdtempSync(path.join(root, 'synthetic-'));
const paths = [];
const events = [];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const now = Date.now();
const snapshot = revision => ({ format: FORMAT, registerId: 'QA-CUSTODY-NOT-REAL', revision,
  issuedAt: new Date(now - 1000).toISOString(), validUntil: new Date(now + 3600000).toISOString(), complete: true, entries: [] });
const save = (folder, name, bytes) => {
  const target = path.join(own, folder, name);
  assert.equal(path.dirname(path.dirname(target)), own);
  fs.writeFileSync(target, bytes, { flag: 'wx' }); paths.push(target); return target;
};
const check = (name, action) => { action(); events.push({ name, result: 'passed' }); console.log('PASS ' + name); };
try {
  for (const folder of ['register', 'reference', 'backup']) fs.mkdirSync(path.join(own, folder));
  const currentBytes = Buffer.from(JSON.stringify(snapshot(2)));
  const oldBytes = Buffer.from(JSON.stringify(snapshot(1)));
  const current = save('register', 'revision-2.json', currentBytes);
  const old = save('backup', 'old-revision-1.json', oldBytes);
  // This file simulates a separately obtained trusted reference; it does NOT create actual independent custody.
  const reference = save('reference', 'current.json', JSON.stringify({ registerId: 'QA-CUSTODY-NOT-REAL', revision: 2, sha256: digest(currentBytes) }));
  const confirm = (journalFile, referenceFile) => {
    if (!referenceFile || !fs.existsSync(referenceFile)) throw Error('REFERENCE_REQUIRED');
    if (!journalFile || !fs.existsSync(journalFile)) throw Error('REGISTER_REQUIRED');
    const anchor = JSON.parse(fs.readFileSync(referenceFile, 'utf8'));
    const bytes = fs.readFileSync(journalFile);
    const journal = validateJournal(bytes, anchor.sha256);
    assert.equal(journal.registerId, anchor.registerId); assert.equal(journal.revision, anchor.revision);
    return journal;
  };
  check('current complete synthetic snapshot agrees with reference', () => assert.equal(confirm(current, reference).revision, 2));
  check('still-valid old snapshot is accepted by format validator but rejected against latest reference', () => {
    assert.equal(validateJournal(oldBytes, digest(oldBytes)).revision, 1);
    assert.throws(() => confirm(old, reference), /INTEGRITY_FAILED/);
  });
  check('changed file and recalculated companion hash cannot replace fixed reference', () => {
    const forged = save('register', 'altered.json', Buffer.concat([currentBytes, Buffer.from(' ')]));
    save('register', 'companion.sha256', digest(fs.readFileSync(forged)));
    assert.throws(() => confirm(forged, reference), /INTEGRITY_FAILED/);
  });
  check('missing reference cannot be inferred from backup', () => assert.throws(() => confirm(old), /REFERENCE_REQUIRED/));
  check('missing register cannot be interpreted as zero decisions', () => assert.throws(() => confirm(undefined, reference), /REGISTER_REQUIRED/));
  check('expired snapshot is rejected even with matching reference hash', () => {
    const journal = snapshot(3); journal.validUntil = new Date(now - 1).toISOString();
    const bytes = Buffer.from(JSON.stringify(journal));
    assert.throws(() => validateJournal(bytes, digest(bytes)), /EXPIRED/);
  });
  check('revision mismatch is rejected even if supplied hash matches', () => {
    const mismatch = save('reference', 'mismatch.json', JSON.stringify({ registerId: 'QA-CUSTODY-NOT-REAL', revision: 3, sha256: digest(currentBytes) }));
    assert.throws(() => confirm(current, mismatch), /AssertionError/);
  });
} finally {
  for (const target of paths.reverse()) {
    assert(path.resolve(target).startsWith(own + path.sep));
    assert(!fs.lstatSync(target).isSymbolicLink()); fs.unlinkSync(target);
  }
  for (const folder of ['register', 'reference', 'backup']) fs.rmdirSync(path.join(own, folder));
  fs.rmdirSync(own);
}
const evidence = { synthetic: true, productionConnected: false, externalCustodyConfigured: false,
  supportMessageSent: false, independentAccessControlTested: false, testedAt: new Date().toISOString(),
  passed: events.length, events, temporaryFilesRemoved: !fs.existsSync(own) };
fs.writeFileSync(path.join(root, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`Synthetic custody: ${events.length} passed, 0 failed; temporary files removed. Real custody remains pending.`);
