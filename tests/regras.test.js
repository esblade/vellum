// Testes das regras de classificação e cálculo do Vellum.
// Rodam o próprio <script> do index.html no Node, com um navegador falso.
// Uso: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadApp(){
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const code = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  // Objeto "faz-tudo": qualquer propriedade ou chamada devolve ele mesmo (simula o DOM).
  const any = new Proxy(function(){}, {
    get: (t, p) => p === Symbol.toPrimitive ? () => '' : p === 'then' ? undefined : p === 'length' ? 0 : any,
    set: () => true, apply: () => any, construct: () => any
  });
  const mem = new Map();
  const localStorage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear() };
  const ctx = {
    console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, URL, URLSearchParams, Set, Map, Object, Array, String, Number, RegExp, Error, Symbol,
    localStorage, document: any, navigator: { onLine: true, userAgent: 'node' }, location: { hash: '', origin: 'http://x', pathname: '/' },
    matchMedia: () => ({ matches: false, addEventListener(){} }), addEventListener(){}, removeEventListener(){}, innerWidth: 1200,
    fetch: async () => ({ ok: false, status: 0, json: async () => ({}) }), crypto: { getRandomValues: a => a }, CSS: { escape: s => s }
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const run = src => vm.runInContext(src, ctx);
  return { run, set: (name, value) => { ctx.__v = value; vm.runInContext(`${name} = __v`, ctx); } };
}

// Objetos criados dentro do vm têm outro "realm"; convertemos para comparar.
const plain = v => JSON.parse(JSON.stringify(v));
const app = loadApp();
const ym = app.run('curYM()');
const day = n => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };
function setData(tx, extra = {}){
  app.set('data', { cards: [{ id: 'c1', name: 'Cartão', due: `${ym}-10`, close: `${ym}-03`, limit: 5000, available: 3000 }], banks: [], tx, bills: {}, syncedAt: new Date().toISOString(), ...extra });
  app.set('db', app.run('loadDbDefaults()'));
}
const cls = id => app.run(`allTx().filter(t => (t.origId || t.id) === ${JSON.stringify(id)})`);

test('pagamento da fatura por Pix no cartão não é estorno', () => {
  setData([
    { id: 'p', cardId: 'c1', date: day(3), desc: 'Pagamento PIX', category: 'Pix', amount: 2951.74, kind: 'in' },
    { id: 'e', cardId: 'c1', date: day(3), desc: 'Estorno Loja X', category: 'Compras online', amount: 59.9, kind: 'in' }
  ]);
  const [p] = cls('p'), [e] = cls('e');
  assert.equal(p.isPayment, true);
  assert.equal(p.category, 'Pagamento de fatura');
  assert.equal(app.run('isRefund')(p), false);
  assert.equal(e.isPayment, false);
  assert.equal(app.run('isRefund')(e), true);
});

test('conta corrente: renda, gasto e movimentação entre contas', () => {
  setData([
    { id: 's', cardId: 'b', acct: 'bank', catRaw: 'Salary', date: day(2), desc: 'SALARIO EMPRESA', category: 'Salário', amount: 6000, kind: 'in' },
    { id: 'r', cardId: 'b', acct: 'bank', catRaw: 'Eating out', date: day(2), desc: 'PIX ENVIADO RESTAURANTE', category: 'Restaurantes', amount: 100, kind: 'out' },
    { id: 'f', cardId: 'b', acct: 'bank', catRaw: 'Credit card payment', date: day(2), desc: 'PAGAMENTO FATURA', category: 'Pagamento de fatura', amount: 1500, kind: 'out' },
    { id: 'a', cardId: 'b', acct: 'bank', catRaw: '', date: day(2), desc: 'APLICACAO POUPANCA', category: 'Outros', amount: 500, kind: 'out' },
    { id: 't', cardId: 'b', acct: 'bank', catRaw: 'Same person transfer', date: day(2), desc: 'TED', category: 'Transferências', amount: 300, kind: 'out' }
  ], { banks: [{ id: 'b', type: 'bank', name: 'Conta', balance: 1000 }] });
  const isSpend = app.run('isSpend'), isBankIncome = app.run('isBankIncome');
  assert.equal(isBankIncome(cls('s')[0]), true);
  assert.equal(isSpend(cls('r')[0]), true);
  for (const id of ['f', 'a', 't']) { const [t] = cls(id); assert.equal(t.isPayment, true, id); assert.equal(isSpend(t), false, id); }
  const inc = app.run(`incomeFor(${JSON.stringify(ymOf(day(2)))})`);
  assert.equal(inc.auto, true);
  assert.equal(inc.total, 6000);
});
const ymOf = d => d.slice(0, 7);

test('parcelas futuras são projetadas a partir da última vista', () => {
  setData([{ id: 'i', cardId: 'c1', date: day(1), desc: 'Loja de Móveis', category: 'Casa', amount: 250, kind: 'out', instN: 3, instT: 10, billMonth: ym }]);
  const list = app.run('installments({ T: allTx() })');
  assert.equal(list.length, 1);
  assert.equal(list[0].future.length, 7);
  assert.equal(list[0].left, 1750);
});

test('assinatura recorrente é identificada; mercado semanal não', () => {
  const tx = [];
  for (let m = 0; m < 4; m++) {
    const d = app.run(`addM(curYM(), -${m})`) + '-05';
    tx.push({ id: 'n' + m, cardId: 'c1', date: d, desc: 'Streaming Plus', category: 'Streaming', amount: 39.9, kind: 'out' });
    for (let w = 0; w < 4; w++) tx.push({ id: `m${m}${w}`, cardId: 'c1', date: d.slice(0, 8) + String(2 + w * 7).padStart(2, '0'), desc: 'Supermercado', category: 'Mercado', amount: 100 + w * 60, kind: 'out' });
  }
  setData(tx);
  const rec = app.run('recurring(context())').map(r => r.desc);
  assert.deepEqual(plain(rec), ['Streaming Plus']);
});

test('fatura: compra depois do fechamento vai para a fatura seguinte', () => {
  const card = { close: '2026-11-03', due: '2026-11-10' };
  const key = app.run('billKeyFor');
  assert.equal(key('2026-11-02', card), '2026-11');
  assert.equal(key('2026-11-03', card), '2026-11');
  assert.equal(key('2026-11-04', card), '2026-12');
  const late = { close: '2026-11-28', due: '2026-12-05' };
  assert.equal(key('2026-11-20', late), '2026-12');
  assert.equal(key('2026-11-29', late), '2027-01');
});

test('compra dividida entre categorias conta cada parte na sua categoria', () => {
  setData([{ id: 'x', cardId: 'c1', date: day(1), desc: 'Hipermercado', category: 'Mercado', amount: 300, kind: 'out' }]);
  app.run(`db.overrides.x = { split: [{ category: 'Mercado', amount: 220 }, { category: 'Casa', amount: 80 }] }`);
  const parts = cls('x');
  assert.equal(parts.length, 2);
  assert.deepEqual(plain(parts.map(p => [p.category, p.amount])), [['Mercado', 220], ['Casa', 80]]);
  assert.equal(app.run('byCat(allTx().filter(isSpend))').Casa, 80);
});

test('renomear categoria muda compras, metas e regras', () => {
  setData([{ id: 'y', cardId: 'c1', date: day(1), desc: 'Padaria', category: 'Restaurantes', amount: 20, kind: 'out' }]);
  app.run(`db.budgets.Restaurantes = 400; db.rules.padaria = 'Restaurantes'; renameCategory('Restaurantes', 'Comer fora')`);
  assert.equal(cls('y')[0].category, 'Comer fora');
  assert.equal(app.run('db.budgets["Comer fora"]'), 400);
  assert.equal(app.run('db.budgets.Restaurantes'), undefined);
  assert.equal(app.run('db.rules.padaria'), 'Comer fora');
});

test('objetivo: quanto guardar por mês até o prazo', () => {
  const g = { target: 1200, deadline: app.run('addM(curYM(), 5)') + '-28', deposits: [{ amount: 600 }] };
  const i = app.run('goalInfo')(g);
  assert.equal(i.saved, 600);
  assert.equal(i.left, 600);
  assert.equal(i.months, 6);
  assert.equal(i.monthly, 100);
});
