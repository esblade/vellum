-- Vellum: estrutura do banco no Supabase.
-- Rode em SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem perder dados.
-- ANTES de rodar, troque SEU_EMAIL@gmail.com (no fim do arquivo) pelo Gmail que você usa para entrar.

-- 1. Quem pode usar o app ------------------------------------------------------------
-- Só e-mails desta lista conseguem ler e gravar dados. Para liberar alguém, adicione o e-mail
-- (veja o exemplo no fim). Cada pessoa tem os próprios dados e a própria conexão com a Pluggy.
create table if not exists public.allowed_users (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);
alter table public.allowed_users enable row level security; -- sem políticas: só se edita pelo painel

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- 2. Ajustes de cada pessoa, um item por linha -----------------------------------------
-- (renda, metas, empréstimos, lançamentos manuais, categorias ajustadas e conexão com a Pluggy)
create table if not exists public.user_settings (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  key        text   not null,
  value      jsonb,
  updated_at bigint not null default 0,
  primary key (user_id, key)
);

-- 3. Transações dos cartões -------------------------------------------------------------
create table if not exists public.transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id      text not null,
  card_id text not null,
  date    date not null,
  data    jsonb not null,
  primary key (user_id, id)
);
create index if not exists transactions_user_date on public.transactions (user_id, date desc);

-- 4. Cartões, limites e faturas (última atualização) ----------------------------------------
create table if not exists public.snapshots (
  user_id   uuid   primary key references auth.users (id) on delete cascade,
  data      jsonb  not null,
  synced_at bigint not null default 0
);

-- 5. Tabela da versão anterior (mantida só para migrar os dados que já estão nela) -------------
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb  not null default '{}'::jsonb,
  updated_at bigint not null default 0
);

-- 6. Regras de acesso: cada pessoa só vê e altera as próprias linhas, e só se estiver liberada ----
do $$
declare t text; p record;
begin
  foreach t in array array['user_settings', 'transactions', 'snapshots', 'user_data'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format(
      'create policy "dono liberado" on public.%I for all to authenticated
         using (auth.uid() = user_id and public.is_allowed())
         with check (auth.uid() = user_id and public.is_allowed())', t);
  end loop;
end $$;

-- 7. Libere o seu e-mail (troque pelo seu Gmail) -------------------------------------------
insert into public.allowed_users (email, name) values ('SEU_EMAIL@gmail.com', 'Eu')
on conflict (email) do nothing;

-- Para liberar um parente depois, rode só esta linha com o e-mail dele:
-- insert into public.allowed_users (email, name) values ('email.do.parente@gmail.com', 'Nome') on conflict (email) do nothing;
-- Para tirar o acesso:
-- delete from public.allowed_users where email = 'email.do.parente@gmail.com';
