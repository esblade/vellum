# Novidades do Vellum

Para lançar uma versão nova, escreva um item no topo desta lista: o número que estiver aqui em cima é a versão que o app mostra. As versões seguem o formato MAIOR.MENOR.CORREÇÃO: muda o MENOR quando chega algo novo e a CORREÇÃO quando é ajuste ou conserto.

## 1.16.7 — 23/11/2026
- Visão geral: "Ver o que entrou" nos quadros Dia a dia e Contas fixas e parcelas abre a lista desses lançamentos.
- Transações: novos filtros "Dia a dia" e "Contas fixas e parcelas".

## 1.16.6 — 23/11/2026
- Visão geral, Orçamento e Relatórios contam as parcelas de empréstimo do mês nas contas fixas. Só entram empréstimos com parcelas e vencimento; os sem prazo ficam de fora.
- Se a parcela já foi debitada na conta ou no cartão, ela não é contada duas vezes. Se você pagou por fora e registrou em Empréstimos, ela conta como paga.

## 1.16.5 — 23/11/2026
- Empréstimos: o contrato e o 1º vencimento agora pedem só mês e ano. A parcela vence no mês e só conta como atrasada depois que o mês acaba. Empréstimos já cadastrados com data completa continuam iguais.
- Registrar pagamento de empréstimo também pede só o mês da parcela (já vem com o mês da próxima), e o histórico mostra os meses.

## 1.16.4 — 23/11/2026
- Financiamento de fatura (ex.: "FINANCIAMENTO FATU01/12" do Itaú) não entra mais na fatura nem nos gastos: é pagamento de uma fatura antiga, e as compras dela já contaram.
- Corrigido o campo "Final do cartão", que recusava qualquer número.
- Crédito no cartão com o valor de uma fatura informada pelo banco conta como pagamento dela, qualquer que seja a descrição (ex.: débito automático). Antes podia virar estorno e a fatura paga continuava aparecendo.
- "Conferir com o banco" mostra qual fatura aparece no cartão e por quê, os pagamentos reconhecidos e os créditos tratados como estorno.

## 1.16.3 — 23/11/2026
- Fatura: quando o banco manda todas as parcelas de uma compra com a data da compra (como o Itaú), cada parcela agora vai para a sua fatura. Antes, todas caíam na fatura atual.
- Final do cartão pelo cartão usado nas compras (o banco às vezes informa outro na conta). Dá para corrigir em Personalizar cartão.
- A fatura fechada que o banco informa e ainda vai vencer aparece primeiro, pelo valor do banco; o vencimento segue o da última fatura do banco.
- Novo "Conferir com o banco" na tela Faturas: o que o banco mandou e como o app chegou no valor.

## 1.16.2 — 23/11/2026
- Fatura: compras feitas no dia do fechamento entram na fatura seguinte, como nos bancos.
- Compras marcadas para "ignorar nos totais" continuam na fatura, porque o banco cobra; só saem da análise dos gastos.
- Datas com horário são lidas no fuso de Brasília (uma compra às 22h não pula mais para o dia seguinte).
- O cartão mostra a fatura com centavos, e a tela Faturas diz quando o banco mandou os dados pela última vez.

## 1.16.1 — 23/11/2026
- Cartão: o valor da fatura agora vem dos lançamentos da fatura (ou do valor oficial do banco, quando ela já fechou). Antes aparecia o saldo em aberto do cartão, que inclui as parcelas futuras e é praticamente o limite usado.
- Vencimento sempre o próximo (antes podia mostrar uma data que já passou). Se a fatura fechou e ainda não foi paga, ela aparece primeiro.
- Lançamentos e parcelas vão para a fatura que o banco informa, quando ele informa.
- Estornos no cartão descontam do gasto do mês e da categoria, no app e nos avisos.

## 1.16.0 — 19/11/2026
- Relatórios em duas abas, Mês e Ano (a Visão anual virou a aba Ano).
- Aba Mês com resumo em frases, "Para onde vai a renda" e a evolução dos gastos separando contas fixas e dia a dia.
- Comparativo mostra só as maiores variações, com as outras categorias recolhidas; ranking de lugares e dias da semana consideram só o dia a dia.
- Orçamento: novo quadro "Quanto dá para o dia a dia" (renda menos contas fixas e o que você quer guardar) e a marca de onde cada meta deveria estar hoje.
- Faturas: previsão de fechamento da fatura aberta e resumo por categoria.

## 1.15.0 — 19/11/2026
- Gastos separados em contas fixas (aluguel, contas, assinaturas, parcelas) e dia a dia (mercado, delivery, transporte, compras).
- Visão geral nova: o topo mostra quanto ainda dá para gastar no mês e por dia, já separando as contas fixas, e como a renda está dividida.
- Ritmo do mês com a previsão até o fim do mês e a linha da renda.
- "Para onde foi o dinheiro" mostra só o dia a dia, com a marca de onde a meta deveria estar hoje.
- Novo quadro "Próximos vencimentos": contas fixas que ainda não caíram, faturas e parcelas.

## 1.14.2 — 19/11/2026
- Comparações do mês em andamento usam o mesmo período do mês anterior (Visão geral e Relatórios), e a fatura aberta é comparada com o mesmo ponto da fatura anterior. Antes, o mês incompleto parecia uma economia.
- Contas fixas (aluguel, luz, internet) separadas das assinaturas (streaming, apps, academia).
- Relatórios e Visão anual mostram, em tom claro, quanto ainda deve entrar no mês atual.
- As barras das faturas anteriores agora usam a escala certa.
- Ao reconectar um banco, os lançamentos não aparecem mais todos como "Nova".

## 1.14.1 — 19/11/2026
- Transações mostram o nome da categoria por extenso, discreto, com um pontinho na cor dela, no lugar da sigla.
- As janelas fecham ao clicar fora delas.

## 1.14.0 — 19/11/2026
- Logo novo: um V caligráfico, com um traço cheio e outro mais leve (o que entra e o que sai). Também nos ícones do celular e na aba do navegador.
- Nome com o subtítulo "finanças pessoais".
- Menu lateral em grupos (Planejar, Acompanhar), destaque mais leve na tela aberta e sua conta no rodapé, que leva aos Ajustes.

## 1.13.5 — 19/11/2026
- Barra do topo mais compacta: título, mês, filtro de conta e botões na mesma linha; nomes de conta longos não esticam mais o filtro.
- No computador, as listas de opções abrem no visual do app (claro e escuro), com busca por letra e navegação pelo teclado. No celular continua o seletor do sistema.

## 1.13.4 — 19/11/2026
- Ao abrir o link de confirmação, o app avisa que o e-mail foi confirmado (também quando o link abre em outro navegador) ou que o link expirou ou já foi usado.

## 1.13.3 — 19/11/2026
- Botão para reenviar o e-mail de confirmação, depois de criar a conta ou ao tentar entrar sem ter confirmado (um pedido por minuto).

## 1.13.2 — 19/11/2026
- Ao recarregar a página antes de conectar um banco, o menu completo não pisca mais antes do menu do tutorial.
- O app abre bem mais rápido ao recarregar: o aparelho lembra que seu acesso já foi liberado e confere em segundo plano, e a tela aparece sem esperar as transações chegarem.

## 1.13.1 — 19/11/2026
- Ajustes organizado em cartões (Pluggy, Bancos, Conta, Notificações, Aparência, Seus dados, Ajuda, Apagar dados), com índice ao lado em telas grandes.
- Durante a configuração, o menu mostra os passos do tutorial com o progresso e as telas que liberam depois de conectar um banco.

## 1.13.0 — 19/11/2026
- Ajustes virou uma página normal (#/ajustes), sem janela por cima; o que você digita não se perde quando os dados atualizam.
- Enquanto nenhum banco estiver conectado, o menu fica escondido e qualquer endereço leva ao tutorial.
- O tutorial pode ser reaberto a qualquer momento em Ajustes → Ajuda.

## 1.12.2 — 19/11/2026
- Tutorial e Ajustes explicam melhor os dois passos de um banco novo: autorizar no Meu Pluggy (Open Finance) e depois trazer para o Vellum.

## 1.12.1 — 19/11/2026
- Acesso liberado automaticamente quando a pessoa confirma o e-mail (ou entra com Google).
- E-mails de cadastro, recuperação de senha e troca de e-mail em português, no visual do Vellum.

## 1.12.0 — 19/11/2026
- Tela de entrada nova, pensada para o celular: entrar ou criar conta com e-mail e senha, ou com Google, e recuperar a senha.
- Tutorial no primeiro acesso: criar a conta no Meu Pluggy, a aplicação no Dashboard, colar e conferir o Client ID e o Secret e conectar o primeiro banco.

## 1.11.0 — 19/11/2026
- Versão do app no menu lateral (e em "Mais" no celular), com esta lista de novidades.
- A janela "Conectar banco" da Pluggy abre por cima dos Ajustes.
- Ajustes fecha ao clicar fora.
- A versão fica em um lugar só: este arquivo.
- Removida a opção de intermediário (Cloudflare Worker) dos Ajustes.

## 1.10.0 — 19/11/2026
- Conectar banco pelo próprio app (janela da Pluggy com o Meu Pluggy) e lista de bancos conectados com status, Renovar e remover.

## 1.9.2 — 19/11/2026
- Alimentação, Mercado, Restaurantes e Delivery conferidos pelo código do estabelecimento e pelo nome; Mercado Livre/Pago viram Compras online.

## 1.9.1 — 19/11/2026
- Orçamento: lista só com as categorias que têm meta, botão para tirar uma meta e "Limpar todas"; campos e seleções com visual novo.

## 1.9.0 — 18/11/2026
- Notificações quando o gasto chega perto da renda ou da meta de uma categoria, mesmo com o app fechado.
- Orçamento com resumo único e sugestão de metas pela média de 6 meses.

## 1.8.0 — 18/11/2026
- Cartões com o visual de cada banco (Itaú, Nubank, Ourocard, Sam's Club), nome e visual personalizáveis.

## 1.7.2 — 18/11/2026
- Renda prevista só com entradas regulares (sem apostas e valores variáveis); valores ao passar o mouse nos gráficos.

## 1.7.1 — 18/11/2026
- Projeção do mês sem multiplicar gastos pontuais; pagamento do cartão pela conta não conta em dobro; empréstimo recebido não é renda.

## 1.7.0 — 18/11/2026
- App instalável na Tela de Início, funcionando sem internet; categorias personalizadas; dividir uma compra; testes automáticos.

## 1.6.0 — 18/11/2026
- Conta corrente com renda automática; telas de Faturas, Objetivos e Visão anual; relatórios em PDF.

## 1.5.0 — 18/11/2026
- Transações salvas na conta, ajustes salvos por item e lista de e-mails com acesso.

## 1.4.1 — 18/11/2026
- Pagamento de fatura por Pix deixa de contar como estorno.

## 1.4.0 — 18/11/2026
- Login com Google (Supabase) e trava com Face ID.

## 1.3.0 — 18/11/2026
- Visual novo, várias rendas e sincronização entre aparelhos.

## 1.2.0 — 18/11/2026
- Renda do mês, modo escuro novo e categorias clicáveis.

## 1.1.0 — 18/11/2026
- Gestão completa de gastos: orçamento, parcelas e assinaturas, empréstimos e relatórios.

## 1.0.0 — 18/11/2026
- Primeira versão: cartões pela Pluggy, usando o GET /v2/transactions.
