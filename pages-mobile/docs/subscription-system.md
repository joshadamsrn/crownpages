# Subscription Management System

This document explains how to use the unified subscription management system that handles individual RevenueCat subscriptions, organization-based team licenses, and free trials.

## Overview

The subscription system provides a unified interface for managing user access to Pro features through three channels:

1. **Free Trials** - Automatic trials for new users with configurable duration
2. **Individual Subscriptions** - Direct in-app purchases via RevenueCat
3. **Organization Team Licenses** - Team licenses managed through organization ownership with license codes

## Key Changes - Organization-Based Licensing

### New Architecture

The subscription system has been refactored to use a **dynamic organization-based approach**:

- **No longer uses `public.users` columns** for subscription status determination
- Subscription status is determined **dynamically** by checking:
  1. RevenueCat entitlements for individual subscriptions
  2. Organization membership and parent license active status for team access
  3. Trial status from the `free_trials` table

### Organization Structure

- **Organizations**: Entities with owners who can purchase team licenses
- **Licenses**: Team subscriptions with seat limits purchased by organization owners
- **License Membership**: Active team member relationships to licenses
- **Parent License Active Status**: Only check if the parent license is active, not individual membership status

## Core Components

### 1. OrganizationService (`utils/organizationService.ts`)

New service that handles organization ownership and team membership:

```typescript
import { OrganizationService } from "../utils/organizationService";

// Check if user is organization owner
const { isOrgOwner, ownedOrgs } =
  await OrganizationService.getCurrentUserOrganizationStatus();

// Check team membership with Pro access
const teamAccess = await OrganizationService.hasProAccessViaTeamMembership();

// Check if user can manage licenses
const canManage = await OrganizationService.canManageLicenses();
```

### 2. SubscriptionService (`utils/subscriptionService.ts`)

Updated unified service that handles all subscription logic including trials and organization licensing:

```typescript
import { SubscriptionService } from "../utils/subscriptionService";

// Get comprehensive subscription info (includes trial and organization status)
const info = await SubscriptionService.getSubscriptionInfo();

// Check if user has Pro access (includes trial, individual, and team users)
const hasAccess = await SubscriptionService.hasProAccess();

// Redeem license code
const result = await SubscriptionService.redeemLicenseCode("ABC123");

// Purchase individual subscription
const result = await SubscriptionService.purchaseSubscription("pro_yearly_1");
```

### 3. SubscriptionContext (`contexts/SubscriptionContext.tsx`)

React context that provides real-time subscription state including organization information:

```typescript
import { useSubscription } from "../contexts/SubscriptionContext";

function MyComponent() {
  const {
    hasProAccess, // true for trial, individual, and team users
    isLoading,
    source, // 'trial' | 'individual' | 'license' | 'none'
    status, // 'trial' | 'active' | 'free' | 'expired' | 'cancelled'
    subscriptionInfo,
    isOnTrial, // true if user is on trial
    hasNoPlan, // true if user has no trial/subscription/license
    trialInfo, // trial-specific information
    daysRemainingInTrial,
    redeemLicenseCode,
    purchaseSubscription,
  } = useSubscription();

  if (isLoading) return <Loader />;

  return (
    <View>
      {hasProAccess ? (
        <ProFeature />
      ) : hasNoPlan ? (
        <Button onPress={() => router.push("/plans")}>Upgrade to Pro</Button>
      ) : (
        <Button onPress={() => router.push("/plans")}>Upgrade to Pro</Button>
      )}

      {isOnTrial && <Text>Trial ends in {daysRemainingInTrial} days</Text>}

      {source === "license" && <Text>Team License Active</Text>}
    </View>
  );
}
```

## Subscription States

### User Subscription Status

| Status    | Description                  | hasProAccess | Source                 | Actions Available             |
| --------- | ---------------------------- | ------------ | ---------------------- | ----------------------------- |
| `trial`   | User on free trial           | ✅           | `trial`                | Upgrade to individual/license |
| `active`  | Paid subscription active     | ✅           | `individual`/`license` | Manage subscription           |
| `free`    | Trial expired, now free plan | ❌           | `none`                 | Upgrade to pro                |
| `no_plan` | Legacy user without trial    | ❌           | `none`                 | Upgrade to pro                |
| `expired` | Subscription expired         | ❌           | `none`                 | Renew, upgrade                |

### Subscription Priorities

The system checks subscription sources in this priority order:

1. **Individual Subscription** (RevenueCat) - Highest priority
2. **Organization Team License** - Second priority (checks parent license active status)
3. **Active Trial** - Third priority
4. **No Plan** - Default state

When a user has multiple sources, the highest priority determines their access.

## Organization-Based Team Licensing

### Database Structure

```sql
-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- License table (team subscriptions)
CREATE TABLE license (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    max_seats INTEGER NOT NULL,
    purchased_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date TIMESTAMPTZ
);

-- License membership (team members)
CREATE TABLE license_membership (
    id UUID PRIMARY KEY,
    license_id UUID REFERENCES license(id),
    user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);
```

### How Team Licensing Works

1. **Organization Owner** purchases a team license with seat limit
2. **License Code** is generated for the team license
3. **Team Members** redeem the license code to join
4. **Pro Access** is determined by:
   - User has active membership (`license_membership.is_active = true`)
   - Parent license is active (`license.is_active = true`)
   - License hasn't expired (`license.expiry_date > now()`)

### Key Features

- **Seat Management**: Automatic seat counting and limit enforcement
- **Dynamic Status**: No database updates needed - status checked in real-time
- **Organization Ownership**: Only organization owners can manage licenses
- **Parent License Priority**: Team access depends on parent license being active

## Trial System

### Database Schema

The trial system uses a dedicated `free_trials` table that locks in trial settings when created:

```sql
CREATE TABLE public.free_trials (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    trial_duration_days INTEGER NOT NULL,
    trial_type TEXT NOT NULL DEFAULT 'free',
    trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ NOT NULL,
    trial_ended_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'converted', 'cancelled'
    trial_settings_snapshot JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    conversion_source TEXT,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Trial Management Functions

```sql
-- Create trial for user (automatically called on signup ONLY)
SELECT * FROM create_user_trial('user-uuid');

-- Get trial info for user
SELECT * FROM get_user_trial_info('user-uuid');

-- Expire trial (for cron jobs)
SELECT expire_trial('trial-uuid');

-- Convert trial to paid subscription
SELECT convert_trial('trial-uuid', 'individual');

-- Process all expired trials (for cron job)
SELECT * FROM process_expired_trials();
```

## Common Usage Patterns

### Checking Pro Access

```typescript
// In a component
const { hasProAccess, source } = useSubscription();

// In a utility function
const hasAccess = await SubscriptionService.hasProAccess();

// Check organization status
const orgStatus = await OrganizationService.getCurrentUserOrganizationStatus();
```

### Conditional Rendering Based on Subscription

```typescript
function MyComponent() {
  const {
    hasProAccess,
    isOnTrial,
    source,
    subscriptionInfo,
    hasNoPlan,
    daysRemainingInTrial,
  } = useSubscription();

  return (
    <View>
      {hasProAccess ? <ProFeature /> : <UpgradePrompt />}

      {isOnTrial && (
        <View>
          <Text>Trial: {daysRemainingInTrial} days left</Text>
          <Button onPress={() => router.push("/plans")}>Upgrade Now</Button>
        </View>
      )}

      {source === "license" && (
        <View>
          <Text>Team License Active</Text>
          <Text>License: {subscriptionInfo.licenseDetails?.licenseCode}</Text>
          <Text>
            Seats: {subscriptionInfo.licenseDetails?.currentSeats}/
            {subscriptionInfo.licenseDetails?.maxSeats}
          </Text>
        </View>
      )}

      {hasNoPlan && (
        <Button onPress={() => router.push("/plans")}>Start Free Trial</Button>
      )}
    </View>
  );
}
```

### Organization Management

```typescript
function OrganizationComponent() {
  const [orgStatus, setOrgStatus] = useState(null);

  useEffect(() => {
    const loadOrgStatus = async () => {
      const status =
        await OrganizationService.getCurrentUserOrganizationStatus();
      setOrgStatus(status);
    };
    loadOrgStatus();
  }, []);

  if (orgStatus?.isOrgOwner) {
    return <LicenseManagementPanel />;
  }

  if (orgStatus?.isTeamMember) {
    return <TeamMemberView memberships={orgStatus.teamMemberships} />;
  }

  return <IndividualUserView />;
}
```

### Handling License Redemption

```typescript
function RedeemCode() {
  const { redeemLicenseCode } = useSubscription();

  const handleRedeem = async (code: string) => {
    const result = await redeemLicenseCode(code);
    if (result.success) {
      // Subscription context automatically updates
      Alert.alert("Success", "You now have Pro access via team license!");
    }
  };
}
```

## Subscription Info Structure

```typescript
interface SubscriptionInfo {
  hasProAccess: boolean;
  source: "trial" | "individual" | "license" | "none";
  status: "trial" | "active" | "free" | "expired" | "cancelled";
  expiresAt?: string;
  willRenew?: boolean;

  // Trial details
  trialInfo?: {
    hasActiveTrial: boolean;
    trialId?: string;
    trialEndsAt?: string;
    daysRemaining?: number;
    trialDurationDays?: number;
    trialType?: string;
  };

  // Individual subscription details
  revenueCatDetails?: {
    planType: string;
    expirationDate: string | null;
    willRenew: boolean;
  };

  // Team license details
  licenseDetails?: {
    licenseCode: string;
    maxSeats: number;
    currentSeats: number;
    expiryDate: string | null;
  };
}
```

## Migration from Old System

### Key Changes Made

1. **Removed `public.users` columns dependency**:

   - No longer update `subscription_status`, `plan_type`, `subscription_source`
   - Status determined dynamically on each check

2. **Added organization-based licensing**:

   - Organization ownership through `organizations` table
   - Team licensing through `license` and `license_membership` tables
   - Parent license active status checking

3. **Simplified architecture**:
   - Dynamic status determination
   - Real-time organization membership checking
   - Reduced database writes and complexity

### Old vs New Pattern

Old pattern:

```typescript
// ❌ Old way - relied on database columns
const hasAccess = await RevenueCatService.hasProAccess(); // Checked users table
const licenseInfo = await LicenseService.getUserLicenseInfo(); // Checked users table
```

New pattern:

```typescript
// ✅ New way - dynamic organization-based checking
const { hasProAccess, source, subscriptionInfo } = useSubscription();
const orgStatus = await OrganizationService.getCurrentUserOrganizationStatus();
```

Benefits of new system:

- ✅ Real-time organization membership checking
- ✅ Simplified database schema (no subscription columns in users table)
- ✅ Better team license management
- ✅ Dynamic status determination
- ✅ Reduced database writes
- ✅ Clearer separation of concerns

## Integration Setup

### 1. Root App Setup

Already configured in `app/_layout.tsx`:

```typescript
<AuthProvider>
  <SubscriptionProvider>{/* Your app content */}</SubscriptionProvider>
</AuthProvider>
```

### 2. Using in Components

```typescript
import {
  useSubscription,
  useHasProAccess,
  useIsOnTrial,
  useHasNoPlan,
  useTrialInfo,
} from "../contexts/SubscriptionContext";

// Full context
const subscription = useSubscription();

// Convenience hooks
const hasProAccess = useHasProAccess();
const isOnTrial = useIsOnTrial();
const hasNoPlan = useHasNoPlan();
const trialInfo = useTrialInfo();
```

## Best Practices

### 1. Always Check Loading State

```typescript
const { hasProAccess, isLoading } = useSubscription();

if (isLoading) {
  return <Loader />;
}

// Now safe to use hasProAccess
```

### 2. Handle All Subscription Types

```typescript
const { subscriptionInfo, source, isOnTrial, hasNoPlan } = useSubscription();

if (source === "individual") {
  // Show individual subscription management
} else if (source === "license") {
  // Show team license info with organization details
} else if (isOnTrial) {
  // Show trial status and upgrade options
} else if (hasNoPlan) {
  // Show upgrade for legacy users
} else {
  // Show general upgrade options
}
```

### 3. Organization-Aware Features

```typescript
// Check organization status for license management features
const orgStatus = await OrganizationService.getCurrentUserOrganizationStatus();

if (orgStatus.isOrgOwner) {
  // Show license management UI
} else if (orgStatus.isTeamMember) {
  // Show team member UI
} else {
  // Show individual user UI
}
```

### 4. Real-time Updates

The subscription context automatically updates when:

- User signs up (trial created automatically)
- User redeems a license code (joins team)
- User purchases a subscription
- User restores purchases
- Trial expires (on next app open)
- Organization membership changes

No manual refresh needed - components re-render automatically.

## Troubleshooting

### Subscription not updating after redemption/purchase

The system should update automatically. If it doesn't:

```typescript
const { refreshSubscription } = useSubscription();
await refreshSubscription();
```

### Team license access issues

Check organization status:

```typescript
// Debug organization membership
const orgStatus = await OrganizationService.getCurrentUserOrganizationStatus();
console.log("Organization status:", orgStatus);

// Debug team access specifically
const teamAccess = await OrganizationService.hasProAccessViaTeamMembership();
console.log("Team access:", teamAccess);
```

### Checking current subscription state

```typescript
// Get current cached info (synchronous)
const currentInfo = SubscriptionService.getCurrentInfo();

// Force refresh (asynchronous)
const freshInfo = await SubscriptionService.refreshSubscriptionStatus();
```
