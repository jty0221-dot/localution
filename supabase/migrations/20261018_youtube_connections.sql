-- Preparation only. Apply separately after production migration approval.
create table if not exists public.youtube_connections (
 user_id text primary key,
 channel_id text not null,
 channel_title text not null,
 encrypted_token jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.youtube_connections enable row level security;
revoke all on public.youtube_connections from anon, authenticated;
grant all on public.youtube_connections to service_role;
-- Rollback preserves credentials: revoke all on public.youtube_connections from service_role;
-- Do not DROP a populated table. Export no credentials; re-enable grant to restore service.
