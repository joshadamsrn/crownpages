import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function generateLicenseCode(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing Stripe env vars' }, { status: 500 });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' });
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Create service role client that bypasses RLS
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Handle different webhook events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object, supabase);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object, supabase);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object, supabase);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object, supabase);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object, supabase);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Original checkout completion handler
async function handleCheckoutCompleted(session: any, supabase: any) {
  const user_id = session.metadata?.user_id;
  const organization_id = session.metadata?.organization_id;
  const plan_pricing_id = session.metadata?.plan_id;
  const seat_count = parseInt(session.metadata?.seat_count || '1', 10);
  const stripe_price_id = session.metadata?.stripe_price_id;
  const subscriptionId = (session.subscription as string | undefined) || session.id;
  let license_code = session.metadata?.license_code;

  console.log('Processing checkout completion for session:', session.id);
  console.log('User ID:', user_id);
  console.log('Subscription ID:', subscriptionId);
  console.log('License Code:', license_code);

  try {
    // Check if license already exists for this subscription
    const { data: existing, error: findError } = await supabase
      .from('license')
      .select('id, code')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (findError) {
      console.error('Error checking for existing license:', findError);
      throw new Error(`Database error while checking for existing license: ${findError.message}`);
    }

    console.log("Existing license check result:", existing);

    if (!existing) {
      // Create license
      license_code = license_code || generateLicenseCode();
      console.log("Creating new license with code:", license_code);

      const licenseData = {
        code: license_code,
        max_seats: seat_count,
        plan_pricing_id,
        purchased_by: user_id,
        stripe_price_id,
        stripe_subscription_id: subscriptionId,
        is_active: true,
        type: 'organization',
      };

      console.log("License data to insert:", licenseData);

      const { data: insertedLicense, error: insertError } = await supabase
        .from('license')
        .insert(licenseData)
        .select('id, code')
        .single();

      if (insertError) {
        console.error('CRITICAL: Failed to create license after payment!', {
          error: insertError,
          session_id: session.id,
          user_id,
          subscription_id: subscriptionId,
          license_code,
          license_data: licenseData
        });

        // This is critical - customer paid but didn't get license
        // Log for manual resolution
        console.error('MANUAL INTERVENTION REQUIRED: Customer paid but license creation failed');
        throw new Error(`Failed to create license: ${insertError.message}`);
      }

      console.log('Successfully created license:', insertedLicense);
    } else {
      console.log('License already exists for this subscription:', existing);
    }
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error);
    // Re-throw to ensure the webhook returns an error status
    // This will cause Stripe to retry the webhook
    throw error;
  }
}

// Handle subscription updates (cancellations, reactivations, etc.)
async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('Subscription updated:', subscription.id);

  // Update license status based on subscription status
  const updates: any = {};

  if (subscription.status === 'canceled') {
    updates.is_active = false;
    updates.deactivation_reason = 'subscription_canceled';
  } else if (subscription.status === 'active') {
    updates.is_active = true;
    updates.deactivation_reason = null;
  }

  // If subscription is set to cancel at period end, we don't deactivate yet
  if (subscription.cancel_at_period_end && subscription.status === 'active') {
    // Keep license active but could add a flag for "canceling"
    updates.is_active = true;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('license')
      .update(updates)
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating license status:', error);
    }
  }
}

// Handle subscription deletion (permanent cancellation)
async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('Subscription deleted:', subscription.id);

  // Deactivate license permanently
  const { error } = await supabase
    .from('license')
    .update({
      is_active: false,
      deactivation_reason: 'subscription_deleted',
      expiry_date: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error deactivating license:', error);
  }

  // Optionally deactivate all team member access
  const { data: license } = await supabase
    .from('license')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (license) {
    await supabase
      .from('license_membership')
      .update({ is_active: false })
      .eq('license_id', license.id);
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice: any, supabase: any) {
  console.log('Payment failed for subscription:', invoice.subscription);

  // You might want to send notifications, update status, etc.
  // For now, we'll just log it - the subscription status will be updated
  // via subscription.updated webhook

  // Could implement email notifications here
  // Could update a payment_status field if you have one
}

// Handle successful payments
async function handlePaymentSucceeded(invoice: any, supabase: any) {
  console.log('Payment succeeded for subscription:', invoice.subscription);

  // Ensure license is active after successful payment
  if (invoice.subscription) {
    const { error } = await supabase
      .from('license')
      .update({
        is_active: true,
        deactivation_reason: null
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error reactivating license after payment:', error);
    }
  }
} 