-- Vellum: notificações (avisos de gasto perto da renda e da meta da categoria).
-- Rode DEPOIS do supabase.sql, em SQL Editor → New query → cole tudo → Run.
-- Antes de rodar, troque TROQUE_PELO_CRON_SECRET pelo CRON_SECRET do arquivo .segredos/notificacoes.txt.

-- 1. Aparelhos que recebem notificação (cada pessoa só vê e mexe nos seus) -----------------------
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  device     text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "dono liberado" on public.push_subscriptions;
create policy "dono liberado" on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id and public.is_allowed())
  with check (auth.uid() = user_id and public.is_allowed());

-- 2. Agenda: chama a função "alertas" a cada 30 minutos ------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('vellum-alertas') where exists (select 1 from cron.job where jobname = 'vellum-alertas');
select cron.schedule('vellum-alertas', '*/30 * * * *', $$
  select net.http_post(
    url     := 'https://zemvlkrymvbbqikzcsqz.supabase.co/functions/v1/alertas',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'TROQUE_PELO_CRON_SECRET'),
    body    := '{}'::jsonb
  );
$$);

-- Para pausar os avisos: select cron.unschedule('vellum-alertas');
