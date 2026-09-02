-- Crown Network staging smoke test.
-- Requires one synthetic facility with source_system = 'staging' and
-- source_facility_id = 'staging-pilot-001'. This test intentionally creates
-- synthetic referral records and does not send an email.

DO $test$
DECLARE
    v_facility_id UUID;
    v_page_id UUID;
    v_referral_id UUID;
    v_notification_id UUID;
    v_token_hash TEXT;
    v_facility_status TEXT;
    v_notification_status TEXT;
    v_access_count INTEGER;
BEGIN
    SELECT id, page_id
    INTO v_facility_id, v_page_id
    FROM public.network_facilities
    WHERE source_system = 'staging'
      AND source_facility_id = 'staging-pilot-001'
      AND referral_status = 'eligible'
      AND is_accepting_referrals = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Synthetic Crown Network staging facility is missing';
    END IF;

    v_token_hash := encode(
        extensions.digest(
            'crown-network-staging-' || gen_random_uuid()::TEXT,
            'sha256'
        ),
        'hex'
    );

    v_referral_id := public.submit_network_referral(
        jsonb_build_object(
            'facilityIds', jsonb_build_array(v_page_id::TEXT),
            'firstName', 'Synthetic',
            'lastName', 'Family',
            'email', 'family.staging@example.com',
            'phone', '+1 801-555-0199',
            'preferredContactMethod', 'email',
            'relationship', 'adult_child',
            'desiredCity', 'Salt Lake City',
            'desiredState', 'Utah',
            'desiredZipCode', '84121',
            'searchRadiusMiles', 25,
            'careTypes', jsonb_build_array('Assisted Living'),
            'moveTimeframe', 'within_30_days',
            'budgetLow', 3500,
            'budgetHigh', 6500,
            'supportNeeds', jsonb_build_array('Medication management'),
            'preferences', jsonb_build_array('24-hour support'),
            'additionalNotes', 'Synthetic staging referral. No real family or patient data.',
            'previouslyContactedFacilityIds', jsonb_build_array(),
            'sharingAccepted', TRUE,
            'compensationAcknowledged', TRUE,
            'privacyAccepted', TRUE,
            'disclosureVersion', 'crown-network-staging-v1',
            'disclosureText', 'Synthetic staging consent for a controlled referral test.',
            'allowEmail', TRUE,
            'allowPhone', FALSE,
            'allowSms', FALSE
        ),
        '127.0.0.1'::INET,
        'Crown Network staging smoke test',
        NULL
    );

    PERFORM public.operate_network_referral(
        v_referral_id,
        'qualify',
        NULL,
        'Synthetic staging qualification',
        NULL
    );

    v_notification_id := public.deliver_network_referral(
        v_referral_id,
        v_facility_id,
        v_token_hash,
        NOW() + INTERVAL '14 days',
        'delivered@resend.dev',
        'Synthetic staging delivery',
        NULL
    );

    PERFORM public.open_network_referral_access(
        v_token_hash,
        'Crown Network staging smoke test'
    );

    PERFORM public.respond_network_referral_access(
        v_token_hash,
        'accept',
        NULL
    );

    SELECT referral_facility.status, notification.status, access_token.access_count
    INTO v_facility_status, v_notification_status, v_access_count
    FROM public.network_referral_facilities referral_facility
    JOIN public.network_referral_access_tokens access_token
      ON access_token.referral_facility_id = referral_facility.id
    JOIN public.network_referral_notifications notification
      ON notification.id = v_notification_id
    WHERE referral_facility.referral_id = v_referral_id
      AND referral_facility.facility_id = v_facility_id;

    IF v_facility_status <> 'accepted' THEN
        RAISE EXCEPTION 'Expected accepted facility status, got %', v_facility_status;
    END IF;
    IF v_notification_status <> 'queued' THEN
        RAISE EXCEPTION 'Expected queued notification, got %', v_notification_status;
    END IF;
    IF v_access_count <> 1 THEN
        RAISE EXCEPTION 'Expected one provider access, got %', v_access_count;
    END IF;

    RAISE NOTICE 'Crown Network smoke test passed for referral %', v_referral_id;
END;
$test$;
