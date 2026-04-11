# Organization Account Setup Verification

## 🎯 Account Type Patterns

### ✅ **Correct Account States**

#### 1. Individual Account

```sql
user_type: "individual"
organization_id: null
```

- Personal account not part of any organization
- Can use team licenses but remains individual
- Example: `testing@professionalhealthnetwork.com`

#### 2. Organization Owner

```sql
user_type: "organization_owner"
organization_id: [valid_org_id]
```

- Owns and manages an organization
- Can purchase licenses, manage team members
- Has corresponding record in `organizations` table
- Example: `testorg7@gm.com`

#### 3. Organization Member

```sql
user_type: "organization_member"
organization_id: [valid_org_id]
```

- Part of an organization but not the owner
- Uses team licenses purchased by owner
- Has active record in `license_membership`

### ❌ **Invalid States (Fixed)**

- `organization_owner` with `organization_id: null` ❌
- `organization_member` with `organization_id: null` ❌

## 🔧 **Account Creation Flows**

### ✅ Single Flow: Individual Sign-Up → Dashboard Upgrade

**Step 1: Individual Sign-Up** (`/auth/sign-up`)

```typescript
1. Create Supabase auth user
2. Update users table: user_type = "individual"
3. Redirect to /protected dashboard
```

**Step 2: Optional Organization Upgrade** (`/protected/upgrade`)

```typescript
1. Validate user is individual/null type
2. Create organization record with owner_id
3. Update user: user_type = "organization_owner" + organization_id
4. Dashboard immediately shows organization features
```

### ❌ Removed: Separate Organization Sign-Up

- Deleted `/auth/organization/sign-up` page
- Organization login page now directs to individual sign-up
- Simplified UX: one sign-up path, upgrade in dashboard

## 🧪 **Verification Queries**

### Check Account States

```sql
SELECT
  u.email,
  u.user_type,
  u.organization_id,
  o.name as org_name,
  CASE
    WHEN u.user_type = 'organization_owner' AND u.organization_id IS NOT NULL THEN '✅ Valid org owner'
    WHEN u.user_type = 'organization_owner' AND u.organization_id IS NULL THEN '❌ Broken org owner'
    WHEN u.user_type = 'individual' AND u.organization_id IS NULL THEN '✅ Valid individual'
    WHEN u.user_type = 'organization_member' AND u.organization_id IS NOT NULL THEN '✅ Valid member'
    ELSE '⚠️ Check needed'
  END as status
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.user_type IS NOT NULL
ORDER BY u.user_type, u.email;
```

### Check License Ownership Patterns

```sql
SELECT
  l.code,
  l.type as license_type,
  u.email as purchased_by,
  u.user_type as purchaser_type,
  l.max_seats,
  (SELECT COUNT(*) FROM license_membership lm
   WHERE lm.license_id = l.id AND lm.is_active = true) as active_members
FROM license l
JOIN users u ON l.purchased_by = u.id
ORDER BY l.created_at DESC;
```

### Find Orphaned Organization Owners

```sql
SELECT u.email, u.user_type, u.organization_id
FROM users u
WHERE u.user_type = 'organization_owner'
  AND u.organization_id IS NULL;
```

## 🚀 **Dashboard Features by Account Type**

### Individual Account Dashboard

- ✅ Basic dashboard with page stats
- ✅ My Pages management
- ✅ Account settings
- ✅ **Upgrade to Organization** button
- ❌ No license management
- ❌ No team management

### Organization Owner Dashboard

- ✅ Enhanced dashboard with license stats
- ✅ My Pages management
- ✅ **License Management** - view/copy codes, see usage
- ✅ **Team Management** - revoke/restore member access
- ✅ **Subscription Management** - cancel/reactivate with Stripe
- ✅ Organization settings
- ❌ No upgrade button (already org owner)

### Organization Member Dashboard

- ✅ Basic dashboard with page stats
- ✅ My Pages management
- ✅ Organization info display
- ✅ Account settings
- ❌ No license management (not owner)
- ❌ No team management (not owner)
- ❌ No upgrade button (already in org)

## 🔍 **Testing Checklist**

### Individual Sign-Up Flow (Primary Path)

- [ ] Creates user in Supabase auth
- [ ] Sets `user_type = "individual"` (default)
- [ ] Redirects to `/protected` dashboard
- [ ] Dashboard shows individual features + upgrade option

### Individual → Organization Upgrade Flow (In Dashboard)

- [ ] Only allows individual accounts to upgrade
- [ ] Creates organization record
- [ ] Updates user type and organization_id atomically
- [ ] Shows success page with next steps
- [ ] Dashboard immediately shows organization features
- [ ] Navigation sidebar updates to show org management options

### License Purchase & Management

- [ ] Organization owners can purchase licenses
- [ ] Licenses show correct owner type in database
- [ ] Team members can redeem license codes
- [ ] Revocation works instantly in dashboard
- [ ] Mobile app respects revoked access

## 🛠 **Common Issues & Solutions**

### Issue: Organization owner with `organization_id = null`

**Cause:** Bug in previous organization sign-up flow (removed)
**Solution:** Use the dashboard upgrade flow instead

```sql
-- Clean up any broken accounts
UPDATE users SET user_type = 'individual'
WHERE user_type = 'organization_owner' AND organization_id IS NULL;
```

### Issue: Individual using team license shows as organization

**Expected:** This is correct! Individual accounts can use team licenses
**Database State:**

- `user_type = "individual"`
- `organization_id = null`
- Active record in `license_membership`

### Issue: Can't access organization features after upgrade

**Check:** Verify both `user_type` and `organization_id` are set
**Solution:** Dashboard layout checks both fields for navigation

## 📊 **Current Database State (Fixed)**

All test accounts are now properly configured:

**Individual Accounts:** ✅

- `testing@professionalhealthnetwork.com`
- `testuser@gmail.com`
- `testorg1@gm.com` (was broken, now fixed)

**Organization Owners:** ✅

- `testorg7@gm.com` → "Test" organization
- `testorg2@gm.com` → "testorg" organization
- `weberet@gmail.com` → "Ethans Awesome Org"

**Special Cases:** ✅

- `TEAMCROWNPAGE` license purchased by individual (manual setup, acceptable)

All organization flows are now working correctly! 🎉
