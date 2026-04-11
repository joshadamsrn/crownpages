-- ============================================================
-- Business Members — Pending Invite Support
--
-- Allows adding a team member by email even if they don't have
-- a Crown Pages account yet. When they sign up, they're
-- automatically linked.
--
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- 1. Add invited_email column and make user_id nullable
ALTER TABLE business_members
  ADD COLUMN IF NOT EXISTS invited_email text,
  ALTER COLUMN user_id DROP NOT NULL;

-- Backfill invited_email from the joined users table for existing rows
UPDATE business_members bm
SET invited_email = u.email
FROM users u
WHERE bm.user_id = u.id
  AND bm.invited_email IS NULL;

-- 2. Update is_business_member() to also match by email (for pending invites)
CREATE OR REPLACE FUNCTION is_business_member(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = bid
      AND (
        user_id = auth.uid()
        OR invited_email = (
          SELECT email FROM users WHERE id = auth.uid()
        )
      )
  );
$$;

-- 3. Trigger: when a new user row is inserted, auto-link any pending invites
CREATE OR REPLACE FUNCTION link_pending_business_member_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_members
  SET user_id = NEW.id
  WHERE
    user_id IS NULL
    AND lower(invited_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created_link_invites ON users;
CREATE TRIGGER on_user_created_link_invites
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION link_pending_business_member_invites();

-- 4. RLS: allow insert of pending invites (user_id may be null)
-- The existing insert policy checks business ownership — no change needed
-- as long as the owner's RLS policy allows inserting rows for their business.
-- Verify the select policy on business_members allows reading pending rows:
DROP POLICY IF EXISTS "business_members_select" ON business_members;
CREATE POLICY "business_members_select"
ON business_members FOR SELECT
USING (
  -- Owner of the business can see all members
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
  -- Member can see their own row (by user_id or pending email)
  OR user_id = auth.uid()
  OR lower(invited_email) = (
    SELECT lower(email) FROM users WHERE id = auth.uid()
  )
);
