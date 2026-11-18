// Gera supabase/functions/alertas/index.ts a partir do template, copiando a tabela de categorias
// (const CAT) e as regras de alimentação do index.html para que o app e a função classifiquem igual.
// Uso: node tools/gerar-funcao-alertas.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const a = html.indexOf('const CAT = {'), b = html.indexOf('\n};', a);
if (a < 0 || b < 0) throw new Error('não achei a tabela CAT no index.html');
const cat = 'export ' + html.slice(a, b + 3).replace('PAYMENT', "'Pagamento de fatura'");
const tpl = fs.readFileSync(path.join(__dirname, 'funcao-alertas.template.ts'), 'utf8').replace(/\r\n/g, '\n');
const out = path.join(root, 'supabase', 'functions', 'alertas', 'index.ts');
fs.mkdirSync(path.dirname(out), { recursive: true });
const fa = html.indexOf('/* @regras-alimentacao-inicio'), fb = html.indexOf('/* @regras-alimentacao-fim */');
if (fa < 0 || fb < 0) throw new Error('não achei as regras de alimentação no index.html');
const food = html.slice(fa, fb + '/* @regras-alimentacao-fim */'.length);
fs.writeFileSync(out, tpl.replace('/*__CAT__*/', cat).replace('/*__FOOD__*/', food));
console.log('gerado:', path.relative(root, out));
