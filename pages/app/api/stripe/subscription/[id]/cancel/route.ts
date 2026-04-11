import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Missing Stripe secret key' }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' });
    const { id: subscriptionId } = await params;

    try {
        // Cancel at period end (don't immediately cancel to allow usage until end of billing period)
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        return NextResponse.json({
            success: true,
            subscription,
            message: 'Subscription will be canceled at the end of the current billing period'
        });
    } catch (error: any) {
        console.error('Error canceling subscription:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription' },
            { status: 400 }
        );
    }
} 