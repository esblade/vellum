# Meus cartões

Página única de gestão de gastos pessoais. Lê os cartões de crédito conectados no Meu Pluggy e guarda o resto (metas, empréstimos, lançamentos manuais) só no navegador.

## Telas

- **Visão geral**: gasto do mês comparado ao mesmo período do mês anterior, renda e sobra, projeção, ritmo de gastos, categorias (clicáveis), conta corrente, objetivos, cartões e alertas.
- **Transações**: busca, filtros por categoria, tipo, cartão ou conta, troca de categoria (só nesta compra ou em todas do mesmo estabelecimento), dividir uma compra entre categorias, notas, ignorar nos totais, lançamentos manuais e CSV. O botão **Categorias** cria, renomeia e muda a cor das categorias.
- **Faturas**: fatura aberta de cada cartão (fecha em, vence em, limite), lançamentos da fatura, parcelas que ainda vão entrar, próximas 6 faturas previstas e faturas anteriores.
- **Orçamento**: meta mensal por categoria, com mês anterior, média de 3 meses e sugestão automática.
- **Parcelas e assinaturas**: compras parceladas em andamento, gastos recorrentes e compromissos dos próximos 12 meses.
- **Objetivos**: caixinhas com meta e prazo (ex.: reserva de emergência), quanto guardar por mês e se cabe na sobra do mês.
- **Empréstimos**: o que você deve e o que te devem, com parcelas, juros e histórico.
- **Relatórios**: evolução, comparativo com o mês anterior, onde o dinheiro foi, dias da semana e faturas; dá para baixar em PDF.
- **Visão anual**: gasto, renda e sobra de cada mês do ano, categorias e estabelecimentos do ano, com PDF.

### Conta corrente

Se a conexão do Meu Pluggy também trouxer a conta corrente, o app mostra o saldo, conta Pix, débito e boletos como gasto e, por padrão, usa o que entra na conta como **renda automática**. Pagamento da fatura, aplicações, resgates e transferências entre suas contas não contam nem como gasto nem como renda. Em "Editar renda" dá para trocar para renda informada manualmente.

Em Ajustes dá para escolher tema claro/escuro, ligar o Face ID e exportar ou importar um backup (JSON).

## App na Tela de Início

No iPhone, abra o site no Safari → Compartilhar → **Adicionar à Tela de Início**. O Vellum vira um app com ícone próprio, abre em tela cheia e funciona sem internet mostrando os últimos dados salvos (eles atualizam sozinhos quando a conexão volta). No Android, o Chrome oferece "Instalar app". Os dados financeiros nunca ficam no cache do app: Pluggy e Supabase são sempre consultados pela rede.

Os ícones ficam em `icons/` e podem ser gerados de novo com `node tools/gerar-icones.js`.

## Versões

A versão atual aparece no menu lateral (e em "Mais" no celular); tocando nela abre a lista de novidades, que vem do `CHANGELOG.md`. Para lançar uma versão nova: suba o número em `APP_VERSION` (index.html) e em `CACHE` (sw.js) e adicione o item no topo do `CHANGELOG.md`. Os testes avisam se os três ficarem diferentes.

## Testes

As regras que mais dão problema (pagamento de fatura por Pix, conta corrente, parcelas, assinaturas, faturas, compra dividida, renomear categoria e objetivos) têm testes automáticos. Para rodar:

```
node --test "tests/*.test.js"
```

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

## Conectar bancos (Meu Pluggy)

Uso pessoal gratuito, sem prazo: até 5 conexões ativas, só contas do próprio titular. Cada pessoa precisa, uma vez:

1. Conectar os bancos em [meu.pluggy.ai](https://meu.pluggy.ai) (é lá que acontece a autorização do Open Finance).
2. Criar uma aplicação no [Dashboard da Pluggy](https://dashboard.pluggy.ai) entrando com a **mesma conta** do Meu Pluggy e ativar o conector MeuPluggy nas configurações de conectores.
3. No Vellum, em Ajustes, colar o Client ID e o Client Secret dessa aplicação.
4. Tocar em **Conectar banco**: abre a janela da Pluggy só com o Meu Pluggy; entre, escolha o banco e o Vellum salva a conexão sozinho. Repita para cada banco.

Em Ajustes → Bancos conectados aparecem as conexões com o status de cada uma, e os botões **Renovar** (quando a autorização vence) e **×** (tira a conexão do Vellum, sem apagar no Meu Pluggy).

## Conta com login Google (dados em qualquer aparelho)

Com a conta ligada, o app pede "Entrar com Google". Cartões (credenciais da Pluggy), renda, metas, empréstimos, lançamentos manuais e categorias ajustadas ficam salvos no Supabase e aparecem em qualquer aparelho em que você entrar. Sem a conta, tudo continua funcionando só no navegador.

### 1. Supabase (banco de dados)

1. Crie um projeto grátis em supabase.com.
2. Abra `supabase.sql`, troque `SEU_EMAIL@gmail.com` pelo Gmail que você usa para entrar e, em SQL Editor → New query, cole tudo e clique em Run. Isso cria as tabelas (ajustes, transações, cartões), a lista de e-mails liberados e as regras que só deixam cada pessoa liberada ler e gravar os próprios dados. Pode rodar de novo sem perder nada.
3. Em Project Settings → API, copie a **Project URL** e a chave **anon public**. Cole as duas no começo do `<script>` do `index.html`, em `const SUPABASE = { url: '...', anonKey: '...' }`. A chave anon é pública por natureza; o que protege os dados é a regra da tabela.
4. Em Authentication → URL Configuration, coloque em **Site URL** o endereço do site (ex.: `https://SEU_USUARIO.github.io/vellum/`) e adicione o mesmo endereço em **Redirect URLs**.

### Liberar acesso para outra pessoa

Só e-mails da tabela `allowed_users` conseguem usar o app. Para liberar um parente, rode no SQL Editor:

```sql
insert into public.allowed_users (email, name) values ('email.do.parente@gmail.com', 'Nome') on conflict (email) do nothing;
```

Cada pessoa tem os próprios dados e configura a própria conexão com a Pluggy em Ajustes. Quem entrar com um e-mail fora da lista vê a tela "Acesso ainda não liberado". Para tirar o acesso: `delete from public.allowed_users where email = '...';`

### O que fica salvo na conta

Credenciais da Pluggy, renda, metas, empréstimos, lançamentos manuais, categorias ajustadas, cartões e as transações. Um aparelho novo abre direto com os dados da conta. Na primeira atualização o app busca 12 meses na Pluggy; depois, só os últimos 40 dias (o histórico antigo continua salvo, então ele cresce além de 12 meses com o tempo). Cada item é salvo separadamente: mudar metas num aparelho e empréstimos em outro não perde nada.

### 2. Google (login)

1. Em console.cloud.google.com, crie um projeto e vá em APIs e serviços → Tela de consentimento OAuth: tipo Externo, preencha nome do app e seu e-mail, e adicione seu Gmail como usuário de teste.
2. Em Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web:
   - Origens JavaScript autorizadas: `https://SEU_USUARIO.github.io`
   - URIs de redirecionamento autorizados: `https://SEU_PROJETO.supabase.co/auth/v1/callback` (o Supabase mostra esse endereço exato na tela do provedor Google).
3. No Supabase, em Authentication → Sign In / Providers → Google, ative e cole o Client ID e o Client Secret gerados pelo Google.

Como as credenciais da Pluggy ficam na sua conta, quem acessar sua conta Google vê seus dados financeiros: deixe a verificação em duas etapas do Google ligada.

### Face ID / digital

No celular (e em computadores com Windows Hello ou Touch ID), entre em Ajustes → Conta → "Pedir Face ID ao abrir". O app passa a pedir a biometria ao abrir e quando você volta depois de 2 minutos fora. É uma trava deste aparelho: cada aparelho ativa a sua, e a segurança da conta continua sendo o login do Google.

No iPhone, adicione o site à Tela de Início pelo Safari (Compartilhar → Adicionar à Tela de Início) e faça o login uma vez dentro do app da Tela de Início, que guarda a sessão separada do Safari.

## Notificações (gasto perto da renda e da meta)

Uma função do Supabase roda a cada 30 minutos, mesmo com o app fechado: busca as compras novas na Pluggy (com as credenciais salvas na conta), calcula o gasto do mês do mesmo jeito que o app e avisa quando o gasto chega a um percentual da renda (80% por padrão) ou passa dela, e quando uma categoria chega perto da meta ou passa dela. Cada aviso chega uma vez por mês.

Configuração (uma vez):

1. **Segredos**: o arquivo `.segredos/notificacoes.txt` (fora do git) tem as chaves das notificações e o `CRON_SECRET`. Se ele não existir, gere novas chaves e troque a `VAPID_PUBLIC` no `index.html`.
2. **Função**: no Supabase, Edge Functions → Deploy a new function → Via Editor, nome `alertas`, cole o conteúdo de `supabase/functions/alertas/index.ts` e publique. Nas configurações da função, **desligue "Verify JWT"** (a função confere o `CRON_SECRET` e o login sozinha).
3. **Segredos da função**: em Edge Functions → Secrets, adicione `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `CRON_SECRET` com os valores do arquivo do passo 1.
4. **Agenda**: abra `supabase-notificacoes.sql`, troque `TROQUE_PELO_CRON_SECRET` pelo `CRON_SECRET` e rode no SQL Editor. Isso cria a tabela dos aparelhos e agenda a função a cada 30 minutos.
5. **No celular**: com o Vellum na Tela de Início, abra Ajustes → Notificações → **Ativar neste aparelho** e depois **Enviar teste**.

Em Ajustes dá para escolher o percentual (70%, 80% ou 90%) e desligar cada tipo de aviso. Se mudar a tabela de categorias no `index.html`, rode `node tools/gerar-funcao-alertas.js` e publique a função de novo (um teste avisa se as duas ficarem diferentes).

## Intermediário e alertas (Cloudflare Workers, plano grátis)

O Worker resolve bloqueio de CORS, guarda o Client Secret fora do celular e, se você quiser, manda uma notificação push a cada compra nova.

1. Em dash.cloudflare.com → Workers & Pages → Create → Worker, cole o conteúdo de `worker.js` e publique.
2. Em Settings → Variables and Secrets, crie `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `ACCESS_TOKEN` e `ALLOWED_ORIGIN` (`https://SEU_USUARIO.github.io`).
3. Na página, em Ajustes → Usar intermediário, informe o endereço do Worker e o mesmo `ACCESS_TOKEN`.

O Worker libera `/items`, `/accounts`, `/v2/transactions` e `/bills`. Se você publicou uma versão antiga, publique de novo para o histórico de faturas aparecer em Relatórios (sem isso, o resto funciona normalmente).

Para os alertas no iPhone:

1. Instale o app ntfy e assine um tópico com nome longo e aleatório.
2. No Worker, crie as variáveis `ITEM_IDS` e `NTFY_TOPIC`, um KV namespace ligado como `SEEN` e um Cron Trigger (`*/30 * * * *`).
3. A primeira execução só memoriza as compras existentes; dali em diante cada compra nova vira notificação.
