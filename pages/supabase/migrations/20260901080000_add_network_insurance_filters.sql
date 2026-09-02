-- Add structured insurance-plan discovery for insurance-funded care services.

ALTER TABLE public.network_facilities
    ADD COLUMN IF NOT EXISTS accepted_insurances TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'network_facilities_accepted_insurances_check'
    ) THEN
        ALTER TABLE public.network_facilities
            ADD CONSTRAINT network_facilities_accepted_insurances_check
            CHECK (
                cardinality(accepted_insurances) <= 100
                AND array_position(accepted_insurances, NULL) IS NULL
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_network_facilities_accepted_insurances
    ON public.network_facilities USING GIN(accepted_insurances);

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
        notification_email,
        latitude,
        longitude,
        price_low,
        price_high,
        price_period,
        accepted_insurances
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
        END,
        NULLIF(page.content #>> '{importSource,network,latitude}', '')::DOUBLE PRECISION,
        NULLIF(page.content #>> '{importSource,network,longitude}', '')::DOUBLE PRECISION,
        NULLIF(page.content #>> '{importSource,network,priceLow}', '')::NUMERIC,
        NULLIF(page.content #>> '{importSource,network,priceHigh}', '')::NUMERIC,
        CASE
            WHEN page.content #>> '{importSource,network,pricePeriod}' IN ('hour', 'day', 'week', 'month')
                THEN page.content #>> '{importSource,network,pricePeriod}'
            ELSE NULL
        END,
        CASE
            WHEN jsonb_typeof(page.content #> '{importSource,network,acceptedInsurances}') = 'array'
                THEN ARRAY(
                    SELECT DISTINCT TRIM(value)
                    FROM jsonb_array_elements_text(
                        page.content #> '{importSource,network,acceptedInsurances}'
                    ) AS insurance(value)
                    WHERE NULLIF(TRIM(value), '') IS NOT NULL
                    LIMIT 100
                )
            ELSE '{}'::TEXT[]
        END
    FROM public.pages page
    JOIN public.businesses business ON business.id = page.business_id
    WHERE page.content -> 'importSource' ->> 'source' = 'phn'
      AND page.is_active IS TRUE
      AND page.is_published IS TRUE
      AND business.is_active IS TRUE
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
        latitude = COALESCE(EXCLUDED.latitude, network_facilities.latitude),
        longitude = COALESCE(EXCLUDED.longitude, network_facilities.longitude),
        price_low = COALESCE(EXCLUDED.price_low, network_facilities.price_low),
        price_high = COALESCE(EXCLUDED.price_high, network_facilities.price_high),
        price_period = COALESCE(EXCLUDED.price_period, network_facilities.price_period),
        accepted_insurances = CASE
            WHEN cardinality(network_facilities.accepted_insurances) = 0
                THEN EXCLUDED.accepted_insurances
            ELSE network_facilities.accepted_insurances
        END,
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
        accepted_insurances = CASE
            WHEN p_settings ? 'acceptedInsurances' THEN ARRAY(
                SELECT DISTINCT TRIM(value)
                FROM jsonb_array_elements_text(
                    COALESCE(p_settings -> 'acceptedInsurances', '[]'::JSONB)
                ) AS insurance(value)
                WHERE NULLIF(TRIM(value), '') IS NOT NULL
                LIMIT 100
            )
            ELSE accepted_insurances
        END,
        notification_email = NULLIF(LOWER(TRIM(p_settings ->> 'notificationEmail')), ''),
        agreement_status = p_settings ->> 'agreementStatus',
        referral_fee_type = NULLIF(p_settings ->> 'referralFeeType', ''),
        referral_fee_amount = NULLIF(p_settings ->> 'referralFeeAmount', '')::NUMERIC,
        referral_fee_percentage = NULLIF(p_settings ->> 'referralFeePercentage', '')::NUMERIC,
        referral_protection_days = (p_settings ->> 'referralProtectionDays')::INTEGER,
        agreement_effective_at = NULLIF(p_settings ->> 'agreementEffectiveAt', '')::TIMESTAMPTZ,
        agreement_expires_at = NULLIF(p_settings ->> 'agreementExpiresAt', '')::TIMESTAMPTZ,
        referral_terms_version = NULLIF(LEFT(TRIM(p_settings ->> 'referralTermsVersion'), 100), ''),
        agreement_notes = NULLIF(LEFT(TRIM(p_settings ->> 'agreementNotes'), 4000), ''),
        latitude = CASE
            WHEN p_settings ? 'latitude' THEN NULLIF(p_settings ->> 'latitude', '')::DOUBLE PRECISION
            ELSE latitude
        END,
        longitude = CASE
            WHEN p_settings ? 'longitude' THEN NULLIF(p_settings ->> 'longitude', '')::DOUBLE PRECISION
            ELSE longitude
        END,
        price_low = CASE
            WHEN p_settings ? 'priceLow' THEN NULLIF(p_settings ->> 'priceLow', '')::NUMERIC
            ELSE price_low
        END,
        price_high = CASE
            WHEN p_settings ? 'priceHigh' THEN NULLIF(p_settings ->> 'priceHigh', '')::NUMERIC
            ELSE price_high
        END,
        price_period = CASE
            WHEN p_settings ? 'pricePeriod' THEN NULLIF(p_settings ->> 'pricePeriod', '')
            ELSE price_period
        END
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

SELECT public.sync_phn_network_facilities();

COMMENT ON COLUMN public.network_facilities.accepted_insurances IS
    'Public insurance plans accepted for family discovery. Coverage and authorization must be confirmed with the provider.';
