-- ============================================================
-- Team Member RLS Policies
-- Allows business members to read pages + analytics for
-- businesses they've been added to, without edit/delete access.
--
-- Run this in the Supabase SQL Editor or via the CLI:
--   supabase db push
-- ============================================================

-- Helper: returns true if the current user is a member of the given business
CREATE OR REPLACE FUNCTION is_business_member(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = bid
      AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- PAGES table
-- ============================================================

-- Drop existing select policy if it only covers owners
DROP POLICY IF EXISTS "Users can view their own pages" ON pages;
DROP POLICY IF EXISTS "Team members can view shared pages" ON pages;

-- Single combined SELECT policy: owner OR team member
CREATE POLICY "pages_select_owner_or_member"
ON pages FOR SELECT
USING (
  auth.uid() = created_by
  OR is_business_member(business_id)
);

-- INSERT / UPDATE / DELETE stay owner-only (no changes needed if already restricted)
-- If you have a broad insert policy, tighten it:
DROP POLICY IF EXISTS "Team members can insert pages" ON pages;
DROP POLICY IF EXISTS "pages_insert_owner_only" ON pages;
CREATE POLICY "pages_insert_owner_only"
ON pages FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "pages_update_owner_only" ON pages;
CREATE POLICY "pages_update_owner_only"
ON pages FOR UPDATE
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "pages_delete_owner_only" ON pages;
CREATE POLICY "pages_delete_owner_only"
ON pages FOR DELETE
USING (auth.uid() = created_by);

-- ============================================================
-- ANALYTICS_EVENTS table
-- ============================================================

DROP POLICY IF EXISTS "Users can view analytics for their pages" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_owner_or_member" ON analytics_events;

CREATE POLICY "analytics_events_select_owner_or_member"
ON analytics_events FOR SELECT
USING (
  page_id IN (
    SELECT id FROM pages
    WHERE created_by = auth.uid()
       OR is_business_member(business_id)
  )
);

-- ============================================================
-- SHARE_LINKS table (so team members can copy/use share links)
-- ============================================================

DROP POLICY IF EXISTS "share_links_select_owner_or_member" ON share_links;

CREATE POLICY "share_links_select_owner_or_member"
ON share_links FOR SELECT
USING (
  page_id IN (
    SELECT id FROM pages
    WHERE created_by = auth.uid()
       OR is_business_member(business_id)
  )
);

-- ============================================================
-- TRACKABLE_LINKS table
-- ============================================================

DROP POLICY IF EXISTS "trackable_links_select_owner_or_member" ON trackable_links;

CREATE POLICY "trackable_links_select_owner_or_member"
ON trackable_links FOR SELECT
USING (
  page_id IN (
    SELECT id FROM pages
    WHERE created_by = auth.uid()
       OR is_business_member(business_id)
  )
);
