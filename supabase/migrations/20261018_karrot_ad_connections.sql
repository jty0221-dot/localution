-- Proposal only; production execution requires separate approval.
CREATE TABLE IF NOT EXISTS public.karrot_ad_connections (
  user_id text PRIMARY KEY,
  advertiser_id text NOT NULL,
  encrypted_key jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.karrot_ad_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.karrot_ad_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.karrot_ad_connections TO service_role;
-- Rollback: export encrypted rows to approved private backup first, then DROP TABLE public.karrot_ad_connections;
