-- Crown Network placement confirmation and referral-fee ledger.
-- Commercial terms are snapshotted when a referral is delivered so later
-- facility agreement changes cannot alter the economics of that referral.

ALTER TABLE public.network_referral_facilities
    ADD COLUMN IF NOT EXISTS referral_fee_type_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS referral_fee_amount_snapshot NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS referral_fee_percentage_snapshot NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS referral_terms_version_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS referral_protection_days_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS protection_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_snapshotted_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_referral_facilities_fee_type_snapshot_check') THEN
        ALTER TABLE public.network_referral_facilities
            ADD CONSTRAINT network_referral_facilities_fee_type_snapshot_check
            CHECK (
                referral_fee_type_snapshot IS NULL
                OR referral_fee_type_snapshot IN ('flat', 'percentage', 'custom')
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_referral_facilities_fee_amount_snapshot_check') THEN
        ALTER TABLE public.network_referral_facilities
            ADD CONSTRAINT network_referral_facilities_fee_amount_snapshot_check
            CHECK (referral_fee_amount_snapshot IS NULL OR referral_fee_amount_snapshot >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_referral_facilities_fee_percentage_snapshot_check') THEN
        ALTER TABLE public.network_referral_facilities
            ADD CONSTRAINT network_referral_facilities_fee_percentage_snapshot_check
            CHECK (
                referral_fee_percentage_snapshot IS NULL
                OR referral_fee_percentage_snapshot > 0 AND referral_fee_percentage_snapshot <= 100
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_referral_facilities_protection_days_snapshot_check') THEN
        ALTER TABLE public.network_referral_facilities
            ADD CONSTRAINT network_referral_facilities_protection_days_snapshot_check
            CHECK (
                referral_protection_days_snapshot IS NULL
                OR referral_protection_days_snapshot BETWEEN 1 AND 730
            );
    END IF;
END;
$$;

-- Snapshot terms for any referral already delivered in staging before this
-- migration. New deliveries are handled by the trigger below.
UPDATE public.network_referral_facilities recipient
SET referral_fee_type_snapshot = facility.referral_fee_type,
    referral_fee_amount_snapshot = facility.referral_fee_amount,
    referral_fee_percentage_snapshot = facility.referral_fee_percentage,
    referral_terms_version_snapshot = facility.referral_terms_version,
    referral_protection_days_snapshot = facility.referral_protection_days,
    protection_expires_at = COALESCE(recipient.delivered_at, recipient.created_at)
        + make_interval(days => facility.referral_protection_days),
    terms_snapshotted_at = COALESCE(recipient.delivered_at, recipient.updated_at, NOW())
FROM public.network_facilities facility
WHERE facility.id = recipient.facility_id
  AND recipient.status IN ('delivered', 'viewed', 'accepted', 'tour_scheduled', 'placed', 'lost')
  AND recipient.terms_snapshotted_at IS NULL;

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

        IF NOT FOUND
           OR v_facility.referral_fee_type IS NULL
           OR v_facility.referral_terms_version IS NULL THEN
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
        NEW.referral_protection_days_snapshot := v_facility.referral_protection_days;
        NEW.protection_expires_at := COALESCE(NEW.delivered_at, NOW())
            + make_interval(days => v_facility.referral_protection_days);
        NEW.terms_snapshotted_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_network_referral_terms_before_delivery
ON public.network_referral_facilities;
CREATE TRIGGER snapshot_network_referral_terms_before_delivery
BEFORE UPDATE OF status ON public.network_referral_facilities
FOR EACH ROW EXECUTE FUNCTION public.snapshot_network_referral_terms();

CREATE OR REPLACE FUNCTION public.prevent_network_referral_terms_snapshot_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.terms_snapshotted_at IS NOT NULL AND (
        NEW.referral_fee_type_snapshot IS DISTINCT FROM OLD.referral_fee_type_snapshot
        OR NEW.referral_fee_amount_snapshot IS DISTINCT FROM OLD.referral_fee_amount_snapshot
        OR NEW.referral_fee_percentage_snapshot IS DISTINCT FROM OLD.referral_fee_percentage_snapshot
        OR NEW.referral_terms_version_snapshot IS DISTINCT FROM OLD.referral_terms_version_snapshot
        OR NEW.referral_protection_days_snapshot IS DISTINCT FROM OLD.referral_protection_days_snapshot
        OR NEW.protection_expires_at IS DISTINCT FROM OLD.protection_expires_at
        OR NEW.terms_snapshotted_at IS DISTINCT FROM OLD.terms_snapshotted_at
    ) THEN
        RAISE EXCEPTION 'Delivered referral fee terms are immutable';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_network_referral_terms_snapshot_change_before_update
ON public.network_referral_facilities;
CREATE TRIGGER prevent_network_referral_terms_snapshot_change_before_update
BEFORE UPDATE OF
    referral_fee_type_snapshot,
    referral_fee_amount_snapshot,
    referral_fee_percentage_snapshot,
    referral_terms_version_snapshot,
    referral_protection_days_snapshot,
    protection_expires_at,
    terms_snapshotted_at
ON public.network_referral_facilities
FOR EACH ROW EXECUTE FUNCTION public.prevent_network_referral_terms_snapshot_change();

CREATE TABLE IF NOT EXISTS public.network_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_facility_id UUID NOT NULL UNIQUE
        REFERENCES public.network_referral_facilities(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'reported'
        CHECK (status IN ('reported', 'confirmed', 'disputed', 'cancelled')),
    reported_by TEXT NOT NULL DEFAULT 'facility'
        CHECK (reported_by IN ('facility', 'navigator', 'admin', 'system')),
    move_in_date DATE NOT NULL,
    placement_value NUMERIC(12, 2),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
    care_level TEXT,
    notes TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (placement_value IS NULL OR placement_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_network_placements_status
    ON public.network_placements(status, reported_at DESC);

CREATE TABLE IF NOT EXISTS public.network_referral_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL UNIQUE REFERENCES public.network_placements(id) ON DELETE RESTRICT,
    referral_facility_id UUID NOT NULL UNIQUE
        REFERENCES public.network_referral_facilities(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'invoiced', 'paid', 'disputed', 'waived')),
    fee_type TEXT NOT NULL CHECK (fee_type IN ('flat', 'percentage', 'custom')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
    calculation_basis JSONB NOT NULL DEFAULT '{}'::JSONB,
    invoice_reference TEXT,
    invoiced_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    disputed_at TIMESTAMPTZ,
    waived_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_fees_status
    ON public.network_referral_fees(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_referral_fees_due
    ON public.network_referral_fees(due_at)
    WHERE status = 'invoiced';

CREATE TABLE IF NOT EXISTS public.network_referral_fee_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id UUID NOT NULL REFERENCES public.network_referral_fees(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_fee_events_fee
    ON public.network_referral_fee_events(fee_id, created_at DESC);

DROP TRIGGER IF EXISTS set_network_placements_updated_at ON public.network_placements;
CREATE TRIGGER set_network_placements_updated_at
BEFORE UPDATE ON public.network_placements
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_referral_fees_updated_at ON public.network_referral_fees;
CREATE TRIGGER set_network_referral_fees_updated_at
BEFORE UPDATE ON public.network_referral_fees
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

ALTER TABLE public.network_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_fee_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.network_placements FROM anon, authenticated;
REVOKE ALL ON public.network_referral_fees FROM anon, authenticated;
REVOKE ALL ON public.network_referral_fee_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.report_network_referral_progress(
    p_token_hash TEXT,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_facility_id UUID;
    v_referral_id UUID;
    v_facility_id UUID;
    v_facility_status TEXT;
    v_tour_at TIMESTAMPTZ;
    v_move_in_date DATE;
    v_placement_value NUMERIC(12, 2);
    v_reason TEXT;
    v_event_type TEXT;
BEGIN
    SELECT token.referral_facility_id
    INTO v_referral_facility_id
    FROM public.network_referral_access_tokens token
    WHERE token.token_hash = p_token_hash
      AND token.revoked_at IS NULL
      AND token.expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral access is invalid or expired';
    END IF;

    SELECT referral_id, facility_id, status
    INTO v_referral_id, v_facility_id, v_facility_status
    FROM public.network_referral_facilities
    WHERE id = v_referral_facility_id
    FOR UPDATE;

    IF NOT EXISTS (
        SELECT 1
        FROM public.network_referral_consents consent
        WHERE consent.referral_id = v_referral_id
          AND v_facility_id = ANY(consent.facility_ids)
          AND consent.revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Referral consent is no longer active';
    END IF;

    IF p_action = 'schedule_tour' THEN
        IF v_facility_status NOT IN ('accepted', 'tour_scheduled') THEN
            RAISE EXCEPTION 'Accept the referral before scheduling a tour';
        END IF;
        v_tour_at := NULLIF(p_details ->> 'tourScheduledAt', '')::TIMESTAMPTZ;
        IF v_tour_at IS NULL
           OR v_tour_at < NOW() - INTERVAL '1 year'
           OR v_tour_at > NOW() + INTERVAL '2 years' THEN
            RAISE EXCEPTION 'Choose a valid tour date';
        END IF;

        UPDATE public.network_referral_facilities
        SET status = 'tour_scheduled',
            tour_scheduled_at = v_tour_at,
            responded_at = COALESCE(responded_at, NOW())
        WHERE id = v_referral_facility_id;

        UPDATE public.network_referrals
        SET status = 'touring'
        WHERE id = v_referral_id
          AND status NOT IN ('placed', 'closed', 'cancelled');
        v_facility_status := 'tour_scheduled';
        v_event_type := 'tour_scheduled';

    ELSIF p_action = 'report_placement' THEN
        IF v_facility_status NOT IN ('accepted', 'tour_scheduled') THEN
            RAISE EXCEPTION 'The referral is not ready for placement reporting';
        END IF;
        v_move_in_date := NULLIF(p_details ->> 'moveInDate', '')::DATE;
        v_placement_value := NULLIF(p_details ->> 'placementValue', '')::NUMERIC;
        IF v_move_in_date IS NULL
           OR v_move_in_date < CURRENT_DATE - 365
           OR v_move_in_date > CURRENT_DATE + 365 THEN
            RAISE EXCEPTION 'Choose a valid move-in date';
        END IF;
        IF v_placement_value IS NOT NULL AND v_placement_value < 0 THEN
            RAISE EXCEPTION 'Placement value cannot be negative';
        END IF;

        INSERT INTO public.network_placements (
            referral_facility_id,
            status,
            reported_by,
            move_in_date,
            placement_value,
            care_level,
            notes
        ) VALUES (
            v_referral_facility_id,
            'reported',
            'facility',
            v_move_in_date,
            v_placement_value,
            NULLIF(LEFT(TRIM(p_details ->> 'careLevel'), 200), ''),
            NULLIF(LEFT(TRIM(p_details ->> 'notes'), 2000), '')
        )
        ON CONFLICT (referral_facility_id) DO UPDATE SET
            status = 'reported',
            reported_by = 'facility',
            move_in_date = EXCLUDED.move_in_date,
            placement_value = EXCLUDED.placement_value,
            care_level = EXCLUDED.care_level,
            notes = EXCLUDED.notes,
            reported_at = NOW(),
            confirmed_at = NULL,
            confirmed_by = NULL;

        v_event_type := 'placement_reported';

    ELSIF p_action = 'report_lost' THEN
        IF v_facility_status NOT IN ('accepted', 'tour_scheduled') THEN
            RAISE EXCEPTION 'The referral is not active';
        END IF;
        v_reason := NULLIF(LEFT(TRIM(p_details ->> 'reason'), 1000), '');
        IF v_reason IS NULL THEN
            RAISE EXCEPTION 'A lost reason is required';
        END IF;

        UPDATE public.network_referral_facilities
        SET status = 'lost',
            outcome_reported_at = COALESCE(outcome_reported_at, NOW()),
            decline_reason = v_reason
        WHERE id = v_referral_facility_id;

        UPDATE public.network_placements
        SET status = 'cancelled',
            notes = concat_ws(E'\n', notes, v_reason)
        WHERE referral_facility_id = v_referral_facility_id
          AND status = 'reported';

        v_facility_status := 'lost';
        v_event_type := 'referral_lost';
    ELSE
        RAISE EXCEPTION 'Unsupported provider progress action';
    END IF;

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        v_referral_id,
        v_referral_facility_id,
        'facility',
        v_event_type,
        jsonb_strip_nulls(jsonb_build_object(
            'tourScheduledAt', v_tour_at,
            'moveInDate', v_move_in_date,
            'placementValue', v_placement_value,
            'reason', v_reason,
            'careLevel', NULLIF(LEFT(TRIM(p_details ->> 'careLevel'), 200), ''),
            'note', NULLIF(LEFT(TRIM(p_details ->> 'notes'), 2000), '')
        ))
    );

    RETURN v_facility_status;
END;
$$;

REVOKE ALL ON FUNCTION public.report_network_referral_progress(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_network_referral_progress(TEXT, TEXT, JSONB) TO service_role;

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
        RAISE EXCEPTION 'The delivered referral does not have fee terms';
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
    v_fee_status := CASE WHEN v_outside_protection THEN 'disputed' ELSE 'confirmed' END;

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
        CASE
            WHEN v_outside_protection THEN concat_ws(E'\n', 'Move-in was reported outside the protection window.', v_note)
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
        'fee_confirmed',
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

CREATE OR REPLACE FUNCTION public.update_network_referral_fee(
    p_fee_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fee public.network_referral_fees%ROWTYPE;
    v_referral_id UUID;
    v_note TEXT;
    v_invoice_reference TEXT;
    v_due_at TIMESTAMPTZ;
    v_paid_at TIMESTAMPTZ;
    v_next_status TEXT;
    v_event_type TEXT;
BEGIN
    SELECT *
    INTO v_fee
    FROM public.network_referral_fees
    WHERE id = p_fee_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral fee not found';
    END IF;

    SELECT recipient.referral_id
    INTO v_referral_id
    FROM public.network_referral_facilities recipient
    WHERE recipient.id = v_fee.referral_facility_id;

    v_note := NULLIF(LEFT(TRIM(p_details ->> 'note'), 2000), '');

    CASE p_action
        WHEN 'mark_invoiced' THEN
            IF v_fee.status <> 'confirmed' THEN
                RAISE EXCEPTION 'Only confirmed fees can be invoiced';
            END IF;
            v_invoice_reference := NULLIF(LEFT(TRIM(p_details ->> 'invoiceReference'), 200), '');
            v_due_at := COALESCE(
                NULLIF(p_details ->> 'dueAt', '')::TIMESTAMPTZ,
                NOW() + INTERVAL '30 days'
            );
            IF v_invoice_reference IS NULL OR v_due_at <= NOW() - INTERVAL '1 day' THEN
                RAISE EXCEPTION 'Invoice reference and a valid due date are required';
            END IF;
            UPDATE public.network_referral_fees
            SET status = 'invoiced',
                invoice_reference = v_invoice_reference,
                invoiced_at = NOW(),
                due_at = v_due_at,
                notes = COALESCE(v_note, notes)
            WHERE id = p_fee_id;
            v_next_status := 'invoiced';
            v_event_type := 'fee_invoiced';

        WHEN 'mark_paid' THEN
            IF v_fee.status NOT IN ('confirmed', 'invoiced') THEN
                RAISE EXCEPTION 'This fee cannot be marked paid';
            END IF;
            v_paid_at := COALESCE(NULLIF(p_details ->> 'paidAt', '')::TIMESTAMPTZ, NOW());
            IF v_paid_at > NOW() + INTERVAL '1 day' THEN
                RAISE EXCEPTION 'Paid date cannot be in the future';
            END IF;
            UPDATE public.network_referral_fees
            SET status = 'paid',
                paid_at = v_paid_at,
                notes = COALESCE(v_note, notes)
            WHERE id = p_fee_id;
            v_next_status := 'paid';
            v_event_type := 'fee_paid';

        WHEN 'mark_disputed' THEN
            IF v_fee.status NOT IN ('confirmed', 'invoiced') OR v_note IS NULL THEN
                RAISE EXCEPTION 'A dispute reason is required for an open fee';
            END IF;
            UPDATE public.network_referral_fees
            SET status = 'disputed',
                disputed_at = NOW(),
                notes = concat_ws(E'\n', notes, v_note)
            WHERE id = p_fee_id;
            v_next_status := 'disputed';
            v_event_type := 'fee_disputed';

        WHEN 'resolve_confirmed' THEN
            IF v_fee.status <> 'disputed' OR v_note IS NULL THEN
                RAISE EXCEPTION 'A resolution note is required';
            END IF;
            UPDATE public.network_referral_fees
            SET status = 'confirmed',
                disputed_at = NULL,
                notes = concat_ws(E'\n', notes, v_note)
            WHERE id = p_fee_id;
            v_next_status := 'confirmed';
            v_event_type := 'fee_dispute_resolved';

        WHEN 'waive' THEN
            IF v_fee.status NOT IN ('confirmed', 'invoiced', 'disputed') OR v_note IS NULL THEN
                RAISE EXCEPTION 'A waiver reason is required for an open fee';
            END IF;
            UPDATE public.network_referral_fees
            SET status = 'waived',
                waived_at = NOW(),
                notes = concat_ws(E'\n', notes, v_note)
            WHERE id = p_fee_id;
            v_next_status := 'waived';
            v_event_type := 'fee_waived';

        ELSE
            RAISE EXCEPTION 'Unsupported referral fee action';
    END CASE;

    INSERT INTO public.network_referral_fee_events (
        fee_id,
        actor_user_id,
        event_type,
        details
    ) VALUES (
        p_fee_id,
        p_actor_user_id,
        v_event_type,
        jsonb_strip_nulls(jsonb_build_object(
            'status', v_next_status,
            'invoiceReference', v_invoice_reference,
            'dueAt', v_due_at,
            'paidAt', v_paid_at,
            'note', v_note
        ))
    );

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        v_referral_id,
        v_fee.referral_facility_id,
        p_actor_user_id,
        'admin',
        v_event_type,
        jsonb_strip_nulls(jsonb_build_object(
            'feeId', p_fee_id,
            'status', v_next_status,
            'invoiceReference', v_invoice_reference,
            'note', v_note
        ))
    );

    RETURN v_next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.update_network_referral_fee(UUID, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_network_referral_fee(UUID, TEXT, JSONB, UUID) TO service_role;

COMMENT ON COLUMN public.network_referral_facilities.terms_snapshotted_at IS
    'When the facility agreement terms became immutable for this delivered referral.';
COMMENT ON TABLE public.network_placements IS
    'Provider-reported and staff-confirmed move-in outcomes for Crown Network referrals.';
COMMENT ON TABLE public.network_referral_fees IS
    'Immutable calculated fee amount with mutable invoice, payment, dispute, and waiver status.';
COMMENT ON TABLE public.network_referral_fee_events IS
    'Append-only audit history for referral fee lifecycle changes.';
