// Confere que a versão está igual no app, no CHANGELOG.md e no cache do sw.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('versão igual no index.html, CHANGELOG.md e sw.js', () => {
  const app = read('index.html').match(/const APP_VERSION = '(\d+\.\d+\.\d+)'/)?.[1];
  const log = read('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+)/m)?.[1];
  const sw = read('sw.js').match(/const CACHE = 'vellum-(\d+\.\d+\.\d+)'/)?.[1];
  assert.ok(app, 'APP_VERSION não encontrado no index.html');
  assert.equal(log, app, 'a primeira versão do CHANGELOG.md deve ser a APP_VERSION');
  assert.equal(sw, app, 'o CACHE do sw.js deve usar a APP_VERSION');
});

test('versões do CHANGELOG em ordem decrescente e sem repetir', () => {
  const vs = [...read('CHANGELOG.md').matchAll(/^## (\d+)\.(\d+)\.(\d+)/gm)].map(m => [+m[1], +m[2], +m[3]]);
  for (let i = 1; i < vs.length; i++) {
    const [a, b] = [vs[i - 1], vs[i]];
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    assert.ok(cmp > 0, `${a.join('.')} deveria vir antes de ${b.join('.')}`);
  }
});
