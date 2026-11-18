-- Vellum: tabela dos dados de cada usuário (renda, metas, empréstimos, ajustes e conexão com a Pluggy).
-- Rode uma vez no Supabase em SQL Editor → New query → cole tudo → Run.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb  not null default '{}'::jsonb,
  updated_at bigint not null default 0
);

-- Só o dono da linha (o usuário logado) pode ler e gravar os próprios dados.
alter table public.user_data enable row level security;

drop policy if exists "dono le" on public.user_data;
drop policy if exists "dono cria" on public.user_data;
drop policy if exists "dono atualiza" on public.user_data;
drop policy if exists "dono apaga" on public.user_data;

create policy "dono le"      on public.user_data for select using (auth.uid() = user_id);
create policy "dono cria"    on public.user_data for insert with check (auth.uid() = user_id);
create policy "dono atualiza" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga"   on public.user_data for delete using (auth.uid() = user_id);
