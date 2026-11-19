// A versão do app é a primeira do CHANGELOG.md (único lugar para atualizar).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('a versão vem só do CHANGELOG.md (nada fixo no app nem no service worker)', () => {
  assert.match(read('CHANGELOG.md'), /^## \d+\.\d+\.\d+ — /m, 'o CHANGELOG precisa ter versões no formato "## X.Y.Z — data"');
  assert.doesNotMatch(read('index.html'), /APP_VERSION = '\d/, 'a versão não deve ficar fixa no index.html');
  assert.doesNotMatch(read('sw.js'), /vellum-\d+\.\d+\.\d+/, 'o cache do sw.js não deve ter a versão');
});

test('versões do CHANGELOG em ordem decrescente e sem repetir', () => {
  const vs = [...read('CHANGELOG.md').matchAll(/^## (\d+)\.(\d+)\.(\d+)/gm)].map(m => [+m[1], +m[2], +m[3]]);
  for (let i = 1; i < vs.length; i++) {
    const [a, b] = [vs[i - 1], vs[i]];
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    assert.ok(cmp > 0, `${a.join('.')} deveria vir antes de ${b.join('.')}`);
  }
});
