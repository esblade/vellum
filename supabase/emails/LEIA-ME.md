# Modelos de e-mail do Vellum

Cole cada modelo no Supabase em **Authentication → Emails → Templates** (ou **Authentication → Email Templates**).
Em cada um, troque o **Subject** e cole o arquivo inteiro no campo do corpo (**Message body / Source**), depois **Save**.

| Modelo no Supabase | Assunto (Subject) | Arquivo |
|---|---|---|
| Confirm signup | Confirme seu e-mail no Vellum | confirmar-cadastro.html |
| Reset Password | Sua senha nova do Vellum | recuperar-senha.html |
| Change Email Address | Confirme seu novo e-mail no Vellum | trocar-email.html |

Os textos entre `{{ }}` são preenchidos pelo Supabase; não apague.
O remetente continua sendo o do Supabase (para trocar, só com um SMTP próprio).
Para mudar o visual ou os textos: edite `tools/gerar-emails.js` e rode `node tools/gerar-emails.js`.
