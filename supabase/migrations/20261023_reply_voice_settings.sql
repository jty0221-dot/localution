-- LU-018 W2-10 · 답글 말투 설정 — 계정 하나의 서버 저장
-- Proposal only; production execution requires separate approval (태형 결재 C).
--
-- 왜 새 테이블인가 : 기존 서버 저장은 platform_credentials.extra_data(autoreply_*) 뿐인데
-- 매체마다 한 줄이고 매체를 연결해야만 행이 생긴다 → 계정 단위 말투를 둘 자리가 없다.
-- user_notification_prefs 는 uuid 키 · 알림 전용 컬럼이라 재사용하지 않는다.
-- user_id 는 다른 사용자 테이블(platform_credentials 등)과 같이 text (2026_05_03_user_id_text 관례).
--
-- 실행 전 동작 : /api/reply-voice 는 이 테이블이 없으면 storage='missing' 으로 답하고
-- 화면은 '서버 저장 준비 전' 이라고 밝힌다 (저장된 척하지 않는다).
CREATE TABLE IF NOT EXISTS public.reply_voice_settings (
  user_id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 편집기 브라우저 값을 처음 한 번 옮겼는지 (중복 이관 방지 · 감사용)
  migrated_from_browser_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reply_voice_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reply_voice_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reply_voice_settings TO service_role;
-- Rollback: drop the table public.reply_voice_settings (말투 설정만 사라지고 편집기는 기본값으로 동작)
