-- Crown Network facility onboarding and commercial eligibility.
-- PHN/Crown Pages profiles remain the marketing-content source while this
-- table owns partner participation, routing, and referral terms.

ALTER TABLE public.network_facilities
    ADD COLUMN IF NOT EXISTS notification_email TEXT,
    ADD COLUMN IF NOT EXISTS agreement_status TEXT NOT NULL DEFAULT 'not_contacted',
    ADD COLUMN IF NOT EXISTS referral_fee_type TEXT,
    ADD COLUMN IF NOT EXISTS referral_fee_amount NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS referral_fee_percentage NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS referral_protection_days INTEGER NOT NULL DEFAULT 180,
    ADD COLUMN IF NOT EXISTS agreement_effective_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS agreement_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS referral_terms_version TEXT,
    ADD COLUMN IF NOT EXISTS agreement_notes TEXT;

-- Preserve the working staging pilot. Any other pre-existing eligible record
-- without a usable provider address is safely paused below.
UPDATE public.network_facilities facility
SET notification_email = LOWER(TRIM(business.email))
FROM public.businesses business
WHERE business.id = facility.business_id
  AND NULLIF(TRIM(business.email), '') IS NOT NULL
  AND facility.notification_email IS NULL;

UPDATE public.network_facilities
SET agreement_status = 'active',
    referral_fee_type = COALESCE(referral_fee_type, 'custom'),
    agreement_effective_at = COALESCE(agreement_effective_at, NOW()),
    referral_terms_version = COALESCE(referral_terms_version, 'legacy-pilot-v1')
WHERE referral_status = 'eligible'
  AND is_accepting_referrals = TRUE
  AND notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

UPDATE public.network_facilities
SET referral_status = 'paused',
    is_accepting_referrals = FALSE
WHERE referral_status = 'eligible'
  AND (
      agreement_status <> 'active'
      OR notification_email IS NULL
      OR notification_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_agreement_status_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_agreement_status_check
            CHECK (agreement_status IN ('not_contacted', 'pending', 'active', 'inactive'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_referral_fee_type_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_referral_fee_type_check
            CHECK (referral_fee_type IS NULL OR referral_fee_type IN ('flat', 'percentage', 'custom'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_notification_email_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_notification_email_check
            CHECK (
                notification_email IS NULL
                OR notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_referral_fee_amount_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_referral_fee_amount_check
            CHECK (referral_fee_amount IS NULL OR referral_fee_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_referral_fee_percentage_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_referral_fee_percentage_check
            CHECK (
                referral_fee_percentage IS NULL
                OR referral_fee_percentage > 0 AND referral_fee_percentage <= 100
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_referral_protection_days_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_referral_protection_days_check
            CHECK (referral_protection_days BETWEEN 1 AND 730);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_agreement_dates_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_agreement_dates_check
            CHECK (
                agreement_effective_at IS NULL
                OR agreement_expires_at IS NULL
                OR agreement_expires_at > agreement_effective_at
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_eligible_agreement_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_eligible_agreement_check
            CHECK (referral_status <> 'eligible' OR agreement_status = 'active');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'network_facilities_accepting_requirements_check') THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_accepting_requirements_check
            CHECK (
                is_accepting_referrals = FALSE
                OR (
                    referral_status = 'eligible'
                    AND agreement_status = 'active'
                    AND notification_email IS NOT NULL
                )
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_network_facilities_agreement
    ON public.network_facilities(agreement_status, agreement_expires_at);

CREATE TABLE IF NOT EXISTS public.network_facility_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.network_facilities(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_facility_events_facility
    ON public.network_facility_events(facility_id, created_at DESC);

ALTER TABLE public.network_facility_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.network_facility_events FROM anon, authenticated;

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
          AND facility.agreement_status = 'active'
          AND facility.notification_email IS NOT NULL
          AND (facility.agreement_effective_at IS NULL OR facility.agreement_effective_at <= NOW())
          AND (facility.agreement_expires_at IS NULL OR facility.agreement_expires_at > NOW())
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
BEGIN
    DELETE FROM public.network_facility_services service
    WHERE service.facility_id = NEW.id
      AND NOT (service.service_type = ANY(NEW.care_types));

    INSERT INTO public.network_facility_services (
        facility_id,
        service_type,
        is_available,
        referral_enabled
    )
    SELECT
        NEW.id,
        care_type,
        TRUE,
        NEW.referral_status = 'eligible'
            AND NEW.is_accepting_referrals
            AND NEW.agreement_status = 'active'
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
AFTER INSERT OR UPDATE OF care_types, referral_status, is_accepting_referrals, agreement_status
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
            RAISE EXCEPTION 'The facility does not have an active Crown Network referral agreement';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_network_referral_facility_eligibility_before_change
ON public.network_referral_facilities;
CREATE TRIGGER validate_network_referral_facility_eligibility_before_change
BEFORE INSERT OR UPDATE OF status ON public.network_referral_facilities
FOR EACH ROW EXECUTE FUNCTION public.validate_network_referral_facility_eligibility();

CREATE OR REPLACE FUNCTION public.sync_phn_network_facilities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_synced_count INTEGER;
BEGIN
    INSERT INTO public.network_facilities (
        business_id,
        page_id,
        source_system,
        source_facility_id,
        listing_status,
        care_types,
        searchable_text,
        notification_email
    )
    SELECT
        page.business_id,
        page.id,
        'phn',
        page.content -> 'importSource' ->> 'facilityId',
        'listed',
        array_remove(ARRAY[
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%assisted living%' THEN 'Assisted Living' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%independent living%' THEN 'Independent Living' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%memory care%' THEN 'Memory Care' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%skilled nursing%' THEN 'Skilled Nursing' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%home health%' THEN 'Home Health' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE '%hospice%' THEN 'Hospice' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE ANY (ARRAY['%in-home care%', '%in home care%']) THEN 'In-Home Care' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE ANY (ARRAY['%durable medical equipment%', '%medical equipment%']) THEN 'Durable Medical Equipment' END,
            CASE WHEN concat_ws(' ', page.description, page.content::TEXT) ILIKE ANY (ARRAY['%medical transportation%', '%senior transportation%']) THEN 'Transportation' END
        ]::TEXT[], NULL),
        concat_ws(' ', page.title, page.description, business.name, business.city, business.state, business.zip_code, page.content::TEXT),
        CASE
            WHEN NULLIF(TRIM(business.email), '') IS NOT NULL THEN LOWER(TRIM(business.email))
            ELSE NULL
        END
    FROM public.pages page
    JOIN public.businesses business ON business.id = page.business_id
    WHERE page.content -> 'importSource' ->> 'source' = 'phn'
    ON CONFLICT (business_id) DO UPDATE SET
        page_id = EXCLUDED.page_id,
        source_system = CASE
            WHEN network_facilities.source_system = 'crown_pages' THEN EXCLUDED.source_system
            ELSE network_facilities.source_system
        END,
        source_facility_id = COALESCE(EXCLUDED.source_facility_id, network_facilities.source_facility_id),
        care_types = EXCLUDED.care_types,
        searchable_text = EXCLUDED.searchable_text,
        notification_email = COALESCE(network_facilities.notification_email, EXCLUDED.notification_email),
        updated_at = NOW();

    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    RETURN v_synced_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_phn_network_facilities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_phn_network_facilities() TO service_role;

CREATE OR REPLACE FUNCTION public.update_network_facility_settings(
    p_facility_id UUID,
    p_settings JSONB,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_before JSONB;
    v_after JSONB;
BEGIN
    IF jsonb_typeof(p_settings) <> 'object' THEN
        RAISE EXCEPTION 'Facility settings must be an object';
    END IF;

    SELECT to_jsonb(facility)
    INTO v_before
    FROM public.network_facilities facility
    WHERE facility.id = p_facility_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facility not found';
    END IF;

    UPDATE public.network_facilities
    SET listing_status = p_settings ->> 'listingStatus',
        referral_status = p_settings ->> 'referralStatus',
        is_accepting_referrals = COALESCE((p_settings ->> 'isAcceptingReferrals')::BOOLEAN, FALSE),
        care_types = ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(p_settings -> 'careTypes', '[]'::JSONB))
        ),
        notification_email = NULLIF(LOWER(TRIM(p_settings ->> 'notificationEmail')), ''),
        agreement_status = p_settings ->> 'agreementStatus',
        referral_fee_type = NULLIF(p_settings ->> 'referralFeeType', ''),
        referral_fee_amount = NULLIF(p_settings ->> 'referralFeeAmount', '')::NUMERIC,
        referral_fee_percentage = NULLIF(p_settings ->> 'referralFeePercentage', '')::NUMERIC,
        referral_protection_days = (p_settings ->> 'referralProtectionDays')::INTEGER,
        agreement_effective_at = NULLIF(p_settings ->> 'agreementEffectiveAt', '')::TIMESTAMPTZ,
        agreement_expires_at = NULLIF(p_settings ->> 'agreementExpiresAt', '')::TIMESTAMPTZ,
        referral_terms_version = NULLIF(LEFT(TRIM(p_settings ->> 'referralTermsVersion'), 100), ''),
        agreement_notes = NULLIF(LEFT(TRIM(p_settings ->> 'agreementNotes'), 4000), '')
    WHERE id = p_facility_id;

    SELECT to_jsonb(facility)
    INTO v_after
    FROM public.network_facilities facility
    WHERE facility.id = p_facility_id;

    INSERT INTO public.network_facility_events (
        facility_id,
        actor_user_id,
        event_type,
        details
    ) VALUES (
        p_facility_id,
        p_actor_user_id,
        'settings_updated',
        jsonb_build_object(
            'before', v_before - ARRAY['searchable_text', 'amenities'],
            'after', v_after - ARRAY['searchable_text', 'amenities']
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_network_facility_settings(UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_network_facility_settings(UUID, JSONB, UUID) TO service_role;

-- Pick up any PHN pages added since the foundation migration.
SELECT public.sync_phn_network_facilities();

COMMENT ON COLUMN public.network_facilities.notification_email IS
    'Operational address for privacy-safe secure referral notifications; separate from the public business email.';
COMMENT ON COLUMN public.network_facilities.agreement_status IS
    'Commercial participation state. Only active agreements can receive Crown Network referrals.';
COMMENT ON TABLE public.network_facility_events IS
    'Append-only audit trail for staff changes to facility participation and referral terms.';
