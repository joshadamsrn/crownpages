-- Synthetic Crown Network fixture for an empty Supabase preview branch.
-- Run with psql -v synthetic_user_id=<auth-user-uuid> after creating a
-- synthetic auth user. The production signup trigger must already have
-- created the matching public.users row.

BEGIN;

INSERT INTO public.businesses (
    id,
    owner_id,
    name,
    slug,
    description,
    email,
    phone,
    street_address,
    city,
    state,
    zip_code,
    is_active
)
VALUES (
    '00000000-0000-4000-8000-000000000101'::uuid,
    :'synthetic_user_id'::uuid,
    'Crown Network Staging Pilot',
    'crown-network-staging-pilot',
    'Synthetic facility used only for Crown Network staging verification.',
    'facility.staging@example.com',
    '+1 801-555-0101',
    '101 Staging Way',
    'Salt Lake City',
    'Utah',
    '84121',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    updated_at = NOW();

INSERT INTO public.pages (
    id,
    business_id,
    created_by,
    title,
    slug,
    description,
    content,
    is_published,
    published_at,
    is_active
)
VALUES (
    '00000000-0000-4000-8000-000000000102'::uuid,
    '00000000-0000-4000-8000-000000000101'::uuid,
    :'synthetic_user_id'::uuid,
    'Crown Network Staging Pilot',
    'crown-network-staging-pilot',
    'Synthetic facility page used only for Crown Network staging verification.',
    jsonb_build_object(
        'importSource', jsonb_build_object(
            'source', 'phn',
            'facilityId', 'staging-pilot-001'
        ),
        'sections', jsonb_build_array(
            jsonb_build_object(
                'type', 'about',
                'data', jsonb_build_object(
                    'content', 'Synthetic assisted living and memory care community used only for Crown Network staging verification.'
                )
            ),
            jsonb_build_object(
                'type', 'amenities',
                'data', jsonb_build_object(
                    'amenities', jsonb_build_array(
                        jsonb_build_object('name', '24-hour support'),
                        jsonb_build_object('name', 'Medication management')
                    )
                )
            )
        )
    ),
    TRUE,
    NOW(),
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    created_by = EXCLUDED.created_by,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    is_published = EXCLUDED.is_published,
    published_at = EXCLUDED.published_at,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.network_facilities (
    id,
    business_id,
    page_id,
    source_system,
    source_facility_id,
    listing_status,
    referral_status,
    is_accepting_referrals,
    notification_email,
    agreement_status,
    referral_fee_type,
    referral_fee_amount,
    referral_protection_days,
    agreement_effective_at,
    referral_terms_version,
    care_types,
    amenities,
    searchable_text,
    latitude,
    longitude,
    price_low,
    price_high,
    price_period,
    availability_status,
    license_state,
    profile_verified_at
)
VALUES (
    '00000000-0000-4000-8000-000000000103'::uuid,
    '00000000-0000-4000-8000-000000000101'::uuid,
    '00000000-0000-4000-8000-000000000102'::uuid,
    'staging',
    'staging-pilot-001',
    'verified',
    'eligible',
    TRUE,
    'facility.staging@example.com',
    'active',
    'flat',
    2500,
    180,
    NOW(),
    'staging-pilot-v1',
    ARRAY['Assisted Living', 'Memory Care']::text[],
    ARRAY['24-hour support', 'Medication management']::text[],
    'Crown Network Staging Pilot assisted living memory care Salt Lake City Utah 84121',
    40.6226,
    -111.7777,
    3500,
    6500,
    'month',
    'available',
    'Utah',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    notification_email = EXCLUDED.notification_email,
    agreement_status = EXCLUDED.agreement_status,
    referral_fee_type = EXCLUDED.referral_fee_type,
    referral_fee_amount = EXCLUDED.referral_fee_amount,
    referral_protection_days = EXCLUDED.referral_protection_days,
    agreement_effective_at = EXCLUDED.agreement_effective_at,
    referral_terms_version = EXCLUDED.referral_terms_version,
    referral_status = EXCLUDED.referral_status,
    is_accepting_referrals = EXCLUDED.is_accepting_referrals,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    price_low = EXCLUDED.price_low,
    price_high = EXCLUDED.price_high,
    price_period = EXCLUDED.price_period,
    updated_at = NOW();

INSERT INTO public.network_facility_services (
    facility_id,
    service_type,
    is_available,
    referral_enabled,
    private_pay_only
)
VALUES
    ('00000000-0000-4000-8000-000000000103'::uuid, 'Assisted Living', TRUE, TRUE, TRUE),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'Memory Care', TRUE, TRUE, TRUE)
ON CONFLICT (facility_id, service_type) DO UPDATE SET
    is_available = EXCLUDED.is_available,
    referral_enabled = EXCLUDED.referral_enabled,
    updated_at = NOW();

COMMIT;
