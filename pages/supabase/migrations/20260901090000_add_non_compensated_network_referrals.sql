-- Allow insurance-covered providers to receive auditable, non-compensated
-- referrals without a commercial referral agreement. Compensated referrals
-- retain the existing agreement and fee-term requirements.

ALTER TABLE public.network_facilities
    DROP CONSTRAINT IF EXISTS network_facilities_referral_fee_type_check,
    DROP CONSTRAINT IF EXISTS network_facilities_eligible_agreement_check,
    DROP CONSTRAINT IF EXISTS network_facilities_accepting_requirements_check;

ALTER TABLE public.network_facilities
    ADD CONSTRAINT network_facilities_referral_fee_type_check
        CHECK (referral_fee_type IS NULL OR referral_fee_type IN ('none', 'flat', 'percentage', 'custom')),
    ADD CONSTRAINT network_facilities_eligible_agreement_check
        CHECK (
            referral_status <> 'eligible'
            OR agreement_status = 'active'
            OR (
                referral_fee_type = 'none'
                AND cardinality(care_types) > 0
                AND care_types <@ ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
            )
        ),
    ADD CONSTRAINT network_facilities_accepting_requirements_check
        CHECK (
            is_accepting_referrals = FALSE
            OR (
                referral_status = 'eligible'
                AND notification_email IS NOT NULL
                AND (
                    agreement_status = 'active'
                    OR (
                        referral_fee_type = 'none'
                        AND cardinality(care_types) > 0
                        AND care_types <@ ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
                    )
                )
            )
        );

ALTER TABLE public.network_referral_facilities
    DROP CONSTRAINT IF EXISTS network_referral_facilities_fee_type_snapshot_check;

ALTER TABLE public.network_referral_facilities
    ADD CONSTRAINT network_referral_facilities_fee_type_snapshot_check
        CHECK (
            referral_fee_type_snapshot IS NULL
            OR referral_fee_type_snapshot IN ('none', 'flat', 'percentage', 'custom')
        );

ALTER TABLE public.network_referral_fees
    DROP CONSTRAINT IF EXISTS network_referral_fees_fee_type_check;

ALTER TABLE public.network_referral_fees
    ADD CONSTRAINT network_referral_fees_fee_type_check
        CHECK (fee_type IN ('none', 'flat', 'percentage', 'custom'));

CREATE OR REPLACE FUNCTION public.network_facility_is_referral_eligible(p_facility_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.network_facilities facility
        JOIN public.pages page ON page.id = facility.page_id
        WHERE facility.id = p_facility_id
          AND facility.listing_status IN ('listed', 'verified', 'partner')
          AND facility.referral_status = 'eligible'
          AND facility.is_accepting_referrals = TRUE
          AND facility.notification_email IS NOT NULL
          AND (
              (
                  facility.referral_fee_type = 'none'
                  AND cardinality(facility.care_types) > 0
                  AND facility.care_types <@ ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
              )
              OR (
                  facility.referral_fee_type IN ('flat', 'percentage', 'custom')
                  AND facility.agreement_status = 'active'
                  AND (facility.agreement_effective_at IS NULL OR facility.agreement_effective_at <= NOW())
                  AND (facility.agreement_expires_at IS NULL OR facility.agreement_expires_at > NOW())
              )
          )
          AND page.is_active = TRUE
          AND page.is_published = TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.network_facility_is_referral_eligible(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.network_facility_is_referral_eligible(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_network_facility_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_referral_enabled BOOLEAN;
BEGIN
    v_referral_enabled := NEW.referral_status = 'eligible'
        AND NEW.is_accepting_referrals
        AND (
            NEW.agreement_status = 'active'
            OR (
                NEW.referral_fee_type = 'none'
                AND cardinality(NEW.care_types) > 0
                AND NEW.care_types <@ ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
            )
        );

    DELETE FROM public.network_facility_services service
    WHERE service.facility_id = NEW.id
      AND NOT (service.service_type = ANY(NEW.care_types));

    INSERT INTO public.network_facility_services (
        facility_id,
        service_type,
        is_available,
        referral_enabled
    )
    SELECT NEW.id, care_type, TRUE, v_referral_enabled
    FROM unnest(NEW.care_types) AS care_type
    ON CONFLICT (facility_id, service_type) DO UPDATE SET
        is_available = TRUE,
        referral_enabled = EXCLUDED.referral_enabled,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_network_facility_services_after_change ON public.network_facilities;
CREATE TRIGGER sync_network_facility_services_after_change
AFTER INSERT OR UPDATE OF care_types, referral_status, is_accepting_referrals, agreement_status, referral_fee_type
ON public.network_facilities
FOR EACH ROW EXECUTE FUNCTION public.sync_network_facility_services();

CREATE OR REPLACE FUNCTION public.validate_network_referral_facility_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
       OR (TG_OP = 'UPDATE' AND NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        IF NOT public.network_facility_is_referral_eligible(NEW.facility_id) THEN
            RAISE EXCEPTION 'The facility is not currently eligible to receive Crown Network referrals';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_network_referral_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_facility public.network_facilities%ROWTYPE;
BEGIN
    IF NEW.status = 'delivered'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.terms_snapshotted_at IS NULL THEN
        SELECT *
        INTO v_facility
        FROM public.network_facilities
        WHERE id = NEW.facility_id;

        IF NOT FOUND OR v_facility.referral_fee_type IS NULL THEN
            RAISE EXCEPTION 'Complete referral terms are required before delivery';
        END IF;
        IF v_facility.referral_fee_type <> 'none'
           AND v_facility.referral_terms_version IS NULL THEN
            RAISE EXCEPTION 'Complete referral fee terms are required before delivery';
        END IF;
        IF v_facility.referral_fee_type = 'flat'
           AND v_facility.referral_fee_amount IS NULL THEN
            RAISE EXCEPTION 'A flat referral fee is required before delivery';
        END IF;
        IF v_facility.referral_fee_type = 'percentage'
           AND v_facility.referral_fee_percentage IS NULL THEN
            RAISE EXCEPTION 'A referral percentage is required before delivery';
        END IF;

        NEW.referral_fee_type_snapshot := v_facility.referral_fee_type;
        NEW.referral_fee_amount_snapshot := v_facility.referral_fee_amount;
        NEW.referral_fee_percentage_snapshot := v_facility.referral_fee_percentage;
        NEW.referral_terms_version_snapshot := v_facility.referral_terms_version;
        NEW.referral_protection_days_snapshot := CASE
            WHEN v_facility.referral_fee_type = 'none' THEN NULL
            ELSE v_facility.referral_protection_days
        END;
        NEW.protection_expires_at := CASE
            WHEN v_facility.referral_fee_type = 'none' THEN NULL
            ELSE COALESCE(NEW.delivered_at, NOW())
                + make_interval(days => v_facility.referral_protection_days)
        END;
        NEW.terms_snapshotted_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_network_referral_placement(
    p_referral_id UUID,
    p_facility_id UUID,
    p_details JSONB,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recipient public.network_referral_facilities%ROWTYPE;
    v_placement_id UUID;
    v_fee_id UUID;
    v_move_in_date DATE;
    v_placement_value NUMERIC(12, 2);
    v_manual_fee NUMERIC(12, 2);
    v_fee_amount NUMERIC(12, 2);
    v_fee_status TEXT;
    v_existing_move_in_date DATE;
    v_existing_placement_value NUMERIC(12, 2);
    v_outside_protection BOOLEAN;
    v_note TEXT;
BEGIN
    SELECT *
    INTO v_recipient
    FROM public.network_referral_facilities
    WHERE referral_id = p_referral_id
      AND facility_id = p_facility_id
    FOR UPDATE;

    IF NOT FOUND OR v_recipient.status NOT IN ('accepted', 'tour_scheduled') THEN
        RAISE EXCEPTION 'The provider referral is not ready for placement confirmation';
    END IF;
    IF v_recipient.terms_snapshotted_at IS NULL
       OR v_recipient.referral_fee_type_snapshot IS NULL THEN
        RAISE EXCEPTION 'The delivered referral does not have referral terms';
    END IF;

    SELECT move_in_date, placement_value
    INTO v_existing_move_in_date, v_existing_placement_value
    FROM public.network_placements
    WHERE referral_facility_id = v_recipient.id;

    v_move_in_date := COALESCE(
        NULLIF(p_details ->> 'moveInDate', '')::DATE,
        v_existing_move_in_date
    );
    v_placement_value := COALESCE(
        NULLIF(p_details ->> 'placementValue', '')::NUMERIC,
        v_existing_placement_value
    );
    v_manual_fee := NULLIF(p_details ->> 'feeAmount', '')::NUMERIC;
    v_note := NULLIF(LEFT(TRIM(p_details ->> 'note'), 2000), '');

    IF v_move_in_date IS NULL
       OR v_move_in_date < CURRENT_DATE - 365
       OR v_move_in_date > CURRENT_DATE + 365 THEN
        RAISE EXCEPTION 'Choose a valid move-in date';
    END IF;
    IF v_placement_value IS NOT NULL AND v_placement_value < 0 THEN
        RAISE EXCEPTION 'Placement value cannot be negative';
    END IF;

    CASE v_recipient.referral_fee_type_snapshot
        WHEN 'none' THEN
            v_fee_amount := 0;
        WHEN 'flat' THEN
            v_fee_amount := v_recipient.referral_fee_amount_snapshot;
        WHEN 'percentage' THEN
            IF v_placement_value IS NULL THEN
                RAISE EXCEPTION 'Placement value is required for percentage fees';
            END IF;
            v_fee_amount := ROUND(
                v_placement_value * v_recipient.referral_fee_percentage_snapshot / 100,
                2
            );
        WHEN 'custom' THEN
            IF v_manual_fee IS NULL OR v_manual_fee < 0 THEN
                RAISE EXCEPTION 'Enter the confirmed custom referral fee';
            END IF;
            v_fee_amount := v_manual_fee;
    END CASE;

    IF v_fee_amount IS NULL OR v_fee_amount < 0 THEN
        RAISE EXCEPTION 'The referral fee could not be calculated';
    END IF;

    v_outside_protection := v_recipient.protection_expires_at IS NOT NULL
        AND v_move_in_date::TIMESTAMPTZ > v_recipient.protection_expires_at;
    v_fee_status := CASE
        WHEN v_recipient.referral_fee_type_snapshot = 'none' THEN 'waived'
        WHEN v_outside_protection THEN 'disputed'
        ELSE 'confirmed'
    END;

    INSERT INTO public.network_placements (
        referral_facility_id,
        status,
        reported_by,
        move_in_date,
        placement_value,
        notes,
        confirmed_at,
        confirmed_by
    ) VALUES (
        v_recipient.id,
        'confirmed',
        'navigator',
        v_move_in_date,
        v_placement_value,
        v_note,
        NOW(),
        p_actor_user_id
    )
    ON CONFLICT (referral_facility_id) DO UPDATE SET
        status = 'confirmed',
        move_in_date = EXCLUDED.move_in_date,
        placement_value = EXCLUDED.placement_value,
        notes = COALESCE(EXCLUDED.notes, network_placements.notes),
        confirmed_at = NOW(),
        confirmed_by = p_actor_user_id
    RETURNING id INTO v_placement_id;

    INSERT INTO public.network_referral_fees (
        placement_id,
        referral_facility_id,
        status,
        fee_type,
        amount,
        calculation_basis,
        disputed_at,
        waived_at,
        notes
    ) VALUES (
        v_placement_id,
        v_recipient.id,
        v_fee_status,
        v_recipient.referral_fee_type_snapshot,
        v_fee_amount,
        jsonb_strip_nulls(jsonb_build_object(
            'termsVersion', v_recipient.referral_terms_version_snapshot,
            'feeType', v_recipient.referral_fee_type_snapshot,
            'flatAmount', v_recipient.referral_fee_amount_snapshot,
            'percentage', v_recipient.referral_fee_percentage_snapshot,
            'placementValue', v_placement_value,
            'protectionExpiresAt', v_recipient.protection_expires_at,
            'outsideProtectionWindow', v_outside_protection
        )),
        CASE WHEN v_fee_status = 'disputed' THEN NOW() ELSE NULL END,
        CASE WHEN v_fee_status = 'waived' THEN NOW() ELSE NULL END,
        CASE
            WHEN v_recipient.referral_fee_type_snapshot = 'none' THEN
                concat_ws(E'\n', 'Non-compensated insurance referral; no fee is due.', v_note)
            WHEN v_outside_protection THEN
                concat_ws(E'\n', 'Move-in was reported outside the protection window.', v_note)
            ELSE v_note
        END
    )
    RETURNING id INTO v_fee_id;

    UPDATE public.network_referral_facilities
    SET status = 'placed',
        outcome_reported_at = COALESCE(outcome_reported_at, NOW())
    WHERE id = v_recipient.id;

    UPDATE public.network_referrals
    SET status = 'placed',
        closed_at = COALESCE(closed_at, NOW())
    WHERE id = p_referral_id;

    INSERT INTO public.network_referral_fee_events (
        fee_id,
        actor_user_id,
        event_type,
        details
    ) VALUES (
        v_fee_id,
        p_actor_user_id,
        CASE WHEN v_fee_status = 'waived' THEN 'non_compensated' ELSE 'fee_confirmed' END,
        jsonb_build_object('status', v_fee_status, 'amount', v_fee_amount)
    );

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        p_referral_id,
        v_recipient.id,
        p_actor_user_id,
        'navigator',
        'placement_confirmed',
        jsonb_strip_nulls(jsonb_build_object(
            'moveInDate', v_move_in_date,
            'placementValue', v_placement_value,
            'feeId', v_fee_id,
            'feeAmount', v_fee_amount,
            'feeStatus', v_fee_status,
            'note', v_note
        ))
    );

    RETURN v_fee_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_network_referral_placement(UUID, UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_network_referral_placement(UUID, UUID, JSONB, UUID) TO service_role;

COMMENT ON COLUMN public.network_facilities.referral_fee_type IS
    'Referral compensation model. none is reserved for non-compensated, insurance-covered referrals.';
