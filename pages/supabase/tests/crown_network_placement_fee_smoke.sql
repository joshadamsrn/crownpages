-- Full synthetic placement-to-payment lifecycle. All records roll back.

BEGIN;

DO $test$
DECLARE
    v_facility_id UUID;
    v_page_id UUID;
    v_referral_id UUID;
    v_recipient_id UUID;
    v_fee_id UUID;
    v_token_hash TEXT;
    v_recipient_status TEXT;
    v_placement_status TEXT;
    v_fee_status TEXT;
    v_fee_amount NUMERIC(12, 2);
    v_snapshot_type TEXT;
    v_snapshot_amount NUMERIC(12, 2);
    v_snapshot_days INTEGER;
    v_immutable_guarded BOOLEAN := FALSE;
    v_fee_immutable_guarded BOOLEAN := FALSE;
BEGIN
    SELECT id, page_id
    INTO v_facility_id, v_page_id
    FROM public.network_facilities
    WHERE source_facility_id = 'staging-pilot-001'
      AND public.network_facility_is_referral_eligible(id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Synthetic referral-eligible staging facility is missing';
    END IF;

    v_token_hash := encode(
        extensions.digest(
            'crown-network-placement-fee-' || gen_random_uuid()::TEXT,
            'sha256'
        ),
        'hex'
    );

    v_referral_id := public.submit_network_referral(
        jsonb_build_object(
            'facilityIds', jsonb_build_array(v_page_id::TEXT),
            'firstName', 'Synthetic',
            'lastName', 'Placement',
            'email', 'placement.staging@example.com',
            'phone', '+1 801-555-0198',
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
            'additionalNotes', 'Synthetic placement and fee ledger test.',
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
        'Crown Network placement fee smoke test',
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

    PERFORM public.respond_network_referral_access(v_token_hash, 'accept', NULL);
    PERFORM public.report_network_referral_progress(
        v_token_hash,
        'schedule_tour',
        jsonb_build_object('tourScheduledAt', NOW() + INTERVAL '1 day')
    );
    PERFORM public.report_network_referral_progress(
        v_token_hash,
        'report_placement',
        jsonb_build_object(
            'moveInDate', (CURRENT_DATE + 10)::TEXT,
            'placementValue', 5000,
            'careLevel', 'Assisted Living',
            'notes', 'Synthetic provider placement report.'
        )
    );

    v_fee_id := public.confirm_network_referral_placement(
        v_referral_id,
        v_facility_id,
        jsonb_build_object(
            'moveInDate', (CURRENT_DATE + 10)::TEXT,
            'placementValue', 5000,
            'note', 'Synthetic navigator confirmation.'
        ),
        NULL
    );

    PERFORM public.update_network_referral_fee(
        v_fee_id,
        'mark_invoiced',
        jsonb_build_object(
            'invoiceReference', 'STAGING-INV-001',
            'dueAt', (NOW() + INTERVAL '30 days')::TEXT,
            'note', 'Synthetic invoice.'
        ),
        NULL
    );
    PERFORM public.update_network_referral_fee(
        v_fee_id,
        'mark_paid',
        jsonb_build_object(
            'paidAt', NOW()::TEXT,
            'note', 'Synthetic payment.'
        ),
        NULL
    );

    SELECT
        recipient.id,
        recipient.status,
        recipient.referral_fee_type_snapshot,
        recipient.referral_fee_amount_snapshot,
        recipient.referral_protection_days_snapshot,
        placement.status,
        fee.status,
        fee.amount
    INTO
        v_recipient_id,
        v_recipient_status,
        v_snapshot_type,
        v_snapshot_amount,
        v_snapshot_days,
        v_placement_status,
        v_fee_status,
        v_fee_amount
    FROM public.network_referral_facilities recipient
    JOIN public.network_placements placement
      ON placement.referral_facility_id = recipient.id
    JOIN public.network_referral_fees fee
      ON fee.referral_facility_id = recipient.id
    WHERE recipient.referral_id = v_referral_id
      AND recipient.facility_id = v_facility_id;

    IF v_recipient_status <> 'placed' OR v_placement_status <> 'confirmed' THEN
        RAISE EXCEPTION 'Placement did not reach its confirmed state';
    END IF;
    IF v_fee_status <> 'paid' OR v_fee_amount <> 2500 THEN
        RAISE EXCEPTION 'Expected a paid $2,500 fee, got % at %', v_fee_amount, v_fee_status;
    END IF;
    IF v_snapshot_type <> 'flat' OR v_snapshot_amount <> 2500 OR v_snapshot_days <> 180 THEN
        RAISE EXCEPTION 'Referral terms were not snapshotted correctly';
    END IF;

    BEGIN
        UPDATE public.network_referral_facilities
        SET referral_fee_amount_snapshot = 1
        WHERE id = v_recipient_id;
    EXCEPTION WHEN OTHERS THEN
        v_immutable_guarded := TRUE;
    END;

    IF NOT v_immutable_guarded THEN
        RAISE EXCEPTION 'Delivered referral terms were not immutable';
    END IF;

    BEGIN
        UPDATE public.network_referral_fees
        SET amount = 1
        WHERE id = v_fee_id;
    EXCEPTION WHEN OTHERS THEN
        v_fee_immutable_guarded := TRUE;
    END;

    IF NOT v_fee_immutable_guarded THEN
        RAISE EXCEPTION 'Calculated referral fee economics were not immutable';
    END IF;

    RAISE NOTICE 'Crown Network placement fee smoke test passed for fee %', v_fee_id;
END;
$test$;

ROLLBACK;
