-- Close competing provider access after a confirmed placement and make the
-- calculated economics of a referral fee immutable.

CREATE OR REPLACE FUNCTION public.reconcile_network_referral_outcomes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'lost' AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE public.network_placements
        SET status = 'cancelled',
            notes = concat_ws(E'\n', notes, NEW.decline_reason)
        WHERE referral_facility_id = NEW.id
          AND status = 'reported';
    END IF;

    IF NEW.status = 'placed' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.network_referral_events (
            referral_id,
            referral_facility_id,
            actor_type,
            event_type,
            details
        )
        SELECT
            other.referral_id,
            other.id,
            'system',
            'referral_closed_after_other_placement',
            jsonb_build_object('placedReferralFacilityId', NEW.id)
        FROM public.network_referral_facilities other
        WHERE other.referral_id = NEW.referral_id
          AND other.id <> NEW.id
          AND other.status IN ('pending', 'delivered', 'viewed', 'accepted', 'tour_scheduled');

        UPDATE public.network_referral_facilities other
        SET status = 'lost',
            outcome_reported_at = COALESCE(other.outcome_reported_at, NOW()),
            decline_reason = COALESCE(
                other.decline_reason,
                'Placement confirmed with another provider.'
            )
        WHERE other.referral_id = NEW.referral_id
          AND other.id <> NEW.id
          AND other.status IN ('pending', 'delivered', 'viewed', 'accepted', 'tour_scheduled');

        UPDATE public.network_referral_access_tokens token
        SET revoked_at = NOW()
        FROM public.network_referral_facilities other
        WHERE other.referral_id = NEW.referral_id
          AND other.id <> NEW.id
          AND token.referral_facility_id = other.id
          AND token.revoked_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reconcile_network_referral_outcomes_after_status
ON public.network_referral_facilities;
CREATE TRIGGER reconcile_network_referral_outcomes_after_status
AFTER UPDATE OF status ON public.network_referral_facilities
FOR EACH ROW EXECUTE FUNCTION public.reconcile_network_referral_outcomes();

CREATE OR REPLACE FUNCTION public.prevent_network_referral_fee_economics_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.placement_id IS DISTINCT FROM OLD.placement_id
       OR NEW.referral_facility_id IS DISTINCT FROM OLD.referral_facility_id
       OR NEW.fee_type IS DISTINCT FROM OLD.fee_type
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.calculation_basis IS DISTINCT FROM OLD.calculation_basis THEN
        RAISE EXCEPTION 'Calculated referral fee economics are immutable';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_network_referral_fee_economics_change_before_update
ON public.network_referral_fees;
CREATE TRIGGER prevent_network_referral_fee_economics_change_before_update
BEFORE UPDATE OF
    placement_id,
    referral_facility_id,
    fee_type,
    amount,
    currency,
    calculation_basis
ON public.network_referral_fees
FOR EACH ROW EXECUTE FUNCTION public.prevent_network_referral_fee_economics_change();

COMMENT ON FUNCTION public.reconcile_network_referral_outcomes() IS
    'Closes competing provider access after placement and cancels unconfirmed placement reports when a referral is lost.';
