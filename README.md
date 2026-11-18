# Meus cartões

Página única de gestão de gastos pessoais. Lê os cartões de crédito conectados no Meu Pluggy e guarda o resto (metas, empréstimos, lançamentos manuais) só no navegador.

## Telas

- **Visão geral**: gasto do mês com comparação ao mesmo período do mês anterior, projeção para o fim do mês, ritmo de gastos dia a dia, principais categorias, limites e faturas dos cartões, alertas (meta estourada, limite alto, fatura vencendo, parcela de empréstimo atrasada).
- **Transações**: busca, filtros por categoria e tipo, troca de categoria (só nesta compra ou em todas do mesmo estabelecimento), notas, ignorar nos totais, lançamentos manuais (Pix, dinheiro, boleto) e exportação em CSV.
- **Orçamento**: meta mensal por categoria, com gasto do mês, mês anterior, média de 3 meses e sugestão automática de metas.
- **Parcelas e assinaturas**: compras parceladas em andamento, quanto falta pagar, gastos recorrentes identificados automaticamente e gráfico do que já está comprometido nos próximos 12 meses.
- **Empréstimos**: empréstimos e financiamentos que você deve e valores que emprestou, com parcelas, juros, saldo, próximo vencimento e histórico de pagamentos.
- **Relatórios**: evolução de 6 meses, comparativo por categoria e por cartão com o mês anterior, onde você mais gastou, maiores compras, gasto por dia da semana e histórico de faturas.

Em Ajustes dá para escolher tema claro/escuro e exportar ou importar um backup (JSON) das metas, empréstimos e categorias ajustadas, para levar a outro aparelho.

## Publicar no GitHub Pages (grátis em repositório público)

1. Crie um repositório público, por exemplo `meus-cartoes`.
2. Envie o `index.html` para a raiz (pode ser pelo botão "Add file → Upload files").
3. Em Settings → Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`.
4. Em um ou dois minutos a página fica em `https://SEU_USUARIO.github.io/meus-cartoes/`.

O código fica público, mas nenhuma credencial está nele: Client ID, Secret e IDs das conexões são digitados nos Ajustes e ficam salvos só no navegador de quem preencheu.

No iPhone, abra o endereço no Safari e use Compartilhar → Adicionar à Tela de Início para ter um ícone como de app.

## Primeiro teste

1. Toque em "Ver com dados de exemplo" para conferir a interface.
2. Em Ajustes, preencha Client ID, Client Secret e os IDs das conexões.
3. Se aparecer o aviso de que o navegador bloqueou o acesso direto à API, use o Worker abaixo.

## Intermediário e alertas (Cloudflare Workers, plano grátis)

O Worker resolve bloqueio de CORS, guarda o Client Secret fora do celular e, se você quiser, manda uma notificação push a cada compra nova.

1. Em dash.cloudflare.com → Workers & Pages → Create → Worker, cole o conteúdo de `worker.js` e publique.
2. Em Settings → Variables and Secrets, crie `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `ACCESS_TOKEN` e `ALLOWED_ORIGIN` (`https://SEU_USUARIO.github.io`).
3. Na página, em Ajustes → Usar intermediário, informe o endereço do Worker e o mesmo `ACCESS_TOKEN`.

### Sincronizar renda, metas e empréstimos entre aparelhos

Sem isso, renda, metas, empréstimos e lançamentos manuais ficam só no navegador onde foram digitados. Com o Worker:

1. Em Workers & Pages → KV, crie um namespace (ex.: `vellum-dados`).
2. No Worker, em Settings → Bindings → Add → KV namespace, ligue esse namespace com o nome `DATA`.
3. Publique a versão atual de `worker.js`.
4. Em cada aparelho (computador e celular), abra Ajustes → Usar intermediário e informe o endereço do Worker e o `ACCESS_TOKEN`.

O app envia as alterações sozinho e busca as novas ao abrir; o topo mostra "sincronizado". Vale a versão mais recente.

O Worker libera `/items`, `/accounts`, `/v2/transactions`, `/bills` e `/sync`. Se você publicou uma versão antiga, publique de novo para o histórico de faturas aparecer em Relatórios (sem isso, o resto funciona normalmente).

Para os alertas no iPhone:

1. Instale o app ntfy e assine um tópico com nome longo e aleatório.
2. No Worker, crie as variáveis `ITEM_IDS` e `NTFY_TOPIC`, um KV namespace ligado como `SEEN` e um Cron Trigger (`*/30 * * * *`).
3. A primeira execução só memoriza as compras existentes; dali em diante cada compra nova vira notificação.
