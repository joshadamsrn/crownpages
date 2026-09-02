-- Prefill review-ready Crown Network referral settings from PHN profile data.
-- This migration deliberately does not activate agreements, change referral
-- status, or enable the accepting-referrals switch.

ALTER TABLE public.network_facilities
    DROP CONSTRAINT IF EXISTS network_facilities_eligible_agreement_check,
    DROP CONSTRAINT IF EXISTS network_facilities_accepting_requirements_check;

ALTER TABLE public.network_facilities
    ADD CONSTRAINT network_facilities_eligible_agreement_check
        CHECK (
            referral_status <> 'eligible'
            OR agreement_status = 'active'
            OR (
                referral_fee_type = 'none'
                AND care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
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
                        AND care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
                    )
                )
            )
        );

CREATE TEMP TABLE crown_network_referral_prefill ON COMMIT DROP AS
WITH raw_profile_emails AS (
    SELECT
        facility.id AS facility_id,
        LOWER(BTRIM(
            CASE section ->> 'type'
                WHEN 'contactCard' THEN section -> 'data' ->> 'email'
                WHEN 'linksWithContact' THEN section -> 'data' ->> 'contactEmail'
                WHEN 'contact' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
                WHEN 'personalContact' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
                WHEN 'medicalProvider' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
            END
        )) AS profile_email
    FROM public.network_facilities facility
    JOIN public.pages page ON page.id = facility.page_id
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(page.content -> 'sections') = 'array'
                THEN page.content -> 'sections'
            ELSE '[]'::JSONB
        END
    ) AS section
),
unique_profile_emails AS (
    SELECT
        facility_id,
        MIN(profile_email) AS profile_email
    FROM raw_profile_emails
    WHERE profile_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    GROUP BY facility_id
    HAVING COUNT(DISTINCT profile_email) = 1
)
SELECT
    facility.id AS facility_id,
    to_jsonb(facility) AS before_state,
    profile.profile_email,
    facility.care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
        AS is_insurance_covered_provider
FROM public.network_facilities facility
LEFT JOIN unique_profile_emails profile ON profile.facility_id = facility.id;

UPDATE public.network_facilities facility
SET notification_email = CASE
        -- Never reroute a facility that is already receiving live referrals.
        WHEN facility.is_accepting_referrals THEN facility.notification_email
        ELSE COALESCE(prefill.profile_email, facility.notification_email)
    END,
    agreement_status = CASE
        WHEN prefill.is_insurance_covered_provider THEN 'not_contacted'
        ELSE facility.agreement_status
    END,
    referral_fee_type = CASE
        WHEN prefill.is_insurance_covered_provider THEN 'none'
        ELSE 'flat'
    END,
    referral_fee_amount = CASE
        WHEN prefill.is_insurance_covered_provider THEN NULL
        ELSE 2600.00
    END,
    referral_fee_percentage = NULL,
    referral_protection_days = CASE
        WHEN prefill.is_insurance_covered_provider THEN facility.referral_protection_days
        ELSE 180
    END,
    agreement_effective_at = CASE
        WHEN prefill.is_insurance_covered_provider THEN NULL
        ELSE '2026-09-01T00:00:00Z'::TIMESTAMPTZ
    END,
    agreement_expires_at = CASE
        WHEN prefill.is_insurance_covered_provider THEN NULL
        ELSE '3026-09-01T00:00:00Z'::TIMESTAMPTZ
    END,
    referral_terms_version = CASE
        WHEN prefill.is_insurance_covered_provider THEN NULL
        ELSE 'Flat $2,600'
    END,
    updated_at = NOW()
FROM crown_network_referral_prefill prefill
WHERE facility.id = prefill.facility_id;

INSERT INTO public.network_facility_events (
    facility_id,
    actor_user_id,
    event_type,
    details
)
SELECT
    prefill.facility_id,
    NULL,
    'referral_defaults_prefilled',
    jsonb_build_object(
        'before', prefill.before_state - ARRAY['searchable_text', 'amenities'],
        'after', to_jsonb(facility) - ARRAY['searchable_text', 'amenities'],
        'notificationEmailSource', CASE
            WHEN prefill.profile_email IS NULL THEN 'missing_profile_email'
            WHEN facility.is_accepting_referrals THEN 'preserved_active_address'
            ELSE 'profile_contact'
        END,
        'requiresVerification', TRUE
    )
FROM crown_network_referral_prefill prefill
JOIN public.network_facilities facility ON facility.id = prefill.facility_id
WHERE prefill.before_state IS DISTINCT FROM to_jsonb(facility);

CREATE OR REPLACE FUNCTION public.prefill_new_network_facility_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_profile_email TEXT;
BEGIN
    IF NEW.source_system <> 'phn' THEN
        RETURN NEW;
    END IF;

    WITH raw_profile_emails AS (
        SELECT LOWER(BTRIM(
            CASE section ->> 'type'
                WHEN 'contactCard' THEN section -> 'data' ->> 'email'
                WHEN 'linksWithContact' THEN section -> 'data' ->> 'contactEmail'
                WHEN 'contact' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
                WHEN 'personalContact' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
                WHEN 'medicalProvider' THEN COALESCE(
                    section -> 'data' ->> 'email',
                    section -> 'data' ->> 'contactEmail'
                )
            END
        )) AS profile_email
        FROM public.pages page
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(page.content -> 'sections') = 'array'
                    THEN page.content -> 'sections'
                ELSE '[]'::JSONB
            END
        ) AS section
        WHERE page.id = NEW.page_id
    )
    SELECT MIN(profile_email)
    INTO v_profile_email
    FROM raw_profile_emails
    WHERE profile_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    HAVING COUNT(DISTINCT profile_email) = 1;

    NEW.notification_email := COALESCE(v_profile_email, NEW.notification_email);

    IF NEW.referral_fee_type IS NULL THEN
        IF NEW.care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[] THEN
            NEW.agreement_status := 'not_contacted';
            NEW.referral_fee_type := 'none';
            NEW.referral_fee_amount := NULL;
            NEW.referral_fee_percentage := NULL;
            NEW.agreement_effective_at := NULL;
            NEW.agreement_expires_at := NULL;
            NEW.referral_terms_version := NULL;
        ELSE
            NEW.referral_fee_type := 'flat';
            NEW.referral_fee_amount := 2600.00;
            NEW.referral_fee_percentage := NULL;
            NEW.referral_protection_days := 180;
            NEW.agreement_effective_at := '2026-09-01T00:00:00Z'::TIMESTAMPTZ;
            NEW.agreement_expires_at := '3026-09-01T00:00:00Z'::TIMESTAMPTZ;
            NEW.referral_terms_version := 'Flat $2,600';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prefill_new_network_facility_defaults_before_insert
ON public.network_facilities;
CREATE TRIGGER prefill_new_network_facility_defaults_before_insert
BEFORE INSERT ON public.network_facilities
FOR EACH ROW EXECUTE FUNCTION public.prefill_new_network_facility_defaults();

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
                  AND facility.care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
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
                AND NEW.care_types && ARRAY['Skilled Nursing', 'Home Health', 'Hospice']::TEXT[]
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

COMMENT ON FUNCTION public.prefill_new_network_facility_defaults() IS
    'Prefills review-only referral email and standard terms for newly synchronized PHN profiles.';
