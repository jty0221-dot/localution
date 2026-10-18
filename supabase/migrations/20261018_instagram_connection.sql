-- REVIEW DRAFT: not executed. Dedicated server-only OAuth and publication records.
BEGIN;
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
 user_id text PRIMARY KEY,
 instagram_user_id text NOT NULL,
 username text NOT NULL,
 encrypted_token jsonb NOT NULL,
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.instagram_publications (
 id uuid PRIMARY KEY,
 user_id text NOT NULL,
 instagram_user_id text NOT NULL,
 media_type text NOT NULL CHECK (media_type IN ('IMAGE','REELS')),
 media_url text NOT NULL,
 caption text NOT NULL CHECK (length(caption) <= 2200),
 status text NOT NULL CHECK (status IN ('preparing','prepare_failed','prepared','publishing','published_unverified','reconciliation_required','verified')),
 container_id text,
 media_id text,
 permalink text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS instagram_publications_owner_created ON public.instagram_publications(user_id, created_at DESC);
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_accounts, public.instagram_publications FROM anon, authenticated;
GRANT ALL ON public.instagram_accounts, public.instagram_publications TO service_role;
COMMIT;
-- Rollback is deliberately not executable here: disable application routes first,
-- preserve encrypted accounts and publication receipts, then review a separate archival plan.
