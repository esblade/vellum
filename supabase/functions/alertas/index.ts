// @ts-nocheck
// Vellum — função "alertas" do Supabase (Edge Function).
// Roda a cada 30 minutos (agendada pelo supabase-notificacoes.sql): busca as compras novas na Pluggy de cada
// pessoa com notificações ativas, calcula o gasto do mês como o app e manda notificação quando o gasto chega
// perto da renda ou da meta de uma categoria. Cada aviso vai uma vez por mês.
//
// ARQUIVO GERADO por tools/gerar-funcao-alertas.js a partir de tools/funcao-alertas.template.ts.
// Para mudar, edite o template e rode: node tools/gerar-funcao-alertas.js
//
// Segredos da função (Edge Functions → alertas → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.

export const CAT = {
  'Groceries':'Mercado','Food and drinks':'Alimentação','Eating out':'Restaurantes','Food delivery':'Delivery',
  'Transportation':'Transporte','Taxi and ride-hailing':'Transporte por app','Ride hailing':'Transporte por app','Public transportation':'Transporte público',
  'Car rental':'Aluguel de carro','Bicycle':'Bicicleta','Automotive':'Automóvel','Gas stations':'Combustível','Parking':'Estacionamento',
  'Tolls and in vehicle payment':'Pedágio','Vehicle maintenance':'Manutenção do veículo','Vehicle ownership taxes and fees':'IPVA e taxas','Traffic tickets':'Multas',
  'Shopping':'Compras','Online shopping':'Compras online','Electronics':'Eletrônicos','Pet supplies and vet':'Pet','Clothing':'Roupas',
  'Kids and toys':'Crianças','Bookstore':'Livraria','Sports goods':'Artigos esportivos','Office supplies':'Papelaria','Houseware':'Casa',
  'Digital services':'Serviços digitais','Gaming':'Jogos','Video streaming':'Streaming','Music streaming':'Streaming',
  'Leisure':'Lazer','Entertainment':'Lazer','Tickets':'Ingressos','Cinema, theater and concerts':'Cinema e shows','Stadiums and arenas':'Eventos',
  'Landmarks and museums':'Passeios','Wellness and fitness':'Bem-estar','Gyms and fitness centers':'Academia','Sports practice':'Esportes','Wellness':'Bem-estar',
  'Health':'Saúde','Healthcare':'Saúde','Dentist':'Dentista','Pharmacy':'Farmácia','Optometry':'Ótica','Hospital clinics and labs':'Clínicas e exames',
  'Travel':'Viagem','Airport and airlines':'Passagens aéreas','Accommodation':'Hospedagem','Mileage programs':'Milhas','Bus tickets':'Passagens de ônibus',
  'Bills':'Contas','Services':'Serviços','Telecommunications':'Telefone e internet','Internet':'Telefone e internet','Mobile':'Telefone e internet','TV':'TV por assinatura',
  'Education':'Educação','Online courses':'Cursos online','University':'Faculdade','School':'Escola','Kindergarten':'Escola',
  'Taxes':'Impostos','Income taxes':'Impostos','Tax on financial operations':'IOF','Bank fees':'Tarifas bancárias','Account fees':'Tarifas bancárias',
  'Credit card fees':'Tarifas do cartão','Wire transfer fees and ATM fees':'Tarifas bancárias','Late payment and overdraft costs':'Juros e multas','Interests charged':'Juros e multas',
  'Transfers':'Transferências','Third party transfers':'Transferências','Same person transfer':'Transferências','Transfer - PIX':'Pix','Transfer - TED':'Transferências',
  'Credit card payment':'Pagamento de fatura','Insurance':'Seguros','Life insurance':'Seguros','Home insurance':'Seguros','Health insurance':'Plano de saúde','Vehicle insurance':'Seguros',
  'Housing':'Moradia','Rent':'Aluguel','Utilities':'Contas da casa','Water':'Contas da casa','Electricity':'Contas da casa','Gas':'Contas da casa',
  'Donations':'Doações','Gambling':'Apostas','Lottery':'Apostas','Online bet':'Apostas','Cashback':'Cashback',
  'Salary':'Salário','Retirement':'Aposentadoria','Entrepreneurial activities':'Pró-labore','Government aid':'Benefícios','Non-recurring income':'Renda extra',
  'Proceeds interests and dividends':'Rendimentos','Loans and financing':'Empréstimos e financiamentos','Financing':'Empréstimos e financiamentos','Investments':'Investimentos','Income':'Receitas','Other':'Outros'
};
export const PAYMENT = 'Pagamento de fatura';
export const INTERNAL = 'Movimentação entre contas';
export const LOAN_IN = 'Empréstimo recebido';
export const BILL_FIN = 'Financiamento de fatura';
const looksBillFinancing = t => t.kind === 'out' && t.acct !== 'bank' && /\b(financiamento|financ|parcelamento|parcel|parc)\s*(de\s*|da\s*)?fatu/.test(t.key || '');

/* ---------- Regras (iguais às do index.html) ---------- */
export const normDesc = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\bparc(ela)?\b\.?/g, ' ').replace(/\d{1,2}\s*(\/|de)\s*\d{1,2}/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const INTERNAL_RAW = new Set(['Same person transfer','Credit card payment','Investments','Automatic investment','Fixed income','Mutual funds','Variable income','Margin','Pension','Blocked balances']);
const LOAN_RAW = new Set(['Loans and financing','Financing','Real estate financing','Vehicle financing','Student loan']);
const looksLoan = t => LOAN_RAW.has(t.catRaw) || /\b(emprestimo|credito pessoal|consignado|financiamento|cdc|antecipacao)\b/.test(t.key);
const looksInternal = t => INTERNAL_RAW.has(t.catRaw) ||
  /\b(fatura|cartao de credito|pagamento cartao|pagto cartao|pag cartao|aplicacao|resgate|poupanca|mesma titularidade|entre contas|transferencia propria)\b/.test(t.key);
/* @regras-alimentacao-inicio — este bloco é copiado para a função de alertas (tools/gerar-funcao-alertas.js) */
// Confere Mercado x Restaurantes x Delivery pelo código de atividade do estabelecimento (MCC, quando o cartão
// informa) e pelo nome. Só mexe em compras que vieram como Alimentação, Mercado, Restaurantes, Delivery,
// Compras ou Outros; categorias definidas por você (regras e ajustes) continuam valendo por cima disso.
const FOOD_CATS = new Set(['Alimentação', 'Mercado', 'Restaurantes', 'Delivery', 'Compras', 'Outros']);
const MCC_FOOD = { 5411: 'Mercado', 5422: 'Mercado', 5451: 'Mercado', 5499: 'Mercado', 5300: 'Mercado',
  5811: 'Restaurantes', 5812: 'Restaurantes', 5813: 'Restaurantes', 5814: 'Restaurantes' };
const RE_MARKETPLACE = /\b(mercado ?livre|mercadolivre|mercado ?pago|mercadopago|mercpago|meli)\b/;
const RE_DELIVERY = /\b(ifood|i food|rappi|uber ?eats|aiqfome|99 ?food|james delivery|ze delivery|ze entregas)\b/;
const RE_MARKET_STRONG = /\b(supermercados?|supermerc|superm|hipermercados?|hiper|atacadao|atacado|atacarejo|assai|carrefour|pao de acucar|gbarbosa|bompreco|sams club|sams|makro|hortifruti|hortifrutti|sacolao|acougue|frigorifico|mateus|guanabara|nordestao|bretas|savegnago|condor|zaffari)\b/;
const RE_FOOD_OUT = /\b(restaurantes?|rest|lanchonete|lanches?|burger|hamburgueria|mc ?donalds|mcdonald s|burger king|bk|subway|pizzaria|pizza|sushi|temaki|churrascaria|espetinho|boteco|bar|choperia|cervejaria|cafeteria|cafe|starbucks|outback|habibs|giraffas|spoleto|coco bambu|madero|kfc|popeyes|acai|sorveteria|pastelaria|pastel|tapiocaria|creperia|cantina|trattoria|bistro|grill|food truck)\b/;
const RE_MARKET_WEAK = /\b(mercado|mercadinho|minimercado|mini mercado|mercearia|emporio|quitanda|feira|hortifruti|verdurao)\b/;
function refineFood(t){
  if (t.kind !== 'out' || !FOOD_CATS.has(t.category)) return null;
  const k = t.key || '';
  if (RE_MARKETPLACE.test(k)) return 'Compras online';
  if (RE_DELIVERY.test(k)) return 'Delivery';
  if (MCC_FOOD[t.mcc]) return MCC_FOOD[t.mcc];
  if (RE_MARKET_STRONG.test(k)) return 'Mercado';
  if (RE_FOOD_OUT.test(k)) return 'Restaurantes';
  if (RE_MARKET_WEAK.test(k)) return 'Mercado';
  return null;
}
/* @regras-alimentacao-fim */
export { refineFood };
const looksLikeBillPayment = t => t.kind === 'in' && t.cardId !== 'manual' &&
  !/\b(estorno|cashback|reembolso|devolucao|cancelamento)\b/.test(t.key) &&
  (/\b(pagamento|pagto|pgto|pag fatura)\b/.test(t.key) || ['Pix', 'Transferências'].includes(t.category));
const dayDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 864e5);
const ymOf = d => String(d || '').slice(0, 7);

// Data no fuso de Brasília (igual ao app): só a data fica como veio; com horário, converte.
export function txDate(v){
  const str = String(v || '');
  if (!/T\d\d:\d\d/.test(str) || /T00:00(:00(\.0+)?)?(Z|[+-]00:?00)?$/.test(str)) return str.slice(0, 10);
  const d = new Date(str); if (isNaN(d.getTime())) return str.slice(0, 10);
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}
export function normTx(x, cardId, acct = 'card'){
  const m = x.creditCardMetadata || {};
  const inst = m.totalInstallments > 1;
  return {
    id: x.id, cardId, acct, catRaw: x.category || '',
    date: txDate(x.date),
    desc: x.description || x.merchant?.name || 'Sem descrição',
    category: CAT[x.category] || x.category || CAT[x.merchant?.category] || 'Outros',
    amount: Math.abs(x.amountInAccountCurrency ?? x.amount ?? 0),
    kind: x.type === 'CREDIT' ? 'in' : 'out',
    pending: x.status === 'PENDING',
    instN: inst ? m.installmentNumber || 0 : 0,
    instT: inst ? m.totalInstallments : 0,
    billMonth: m.billForecastDate ? String(m.billForecastDate).slice(0, 7) : (m.billPostDate ? String(m.billPostDate).slice(0, 7) : ''),
    mcc: m.payeeMCC || null,
    isPayment: x.operationType === 'PAGAMENTO_FATURA' || x.category === 'Credit card payment'
  };
}

// Mesma classificação do app: pagamentos de fatura, movimentação entre contas, empréstimo recebido,
// regras, categorias ajustadas, renomeadas, ignoradas e compras divididas.
export function classify(raw, s){
  const rules = s.rules || {}, overrides = s.overrides || {}, renamed = s.cats?.renamed || {};
  const ren = c => { let x = c, n = 0; while (renamed[x] && n++ < 10) x = renamed[x]; return x; };
  const cardPays = raw.filter(t => t.acct !== 'bank' && t.cardId !== 'manual' && t.kind === 'in' &&
    (t.isPayment || looksLikeBillPayment({ ...t, key: normDesc(t.desc) })));
  const paidFromBank = t => cardPays.some(p => Math.abs(p.amount - t.amount) < 0.01 && Math.abs(dayDiff(p.date, t.date)) <= 5);
  return raw.flatMap(t0 => {
    const t = { ...t0 };
    t.key = normDesc(t.desc);
    t.cm = t.instT > 1 && t.billMonth ? t.billMonth : ymOf(t.date);
    if (t.acct === 'bank' && !t.isPayment) {
      if (t.kind === 'out' && paidFromBank(t)) t.category = PAYMENT;
      else if (t.kind === 'in' && looksLoan(t)) t.category = LOAN_IN;
      else if (looksInternal(t)) t.category = INTERNAL;
    } else if (t.acct !== 'bank' && !t.isPayment && looksLikeBillPayment(t)) t.category = PAYMENT;
    else if (t.acct !== 'bank' && !t.isPayment && looksBillFinancing(t)) t.category = BILL_FIN;
    if (!t.isPayment) { const fc = refineFood(t); if (fc) t.category = fc; }
    if (rules[t.key]) t.category = rules[t.key];
    const o = overrides[t.id];
    if (o) { if (o.category) t.category = o.category; t.ignored = !!o.ignored; }
    t.category = ren(t.category);
    t.isPayment = !!t.isPayment || [PAYMENT, INTERNAL, LOAN_IN, BILL_FIN].includes(t.category);
    if (o?.split?.length > 1) return o.split.map((p, i) => ({ ...t, id: t.id + '#' + (i + 1), amount: +p.amount || 0, category: ren(p.category),
      isPayment: !!t0.isPayment || [PAYMENT, INTERNAL, LOAN_IN, BILL_FIN].includes(ren(p.category)) }));
    return [t];
  });
}
const isSpend = t => t.kind === 'out' && !t.isPayment && !t.ignored;
const isRefund = t => t.kind === 'in' && !t.isPayment && !t.ignored && t.cardId !== 'manual' && t.acct !== 'bank';
const isBankIncome = t => t.acct === 'bank' && t.kind === 'in' && !t.isPayment && !t.ignored;

// Gasto do mês, por categoria, e renda (automática pela conta corrente ou a informada).
export function monthSummary(tx, s, ym, hasBank){
  // Compras do mês menos os estornos do cartão.
  const spend = [...tx.filter(t => isSpend(t) && t.cm === ym), ...tx.filter(t => isRefund(t) && t.cm === ym).map(t => ({ ...t, amount: -t.amount }))];
  const byCat = {};
  for (const t of spend) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  const inc = s.income || {};
  const auto = hasBank && inc.auto !== false;
  const manualIn = (s.manual || []).filter(t => t.kind === 'in' && !s.overrides?.[t.id]?.ignored && ymOf(t.date) === ym).reduce((a, t) => a + t.amount, 0);
  let income;
  if (auto) income = tx.filter(t => isBankIncome(t) && ymOf(t.date) === ym).reduce((a, t) => a + t.amount, 0) + manualIn;
  else {
    const m = (inc.months || {})[ym] || {};
    const sources = Array.isArray(inc.sources) ? inc.sources : (inc.base > 0 ? [{ amount: inc.base }] : []);
    const fixed = sources.reduce((a, x) => a + (+x.amount || 0), 0);
    income = (m.override != null ? +m.override || 0 : fixed) + (m.extras || []).reduce((a, x) => a + (+x.amount || 0), 0) + manualIn;
  }
  return { total: spend.reduce((a, t) => a + t.amount, 0), byCat, income };
}

const brl = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Avisos que devem sair agora (ainda não enviados neste mês), conforme as preferências.
export function alertsFor(sum, s, ym, sent){
  const pref = { income: true, budgets: true, threshold: 80, ...(s.notify || {}) };
  const th = Math.min(99, Math.max(50, +pref.threshold || 80));
  const mes = MONTHS[+ym.slice(5, 7) - 1];
  const out = [], once = (key, a) => { if (!sent.has(key)) out.push({ key, ...a }); };
  if (pref.income && sum.income > 0) {
    const p = sum.total / sum.income * 100;
    if (p >= 100) once(`${ym}:inc:100`, { title: `Seus gastos passaram a renda de ${mes}`, body: `${brl(sum.total)} gastos, ${brl(sum.total - sum.income)} acima da renda de ${brl(sum.income)}.`, url: '#/inicio' });
    else if (p >= th) once(`${ym}:inc:${th}`, { title: `Você já gastou ${Math.floor(p)}% da renda de ${mes}`, body: `${brl(sum.total)} de ${brl(sum.income)}. Restam ${brl(sum.income - sum.total)} até o fim do mês.`, url: '#/inicio' });
  }
  if (pref.budgets) for (const [cat, meta] of Object.entries(s.budgets || {})) {
    if (!(meta > 0)) continue;
    const v = sum.byCat[cat] || 0, p = v / meta * 100;
    if (p >= 100) once(`${ym}:cat:${cat}:100`, { title: `${cat} passou da meta`, body: `${brl(v)} de ${brl(meta)} em ${mes} (${brl(v - meta)} acima).`, url: '#/orcamento' });
    else if (p >= th) once(`${ym}:cat:${cat}:${th}`, { title: `${cat}: ${Math.floor(p)}% da meta`, body: `${brl(v)} de ${brl(meta)} em ${mes}. Restam ${brl(meta - v)}.`, url: '#/orcamento' });
  }
  return out;
}

/* ---------- Execução no Supabase ---------- */
async function pluggyFetchMonth(cfg, ym){
  const API = 'https://api.pluggy.ai';
  const base = cfg.proxyUrl ? cfg.proxyUrl.replace(/\/+$/, '') : API;
  let key = cfg.apiKey || '';
  const headers = () => cfg.proxyUrl ? { Authorization: 'Bearer ' + (cfg.proxyToken || '') } : { 'X-API-KEY': key };
  if (!cfg.proxyUrl && !key) {
    const r = await fetch(API + '/auth', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ clientId: cfg.clientId, clientSecret: cfg.clientSecret }) });
    if (!r.ok) throw new Error('Pluggy recusou as credenciais');
    key = (await r.json()).apiKey;
  }
  const get = async p => { const r = await fetch(base + p, { headers: headers() }); if (!r.ok) throw new Error(`Pluggy ${r.status} em ${p.split('?')[0]}`); return r.json(); };
  const from = `${ym}-01`, to = new Date().toISOString().slice(0, 10);
  const out = []; let hasBank = false;
  for (const itemId of cfg.itemIds || []) {
    const acc = await get(`/accounts?itemId=${encodeURIComponent(itemId)}`);
    for (const a of acc.results || []) {
      const isBank = a.type === 'BANK'; if (a.type !== 'CREDIT' && !isBank) continue;
      if (isBank) hasBank = true;
      let after = null;
      for (let i = 0; i < 50; i++) {
        const q = new URLSearchParams({ accountId: a.id, dateFrom: from, dateTo: to }); if (after) q.set('after', after);
        const t = await get('/v2/transactions?' + q);
        for (const x of t.results || []) out.push(normTx(x, a.id, isBank ? 'bank' : 'card'));
        if (!t.next) break;
        after = new URLSearchParams(String(t.next).replace(/^[^?]*\?/, '')).get('after'); if (!after) break;
      }
    }
  }
  return { tx: out, hasBank };
}

async function handle(req){
  const { createClient } = await import('npm:@supabase/supabase-js@2.49.4');
  const webpush = (await import('npm:web-push@3.6.7')).default;
  const env = k => Deno.env.get(k) || '';
  const json = (b, st = 200) => new Response(JSON.stringify(b), { status: st, headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, content-type, apikey, x-client-info' } });
  if (req.method === 'OPTIONS') return json({});
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'https://example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

  // Quem chamou: o agendamento (x-cron-secret) processa todos; o app (token do usuário) pede um teste.
  let onlyUser = null, test = false;
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: 'não autorizado' }, 401);
    onlyUser = u.user.id; test = true;
  }

  let q = sb.from('push_subscriptions').select('user_id, endpoint, p256dh, auth');
  if (onlyUser) q = q.eq('user_id', onlyUser);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  const byUser = {};
  for (const s of subs || []) (byUser[s.user_id] ||= []).push(s);

  const send = async (uid, payload) => {
    for (const s of byUser[uid] || []) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload)); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint); }
    }
  };

  const report = [];
  for (const uid of Object.keys(byUser)) {
    if (test) { await send(uid, { title: 'Notificações do Vellum ativas', body: 'Você vai receber avisos quando os gastos chegarem perto da renda ou das metas.', url: '#/inicio' }); report.push({ uid, test: true }); continue; }
    try {
      const { data: rows } = await sb.from('user_settings').select('key, value').eq('user_id', uid);
      const s = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
      if (s.notify && s.notify.enabled === false) continue;
      const ym = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);   // horário de Brasília
      let hasBank = false;
      // Compras novas na Pluggy (as credenciais ficam na conta da pessoa) e gravação na tabela de transações.
      if (s.cfg?.itemIds?.length) {
        try {
          const fresh = await pluggyFetchMonth(s.cfg, ym);
          hasBank = fresh.hasBank;
          for (let i = 0; i < fresh.tx.length; i += 500) {
            await sb.from('transactions').upsert(fresh.tx.slice(i, i + 500).map(t => ({ user_id: uid, id: t.id, card_id: t.cardId, date: t.date, data: t })), { onConflict: 'user_id,id' });
          }
        } catch (e) { report.push({ uid, pluggy: String(e.message || e) }); }
      }
      const prev = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1)).toISOString().slice(0, 10);
      const { data: txRows } = await sb.from('transactions').select('data').eq('user_id', uid).gte('date', prev).limit(5000);
      const raw = [...(txRows || []).map(r => r.data), ...(s.manual || [])];
      if (!hasBank) hasBank = raw.some(t => t.acct === 'bank');
      const sum = monthSummary(classify(raw, s), s, ym, hasBank);
      const state = s._alerts || {};
      const sent = new Set(state[ym] || []);
      const list = alertsFor(sum, s, ym, sent);
      for (const a of list) { await send(uid, a); sent.add(a.key); }
      if (list.length) await sb.from('user_settings').upsert({ user_id: uid, key: '_alerts', value: { [ym]: [...sent] }, updated_at: Date.now() }, { onConflict: 'user_id,key' });
      report.push({ uid, sent: list.length, total: Math.round(sum.total), income: Math.round(sum.income) });
    } catch (e) { report.push({ uid, error: String(e.message || e) }); }
  }
  return json({ ok: true, report });
}

if (typeof Deno !== 'undefined') Deno.serve(handle);
