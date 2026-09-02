-- Supabase preview branches do not copy Storage objects or bucket metadata.
-- Crown Pages and Crown Network both use this public bucket for published page
-- media. Production already has the same bucket, so this is idempotent there.

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', TRUE)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
