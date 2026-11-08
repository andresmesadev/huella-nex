const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));
// Exercise the dependency Jest actually loads, including the npm override.
const jestConfigRequire = createRequire(backendRequire.resolve('jest-config'));
const merge = jestConfigRequire('deepmerge');
const payload = () => JSON.parse('{"__proto__":{"__huellaMergeInjected":true},"safe":1}');

function assertUnpoisoned(result) {
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.__huellaMergeInjected, undefined);
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(({}).__huellaMergeInjected, undefined);
}

for (const [label, target] of [
  ['ordinary object', () => ({})],
  ['null prototype', () => Object.create(null)],
  ['null target', () => null],
  ['undefined target', () => undefined],
  ['primitive target', () => 1],
  ['own prototype key', () => JSON.parse('{"__proto__":{}}')],
]) {
  test(`Jest merge rejects prototype injection into ${label}`, () => {
    const result = merge(target(), payload());
    assertUnpoisoned(result);
    assert.equal(result.safe, 1);
  });
}

test('Jest merge also rejects poisoning while copying the target alone', () => {
  const result = merge(payload(), { other: 2 });
  assertUnpoisoned(result);
  assert.deepEqual(result, { safe: 1, other: 2 });
});

test('Jest merge rejects nested payloads and payloads cloned from arrays', () => {
  const nested = { session: payload(), items: [payload()] };
  for (const target of [{ session: null }, { session: undefined }, { session: {} }]) {
    const result = merge(target, nested);
    assertUnpoisoned(result.session);
    assertUnpoisoned(result.items[0]);
  }
  assertUnpoisoned(merge(nested, {}).session);
  assertUnpoisoned(merge(nested, {}).items[0]);
});

test('Jest merge preserves config merging, symbols, arrays and clone semantics', () => {
  const symbol = Symbol('config');
  const date = new Date('2026-11-08T00:00:00Z');
  const input = { globals: { config: { one: true } }, roots: ['src'], date, regex: /test/i, [symbol]: 'value' };
  const result = merge.all([input, { globals: { config: { two: true } }, roots: ['tests'] }]);
  assert.deepEqual(result.globals, { config: { one: true, two: true } });
  assert.deepEqual(result.roots, ['src', 'tests']);
  assert.notEqual(result.globals, input.globals);
  assert.equal(result.date, date);
  assert.equal(result.regex, input.regex);
  assert.equal(result[symbol], 'value');
  const replaceArrays = merge({ roots: ['src'] }, { roots: ['tests'] }, { arrayMerge: (_, source) => source });
  assert.deepEqual(replaceArrays.roots, ['tests']);
  assert.deepEqual(merge({ config: { one: 1 } }, { config: { two: 2 } }, {
    customMerge: key => key === 'config' ? () => ({ custom: true }) : undefined,
  }), { config: { custom: true } });
});

test('Jest glob keeps sync, Windows path, brace and ignore behavior', () => {
  const { glob, globSync } = jestConfigRequire('glob');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huella-glob-'));
  try {
    fs.writeFileSync(path.join(dir, 'a.js'), '');
    fs.writeFileSync(path.join(dir, 'b.cjs'), '');
    fs.writeFileSync(path.join(dir, 'skip.js'), '');
    const options = { cwd: dir, windowsPathsNoEscape: true, ignore: ['skip.*'] };
    assert.deepEqual(glob.sync('*.{js,cjs}', options).sort(), ['a.js', 'b.cjs']);
    assert.deepEqual(globSync('*.{js,cjs}', options).sort(), ['a.js', 'b.cjs']);
    assert.equal(glob.sync(path.join(dir, '*.js'), { windowsPathsNoEscape: true }).length, 2);
  } finally {
    assert.equal(path.dirname(fs.realpathSync(dir)), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('huella-glob-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Jest glob rejects a cancelled traversal', async () => {
  const { glob } = jestConfigRequire('glob');
  await assert.rejects(glob('**/*', {
    cwd: path.join(__dirname, '../backend/vendor'),
    signal: AbortSignal.abort(),
  }), { name: 'AbortError' });
});

test('nodemon minimatch keeps its CommonJS matching API and Windows paths', () => {
  const nodemonRequire = createRequire(backendRequire.resolve('nodemon'));
  const { minimatch } = nodemonRequire('minimatch');
  assert.equal(minimatch('src/app.js', '**/*.js'), true);
  assert.equal(minimatch('src/app.ts', '**/*.js'), false);
  assert.equal(minimatch('node_modules/pkg/index.js', '**/node_modules/**'), true);
  assert.equal(minimatch('src\\app.js', 'src/*.js', { windowsPathsNoEscape: true }), true);
});
