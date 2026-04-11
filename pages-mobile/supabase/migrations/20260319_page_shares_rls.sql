-- ============================================================
-- page_shares RLS Policies
--
-- Controls who can read, create, update, and delete rows
-- in the page_shares table.
--
-- Run this in the Supabase SQL Editor or via the CLI:
--   supabase db push
-- ============================================================

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "page_shares_select" ON page_shares;
DROP POLICY IF EXISTS "page_shares_insert" ON page_shares;
DROP POLICY IF EXISTS "page_shares_update" ON page_shares;
DROP POLICY IF EXISTS "page_shares_delete" ON page_shares;

-- Enable RLS (idempotent — safe to run even if already enabled)
ALTER TABLE page_shares ENABLE ROW LEVEL SECURITY;

-- SELECT: page owner OR the recipient (by email match)
CREATE POLICY "page_shares_select"
ON page_shares FOR SELECT
USING (
  page_id IN (SELECT id FROM pages WHERE created_by = auth.uid())
  OR lower(shared_with_email) = (SELECT lower(email) FROM users WHERE id = auth.uid())
);

-- INSERT: only the page owner can share their page
CREATE POLICY "page_shares_insert"
ON page_shares FOR INSERT
WITH CHECK (
  shared_by = auth.uid()
  AND page_id IN (SELECT id FROM pages WHERE created_by = auth.uid())
);

-- UPDATE: only the page owner can change permissions
CREATE POLICY "page_shares_update"
ON page_shares FOR UPDATE
USING (
  page_id IN (SELECT id FROM pages WHERE created_by = auth.uid())
);

-- DELETE: only the page owner can remove shares
CREATE POLICY "page_shares_delete"
ON page_shares FOR DELETE
USING (
  page_id IN (SELECT id FROM pages WHERE created_by = auth.uid())
);
