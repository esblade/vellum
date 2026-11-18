// Cloudflare Worker: intermediário para a API da Pluggy + alertas opcionais de compras novas no iPhone (via app ntfy).
//
// Variáveis em Settings → Variables and Secrets:
//   PLUGGY_CLIENT_ID      (texto)
//   PLUGGY_CLIENT_SECRET  (secret)
//   ACCESS_TOKEN          (secret) uma senha longa qualquer; é o "Token de acesso" nos ajustes da página
//   ALLOWED_ORIGIN        (texto)  ex.: https://seuusuario.github.io
//
// Alertas (opcional):
//   ITEM_IDS    (texto)  IDs das conexões separados por vírgula
//   NTFY_TOPIC  (secret) nome de tópico longo e aleatório; quem souber o nome recebe os alertas
//   KV namespace ligado com o nome SEEN
//   Cron Trigger em Settings → Triggers, ex.: */30 * * * *

const API = 'https://api.pluggy.ai';
const ALLOWED_PATHS = [/^\/items\/[\w-]+$/, /^\/accounts$/, /^\/v2\/transactions$/];
let cached = { key: null, at: 0 };

async function pluggyKey(env) {
  if (cached.key && Date.now() - cached.at < 100 * 60 * 1000) return cached.key;
  const r = await fetch(API + '/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error('Falha na autenticação com a Pluggy: ' + r.status);
  cached = { key: (await r.json()).apiKey, at: Date.now() };
  return cached.key;
}

// GET /v2/transactions: filtro dateFrom (yyyy-mm-dd), sem pageSize; resposta { results, next },
// onde "next" é a query string da próxima página (null no fim) e dela se usa só o "after".
async function recentTransactions(get, accountId, from) {
  const out = [];
  const used = new Set();
  let after = null;
  for (let i = 0; i < 100; i++) {
    const q = new URLSearchParams({ accountId, dateFrom: from });
    if (after) q.set('after', after);
    const t = await get('/v2/transactions?' + q);
    out.push(...(t.results || []));
    if (!t.next) break;
    after = new URLSearchParams(String(t.next).replace(/^[^?]*\?/, '')).get('after');
    if (!after || used.has(after)) break;
    used.add(after);
  }
  return out;
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(req, env) {
    const h = corsHeaders(env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'GET') return new Response('Método não permitido', { status: 405, headers: h });
    if (!env.ACCESS_TOKEN || req.headers.get('Authorization') !== `Bearer ${env.ACCESS_TOKEN}`) {
      return new Response('Não autorizado', { status: 401, headers: h });
    }
    const url = new URL(req.url);
    if (!ALLOWED_PATHS.some(p => p.test(url.pathname))) return new Response('Não encontrado', { status: 404, headers: h });

    try {
      let key = await pluggyKey(env);
      let r = await fetch(API + url.pathname + url.search, { headers: { 'X-API-KEY': key } });
      if (r.status === 401) {
        cached = { key: null, at: 0 };
        key = await pluggyKey(env);
        r = await fetch(API + url.pathname + url.search, { headers: { 'X-API-KEY': key } });
      }
      return new Response(r.body, { status: r.status, headers: { ...h, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { ...h, 'Content-Type': 'application/json' } });
    }
  },

  async scheduled(_event, env) {
    if (!env.NTFY_TOPIC || !env.ITEM_IDS || !env.SEEN) return;
    const key = await pluggyKey(env);
    const get = async path => {
      const r = await fetch(API + path, { headers: { 'X-API-KEY': key } });
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    };

    const from = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    const seen = new Set(JSON.parse((await env.SEEN.get('ids')) || '[]'));
    const firstRun = seen.size === 0;
    const current = [];

    for (const itemId of env.ITEM_IDS.split(',').map(s => s.trim()).filter(Boolean)) {
      const acc = await get(`/accounts?itemId=${encodeURIComponent(itemId)}`);
      for (const a of acc.results || []) {
        if (a.type !== 'CREDIT') continue;
        for (const x of await recentTransactions(get, a.id, from)) {
          current.push(x.id);
          if (firstRun || seen.has(x.id) || x.type !== 'DEBIT') continue;
          const valor = Math.abs(x.amountInAccountCurrency ?? x.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          await fetch('https://ntfy.sh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: env.NTFY_TOPIC,
              title: `${valor} no ${a.marketingName || a.name}`,
              message: x.description || 'Nova compra',
              tags: ['credit_card'],
            }),
          });
        }
      }
    }
    await env.SEEN.put('ids', JSON.stringify(current));
  },
};
