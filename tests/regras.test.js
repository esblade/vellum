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

test('fatura: compra no dia do fechamento ou depois vai para a fatura seguinte', () => {
  const card = { close: '2026-11-03', due: '2026-11-10' };
  const key = app.run('billKeyFor');
  assert.equal(key('2026-11-02', card), '2026-11');
  assert.equal(key('2026-11-03', card), '2026-12');   // no dia do fechamento já vai para a próxima
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

test('empréstimo recebido não é renda; quitar o cartão pela conta não é gasto em dobro', () => {
  setData([
    { id: 'emp', cardId: 'b', acct: 'bank', catRaw: 'Loans and financing', date: day(6), desc: 'CREDITO EMPRESTIMO PESSOAL', category: 'Empréstimos e financiamentos', amount: 20000, kind: 'in' },
    { id: 'sal', cardId: 'b', acct: 'bank', catRaw: 'Salary', date: day(6), desc: 'SALARIO', category: 'Salário', amount: 7000, kind: 'in' },
    // saiu da conta com um nome qualquer...
    { id: 'pix', cardId: 'b', acct: 'bank', catRaw: 'Transfer - PIX', date: day(5), desc: 'PIX ENVIADO NU PAGAMENTOS', category: 'Pix', amount: 8123.45, kind: 'out' },
    // ...e chegou no cartão como pagamento
    { id: 'pg', cardId: 'c1', date: day(4), desc: 'Pagamento recebido', category: 'Pix', amount: 8123.45, kind: 'in' },
    { id: 'compra', cardId: 'c1', date: day(4), desc: 'Loja', category: 'Compras', amount: 300, kind: 'out' }
  ], { banks: [{ id: 'b', type: 'bank', name: 'Conta', balance: 0 }] });
  const isSpend = app.run('isSpend'), isBankIncome = app.run('isBankIncome');
  assert.equal(cls('emp')[0].category, 'Empréstimo recebido');
  assert.equal(isBankIncome(cls('emp')[0]), false);
  assert.equal(isBankIncome(cls('sal')[0]), true);
  assert.equal(cls('pix')[0].category, 'Pagamento de fatura');
  assert.equal(isSpend(cls('pix')[0]), false);
  assert.equal(app.run('sum(allTx().filter(isSpend))'), 300);
});

test('salário que cai duas vezes no mês: o que ainda não caiu entra como previsto', { skip: new Date().getDate() > 30 && 'o 2º salário (dia 27) já teria passado' }, () => {
  const tx = [];
  for (let m = 1; m <= 3; m++) {
    const mm = app.run(`addM(curYM(), -${m})`);
    tx.push({ id: `a${m}`, cardId: 'b', acct: 'bank', catRaw: 'Salary', date: `${mm}-05`, desc: 'SALARIO EMPRESA 05', category: 'Salário', amount: 4000, kind: 'in' });
    tx.push({ id: `b${m}`, cardId: 'b', acct: 'bank', catRaw: 'Salary', date: `${mm}-27`, desc: 'SALARIO EMPRESA 27', category: 'Salário', amount: 3000, kind: 'in' });
  }
  tx.push({ id: 'agora', cardId: 'b', acct: 'bank', catRaw: 'Salary', date: `${ym}-01`, desc: 'SALARIO EMPRESA 05', category: 'Salário', amount: 4000, kind: 'in' });
  setData(tx, { banks: [{ id: 'b', type: 'bank', name: 'Conta', balance: 0 }] });
  const inc = app.run('incomeFor(curYM())');
  assert.equal(inc.received, 4000);
  assert.equal(inc.expected, 3000);   // falta o 2º salário do mês (o do dia 27)
  assert.equal(inc.total, 7000);
});

test('projeção não multiplica um gasto pontual grande pelos dias do mês', () => {
  const tx = [];
  for (let m = 1; m <= 3; m++) {
    const mm = app.run(`addM(curYM(), -${m})`);
    for (let d = 1; d <= 28; d++) tx.push({ id: `d${m}-${d}`, cardId: 'c1', date: `${mm}-${String(d).padStart(2, '0')}`, desc: 'Padaria ' + (d % 7), category: 'Restaurantes', amount: 50, kind: 'out' });
  }
  tx.push({ id: 'quita', cardId: 'b', acct: 'bank', catRaw: '', date: `${ym}-01`, desc: 'BOLETO QUITACAO', category: 'Outros', amount: 15000, kind: 'out' });
  setData(tx, { banks: [{ id: 'b', type: 'bank', name: 'Conta', balance: 0 }] });
  const P = app.run('monthPace(context(), curYM())');
  const linear = P.total / P.day * app.run('dim(curYM())');
  assert.equal(P.method, 'base');
  assert.equal(P.oneOffTotal, 15000);
  assert.ok(P.projection < linear, `projeção ${P.projection} deveria ser menor que a regra de três ${linear}`);
  assert.ok(P.projection < 15000 + 31 * 60, 'gasto pontual entra uma vez só');
});

test('renda prevista ignora apostas, transferências de valor variável e o que você marcou para não esperar', () => {
  const tx = [], dayNext = Math.min(28, new Date().getDate() + 1);   // dia que ainda não passou
  const d2 = String(dayNext).padStart(2, '0');
  for (let m = 1; m <= 3; m++) {
    const mm = app.run(`addM(curYM(), -${m})`);
    tx.push({ id: `bet${m}`, cardId: 'b', acct: 'bank', catRaw: 'Transfer - PIX', date: `${mm}-${d2}`, desc: 'Transferência Recebida|KAIZEN GAMING BRASIL LTDA', category: 'Pix', amount: 5000, kind: 'in' });
    tx.push({ id: `pes${m}`, cardId: 'b', acct: 'bank', catRaw: 'Transfer - PIX', date: `${mm}-${d2}`, desc: 'Transferência Recebida|Fulana de Tal', category: 'Pix', amount: [300, 2500, 900][m - 1], kind: 'in' });
    tx.push({ id: `alu${m}`, cardId: 'b', acct: 'bank', catRaw: 'Transfer - PIX', date: `${mm}-${d2}`, desc: 'Transferência Recebida|Inquilino Aluguel', category: 'Pix', amount: 1500, kind: 'in' });
  }
  setData(tx, { banks: [{ id: 'b', type: 'bank', name: 'Conta', balance: 0 }] });
  let exp = plain(app.run('expectedIncome(curYM())'));
  assert.deepEqual(exp.map(x => x.desc), ['Inquilino Aluguel']);   // só o aluguel, que é fixo
  assert.equal(exp[0].amount, 1500);
  app.run(`db.income.noExpect = [${JSON.stringify(exp[0].key)}]`);
  exp = plain(app.run('expectedIncome(curYM())'));
  assert.equal(exp.length, 0);
});

test('cartões: visual e bandeira pelo banco/nome, e o Croma vira NUBANK CROMA PLATINUM', () => {
  setData([]);
  const deco = c => plain(app.run(`decorateCard(${JSON.stringify(c)}, 0)`));
  const croma = deco({ id: 'n', name: 'CROMA PLATINUM', bank: 'Nubank' });
  assert.equal(croma.name, 'NUBANK CROMA PLATINUM');
  assert.equal(croma.theme, 'nubank');
  assert.equal(croma.network, 'master');
  assert.equal(croma.tier, 'platinum');
  const itau = deco({ id: 'i', name: 'ITI ITAU VISA PLATINUM', bank: 'Itaú' });
  assert.deepEqual([itau.theme, itau.network], ['itau', 'visa']);
  assert.equal(deco({ id: 'b', name: 'OUROCARD VISA', bank: 'Banco do Brasil' }).theme, 'bb');
  assert.equal(deco({ id: 's', name: "SAM'S CLUB MASTERCARD", bank: 'Carrefour' }).theme, 'sams');
  // nome escolhido pelo usuário vence o automático
  app.run(`db.cardPrefs = { n: { name: 'Meu Nubank', theme: 'violeta' } }`);
  const custom = deco({ id: 'n', name: 'CROMA PLATINUM', bank: 'Nubank' });
  assert.deepEqual([custom.name, custom.theme], ['Meu Nubank', 'violeta']);
});

test('média para sugerir metas: últimos 6 meses com dados', () => {
  const tx = [];
  // 4 meses com dados entre os 6 anteriores: 100, 200, 300, 400 em Mercado
  [1, 2, 3, 4].forEach(m => tx.push({ id: 'g' + m, cardId: 'c1', date: app.run(`addM(curYM(), -${m})`) + '-10', desc: 'Mercado', category: 'Mercado', amount: m * 100, kind: 'out' }));
  // um mês fora da janela de 6 não entra
  tx.push({ id: 'old', cardId: 'c1', date: app.run('addM(curYM(), -8)') + '-10', desc: 'Mercado', category: 'Mercado', amount: 9999, kind: 'out' });
  setData(tx);
  const r = plain(app.run('catAverage(context(), curYM(), 6)'));
  assert.equal(r.months, 4);
  assert.equal(r.avg.Mercado, 250);
});

test('alimentação: mercado, restaurante e delivery pelo MCC e pelo nome', () => {
  const T = (id, desc, category, extra = {}) => ({ id, cardId: 'c1', date: day(1), desc, category, amount: 50, kind: 'out', ...extra });
  setData([
    T('a', 'ASSAI ATACADISTA LJ 22', 'Alimentação'),
    T('b', 'CARREFOUR HIPER', 'Compras'),
    T('c', 'RESTAURANTE MARE', 'Mercado'),
    T('d', 'IFD*IFOOD.COM AGENCIA', 'Alimentação'),
    T('e', 'MERCADOLIVRE*LOJA', 'Mercado'),
    T('f', 'LOJA XYZ', 'Alimentação', { mcc: 5812 }),
    T('g', 'POSTO SHELL', 'Combustível'),          // fora das categorias de comida: não mexe
    T('h', 'PADARIA BOM PAO', 'Alimentação'),       // sem pista: continua Alimentação
    T('i', 'MERCADINHO DA ESQUINA', 'Outros'),
    T('j', 'MC DONALDS', 'Alimentação')
  ]);
  const cat = id => cls(id)[0].category;
  assert.equal(cat('a'), 'Mercado');
  assert.equal(cat('b'), 'Mercado');
  assert.equal(cat('c'), 'Restaurantes');
  assert.equal(cat('d'), 'Delivery');
  assert.equal(cat('e'), 'Compras online');
  assert.equal(cat('f'), 'Restaurantes');
  assert.equal(cat('g'), 'Combustível');
  assert.equal(cat('h'), 'Alimentação');
  assert.equal(cat('i'), 'Mercado');
  assert.equal(cat('j'), 'Restaurantes');
  assert.equal(cls('a')[0].autoFrom, 'Alimentação');
  // regra sua vence a correção automática
  app.run(`db.rules[normDesc('ASSAI ATACADISTA LJ 22')] = 'Casa'`);
  assert.equal(cat('a'), 'Casa');
});

// ---- Fatura do cartão e estornos ----
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
function setCard(card, tx, bills = []){
  app.set('data', { cards: [{ id: 'c1', name: 'Cartão', limit: 10000, available: 163, outstanding: 9837, ...card }], banks: [], tx, bills: { c1: bills }, syncedAt: new Date().toISOString() });
  app.set('db', app.run('loadDbDefaults()'));
}
const billNow = () => plain(app.run(`(() => { const b = billNow(context().cards[0]); return { key: b.key, closed: b.closed, amount: b.amount, due: b.due }; })()`));

test('fatura atual vem dos lançamentos da fatura, não do saldo em aberto do cartão', () => {
  // fecha daqui a 10 dias e vence 7 dias depois: tudo de hoje cai na fatura aberta
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'a', cardId: 'c1', date: shift(0), desc: 'Mercado', category: 'Mercado', amount: 300, kind: 'out' },
    { id: 'b', cardId: 'c1', date: shift(-1), desc: 'Farmácia', category: 'Farmácia', amount: 80, kind: 'out' },
    { id: 'e', cardId: 'c1', date: shift(0), desc: 'Estorno Loja', category: 'Compras', amount: 30, kind: 'in' }
  ]);
  const b = billNow();
  assert.equal(b.closed, false);
  assert.equal(Math.round(b.amount * 100) / 100, 350);          // 300 + 80 − 30, e não os 9.837 do saldo
  assert.equal(app.run('daysUntil')(b.due) >= 0, true);          // vencimento nunca no passado
});

test('fatura fechada e ainda não vencida aparece primeiro; paga, sai da frente', () => {
  // fechou há 3 dias e vence daqui a 4: a fatura a pagar é a fechada
  const tx = [
    { id: 'old', cardId: 'c1', date: shift(-8), desc: 'Compra antes do fechamento', category: 'Compras', amount: 500, kind: 'out' },
    { id: 'new', cardId: 'c1', date: shift(-1), desc: 'Compra depois do fechamento', category: 'Compras', amount: 120, kind: 'out' }
  ];
  setCard({ close: shift(-3), due: shift(4) }, tx);
  let b = billNow();
  assert.equal(b.closed, true);
  assert.equal(b.amount, 500);
  assert.equal(b.due, shift(4));
  // valor oficial do banco tem prioridade sobre a soma
  setCard({ close: shift(-3), due: shift(4) }, tx, [{ id: 'bill1', due: shift(4), total: 512.4, min: 50 }]);
  assert.equal(billNow().amount, 512.4);
  // depois do pagamento, a fatura da vez é a aberta (só a compra depois do fechamento)
  setCard({ close: shift(-3), due: shift(4) }, [...tx, { id: 'pay', cardId: 'c1', date: shift(-1), desc: 'Pagamento recebido', category: 'Pix', amount: 500, kind: 'in' }]);
  b = billNow();
  assert.equal(b.closed, false);
  assert.equal(b.amount, 120);
});

test('lançamento com billId vai para a fatura que o banco informou', () => {
  const due = shift(4);
  setCard({ close: shift(-3), due }, [
    // pela data cairia na fatura aberta, mas o banco diz que é da fatura que vence em `due`
    { id: 'x', cardId: 'c1', date: shift(-1), desc: 'Compra', category: 'Compras', amount: 90, kind: 'out', billId: 'bill1' }
  ], [{ id: 'bill1', due, total: 90, min: 10 }]);
  const key = app.run(`txBill(allTx().find(t => t.id === 'x'), context().cards[0])`);
  assert.equal(key, due.slice(0, 7));
});

test('estorno do cartão desconta do gasto do mês e da categoria', () => {
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'r1', cardId: 'c1', date: shift(0), desc: 'Loja Roupa', category: 'Roupas', amount: 200, kind: 'out' },
    { id: 'r2', cardId: 'c1', date: shift(0), desc: 'Estorno Loja Roupa', category: 'Roupas', amount: 50, kind: 'in' }
  ]);
  const r = plain(app.run(`(() => { const c = context(), l = spendIn(c, curYM()); return { total: sum(l), roupas: byCat(l)['Roupas'], compras: l.filter(t => !t.refund).length }; })()`));
  assert.equal(r.total, 150);
  assert.equal(r.roupas, 150);
  assert.equal(r.compras, 1);
});

test('parcela com a data da compra conta no mês da fatura em que entrou', () => {
  const d0 = new Date(); d0.setMonth(d0.getMonth() - 2); d0.setDate(5);
  const buy = isoOf(d0), due = shift(4);
  setCard({ close: shift(-3), due }, [
    { id: 'p1', cardId: 'c1', date: buy, desc: 'TV', category: 'Eletrônicos', amount: 100, kind: 'out', instN: 3, instT: 10, billId: 'bill1' }
  ], [{ id: 'bill1', due, total: 100, min: 10 }]);
  assert.equal(app.run(`allTx().find(t => t.id === 'p1').cm`), due.slice(0, 7));
});

test('compra marcada para ignorar nos totais continua na fatura (o banco cobra)', () => {
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'a', cardId: 'c1', date: shift(0), desc: 'Mercado', category: 'Mercado', amount: 300, kind: 'out' },
    { id: 'g', cardId: 'c1', date: shift(0), desc: 'Presente pra mãe', category: 'Compras', amount: 36.18, kind: 'out' }
  ]);
  app.run(`db.overrides.g = { ignored: true }`);
  assert.equal(Math.round(billNow().amount * 100) / 100, 336.18);
  const spent = app.run(`sum(spendIn(context(), curYM()))`);
  assert.equal(spent, 300);                                   // mas não entra na análise dos gastos
});

test('data com horário é lida no fuso de Brasília', () => {
  const txDate = app.run('txDate');
  assert.equal(txDate('2026-11-22T00:00:00.000Z'), '2026-11-22');   // só a data: fica como veio
  assert.equal(txDate('2026-11-22'), '2026-11-22');
  assert.equal(txDate('2026-11-23T01:30:00.000Z'), '2026-11-22');   // 22h30 em Brasília
  assert.equal(txDate('2026-11-22T15:00:00.000Z'), '2026-11-22');
});

test('Itaú: parcelas que chegam todas com a data da compra vão cada uma para a sua fatura', () => {
  // compra de hoje em 3x de 451,56, as três com a data de hoje (como o Itaú manda)
  const p = n => ({ id: 'i' + n, cardId: 'c1', date: shift(0), desc: 'LOJA X', category: 'Compras', amount: 451.56, kind: 'out', instN: n, instT: 3 });
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'a', cardId: 'c1', date: shift(0), desc: 'Mercado', category: 'Mercado', amount: 825.38, kind: 'out' },
    p(1), p(2), p(3)
  ]);
  const b = billNow();
  assert.equal(Math.round(b.amount * 100) / 100, 1276.94);    // 825,38 + só a 1ª parcela, e não as três
  const r = plain(app.run(`(() => { const c = context().cards[0], B = cardBills(c); return [B.totalOf(B.open), B.totalOf(addM(B.open, 1)), B.totalOf(addM(B.open, 2))]; })()`));
  assert.deepEqual(r.map(v => Math.round(v * 100) / 100), [1276.94, 451.56, 451.56]);
});

test('parcelas com datas diferentes (cada uma na data do seu mês) não são deslocadas', () => {
  const d = n => { const x = new Date(); x.setMonth(x.getMonth() - (3 - n)); x.setDate(5); return isoOf(x); };
  setCard({ close: shift(10), due: shift(17) }, [1, 2, 3].map(n => ({ id: 'q' + n, cardId: 'c1', date: d(n), desc: 'LOJA Y', category: 'Compras', amount: 100, kind: 'out', instN: n, instT: 3 })));
  assert.equal(app.run(`allTx().filter(t => t.instShift).length`), 0);
});

test('final do cartão: o que você informar > o mais usado nas compras > o da conta', () => {
  const tx = [7519, 7519, 4174].map((f, i) => ({ id: 'f' + i, cardId: 'c1', date: shift(0), desc: 'X', category: 'Compras', amount: 10, kind: 'out', cardNumber: String(f) }));
  setCard({ close: shift(10), due: shift(17), number: '4174' }, tx);
  assert.equal(app.run(`context().cards[0].number`), '7519');
  app.run(`db.cardPrefs = { c1: { number: '1234' } }`);
  assert.equal(app.run(`context().cards[0].number`), '1234');
  setCard({ close: shift(10), due: shift(17), number: '4174' }, []);
  assert.equal(app.run(`context().cards[0].number`), '4174');
});

test('fatura fechada que o banco informou e ainda vai vencer vem primeiro, pelo valor do banco', () => {
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'a', cardId: 'c1', date: shift(0), desc: 'Mercado', category: 'Mercado', amount: 300, kind: 'out' }
  ], [{ id: 'b1', due: shift(2), total: 1276.94, min: 100 }]);
  const b = billNow();
  assert.equal(b.closed, true);
  assert.equal(b.amount, 1276.94);
  assert.equal(b.due, shift(2));
});

test('crédito no cartão com o valor da fatura do banco é pagamento, qualquer que seja a descrição', () => {
  setCard({ close: shift(-5), due: shift(2) }, [
    { id: 'm', cardId: 'c1', date: shift(-1), desc: 'Mercado', category: 'Mercado', amount: 1276.94, kind: 'out' },
    { id: 'pg', cardId: 'c1', date: shift(-2), desc: 'DEB AUTOM ITAU', category: 'Outros', amount: 2180.05, kind: 'in' }
  ], [{ id: 'b1', due: shift(2), total: 2180.05, min: 300 }]);
  const [pg] = cls('pg');
  assert.equal(pg.isPayment, true);
  const b = billNow();
  assert.equal(b.closed, false);                                   // a fechada já foi paga
  assert.equal(Math.round(b.amount * 100) / 100, 1276.94);
});

test('financiamento de fatura (Itaú) não entra na fatura, nos gastos nem nas parcelas futuras', () => {
  const fin = n => ({ id: 'fin' + n, cardId: 'c1', date: shift(0), desc: `FINANCIAMENTO FATU0${n}/12`, category: 'Outros', amount: 301.04, kind: 'out', instN: n, instT: 12 });
  setCard({ close: shift(10), due: shift(17) }, [
    { id: 'm', cardId: 'c1', date: shift(0), desc: 'Mercado', category: 'Mercado', amount: 1276.94, kind: 'out' },
    fin(1), fin(2), fin(3)
  ]);
  assert.equal(cls('fin1')[0].category, 'Financiamento de fatura');
  assert.equal(cls('fin1')[0].isPayment, true);
  assert.equal(Math.round(billNow().amount * 100) / 100, 1276.94);   // e não 1.276,94 + 903,12
  assert.equal(app.run(`sum(spendIn(context(), curYM()))`), 1276.94);
  assert.equal(app.run(`installments(context()).length`), 0);       // não vira "compra parcelada"
});
