-- Vellum: libera o acesso automaticamente quando a pessoa confirma o e-mail.
-- Rode uma vez em SQL Editor → New query → cole tudo → Run (depois do supabase.sql).
--
-- Como funciona: quando o e-mail de uma conta é confirmado (link do e-mail de cadastro) ou a conta já
-- nasce confirmada (login com Google), o e-mail entra na lista public.allowed_users.
-- Para tirar o acesso de alguém depois: delete from public.allowed_users where email = 'email@dela.com';
-- (a pessoa só volta a ter acesso se você inserir o e-mail de novo).

create or replace function public.liberar_email_confirmado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    insert into public.allowed_users (email, name)
    values (lower(new.email), coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'))
    on conflict (email) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists liberar_email_confirmado on auth.users;
create trigger liberar_email_confirmado
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.liberar_email_confirmado();

-- Libera agora quem já confirmou o e-mail antes desta regra existir.
insert into public.allowed_users (email, name)
select lower(email), coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name')
from auth.users
where email is not null and email_confirmed_at is not null
on conflict (email) do nothing;
