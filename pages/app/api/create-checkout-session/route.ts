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
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Missing Stripe secret key' }, { status: 500 });
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' });
  const body = await req.json();
  const { stripe_price_id, seat_count, user_id, plan_id } = body;

  const supabase = await createClient();

  // Fetch user details from Supabase
  let organization_id = '';
  if (user_id) {
    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user_id)
      .maybeSingle();
    organization_id = userRow?.organization_id || '';
  }

  // Fetch plan details to check if it's tiered pricing
  const { data: planData, error: planError } = await supabase
    .from('plans_pricing')
    .select('*')
    .eq('id', plan_id)
    .single();

  if (planError || !planData) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
  }

  // Generate a unique license code
  let licenseCode = '';
  let isUnique = false;
  while (!isUnique) {
    licenseCode = generateLicenseCode();
    const { data: existing } = await supabase
      .from('license')
      .select('id')
      .eq('code', licenseCode)
      .maybeSingle();
    if (!existing) isUnique = true;
  }

  try {
    // Handle different pricing types
    let lineItems;

    if (planData.pricing_type === 'multi_line_item' && seat_count > 4) {
      // 5+ users: Base plan (first 4 users) + Additional users starting at the 5th
      const additionalUsers = seat_count - 4;

      // Get the additional user price ID
      const { data: additionalUserPlan, error: additionalUserError } = await supabase
        .from('plans_pricing')
        .select('stripe_price_id')
        .eq('pricing_type', 'additional_user')
        .single();

      if (additionalUserError || !additionalUserPlan) {
        return NextResponse.json({ error: 'Additional user pricing not found' }, { status: 400 });
      }

      lineItems = [
        {
          price: planData.stripe_price_id, // Base plan amount
          quantity: 1,
        },
        {
          price: additionalUserPlan.stripe_price_id, // Additional user price
          quantity: additionalUsers,
        },
      ];
    } else {
      // Fixed pricing for 1-4 users
      lineItems = [
        {
          price: stripe_price_id,
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      metadata: {
        user_id: user_id || '',
        organization_id,
        stripe_price_id: planData.pricing_type === 'multi_line_item' ? 'multi_line_item' : stripe_price_id,
        seat_count: seat_count,
        plan_id,
        license_code: licenseCode,
        pricing_type: planData.pricing_type,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?license_code=${licenseCode}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 