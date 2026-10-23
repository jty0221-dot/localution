-- ============================================================
-- LU-018 W2-4 · CRM 고객 소유 키 통일 : customers · customer_visits · customer_messages
--   user_id uuid (FK auth.users) → text (FK 없음)
-- ============================================================
--
-- 왜
--   · 로컬루션 사장님 ID 는 두 종류다. Supabase 로그인 = uuid, 네이버 · 카카오 · 구글 로그인
--     (localution_user 쿠키) = 자체 문자열 ID. stamp_cards · stores · qr_review_logs 는 이미 text 다
--     (migrations/stamp_cards.sql:13 · 30cha13_stores_user_id_text.sql · 2026_05_03_user_id_text.sql).
--   · customers 만 uuid FK 로 남아 있어 OAuth 사장님 고객은 서버에 저장되지 않고(409),
--     스탬프 적립 → 고객 자동 등록도 'invalid input syntax for type uuid' 로 실패했다.
--
-- 데이터 이전 부담
--   · 2026-10-23 운영 실측 : customers 행 0 · stamp_cards 1 · stamp_events 0.
--   · uuid → text 는 using user_id::text 로 값이 그대로 보존된다(소문자 하이픈 표기). 행이 0 이라
--     옮길 데이터가 없고, 행이 있어도 손실 없이 바뀐다.
--   · 실행 직전 확인 : select count(*) from public.customers;  (0 이 아니면 결재문에 숫자를 적는다)
--
-- 코드와의 관계 (마이그레이션 전/후 모두 동작)
--   · app/lib/customer-owner.ts 가 먼저 로그인 ID(text) 그대로 조회하고, DB 가 uuid 형식 오류(22P02)를
--     내면 그때만 기존 env 연결 경로(LOCALUTION_VERIFIED_IDENTITY_BINDINGS)로 넘어간다.
--   · 이 파일을 실행하면 22P02 가 더 이상 나지 않아 OAuth 사장님도 코드 변경 없이 서버 저장이 된다.
--   · 주의 : 실행 전에 env 연결로 저장된 네이버 사장님 행이 있으면(user_id = 연결된 auth uuid),
--     실행 뒤에는 원래 ID 로 조회하므로 그 행이 안 보인다. 운영 행 0 이라 해당 없음.
--     행이 생긴 뒤 실행한다면 아래 '확인 쿼리 2' 로 먼저 센다.
--
-- 실행 위치 : Supabase Dashboard → SQL Editor (대표 결재 후). 한 트랜잭션으로 돈다.
-- 문법 확인 근거 : 아래 문장은 모두 이 저장소 기존 마이그레이션에서 이미 운영에 실행된 형태를 따른다
--   (drop constraint if exists · alter column type text using ::text — 2026_05_03_user_id_text.sql,
--    pg_policies 순회 drop — 30cha13_stores_user_id_text.sql, view security_invoker — 20260425_view_security_invoker.sql).
--   로컬 Postgres 파서로는 돌리지 않았다.
-- ============================================================

begin;

-- 0) 뷰가 user_id 열에 걸려 있으면 타입 변경이 막힌다 → 먼저 지운다 (5 에서 다시 만든다)
drop view if exists public.my_customers;

-- 1) 세 표의 정책을 이름과 무관하게 전부 지운다 (운영에서 이름이 바뀌었어도 남지 않게)
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'customer_visits', 'customer_messages')
  loop
    execute format('drop policy %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    raise notice 'dropped policy %.%', rec.tablename, rec.policyname;
  end loop;
end $$;

-- 2) auth.users FK 제거 (text 사장님 ID 는 auth.users 에 없다)
alter table public.customers         drop constraint if exists customers_user_id_fkey;
alter table public.customer_visits   drop constraint if exists customer_visits_user_id_fkey;
alter table public.customer_messages drop constraint if exists customer_messages_user_id_fkey;

-- 3) uuid → text (값 보존)
alter table public.customers         alter column user_id type text using user_id::text;
alter table public.customer_visits   alter column user_id type text using user_id::text;
alter table public.customer_messages alter column user_id type text using user_id::text;

-- 빈 문자열 소유자 방지 (NOT NULL 은 원래 있음)
alter table public.customers         drop constraint if exists customers_user_id_nonempty;
alter table public.customers         add  constraint customers_user_id_nonempty check (length(user_id) > 0);

-- 4) 인덱스 — 타입 변경 때 Postgres 가 자동 재작성하지만, 없는 환경을 위해 다시 보장한다
create index if not exists idx_customers_user
  on public.customers(user_id, updated_at desc);
create unique index if not exists customers_user_phone_key
  on public.customers(user_id, phone)
  where phone is not null and phone <> '';
create unique index if not exists customers_user_legacy_key
  on public.customers(user_id, legacy_id)
  where legacy_id is not null;
create index if not exists idx_visits_user
  on public.customer_visits(user_id, visited_at desc);
create index if not exists idx_messages_user
  on public.customer_messages(user_id, created_at desc);

-- 5) RLS 재작성 — 앱 접근은 전부 service role API(/api/customers · /api/stamps/*)라 정책을 타지 않는다.
--    정책은 브라우저가 anon 키로 직접 읽는 경우의 방어선이다. auth.uid() 는 uuid 라 ::text 로 맞춘다.
--    (OAuth 사장님은 Supabase 세션이 없어 auth.uid() 가 null → 직접 접근 0행. 의도된 동작)
alter table public.customers         enable row level security;
alter table public.customer_visits   enable row level security;
alter table public.customer_messages enable row level security;

create policy "users read own customers"   on public.customers for select using (auth.uid()::text = user_id);
create policy "users insert own customers" on public.customers for insert with check (auth.uid()::text = user_id);
create policy "users update own customers" on public.customers for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "users delete own customers" on public.customers for delete using (auth.uid()::text = user_id);

create policy "users read own visits"   on public.customer_visits for select using (auth.uid()::text = user_id);
create policy "users insert own visits" on public.customer_visits for insert with check (auth.uid()::text = user_id);
create policy "users update own visits" on public.customer_visits for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "users delete own visits" on public.customer_visits for delete using (auth.uid()::text = user_id);

create policy "users read own messages"   on public.customer_messages for select using (auth.uid()::text = user_id);
create policy "users insert own messages" on public.customer_messages for insert with check (auth.uid()::text = user_id);

-- 6) 뷰 다시 만들기 (원본 20260420_crm.sql 과 같은 열 · security_invoker 유지)
create view public.my_customers
with (security_invoker = true) as
select id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at, created_at, updated_at
from public.customers
where user_id = auth.uid()::text;

grant select on public.my_customers to authenticated;

commit;

notify pgrst, 'reload schema';

-- ============================================================
-- 확인 쿼리
-- 1) 타입 : select table_name, data_type from information_schema.columns
--           where table_schema='public' and column_name='user_id'
--             and table_name in ('customers','customer_visits','customer_messages');   -- 3행 모두 text
-- 2) env 연결로 저장된 행(실행 전에 돌린다) :
--      select user_id, count(*) from public.customers group by 1;
-- 3) 정책 : select tablename, policyname from pg_policies
--           where tablename in ('customers','customer_visits','customer_messages');   -- 10행
-- ============================================================
--
-- 되돌리기 (text → uuid) — uuid 형식이 아닌 user_id 행이 하나라도 있으면 실패한다. 그 행을 먼저 지우거나 옮긴다.
--   begin;
--   drop view if exists public.my_customers;
--   do $$ declare rec record; begin
--     for rec in select schemaname, tablename, policyname from pg_policies
--       where schemaname='public' and tablename in ('customers','customer_visits','customer_messages')
--     loop execute format('drop policy %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename); end loop;
--   end $$;
--   alter table public.customers drop constraint if exists customers_user_id_nonempty;
--   alter table public.customers         alter column user_id type uuid using user_id::uuid;
--   alter table public.customer_visits   alter column user_id type uuid using user_id::uuid;
--   alter table public.customer_messages alter column user_id type uuid using user_id::uuid;
--   alter table public.customers         add constraint customers_user_id_fkey         foreign key (user_id) references auth.users(id) on delete cascade;
--   alter table public.customer_visits   add constraint customer_visits_user_id_fkey   foreign key (user_id) references auth.users(id) on delete cascade;
--   alter table public.customer_messages add constraint customer_messages_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
--   -- 정책은 20260420_crm.sql 의 RLS 절(auth.uid() = user_id) 을 그대로 다시 실행
--   -- 뷰는 20260420_crm.sql 의 my_customers 절 + 20260425_view_security_invoker.sql 다시 실행
--   commit;
--   (코드는 되돌릴 필요 없다 — 22P02 가 다시 나면 자동으로 env 연결 경로로 돌아간다)
-- ============================================================
