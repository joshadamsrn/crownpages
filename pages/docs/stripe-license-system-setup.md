# Stripe License System Setup & Architecture

## Overview

Crown Pages uses a comprehensive Stripe-based license system for organization subscriptions. Users purchase licenses on the web app, manage subscriptions through an enhanced dashboard, and team members redeem license codes on mobile devices to access the platform.

## System Architecture

```
Web App (Purchase) → Stripe Checkout → License Generation → Dashboard Management → Mobile App (Redemption)
```

### Key Components:

- **Web App**: License purchasing interface at `/organization/plans`
- **Enhanced Dashboard**: Complete subscription and team management portal
- **Stripe**: Payment processing and subscription management
- **Supabase**: License storage and user management
- **Mobile App**: License code redemption and team access

---

## 1. Initial Stripe Setup

### 1.1 Create Stripe Account

1. Create a new Stripe account at [stripe.com](https://stripe.com)
2. Complete business verification
3. Note your **Account ID** (starts with `acct_`)

### 1.2 Environment Variables

Set up the following environment variables:

```env
# Stripe Keys (Test/Live)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL for redirects
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 1.3 Enhanced Webhook Setup

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed` ✨ _Original_
   - `customer.subscription.updated` ✨ _New_
   - `customer.subscription.deleted` ✨ _New_
   - `invoice.payment_failed` ✨ _New_
   - `invoice.payment_succeeded` ✨ _New_
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

**Why these events?**

- `checkout.session.completed`: Creates licenses after purchase
- `customer.subscription.updated`: Handles cancellations/reactivations
- `customer.subscription.deleted`: Permanently deactivates licenses
- `invoice.payment_failed`: Tracks payment issues
- `invoice.payment_succeeded`: Reactivates after successful payment

---

## 2. Product & Price Creation

### 2.1 Create Main Product

Use Stripe MCP tool or manually in dashboard:

```typescript
// Product: "Crown Pages License"
{
  name: "Crown Pages License",
  description: "Dynamic page building platform for teams and organizations"
}
```

### 2.2 Create Pricing Structure

#### Fixed Pricing Tiers (1-4 Users)

Create these recurring yearly prices:

| Users   | Annual Price | Description      |
| ------- | ------------ | ---------------- |
| 1 User  | $69/year     | Single user plan |
| 2 Users | $126/year    | Small team       |
| 3 Users | $169/year    | Growing team     |
| 4 Users | $199/year    | Medium team      |

#### Multi-Line Pricing (5+ Users)

Create these recurring yearly prices:

| Component       | Price     | Description             |
| --------------- | --------- | ----------------------- |
| Base Plan       | $199/year | Covers first 5 users    |
| Additional User | $49/year  | Per extra user beyond 5 |

### 2.3 Example Stripe Price Creation

```bash
# Using Stripe CLI
stripe prices create \
  --unit-amount=6900 \
  --currency=usd \
  --product=prod_YourProductId \
  --recurring='{"interval":"year"}' \
  --nickname="1 User Plan"
```

---

## 3. Database Configuration

### 3.1 Plans Pricing Table Structure

```sql
CREATE TABLE plans_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_seats INTEGER NOT NULL,
  max_seats INTEGER, -- NULL for unlimited
  base_price DECIMAL(10,2) NOT NULL,
  additional_price DECIMAL(10,2), -- For tiered pricing
  stripe_price_id TEXT,
  pricing_type TEXT DEFAULT 'fixed', -- 'fixed', 'multi_line_item', 'additional_user'
  interval_type TEXT DEFAULT 'yearly',
  interval_count INTEGER DEFAULT 12,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Enhanced License Table Structure

```sql
CREATE TABLE license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  max_seats INTEGER NOT NULL,
  plan_pricing_id UUID REFERENCES plans_pricing(id),
  purchased_by UUID REFERENCES users(id),
  stripe_price_id TEXT,
  stripe_subscription_id TEXT,
  is_active BOOLEAN DEFAULT true,
  type TEXT, -- 'individual' or 'organization'
  expiry_date TIMESTAMP,
  deactivation_reason TEXT, -- 'subscription_canceled', 'subscription_deleted', 'manual', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Sample Data Population

```sql
-- Fixed pricing plans (1-4 users)
INSERT INTO plans_pricing (min_seats, max_seats, base_price, stripe_price_id, pricing_type, description) VALUES
(1, 1, 69, 'price_1RotprB8gk9fQCgxwY4LPNXX', 'fixed', 'Annual Plan - Single User'),
(2, 2, 126, 'price_1RotpsB8gk9fQCgxUGbuqCWv', 'fixed', 'Annual Plan - 2 Users'),
(3, 3, 169, 'price_1RotptB8gk9fQCgxzywQmjJO', 'fixed', 'Annual Plan - 3 Users'),
(4, 4, 199, 'price_1Rou4MB8gk9fQCgxH8pcj0nU', 'fixed', 'Annual Plan - 4 Users');

-- Multi-line pricing (5+ users)
INSERT INTO plans_pricing (min_seats, max_seats, base_price, additional_price, stripe_price_id, pricing_type, description) VALUES
(5, NULL, 199, 49, 'price_1Rou1WB8gk9fQCgxKQWERB8M', 'multi_line_item', 'Annual Plan - 5+ Users (Base: $199 for 5 users + $49/additional user)');

-- Additional user pricing component
INSERT INTO plans_pricing (min_seats, max_seats, base_price, stripe_price_id, pricing_type, description) VALUES
(1, 1, 49, 'price_1Rou1tB8gk9fQCgxV5pK4WdL', 'additional_user', 'Additional User (for 5+ user plans)');
```

---

## 4. Pricing Logic & Calculations

### 4.1 Frontend Price Calculation

```typescript
function calculatePrice(seatCount: number, plans: Plan[]) {
  if (seatCount <= 0 || plans.length === 0) return 0;

  const plan = plans.find(
    (p) =>
      seatCount >= p.min_seats &&
      (p.max_seats === null || seatCount <= p.max_seats)
  );

  if (!plan) return 0;

  // Tiered pricing for 5+ users
  if (
    plan.pricing_type === "multi_line_item" &&
    plan.additional_price &&
    seatCount > 5
  ) {
    return plan.base_price + (seatCount - 5) * plan.additional_price;
  }

  return plan.base_price;
}
```

### 4.2 Pricing Examples

| Users | Calculation       | Annual Cost |
| ----- | ----------------- | ----------- |
| 1     | Fixed             | $69         |
| 2     | Fixed             | $126        |
| 3     | Fixed             | $169        |
| 4     | Fixed             | $199        |
| 5     | Base plan         | $199        |
| 7     | $199 + (2 × $49)  | $297        |
| 10    | $199 + (5 × $49)  | $444        |
| 20    | $199 + (15 × $49) | $934        |

---

## 5. Checkout Flow

### 5.1 Web App Purchase Process

1. **User Selection**: User visits `/organization/plans`
2. **Seat Selection**: Choose number of team members
3. **Price Calculation**: Frontend calculates total cost
4. **Checkout Creation**: POST to `/api/create-checkout-session`
5. **Stripe Redirect**: User redirected to Stripe Checkout
6. **Payment Processing**: Stripe handles payment
7. **Webhook Processing**: License created via webhook
8. **Success Redirect**: User sees license code

### 5.2 Checkout Session Creation Logic

```typescript
// Fixed pricing (1-4 users)
if (planData.pricing_type === "fixed") {
  lineItems = [
    {
      price: stripe_price_id,
      quantity: 1,
    },
  ];
}

// Multi-line pricing (5+ users)
if (planData.pricing_type === "multi_line_item" && seat_count > 5) {
  const additionalUsers = seat_count - 5;
  lineItems = [
    {
      price: planData.stripe_price_id, // Base 5-user plan
      quantity: 1,
    },
    {
      price: additionalUserPlan.stripe_price_id, // Additional users
      quantity: additionalUsers,
    },
  ];
}
```

### 5.3 License Code Generation

```typescript
function generateLicenseCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

---

## 6. Enhanced Webhook Processing

### 6.1 Multi-Event Handler Structure

```typescript
export async function POST(req: NextRequest) {
  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(
    rawBody,
    sig,
    STRIPE_WEBHOOK_SECRET
  );

  // Handle different webhook events
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, supabase);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, supabase);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, supabase);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object, supabase);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object, supabase);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### 6.2 Subscription Update Handler

```typescript
async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  const updates: any = {};

  if (subscription.status === "canceled") {
    updates.is_active = false;
    updates.deactivation_reason = "subscription_canceled";
  } else if (subscription.status === "active") {
    updates.is_active = true;
    updates.deactivation_reason = null;
  }

  // If subscription is set to cancel at period end, keep active until then
  if (subscription.cancel_at_period_end && subscription.status === "active") {
    updates.is_active = true;
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("license")
      .update(updates)
      .eq("stripe_subscription_id", subscription.id);
  }
}
```

---

## 7. New API Endpoints ✨

### 7.1 Subscription Management APIs

#### Get Subscription Details

```typescript
// GET /api/stripe/subscription/[id]
// Returns full subscription object with pricing details
```

#### Cancel Subscription (at period end)

```typescript
// POST /api/stripe/subscription/[id]/cancel
// Sets cancel_at_period_end = true, keeps access until billing period ends
```

#### Reactivate Subscription

```typescript
// POST /api/stripe/subscription/[id]/reactivate
// Removes cancel_at_period_end flag, continues subscription
```

### 7.2 Usage Examples

```typescript
// Cancel subscription
const response = await fetch(
  `/api/stripe/subscription/${subscriptionId}/cancel`,
  {
    method: "POST",
  }
);

// Reactivate subscription
const response = await fetch(
  `/api/stripe/subscription/${subscriptionId}/reactivate`,
  {
    method: "POST",
  }
);
```

---

## 8. Enhanced Dashboard Features ✨

### 8.1 Dashboard Architecture

```
/protected/
├── dashboard (overview with stats)
├── upgrade (individual → organization)
├── licenses (license management)
├── team (member management + revocation)
├── subscriptions (billing management)
├── pages (page editing portal)
└── settings (account settings)
```

### 8.2 License Management Dashboard

**Features:**

- View all purchased licenses with usage stats
- Copy license codes for team sharing
- See team members using each license
- Monitor subscription status and renewal dates
- Quick access to Stripe dashboard

### 8.3 Team Management Dashboard

**Features:**

- View all team members across licenses
- **Revoke/restore access** for individual members
- Advanced filtering by license and status
- Member activity tracking (join dates, usage)
- Seat utilization analytics

### 8.4 Subscription Management Dashboard

**Features:**

- Real-time subscription status from Stripe
- **Cancel at period end** (maintains access until renewal)
- **Reactivate cancelled subscriptions**
- Payment status monitoring (failed, past due)
- Renewal reminders and billing breakdown

---

## 9. Mobile App Integration

### 9.1 License Redemption Flow

```
Mobile App → Enter License Code → Validate → Join Organization → Access Granted
```

### 9.2 Enhanced License Validation API

```typescript
// Endpoint: /api/mobile/validate-license
export async function POST(req: NextRequest) {
  const { license_code, user_id } = await req.json();

  // Check license validity and active status
  const { data: license } = await supabase
    .from("license")
    .select("*")
    .eq("code", license_code)
    .eq("is_active", true) // Only allow active licenses
    .single();

  if (!license) {
    return NextResponse.json({ error: "Invalid or inactive license code" });
  }

  // Check seat availability
  const { data: currentMembers } = await supabase
    .from("license_membership")
    .select("id")
    .eq("license_id", license.id)
    .eq("is_active", true);

  if (currentMembers.length >= license.max_seats) {
    return NextResponse.json({ error: "License at maximum capacity" });
  }

  // Add user to license membership
  await supabase.from("license_membership").insert({
    license_id: license.id,
    user_id: user_id,
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, license });
}
```

### 9.3 Revocation Handling

When access is revoked via dashboard:

```typescript
// Update license_membership
await supabase
  .from("license_membership")
  .update({ is_active: false })
  .eq("id", membershipId);

// Mobile app should check membership status on app launch
```

---

## 10. Testing & Verification

### 10.1 Enhanced Test Scenarios

1. **Purchase Flow Testing**

   - Single user purchase (1-4 users)
   - Multi-user purchase (5+ users)
   - License code generation and validity

2. **Subscription Management Testing**

   - Cancel subscription (verify cancel_at_period_end)
   - Reactivate cancelled subscription
   - Webhook event processing

3. **Team Management Testing**

   - License redemption on mobile
   - Member revocation from dashboard
   - Seat limit enforcement

4. **Payment Scenarios**
   - Failed payment handling
   - Successful payment reactivation
   - Subscription deletion

### 10.2 Webhook Testing

```bash
# Test webhook events using Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### 10.3 Dashboard Testing Checklist

- [ ] License management UI shows correct data
- [ ] Team member revocation works instantly
- [ ] Subscription cancellation sets cancel_at_period_end
- [ ] Reactivation removes cancellation flag
- [ ] Payment status reflects in dashboard
- [ ] Mobile redemption respects revoked access

---

## 11. Migration Guide

### 11.1 Updating Existing Stripe Webhooks

**If you have an existing webhook:**

1. **Add new events** to existing webhook:

   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`

2. **Deploy updated webhook handler** (the one we created above)

3. **Test with Stripe CLI** to ensure all events work

**Don't create a new webhook** - extend the existing one for simplicity.

### 11.2 Database Migration

```sql
-- Add deactivation_reason column if not exists
ALTER TABLE license ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Create license_membership table if not exists
CREATE TABLE IF NOT EXISTS license_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES license(id),
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_id, user_id)
);
```

---

## 12. Monitoring & Troubleshooting

### 12.1 Webhook Event Monitoring

```sql
-- Check recent webhook processing
SELECT
  stripe_subscription_id,
  is_active,
  deactivation_reason,
  updated_at
FROM license
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

### 12.2 Subscription Status Debugging

```sql
-- Find licenses with subscription issues
SELECT
  l.code,
  l.stripe_subscription_id,
  l.is_active,
  l.deactivation_reason,
  COUNT(lm.id) as active_members
FROM license l
LEFT JOIN license_membership lm ON l.id = lm.license_id AND lm.is_active = true
WHERE l.stripe_subscription_id IS NOT NULL
GROUP BY l.id;
```

### 12.3 Common Issues

**"Webhook not receiving events"**

- Verify webhook URL is accessible
- Check webhook secret matches
- Ensure all required events are selected

**"Subscription status not updating"**

- Check webhook logs for errors
- Verify subscription ID matches in database
- Test webhook events manually

**"Team member access not revoked"**

- Check license_membership table updates
- Verify mobile app checks membership status
- Test revocation flow end-to-end

---

## 13. Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Access Control**: Verify user permissions before subscription operations
3. **Rate Limiting**: Implement limits on API endpoints
4. **Audit Logging**: Track all license and subscription changes
5. **Team Member Validation**: Ensure only active members can access resources

---

## Summary of New Features ✨

### 🚀 **Dashboard Enhancements**

- Complete license management with team usage stats
- Team member management with revocation capabilities
- Real-time subscription management with Stripe integration
- Individual to organization account upgrades

### 🔧 **API Enhancements**

- Subscription cancellation and reactivation endpoints
- Enhanced webhook processing for subscription lifecycle
- Team member management APIs

### 📱 **Mobile Integration**

- Respects revoked access instantly
- Enhanced license validation with membership tracking
- Proper seat limit enforcement

This comprehensive setup provides organization owners with complete control over their licenses, team members, and subscriptions while maintaining seamless mobile app integration! 🎉
