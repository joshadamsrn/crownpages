import { NextRequest, NextResponse } from 'next/server';
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
    const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { bypass, seats } = await req.json();
	if (!bypass || String(bypass) !== process.env.ADMIN_BYPASS_CODE) {
		return NextResponse.json({ error: 'Invalid bypass code' }, { status: 403 });
	}

	// Ensure user is admin
	const { data: profile, error: profileErr } = await supabase
		.from('users')
		.select('admin')
		.eq('id', user.id)
		.single();
	if (profileErr || !profile?.admin) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

    // Generate unique code
	let code = '';
	let isUnique = false;
	while (!isUnique) {
		code = generateLicenseCode();
		const { data: existing } = await supabase
			.from('license')
			.select('id')
			.eq('code', code)
			.maybeSingle();
		if (!existing) isUnique = true;
	}

    const seatCount = Math.max(1, Number(seats) || 5);

    // Resolve a plan_pricing_id based on seats: 1-4 fixed plans, else 5+ base plan
    const { data: planRow } = await supabase
        .from('plans_pricing')
        .select('id, min_seats, max_seats, pricing_type')
        .eq('is_active', true)
        .order('min_seats', { ascending: true })
        .then((res: any) => {
            const plans = res.data || [];
            const chosen = plans.find((p: any) => {
                if (seatCount <= 4) {
                    return p.pricing_type === 'fixed' && p.min_seats === seatCount && p.max_seats === seatCount;
                }
                return p.pricing_type === 'multi_line_item';
            });
            return { data: chosen };
        });

    const plan_pricing_id = planRow?.id ?? null;

    // Insert license; purchased_by is the admin who generated it
    const { error: insertErr } = await supabase
        .from('license')
        .insert({
            code,
            max_seats: seatCount,
            plan_pricing_id,
            purchased_by: user.id,
            stripe_price_id: null,
            stripe_subscription_id: null,
            is_active: true,
            type: 'organization',
        })
        .single();

	if (insertErr) {
		return NextResponse.json({ error: insertErr.message }, { status: 500 });
	}

	return NextResponse.json({ code });
}


