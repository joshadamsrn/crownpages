import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
        }
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-06-30.basil' });
        const supabase = await createClient();

        // Verify user is authenticated and is an admin/owner
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Setting up Stripe Customer Portal configuration...');

        // Create a customer portal configuration
        const configuration = await stripe.billingPortal.configurations.create({
            features: {
                customer_update: {
                    enabled: true,
                    allowed_updates: ['email', 'name', 'tax_id'],
                },
                invoice_history: {
                    enabled: true,
                },
                payment_method_update: {
                    enabled: true,
                },
                subscription_cancel: {
                    enabled: true,
                    mode: 'at_period_end',
                    cancellation_reason: {
                        enabled: true,
                        options: [
                            'too_expensive',
                            'missing_features',
                            'switched_service',
                            'unused',
                            'other'
                        ],
                    },
                },
                subscription_update: {
                    enabled: true,
                    default_allowed_updates: ['price', 'quantity'],
                    proration_behavior: 'create_prorations',
                },
            },
            business_profile: {
                headline: 'Manage your CrownPages subscription and billing',
                privacy_policy_url: `${req.nextUrl.origin}/privacy-policy`,
                terms_of_service_url: `${req.nextUrl.origin}/terms-of-service`,
            },
            default_return_url: `${req.nextUrl.origin}/protected/licenses`,
        });

        console.log('Customer Portal configuration created:', configuration.id);

        return NextResponse.json({
            success: true,
            configuration_id: configuration.id,
            message: 'Customer Portal configuration created successfully'
        });

    } catch (error) {
        console.error('Error setting up customer portal configuration:', error);
        return NextResponse.json(
            {
                error: 'Failed to setup portal configuration',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 
