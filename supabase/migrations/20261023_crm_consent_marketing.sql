-- ============================================================
-- LU-018 W2-5 · CRM 광고 수신 동의 열 : customers.consent_marketing
-- ============================================================
--
-- 왜
--   · /customers 단체 메시지가 수신 동의 확인 없이 선택한 전원에게 준비됐다(동의 열 자체가 없었다).
--   · 손님 쪽 동의는 이미 stamp_collections.consent_marketing 에 받고 있다(스탬프 적립 화면).
--     고객 목록에도 같은 값을 두고 단체 메시지 대상에서 미동의 손님을 자동으로 뺀다.
--
-- 열
--   consent_marketing     boolean      기본 false — 모르면 미동의로 본다 (보내지 않는 쪽이 안전)
--   consent_marketing_at  timestamptz  동의를 받은 시각 (철회하면 null)
--   consent_source        text         'stamp'(손님이 적립 화면에서 체크) · 'owner_record'(사장님이 받아서 기록)
--
-- 순서 : 20261023_crm_owner_key_text.sql 다음에 실행한다 (서로 독립이라 이 파일만 먼저 돌아가도 문제는 없다)
-- 기존 행 : 운영 0행(2026-10-23 실측). 행이 있어도 전부 false 로 시작 → 동의 받은 손님만 사장님이 켜거나,
--           다음 스탬프 적립 때 손님 동의가 이어진다. 과거 동의를 추정해서 true 로 채우지 않는다.
--
-- 코드와의 관계 : /api/customers · app/lib/stamp-customer-sync.ts 는 이 열이 없으면(42703 · PGRST204)
--   열 없이 다시 시도한다 → 실행 전에도 깨지지 않고, 그동안 모든 고객은 미동의(메시지 대상 제외)로 보인다.
--
-- 실행 위치 : Supabase Dashboard → SQL Editor (대표 결재 후)
-- 문법 근거 : add column if not exists · check 제약 · 부분 인덱스는 20260420_crm.sql · 20260419_entitlements.sql 과 같은 형태
-- ============================================================

begin;

alter table public.customers add column if not exists consent_marketing    boolean     not null default false;
alter table public.customers add column if not exists consent_marketing_at timestamptz;
alter table public.customers add column if not exists consent_source       text;

alter table public.customers drop constraint if exists customers_consent_source_check;
alter table public.customers add  constraint customers_consent_source_check
  check (consent_source is null or consent_source in ('stamp', 'owner_record'));

-- 단체 메시지 대상 조회 (사장님별 동의 고객)
create index if not exists idx_customers_user_consent
  on public.customers(user_id)
  where consent_marketing = true;

commit;

notify pgrst, 'reload schema';

-- 확인 : select column_name, data_type, column_default from information_schema.columns
--         where table_schema='public' and table_name='customers' and column_name like 'consent%';   -- 3행
--
-- 되돌리기
--   begin;
--   drop index if exists public.idx_customers_user_consent;
--   alter table public.customers drop constraint if exists customers_consent_source_check;
--   alter table public.customers drop column if exists consent_source;
--   alter table public.customers drop column if exists consent_marketing_at;
--   alter table public.customers drop column if exists consent_marketing;
--   commit;
--   (코드는 그대로 둬도 된다 — 열이 없으면 자동으로 '전원 미동의' 로 돌아간다)
-- ============================================================
