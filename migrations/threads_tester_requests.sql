-- migrations/threads_tester_requests.sql
-- Threads 테스터 신청 테이블 (LU-018)
--   · 예전에는 app/api/threads/request-tester 가 요청마다 테이블이 없으면 서비스 키를 Bearer 로 붙여
--     Supabase 관리 API(api.supabase.com) 에 CREATE TABLE 을 보냈다. 관리 API 는 서비스 키가 아니라
--     개인 액세스 토큰을 받으므로 동작하지 않았고, 운영 코드가 실행 중에 DDL 을 시도하는 것 자체가 위험하다.
--   · 이제 테이블은 이 파일로 만든다. 운영 DB 적용은 결재(C) 뒤 SQL 편집기에서 한 번 실행한다.
CREATE TABLE IF NOT EXISTS public.threads_tester_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  instagram_id TEXT NOT NULL,
  store_name TEXT,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','rejected')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.threads_tester_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_full_tester_req" ON public.threads_tester_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
