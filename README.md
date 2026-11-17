# Meus cartões

Página única que lê os cartões de crédito conectados no Meu Pluggy e mostra gastos do período, limites, categorias e compras novas desde a última visita.

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

Para os alertas no iPhone:

1. Instale o app ntfy e assine um tópico com nome longo e aleatório.
2. No Worker, crie as variáveis `ITEM_IDS` e `NTFY_TOPIC`, um KV namespace ligado como `SEEN` e um Cron Trigger (`*/30 * * * *`).
3. A primeira execução só memoriza as compras existentes; dali em diante cada compra nova vira notificação.
