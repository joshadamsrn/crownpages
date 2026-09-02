-- Verifies facility activation, service synchronization, audit history, and
-- safe pausing against the synthetic staging pilot. All changes roll back.

BEGIN;

DO $test$
DECLARE
    v_facility_id UUID := '00000000-0000-4000-8000-000000000103'::UUID;
    v_events_before INTEGER;
    v_events_after INTEGER;
    v_enabled_services INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_events_before
    FROM public.network_facility_events
    WHERE facility_id = v_facility_id;

    PERFORM public.update_network_facility_settings(
        v_facility_id,
        jsonb_build_object(
            'listingStatus', 'partner',
            'referralStatus', 'eligible',
            'isAcceptingReferrals', TRUE,
            'careTypes', jsonb_build_array('Assisted Living', 'Memory Care'),
            'notificationEmail', 'facility.staging@example.com',
            'agreementStatus', 'active',
            'referralFeeType', 'flat',
            'referralFeeAmount', 2500,
            'referralFeePercentage', NULL,
            'referralProtectionDays', 180,
            'agreementEffectiveAt', (NOW() - INTERVAL '1 day')::TEXT,
            'agreementExpiresAt', (NOW() + INTERVAL '1 year')::TEXT,
            'referralTermsVersion', 'staging-pilot-v1',
            'agreementNotes', 'Synthetic staging agreement.'
        ),
        NULL
    );

    IF NOT public.network_facility_is_referral_eligible(v_facility_id) THEN
        RAISE EXCEPTION 'Expected facility to be referral eligible after activation';
    END IF;

    SELECT COUNT(*)
    INTO v_enabled_services
    FROM public.network_facility_services
    WHERE facility_id = v_facility_id
      AND referral_enabled = TRUE;

    IF v_enabled_services <> 2 THEN
        RAISE EXCEPTION 'Expected two referral-enabled services, got %', v_enabled_services;
    END IF;

    SELECT COUNT(*)
    INTO v_events_after
    FROM public.network_facility_events
    WHERE facility_id = v_facility_id;

    IF v_events_after <> v_events_before + 1 THEN
        RAISE EXCEPTION 'Expected one facility audit event';
    END IF;

    PERFORM public.update_network_facility_settings(
        v_facility_id,
        jsonb_build_object(
            'listingStatus', 'verified',
            'referralStatus', 'paused',
            'isAcceptingReferrals', FALSE,
            'careTypes', jsonb_build_array('Assisted Living', 'Memory Care'),
            'notificationEmail', 'facility.staging@example.com',
            'agreementStatus', 'pending',
            'referralFeeType', 'flat',
            'referralFeeAmount', 2500,
            'referralFeePercentage', NULL,
            'referralProtectionDays', 180,
            'agreementEffectiveAt', NULL,
            'agreementExpiresAt', NULL,
            'referralTermsVersion', 'staging-pilot-v1',
            'agreementNotes', 'Synthetic staging agreement.'
        ),
        NULL
    );

    IF public.network_facility_is_referral_eligible(v_facility_id) THEN
        RAISE EXCEPTION 'Expected paused facility to be ineligible';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.network_facilities
        WHERE id = v_facility_id
          AND latitude = 40.6226
          AND longitude = -111.7777
          AND price_low = 3500
          AND price_high = 6500
          AND price_period = 'month'
    ) THEN
        RAISE EXCEPTION 'Expected older settings payloads to preserve discovery coordinates and pricing';
    END IF;

    RAISE NOTICE 'Crown Network facility onboarding smoke test passed';
END;
$test$;

ROLLBACK;
