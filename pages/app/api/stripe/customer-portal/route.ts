import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('Customer portal error: User not authenticated');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscriptionId } = await req.json();

        if (!subscriptionId) {
            console.error('Customer portal error: No subscription ID provided');
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        console.log('Creating customer portal session for subscription:', subscriptionId);

        // Get the subscription to find the customer ID
        let subscription;
        try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
            console.log('Retrieved subscription:', {
                id: subscription.id,
                customer: subscription.customer,
                status: subscription.status
            });
        } catch (error) {
            console.error('Error retrieving subscription:', error);
            return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
        }

        if (!subscription.customer) {
            console.error('No customer associated with subscription:', subscriptionId);
            return NextResponse.json({ error: 'No customer associated with this subscription' }, { status: 400 });
        }

        const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        console.log('Creating portal session for customer:', customerId);

        // Create a customer portal session
        let session;
        try {
            session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${req.nextUrl.origin}/protected/licenses`,
            });
            console.log('Created portal session:', session.id);
        } catch (error) {
            console.error('Error creating portal session:', error);
            if (error instanceof Stripe.errors.StripeError) {
                return NextResponse.json({
                    error: `Stripe error: ${error.message}`,
                    code: error.code
                }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Unexpected error creating customer portal session:', error);
        return NextResponse.json(
            {
                error: 'Failed to create portal session',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 