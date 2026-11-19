// Gera os modelos de e-mail do Supabase (Authentication → Emails → Templates) no visual do Vellum.
// Uso: node tools/gerar-emails.js  → cria supabase/emails/*.html
// Os textos entre {{ }} são preenchidos pelo Supabase ({{ .ConfirmationURL }}, {{ .Email }}, {{ .NewEmail }}).
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'supabase', 'emails');
fs.mkdirSync(out, { recursive: true });

const ICON = 'https://esblade.github.io/vellum/icons/icon-192.png';
function email({ preheader, title, intro, button, after, note }){
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F2F8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17142B;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F2F8;">
  <tr><td align="center" style="padding:28px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <tr><td style="background:#17142B;border-radius:22px 22px 0 0;padding:26px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;"><img src="${ICON}" width="40" height="40" alt="Vellum" style="display:block;border-radius:12px;"></td>
          <td style="vertical-align:middle;padding-left:12px;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Vellum</td>
        </tr></table>
        <p style="margin:18px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:#FFFFFF;letter-spacing:-0.4px;">${title}</p>
      </td></tr>
      <tr><td style="background:#FFFFFF;border-radius:0 0 22px 22px;padding:28px;">
        <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#3B3854;">${intro}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#5B3DF5;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:15px 28px;border-radius:14px;">${button}</a>
        </td></tr></table>
        <p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#3B3854;">${after}</p>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#736F8A;">Se o botão não abrir, copie e cole este endereço no navegador:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#5B3DF5;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        <hr style="border:0;border-top:1px solid #EFEDF5;margin:24px 0 16px;">
        <p style="margin:0;font-size:12px;line-height:1.5;color:#736F8A;">${note}</p>
      </td></tr>
      <tr><td align="center" style="padding:18px 10px 0;font-size:12px;color:#736F8A;">Vellum · suas finanças num lugar só</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;
}

const files = {
  'confirmar-cadastro.html': email({
    preheader: 'Confirme seu e-mail para começar a usar o Vellum.',
    title: 'Confirme seu e-mail',
    intro: 'Que bom ter você por aqui! Falta só confirmar que <b>{{ .Email }}</b> é seu. Ao confirmar, seu acesso ao Vellum é liberado na hora.',
    button: 'Confirmar e-mail',
    after: 'Depois de confirmar, o Vellum abre e um passo a passo mostra como conectar seus bancos pelo Meu Pluggy. Leva uns 5 minutos.',
    note: 'Você recebeu este e-mail porque alguém criou uma conta no Vellum com este endereço. Se não foi você, é só ignorar: nada acontece sem a confirmação.'
  }),
  'recuperar-senha.html': email({
    preheader: 'Crie uma senha nova para sua conta do Vellum.',
    title: 'Criar uma senha nova',
    intro: 'Recebemos um pedido para trocar a senha da conta <b>{{ .Email }}</b>. Toque no botão abaixo e escolha a senha nova.',
    button: 'Criar senha nova',
    after: 'O link vale por pouco tempo e só pode ser usado uma vez. Se ele expirar, peça outro em "Esqueci a senha".',
    note: 'Se você não pediu para trocar a senha, ignore este e-mail: sua senha atual continua a mesma.'
  }),
  'trocar-email.html': email({
    preheader: 'Confirme o novo e-mail da sua conta do Vellum.',
    title: 'Confirme o novo e-mail',
    intro: 'Você pediu para trocar o e-mail da sua conta de <b>{{ .Email }}</b> para <b>{{ .NewEmail }}</b>. Confirme para concluir a troca.',
    button: 'Confirmar novo e-mail',
    after: 'Até a confirmação, o e-mail antigo continua valendo para entrar.',
    note: 'Se você não pediu essa troca, ignore este e-mail e considere trocar sua senha.'
  })
};
for (const [name, html] of Object.entries(files)) fs.writeFileSync(path.join(out, name), html);

fs.writeFileSync(path.join(out, 'LEIA-ME.md'), `# Modelos de e-mail do Vellum

Cole cada modelo no Supabase em **Authentication → Emails → Templates** (ou **Authentication → Email Templates**).
Em cada um, troque o **Subject** e cole o arquivo inteiro no campo do corpo (**Message body / Source**), depois **Save**.

| Modelo no Supabase | Assunto (Subject) | Arquivo |
|---|---|---|
| Confirm signup | Confirme seu e-mail no Vellum | confirmar-cadastro.html |
| Reset Password | Sua senha nova do Vellum | recuperar-senha.html |
| Change Email Address | Confirme seu novo e-mail no Vellum | trocar-email.html |

Os textos entre \`{{ }}\` são preenchidos pelo Supabase; não apague.
O remetente continua sendo o do Supabase (para trocar, só com um SMTP próprio).
Para mudar o visual ou os textos: edite \`tools/gerar-emails.js\` e rode \`node tools/gerar-emails.js\`.
`);
console.log('modelos gerados em', path.relative(path.join(__dirname, '..'), out));
