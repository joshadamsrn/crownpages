-- Verifies insurance-only facilities can receive and complete referrals with
-- no agreement or referral compensation. All changes roll back.

BEGIN;

DO $test$
DECLARE
    v_facility_id UUID := '00000000-0000-4000-8000-000000000103'::UUID;
    v_page_id UUID;
    v_referral_id UUID;
    v_token_hash TEXT;
    v_fee_id UUID;
    v_snapshot_type TEXT;
    v_snapshot_terms TEXT;
    v_snapshot_protection INTEGER;
    v_fee_type TEXT;
    v_fee_status TEXT;
    v_fee_amount NUMERIC(12, 2);
    v_invalid_private_pay_guarded BOOLEAN := FALSE;
BEGIN
    SELECT page_id
    INTO v_page_id
    FROM public.network_facilities
    WHERE id = v_facility_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Synthetic staging facility is missing';
    END IF;

    PERFORM public.update_network_facility_settings(
        v_facility_id,
        jsonb_build_object(
            'listingStatus', 'verified',
            'referralStatus', 'eligible',
            'isAcceptingReferrals', TRUE,
            'careTypes', jsonb_build_array('Home Health'),
            'acceptedInsurances', jsonb_build_array('Medicare'),
            'notificationEmail', 'facility.staging@example.com',
            'agreementStatus', 'not_contacted',
            'referralFeeType', 'none',
            'referralFeeAmount', NULL,
            'referralFeePercentage', NULL,
            'referralProtectionDays', 180,
            'agreementEffectiveAt', NULL,
            'agreementExpiresAt', NULL,
            'referralTermsVersion', NULL,
            'agreementNotes', 'Non-compensated insurance referral test.'
        ),
        NULL
    );

    IF NOT public.network_facility_is_referral_eligible(v_facility_id) THEN
        RAISE EXCEPTION 'Expected no-fee Home Health facility to be referral eligible';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.network_facility_services
        WHERE facility_id = v_facility_id
          AND service_type = 'Home Health'
          AND referral_enabled = TRUE
    ) THEN
        RAISE EXCEPTION 'Expected Home Health service to be referral enabled';
    END IF;

    BEGIN
        PERFORM public.update_network_facility_settings(
            v_facility_id,
            jsonb_build_object(
                'listingStatus', 'verified',
                'referralStatus', 'eligible',
                'isAcceptingReferrals', TRUE,
                'careTypes', jsonb_build_array('Assisted Living'),
                'acceptedInsurances', jsonb_build_array(),
                'notificationEmail', 'facility.staging@example.com',
                'agreementStatus', 'not_contacted',
                'referralFeeType', 'none',
                'referralFeeAmount', NULL,
                'referralFeePercentage', NULL,
                'referralProtectionDays', 180,
                'agreementEffectiveAt', NULL,
                'agreementExpiresAt', NULL,
                'referralTermsVersion', NULL,
                'agreementNotes', 'This update must be rejected.'
            ),
            NULL
        );
    EXCEPTION WHEN check_violation THEN
        v_invalid_private_pay_guarded := TRUE;
    END;

    IF NOT v_invalid_private_pay_guarded THEN
        RAISE EXCEPTION 'Expected no-fee private-pay referral configuration to be rejected';
    END IF;

    v_token_hash := encode(
        extensions.digest(
            'crown-network-non-compensated-' || gen_random_uuid()::TEXT,
            'sha256'
        ),
        'hex'
    );

    v_referral_id := public.submit_network_referral(
        jsonb_build_object(
            'facilityIds', jsonb_build_array(v_page_id::TEXT),
            'firstName', 'Synthetic',
            'lastName', 'No Fee',
            'email', 'non-compensated.staging@example.com',
            'phone', '+1 801-555-0197',
            'preferredContactMethod', 'email',
            'relationship', 'adult_child',
            'desiredCity', 'Salt Lake City',
            'desiredState', 'Utah',
            'desiredZipCode', '84121',
            'searchRadiusMiles', 25,
            'careTypes', jsonb_build_array('Home Health'),
            'moveTimeframe', 'within_30_days',
            'budgetLow', NULL,
            'budgetHigh', NULL,
            'supportNeeds', jsonb_build_array('Skilled nursing visits'),
            'preferences', jsonb_build_array(),
            'additionalNotes', 'Synthetic non-compensated referral test.',
            'previouslyContactedFacilityIds', jsonb_build_array(),
            'sharingAccepted', TRUE,
            'compensationAcknowledged', TRUE,
            'privacyAccepted', TRUE,
            'disclosureVersion', 'crown-network-staging-v1',
            'disclosureText', 'Synthetic staging consent.',
            'allowEmail', TRUE,
            'allowPhone', FALSE,
            'allowSms', FALSE
        ),
        '127.0.0.1'::INET,
        'Crown Network non-compensated referral smoke test',
        NULL
    );

    PERFORM public.operate_network_referral(
        v_referral_id,
        'qualify',
        NULL,
        'Synthetic qualification',
        NULL
    );

    PERFORM public.deliver_network_referral(
        v_referral_id,
        v_facility_id,
        v_token_hash,
        NOW() + INTERVAL '14 days',
        'facility.staging@example.com',
        'Synthetic secure delivery',
        NULL
    );

    SELECT
        referral_fee_type_snapshot,
        referral_terms_version_snapshot,
        referral_protection_days_snapshot
    INTO v_snapshot_type, v_snapshot_terms, v_snapshot_protection
    FROM public.network_referral_facilities
    WHERE referral_id = v_referral_id
      AND facility_id = v_facility_id;

    IF v_snapshot_type <> 'none'
       OR v_snapshot_terms IS NOT NULL
       OR v_snapshot_protection IS NOT NULL THEN
        RAISE EXCEPTION 'Non-compensated terms were not snapshotted correctly';
    END IF;

    PERFORM public.respond_network_referral_access(v_token_hash, 'accept', NULL);

    v_fee_id := public.confirm_network_referral_placement(
        v_referral_id,
        v_facility_id,
        jsonb_build_object(
            'moveInDate', (CURRENT_DATE + 10)::TEXT,
            'placementValue', NULL,
            'feeAmount', NULL,
            'note', 'Synthetic non-compensated placement confirmation.'
        ),
        NULL
    );

    SELECT fee_type, status, amount
    INTO v_fee_type, v_fee_status, v_fee_amount
    FROM public.network_referral_fees
    WHERE id = v_fee_id;

    IF v_fee_type <> 'none' OR v_fee_status <> 'waived' OR v_fee_amount <> 0 THEN
        RAISE EXCEPTION 'Expected an auditable no-fee outcome, got % / % / %', v_fee_type, v_fee_status, v_fee_amount;
    END IF;

    RAISE NOTICE 'Crown Network non-compensated referral smoke test passed';
END;
$test$;

ROLLBACK;
