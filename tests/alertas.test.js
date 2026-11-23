// Testes da função "alertas" (supabase/functions/alertas/index.ts).
// Uso: node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const fnFile = path.join(__dirname, '..', 'supabase', 'functions', 'alertas', 'index.ts');
const load = () => import(pathToFileURL(fnFile).href);

test('a função usa a mesma tabela de categorias do app (rode tools/gerar-funcao-alertas.js se falhar)', async () => {
  const fn = await load();
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const a = html.indexOf('const CAT = {'), b = html.indexOf('\n};', a) >= 0 ? html.indexOf('\n};', a) : html.indexOf('\r\n};', a);
  const appCat = new Function('PAYMENT', html.slice(a, b + 3).replace(/\r/g, '') + '; return CAT;')('Pagamento de fatura');
  assert.deepEqual({ ...fn.CAT }, appCat);
});

test('gasto, renda e categorias do mês são calculados como no app', async () => {
  const fn = await load();
  const ym = '2026-11';
  const raw = [
    { id: 'm', cardId: 'c', acct: 'card', date: '2026-11-10', desc: 'Mercado', category: 'Mercado', amount: 900, kind: 'out' },
    { id: 'r', cardId: 'c', acct: 'card', date: '2026-11-11', desc: 'Restaurante', category: 'Restaurantes', amount: 300, kind: 'out' },
    { id: 'p', cardId: 'c', acct: 'card', date: '2026-11-12', desc: 'Pagamento recebido', category: 'Pix', amount: 2000, kind: 'in' },
    { id: 'px', cardId: 'b', acct: 'bank', catRaw: 'Transfer - PIX', date: '2026-11-11', desc: 'PIX ENVIADO NU', category: 'Pix', amount: 2000, kind: 'out' },
    { id: 's', cardId: 'b', acct: 'bank', catRaw: 'Salary', date: '2026-11-05', desc: 'SALARIO', category: 'Salário', amount: 1500, kind: 'in' },
    { id: 'e', cardId: 'b', acct: 'bank', catRaw: 'Loans and financing', date: '2026-11-06', desc: 'CREDITO EMPRESTIMO', category: 'Outros', amount: 9000, kind: 'in' }
  ];
  const s = { budgets: { Mercado: 1000 }, overrides: { r: { ignored: true } }, income: { auto: true } };
  const sum = fn.monthSummary(fn.classify(raw, s), s, ym, true);
  assert.equal(sum.total, 900);              // restaurante ignorado; Pix da fatura não conta
  assert.equal(sum.income, 1500);            // empréstimo não é renda
  assert.equal(sum.byCat.Mercado, 900);
});

test('avisos: perto da renda e da meta, uma vez por mês, conforme as preferências', async () => {
  const fn = await load();
  const s = { budgets: { Mercado: 1000, Lazer: 200 }, notify: { threshold: 80 } };
  const sum = { total: 1300, income: 1500, byCat: { Mercado: 850, Lazer: 260 } };
  let list = fn.alertsFor(sum, s, '2026-11', new Set());
  assert.deepEqual(list.map(a => a.key).sort(), ['2026-11:cat:Lazer:100', '2026-11:cat:Mercado:80', '2026-11:inc:80']);
  assert.match(list.find(a => a.key.includes('inc')).title, /86% da renda de novembro/);
  // já enviados: não repete
  list = fn.alertsFor(sum, s, '2026-11', new Set(list.map(a => a.key)));
  assert.equal(list.length, 0);
  // passou da renda: novo aviso (100%)
  list = fn.alertsFor({ ...sum, total: 1600 }, s, '2026-11', new Set(['2026-11:inc:80']));
  assert.ok(list.some(a => a.key === '2026-11:inc:100'));
  // desligado nas preferências
  list = fn.alertsFor(sum, { ...s, notify: { income: false, budgets: false } }, '2026-11', new Set());
  assert.equal(list.length, 0);
});

test('a função corrige mercado/restaurante igual ao app', async () => {
  const fn = await load();
  const raw = [
    { id: 'a', cardId: 'c', date: '2026-11-10', desc: 'ASSAI ATACADISTA', category: 'Alimentação', amount: 300, kind: 'out' },
    { id: 'b', cardId: 'c', date: '2026-11-10', desc: 'RESTAURANTE MARE', category: 'Mercado', amount: 80, kind: 'out' },
    { id: 'c', cardId: 'c', date: '2026-11-10', desc: 'MERCADOLIVRE', category: 'Mercado', amount: 120, kind: 'out' }
  ];
  const sum = fn.monthSummary(fn.classify(raw, {}), {}, '2026-11', false);
  assert.deepEqual({ ...sum.byCat }, { Mercado: 300, Restaurantes: 80, 'Compras online': 120 });
});

test('a função desconta os estornos do cartão, igual ao app', async () => {
  const fn = await load();
  const raw = [
    { id: 'r1', cardId: 'c', acct: 'card', date: '2026-11-10', desc: 'Loja Roupa', category: 'Roupas', amount: 200, kind: 'out' },
    { id: 'r2', cardId: 'c', acct: 'card', date: '2026-11-12', desc: 'Estorno Loja Roupa', category: 'Roupas', amount: 50, kind: 'in' }
  ];
  const sum = fn.monthSummary(fn.classify(raw, {}), {}, '2026-11', false);
  assert.equal(sum.total, 150);
  assert.equal(sum.byCat.Roupas, 150);
});
