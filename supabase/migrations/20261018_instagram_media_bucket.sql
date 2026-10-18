-- Proposal only. No production execution without approval.
-- Existing threads-media settings and objects are untouched.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('instagram-media', 'instagram-media', true, 104857600, ARRAY['image/jpeg','video/mp4'])
ON CONFLICT (id) DO NOTHING;
-- No anonymous/authenticated write policy is added. Server-issued signed uploads only.
-- Public media is used only after explicit user consent; do not put private files here.
