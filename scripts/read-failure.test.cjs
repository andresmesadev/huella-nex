const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../frontend/node_modules/typescript');
const source = fs.readFileSync(path.join(__dirname, '../frontend/lib/read-failure.ts'), 'utf8');
const moduleResult = { exports: {} };
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleResult, moduleResult.exports);
const { readFailure, worstReadFailure, READ_FAILURE_MESSAGE, READ_FAILURE_RETRYABLE } = moduleResult.exports;

test('only network failures and server errors read as an unavailable server', () => {
  for (const status of [null, 500, 502, 503, 408, 429]) assert.equal(readFailure(status), 'unavailable');
  assert.equal(readFailure(401), 'session');
  assert.equal(readFailure(402), 'suspended');
  assert.equal(readFailure(403), 'denied');
  assert.equal(readFailure(400), 'rejected');
  assert.equal(readFailure(404), 'rejected');
});

test('a session or permission problem outranks an outage across several reads', () => {
  assert.equal(worstReadFailure([503, 401]), 'session');
  assert.equal(worstReadFailure([500, 403]), 'denied');
  assert.equal(worstReadFailure([null]), 'unavailable');
});

test('every reason has a message and only recoverable reasons offer a retry', () => {
  for (const reason of ['unavailable', 'session', 'suspended', 'denied', 'rejected']) assert.ok(READ_FAILURE_MESSAGE[reason]);
  assert.equal(READ_FAILURE_RETRYABLE.unavailable, true);
  assert.equal(READ_FAILURE_RETRYABLE.session, false);
  assert.equal(READ_FAILURE_RETRYABLE.denied, false);
  assert.doesNotMatch(READ_FAILURE_MESSAGE.denied, /servidor/i);
});
