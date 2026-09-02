-- Preserve discovery data when an older operations client submits facility
-- settings without the fields added for family-facing search filters.

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
