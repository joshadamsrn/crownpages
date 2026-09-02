-- Crown Network discovery and referral foundation.
-- This migration is intentionally additive: existing Crown Pages businesses and
-- pages remain the source of marketing content while Network owns discovery,
-- consent, attribution, and referral workflow state.

CREATE TABLE IF NOT EXISTS public.network_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    page_id UUID NOT NULL UNIQUE REFERENCES public.pages(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL DEFAULT 'crown_pages',
    source_facility_id TEXT,
    listing_status TEXT NOT NULL DEFAULT 'listed'
        CHECK (listing_status IN ('listed', 'verified', 'partner', 'hidden')),
    referral_status TEXT NOT NULL DEFAULT 'disabled'
        CHECK (referral_status IN ('disabled', 'eligible', 'paused')),
    is_accepting_referrals BOOLEAN NOT NULL DEFAULT FALSE,
    care_types TEXT[] NOT NULL DEFAULT '{}',
    amenities TEXT[] NOT NULL DEFAULT '{}',
    searchable_text TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    price_low NUMERIC(12, 2),
    price_high NUMERIC(12, 2),
    price_period TEXT CHECK (price_period IS NULL OR price_period IN ('hour', 'day', 'week', 'month')),
    availability_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (availability_status IN ('unknown', 'available', 'waitlist', 'unavailable')),
    license_number TEXT,
    license_state TEXT,
    license_verified_at TIMESTAMPTZ,
    profile_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (price_low IS NULL OR price_low >= 0),
    CHECK (price_high IS NULL OR price_high >= 0),
    CHECK (price_low IS NULL OR price_high IS NULL OR price_high >= price_low),
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_facilities_source
    ON public.network_facilities(source_system, source_facility_id)
    WHERE source_facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_network_facilities_listing
    ON public.network_facilities(listing_status, referral_status, is_accepting_referrals);
CREATE INDEX IF NOT EXISTS idx_network_facilities_care_types
    ON public.network_facilities USING GIN(care_types);
CREATE INDEX IF NOT EXISTS idx_network_facilities_search
    ON public.network_facilities USING GIN(to_tsvector('english', searchable_text));

CREATE TABLE IF NOT EXISTS public.network_facility_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.network_facilities(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    referral_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    private_pay_only BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (facility_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_network_facility_services_type
    ON public.network_facility_services(service_type, is_available);

CREATE TABLE IF NOT EXISTS public.network_care_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'matched', 'closed', 'archived')),
    contact_first_name TEXT NOT NULL,
    contact_last_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    preferred_contact_method TEXT
        CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'sms')),
    relationship_to_recipient TEXT,
    desired_city TEXT,
    desired_state TEXT,
    desired_zip_code TEXT,
    search_radius_miles INTEGER CHECK (search_radius_miles IS NULL OR search_radius_miles BETWEEN 1 AND 500),
    care_types TEXT[] NOT NULL DEFAULT '{}',
    move_timeframe TEXT,
    budget_low NUMERIC(12, 2),
    budget_high NUMERIC(12, 2),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (budget_low IS NULL OR budget_low >= 0),
    CHECK (budget_high IS NULL OR budget_high >= 0),
    CHECK (budget_low IS NULL OR budget_high IS NULL OR budget_high >= budget_low)
);

CREATE INDEX IF NOT EXISTS idx_network_care_searches_consumer
    ON public.network_care_searches(consumer_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.network_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_search_id UUID NOT NULL REFERENCES public.network_care_searches(id) ON DELETE RESTRICT,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'matching', 'delivered', 'touring', 'placed', 'closed', 'cancelled')),
    referral_source TEXT NOT NULL DEFAULT 'crown_network',
    attribution_code TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
    protection_expires_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referrals_consumer
    ON public.network_referrals(submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_referrals_status
    ON public.network_referrals(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.network_referral_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.network_referrals(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.network_facilities(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'delivered', 'viewed', 'accepted', 'declined', 'duplicate', 'tour_scheduled', 'placed', 'lost')),
    delivered_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    tour_scheduled_at TIMESTAMPTZ,
    outcome_reported_at TIMESTAMPTZ,
    decline_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referral_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_network_referral_facilities_facility
    ON public.network_referral_facilities(facility_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.network_referral_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.network_referrals(id) ON DELETE RESTRICT,
    consumer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    disclosure_version TEXT NOT NULL,
    disclosure_text TEXT NOT NULL,
    facility_ids UUID[] NOT NULL,
    allow_email BOOLEAN NOT NULL DEFAULT FALSE,
    allow_phone BOOLEAN NOT NULL DEFAULT FALSE,
    allow_sms BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_consents_referral
    ON public.network_referral_consents(referral_id, granted_at DESC);

CREATE TABLE IF NOT EXISTS public.network_referral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.network_referrals(id) ON DELETE CASCADE,
    referral_facility_id UUID REFERENCES public.network_referral_facilities(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL
        CHECK (actor_type IN ('consumer', 'facility', 'navigator', 'admin', 'system')),
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_events_referral
    ON public.network_referral_events(referral_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.network_referral_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_facility_id UUID NOT NULL REFERENCES public.network_referral_facilities(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0 CHECK (access_count >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_referral_access_tokens_active
    ON public.network_referral_access_tokens(referral_facility_id)
    WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_network_referral_access_tokens_expiry
    ON public.network_referral_access_tokens(expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.network_referral_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_facility_id UUID NOT NULL REFERENCES public.network_referral_facilities(id) ON DELETE CASCADE,
    access_token_id UUID NOT NULL REFERENCES public.network_referral_access_tokens(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    provider_message_id TEXT,
    error_message TEXT,
    attempted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_notifications_recipient
    ON public.network_referral_notifications(referral_facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_referral_notifications_status
    ON public.network_referral_notifications(status, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_network_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_network_facilities_updated_at ON public.network_facilities;
CREATE TRIGGER set_network_facilities_updated_at
BEFORE UPDATE ON public.network_facilities
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_facility_services_updated_at ON public.network_facility_services;
CREATE TRIGGER set_network_facility_services_updated_at
BEFORE UPDATE ON public.network_facility_services
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_care_searches_updated_at ON public.network_care_searches;
CREATE TRIGGER set_network_care_searches_updated_at
BEFORE UPDATE ON public.network_care_searches
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_referrals_updated_at ON public.network_referrals;
CREATE TRIGGER set_network_referrals_updated_at
BEFORE UPDATE ON public.network_referrals
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_referral_facilities_updated_at ON public.network_referral_facilities;
CREATE TRIGGER set_network_referral_facilities_updated_at
BEFORE UPDATE ON public.network_referral_facilities
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

DROP TRIGGER IF EXISTS set_network_referral_notifications_updated_at ON public.network_referral_notifications;
CREATE TRIGGER set_network_referral_notifications_updated_at
BEFORE UPDATE ON public.network_referral_notifications
FOR EACH ROW EXECUTE FUNCTION public.set_network_updated_at();

-- Seed Network discovery records from the PHN pages already imported into Crown Pages.
INSERT INTO public.network_facilities (
    business_id,
    page_id,
    source_system,
    source_facility_id,
    listing_status,
    care_types,
    searchable_text
)
SELECT
    p.business_id,
    p.id,
    'phn',
    p.content -> 'importSource' ->> 'facilityId',
    'listed',
    array_remove(ARRAY[
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%assisted living%' THEN 'Assisted Living' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%independent living%' THEN 'Independent Living' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%memory care%' THEN 'Memory Care' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%skilled nursing%' THEN 'Skilled Nursing' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%home health%' THEN 'Home Health' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE '%hospice%' THEN 'Hospice' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE ANY (ARRAY['%in-home care%', '%in home care%']) THEN 'In-Home Care' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE ANY (ARRAY['%durable medical equipment%', '%medical equipment%']) THEN 'Durable Medical Equipment' END,
        CASE WHEN concat_ws(' ', p.description, p.content::text) ILIKE ANY (ARRAY['%medical transportation%', '%senior transportation%']) THEN 'Transportation' END
    ]::TEXT[], NULL),
    concat_ws(' ', p.title, p.description, b.name, b.city, b.state, b.zip_code, p.content::text)
FROM public.pages p
JOIN public.businesses b ON b.id = p.business_id
WHERE p.content -> 'importSource' ->> 'source' = 'phn'
ON CONFLICT (business_id) DO UPDATE SET
    page_id = EXCLUDED.page_id,
    source_system = EXCLUDED.source_system,
    source_facility_id = EXCLUDED.source_facility_id,
    care_types = EXCLUDED.care_types,
    searchable_text = EXCLUDED.searchable_text,
    updated_at = NOW();

ALTER TABLE public.network_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_facility_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_care_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_referral_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_network_referral(p_referral_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.network_referrals r
        WHERE r.id = p_referral_id
          AND r.submitted_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.network_referral_facilities rf
        JOIN public.network_facilities nf ON nf.id = rf.facility_id
        WHERE rf.referral_id = p_referral_id
          AND public.can_access_crm_business(nf.business_id)
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_network_referral(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_network_referral(UUID) TO authenticated;

DROP POLICY IF EXISTS "network facilities are publicly readable" ON public.network_facilities;
CREATE POLICY "network facilities are publicly readable"
ON public.network_facilities FOR SELECT
USING (
    listing_status IN ('listed', 'verified', 'partner')
    AND EXISTS (
        SELECT 1
        FROM public.pages p
        WHERE p.id = network_facilities.page_id
          AND p.is_active = TRUE
          AND p.is_published = TRUE
    )
);

DROP POLICY IF EXISTS "network facility services are publicly readable" ON public.network_facility_services;
CREATE POLICY "network facility services are publicly readable"
ON public.network_facility_services FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.network_facilities nf
        WHERE nf.id = network_facility_services.facility_id
          AND nf.listing_status IN ('listed', 'verified', 'partner')
    )
);

DROP POLICY IF EXISTS "consumers manage their care searches" ON public.network_care_searches;
CREATE POLICY "consumers manage their care searches"
ON public.network_care_searches FOR ALL
USING (consumer_user_id = auth.uid())
WITH CHECK (consumer_user_id = auth.uid());

DROP POLICY IF EXISTS "consumers create their referrals" ON public.network_referrals;
CREATE POLICY "consumers create their referrals"
ON public.network_referrals FOR INSERT
WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.network_care_searches cs
        WHERE cs.id = network_referrals.care_search_id
          AND cs.consumer_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "referral participants can read referrals" ON public.network_referrals;
CREATE POLICY "referral participants can read referrals"
ON public.network_referrals FOR SELECT
USING (public.can_access_network_referral(id));

DROP POLICY IF EXISTS "referral participants can read recipients" ON public.network_referral_facilities;
CREATE POLICY "referral participants can read recipients"
ON public.network_referral_facilities FOR SELECT
USING (public.can_access_network_referral(referral_id));

DROP POLICY IF EXISTS "facilities update delivered recipients" ON public.network_referral_facilities;
CREATE POLICY "facilities update delivered recipients"
ON public.network_referral_facilities FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.network_facilities nf
        WHERE nf.id = network_referral_facilities.facility_id
          AND public.can_access_crm_business(nf.business_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.network_facilities nf
        WHERE nf.id = network_referral_facilities.facility_id
          AND public.can_access_crm_business(nf.business_id)
    )
);

DROP POLICY IF EXISTS "consumers record referral consent" ON public.network_referral_consents;
CREATE POLICY "consumers record referral consent"
ON public.network_referral_consents FOR INSERT
WITH CHECK (
    consumer_user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.network_referrals r
        WHERE r.id = network_referral_consents.referral_id
          AND r.submitted_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "consumers read their referral consent" ON public.network_referral_consents;
CREATE POLICY "consumers read their referral consent"
ON public.network_referral_consents FOR SELECT
USING (consumer_user_id = auth.uid());

DROP POLICY IF EXISTS "referral participants read event history" ON public.network_referral_events;
CREATE POLICY "referral participants read event history"
ON public.network_referral_events FOR SELECT
USING (public.can_access_network_referral(referral_id));

GRANT SELECT ON public.network_facilities TO anon, authenticated;
GRANT SELECT ON public.network_facility_services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_care_searches TO authenticated;
GRANT SELECT, INSERT ON public.network_referrals TO authenticated;
GRANT SELECT, UPDATE ON public.network_referral_facilities TO authenticated;
GRANT SELECT, INSERT ON public.network_referral_consents TO authenticated;
GRANT SELECT ON public.network_referral_events TO authenticated;
REVOKE ALL ON public.network_referral_access_tokens FROM anon, authenticated;
REVOKE ALL ON public.network_referral_notifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_network_referral(
    p_payload JSONB,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_consumer_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_search_id UUID;
    v_referral_id UUID;
    v_page_ids UUID[];
    v_facility_ids UUID[];
    v_requested_facility_count INTEGER;
    v_eligible_facility_count INTEGER;
BEGIN
    IF jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'Referral payload must be an object';
    END IF;

    -- The public directory uses the existing Crown Pages UUID as its stable
    -- provider identifier. Resolve those IDs to Network-only facility IDs here
    -- so the browser never needs to know the internal referral record ID.
    SELECT ARRAY_AGG(DISTINCT value::UUID), COUNT(DISTINCT value::UUID)
    INTO v_page_ids, v_requested_facility_count
    FROM jsonb_array_elements_text(COALESCE(p_payload -> 'facilityIds', '[]'::jsonb));

    IF v_requested_facility_count < 1 OR v_requested_facility_count > 3 THEN
        RAISE EXCEPTION 'Select between one and three facilities';
    END IF;

    SELECT ARRAY_AGG(nf.id ORDER BY nf.id), COUNT(*)
    INTO v_facility_ids, v_eligible_facility_count
    FROM public.network_facilities nf
    JOIN public.pages p ON p.id = nf.page_id
    WHERE nf.page_id = ANY(v_page_ids)
      AND nf.listing_status IN ('listed', 'verified', 'partner')
      AND nf.referral_status = 'eligible'
      AND nf.is_accepting_referrals = TRUE
      AND p.is_active = TRUE
      AND p.is_published = TRUE;

    IF v_eligible_facility_count <> v_requested_facility_count THEN
        RAISE EXCEPTION 'One or more selected facilities are unavailable';
    END IF;

    IF NOT COALESCE((p_payload ->> 'sharingAccepted')::BOOLEAN, FALSE)
       OR NOT COALESCE((p_payload ->> 'compensationAcknowledged')::BOOLEAN, FALSE)
       OR NOT COALESCE((p_payload ->> 'privacyAccepted')::BOOLEAN, FALSE)
       OR NULLIF(p_payload ->> 'disclosureVersion', '') IS NULL
       OR NULLIF(p_payload ->> 'disclosureText', '') IS NULL THEN
        RAISE EXCEPTION 'Complete consent is required';
    END IF;

    INSERT INTO public.network_care_searches (
        consumer_user_id,
        status,
        contact_first_name,
        contact_last_name,
        contact_email,
        contact_phone,
        preferred_contact_method,
        relationship_to_recipient,
        desired_city,
        desired_state,
        desired_zip_code,
        search_radius_miles,
        care_types,
        move_timeframe,
        budget_low,
        budget_high,
        preferences
    ) VALUES (
        p_consumer_user_id,
        'active',
        p_payload ->> 'firstName',
        p_payload ->> 'lastName',
        NULLIF(p_payload ->> 'email', ''),
        NULLIF(p_payload ->> 'phone', ''),
        NULLIF(p_payload ->> 'preferredContactMethod', ''),
        NULLIF(p_payload ->> 'relationship', ''),
        NULLIF(p_payload ->> 'desiredCity', ''),
        NULLIF(p_payload ->> 'desiredState', ''),
        NULLIF(p_payload ->> 'desiredZipCode', ''),
        COALESCE(NULLIF(p_payload ->> 'searchRadiusMiles', '')::INTEGER, 25),
        ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'careTypes', '[]'::jsonb))
        ),
        NULLIF(p_payload ->> 'moveTimeframe', ''),
        NULLIF(p_payload ->> 'budgetLow', '')::NUMERIC,
        NULLIF(p_payload ->> 'budgetHigh', '')::NUMERIC,
        jsonb_build_object(
            'supportNeeds', COALESCE(p_payload -> 'supportNeeds', '[]'::jsonb),
            'preferences', COALESCE(p_payload -> 'preferences', '[]'::jsonb),
            'additionalNotes', COALESCE(p_payload -> 'additionalNotes', 'null'::jsonb),
            'previouslyContactedFacilityIds', COALESCE(p_payload -> 'previouslyContactedFacilityIds', '[]'::jsonb)
        )
    )
    RETURNING id INTO v_search_id;

    INSERT INTO public.network_referrals (
        care_search_id,
        submitted_by,
        status,
        protection_expires_at
    ) VALUES (
        v_search_id,
        p_consumer_user_id,
        'submitted',
        NOW() + INTERVAL '180 days'
    )
    RETURNING id INTO v_referral_id;

    INSERT INTO public.network_referral_facilities (referral_id, facility_id, status)
    SELECT v_referral_id, facility_id, 'pending'
    FROM unnest(v_facility_ids) AS facility_id;

    INSERT INTO public.network_referral_consents (
        referral_id,
        consumer_user_id,
        disclosure_version,
        disclosure_text,
        facility_ids,
        allow_email,
        allow_phone,
        allow_sms,
        ip_address,
        user_agent
    ) VALUES (
        v_referral_id,
        p_consumer_user_id,
        p_payload ->> 'disclosureVersion',
        p_payload ->> 'disclosureText',
        v_facility_ids,
        COALESCE((p_payload ->> 'allowEmail')::BOOLEAN, FALSE),
        COALESCE((p_payload ->> 'allowPhone')::BOOLEAN, FALSE),
        COALESCE((p_payload ->> 'allowSms')::BOOLEAN, FALSE),
        p_ip_address,
        LEFT(p_user_agent, 1000)
    );

    INSERT INTO public.network_referral_events (
        referral_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        v_referral_id,
        p_consumer_user_id,
        CASE WHEN p_consumer_user_id IS NULL THEN 'system' ELSE 'consumer' END,
        'referral_submitted',
        jsonb_build_object('facilityCount', v_requested_facility_count)
    );

    RETURN v_referral_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_network_referral(JSONB, INET, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_network_referral(JSONB, INET, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.operate_network_referral(
    p_referral_id UUID,
    p_action TEXT,
    p_facility_id UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_status TEXT;
    v_referral_facility_id UUID;
    v_facility_status TEXT;
    v_event_type TEXT;
BEGIN
    SELECT status
    INTO v_referral_status
    FROM public.network_referrals
    WHERE id = p_referral_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found';
    END IF;

    IF p_action NOT IN (
        'qualify',
        'request_information',
        'deliver',
        'mark_duplicate',
        'mark_accepted',
        'schedule_tour',
        'mark_placed',
        'mark_lost',
        'close'
    ) THEN
        RAISE EXCEPTION 'Unsupported referral action';
    END IF;

    IF p_action IN (
        'deliver',
        'mark_duplicate',
        'mark_accepted',
        'schedule_tour',
        'mark_placed',
        'mark_lost'
    ) THEN
        IF p_facility_id IS NULL THEN
            RAISE EXCEPTION 'A facility is required for this action';
        END IF;

        SELECT id, status
        INTO v_referral_facility_id, v_facility_status
        FROM public.network_referral_facilities
        WHERE referral_id = p_referral_id
          AND facility_id = p_facility_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'The facility is not attached to this referral';
        END IF;
    END IF;

    CASE p_action
        WHEN 'qualify' THEN
            IF v_referral_status <> 'submitted' THEN
                RAISE EXCEPTION 'Only new referrals can be qualified';
            END IF;

            UPDATE public.network_referrals
            SET status = 'matching'
            WHERE id = p_referral_id;
            v_event_type := 'referral_qualified';

        WHEN 'request_information' THEN
            IF v_referral_status IN ('closed', 'cancelled') THEN
                RAISE EXCEPTION 'Closed referrals cannot request information';
            END IF;
            IF NULLIF(TRIM(p_note), '') IS NULL THEN
                RAISE EXCEPTION 'An information request note is required';
            END IF;
            v_event_type := 'information_requested';

        WHEN 'deliver' THEN
            IF v_referral_status NOT IN ('matching', 'delivered') THEN
                RAISE EXCEPTION 'Qualify the referral before delivery';
            END IF;
            IF v_facility_status <> 'pending' THEN
                RAISE EXCEPTION 'Only pending facility referrals can be delivered';
            END IF;
            IF EXISTS (
                SELECT 1
                FROM public.network_referrals referral
                JOIN public.network_care_searches care_search ON care_search.id = referral.care_search_id
                JOIN public.network_facilities facility ON facility.id = p_facility_id
                WHERE referral.id = p_referral_id
                  AND COALESCE(
                      care_search.preferences -> 'previouslyContactedFacilityIds',
                      '[]'::jsonb
                  ) ? facility.page_id::TEXT
            ) AND NULLIF(TRIM(p_note), '') IS NULL THEN
                RAISE EXCEPTION 'Document referral ownership before delivering a prior-contact referral';
            END IF;
            IF NOT EXISTS (
                SELECT 1
                FROM public.network_referral_consents consent
                WHERE consent.referral_id = p_referral_id
                  AND p_facility_id = ANY(consent.facility_ids)
                  AND consent.revoked_at IS NULL
            ) THEN
                RAISE EXCEPTION 'Active facility-specific consent is required';
            END IF;
            IF NOT EXISTS (
                SELECT 1
                FROM public.network_facilities facility
                WHERE facility.id = p_facility_id
                  AND facility.referral_status = 'eligible'
                  AND facility.is_accepting_referrals = TRUE
                  AND facility.listing_status IN ('listed', 'verified', 'partner')
            ) THEN
                RAISE EXCEPTION 'The facility is not accepting referrals';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'delivered',
                delivered_at = COALESCE(delivered_at, NOW())
            WHERE id = v_referral_facility_id;

            UPDATE public.network_referrals
            SET status = 'delivered'
            WHERE id = p_referral_id;
            v_event_type := 'referral_delivered';

        WHEN 'mark_duplicate' THEN
            IF v_facility_status <> 'pending' THEN
                RAISE EXCEPTION 'Only pending facility referrals can be marked duplicate';
            END IF;
            IF NULLIF(TRIM(p_note), '') IS NULL THEN
                RAISE EXCEPTION 'A duplicate reason is required';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'duplicate',
                responded_at = COALESCE(responded_at, NOW()),
                outcome_reported_at = COALESCE(outcome_reported_at, NOW()),
                decline_reason = LEFT(p_note, 1000)
            WHERE id = v_referral_facility_id;
            v_event_type := 'referral_marked_duplicate';

        WHEN 'mark_accepted' THEN
            IF v_facility_status NOT IN ('delivered', 'viewed') THEN
                RAISE EXCEPTION 'Only delivered referrals can be accepted';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'accepted',
                responded_at = COALESCE(responded_at, NOW())
            WHERE id = v_referral_facility_id;
            v_event_type := 'referral_accepted';

        WHEN 'schedule_tour' THEN
            IF v_facility_status NOT IN ('delivered', 'viewed', 'accepted') THEN
                RAISE EXCEPTION 'The referral is not ready for a tour';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'tour_scheduled',
                responded_at = COALESCE(responded_at, NOW())
            WHERE id = v_referral_facility_id;

            UPDATE public.network_referrals
            SET status = 'touring'
            WHERE id = p_referral_id;
            v_event_type := 'tour_scheduled';

        WHEN 'mark_placed' THEN
            IF v_facility_status <> 'tour_scheduled' THEN
                RAISE EXCEPTION 'A tour must be recorded before placement';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'placed',
                outcome_reported_at = COALESCE(outcome_reported_at, NOW())
            WHERE id = v_referral_facility_id;

            UPDATE public.network_referrals
            SET status = 'placed',
                closed_at = COALESCE(closed_at, NOW())
            WHERE id = p_referral_id;
            v_event_type := 'placement_confirmed';

        WHEN 'mark_lost' THEN
            IF v_facility_status NOT IN ('delivered', 'viewed', 'accepted', 'tour_scheduled') THEN
                RAISE EXCEPTION 'The facility referral cannot be marked lost from its current status';
            END IF;
            IF NULLIF(TRIM(p_note), '') IS NULL THEN
                RAISE EXCEPTION 'A lost reason is required';
            END IF;

            UPDATE public.network_referral_facilities
            SET status = 'lost',
                outcome_reported_at = COALESCE(outcome_reported_at, NOW()),
                decline_reason = LEFT(p_note, 1000)
            WHERE id = v_referral_facility_id;
            v_event_type := 'referral_lost';

        WHEN 'close' THEN
            IF v_referral_status IN ('closed', 'cancelled') THEN
                RAISE EXCEPTION 'The referral is already closed';
            END IF;
            IF NULLIF(TRIM(p_note), '') IS NULL THEN
                RAISE EXCEPTION 'A closure reason is required';
            END IF;

            UPDATE public.network_referrals
            SET status = 'closed',
                closed_at = COALESCE(closed_at, NOW())
            WHERE id = p_referral_id;
            v_event_type := 'referral_closed';
    END CASE;

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        p_referral_id,
        v_referral_facility_id,
        p_actor_user_id,
        'navigator',
        v_event_type,
        jsonb_strip_nulls(jsonb_build_object(
            'action', p_action,
            'note', NULLIF(LEFT(p_note, 1000), '')
        ))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.operate_network_referral(UUID, TEXT, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.operate_network_referral(UUID, TEXT, UUID, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.deliver_network_referral(
    p_referral_id UUID,
    p_facility_id UUID,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ,
    p_notification_email TEXT,
    p_note TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_facility_id UUID;
    v_access_token_id UUID;
    v_notification_id UUID;
BEGIN
    IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid access token hash';
    END IF;
    IF p_expires_at <= NOW() OR p_expires_at > NOW() + INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Access expiration must be within 30 days';
    END IF;
    IF NULLIF(TRIM(p_notification_email), '') IS NULL OR POSITION('@' IN p_notification_email) < 2 THEN
        RAISE EXCEPTION 'A provider notification email is required';
    END IF;

    PERFORM public.operate_network_referral(
        p_referral_id,
        'deliver',
        p_facility_id,
        p_note,
        p_actor_user_id
    );

    SELECT id
    INTO v_referral_facility_id
    FROM public.network_referral_facilities
    WHERE referral_id = p_referral_id
      AND facility_id = p_facility_id;

    UPDATE public.network_referral_access_tokens
    SET revoked_at = NOW()
    WHERE referral_facility_id = v_referral_facility_id
      AND revoked_at IS NULL;

    INSERT INTO public.network_referral_access_tokens (
        referral_facility_id,
        token_hash,
        expires_at,
        created_by
    ) VALUES (
        v_referral_facility_id,
        p_token_hash,
        p_expires_at,
        p_actor_user_id
    )
    RETURNING id INTO v_access_token_id;

    INSERT INTO public.network_referral_notifications (
        referral_facility_id,
        access_token_id,
        recipient_email,
        status,
        created_by
    ) VALUES (
        v_referral_facility_id,
        v_access_token_id,
        LOWER(TRIM(p_notification_email)),
        'queued',
        p_actor_user_id
    )
    RETURNING id INTO v_notification_id;

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        p_referral_id,
        v_referral_facility_id,
        p_actor_user_id,
        'navigator',
        'provider_access_issued',
        jsonb_build_object('expiresAt', p_expires_at)
    );

    RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_network_referral(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deliver_network_referral(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.reissue_network_referral_access(
    p_referral_id UUID,
    p_facility_id UUID,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ,
    p_notification_email TEXT,
    p_note TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_facility_id UUID;
    v_facility_status TEXT;
    v_access_token_id UUID;
    v_notification_id UUID;
BEGIN
    IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid access token hash';
    END IF;
    IF p_expires_at <= NOW() OR p_expires_at > NOW() + INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Access expiration must be within 30 days';
    END IF;
    IF NULLIF(TRIM(p_notification_email), '') IS NULL OR POSITION('@' IN p_notification_email) < 2 THEN
        RAISE EXCEPTION 'A provider notification email is required';
    END IF;

    SELECT id, status
    INTO v_referral_facility_id, v_facility_status
    FROM public.network_referral_facilities
    WHERE referral_id = p_referral_id
      AND facility_id = p_facility_id
    FOR UPDATE;

    IF NOT FOUND OR v_facility_status NOT IN ('delivered', 'viewed', 'accepted', 'tour_scheduled') THEN
        RAISE EXCEPTION 'This provider referral cannot receive a new access link';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.network_referral_consents consent
        WHERE consent.referral_id = p_referral_id
          AND p_facility_id = ANY(consent.facility_ids)
          AND consent.revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Active facility-specific consent is required';
    END IF;

    UPDATE public.network_referral_access_tokens
    SET revoked_at = NOW()
    WHERE referral_facility_id = v_referral_facility_id
      AND revoked_at IS NULL;

    INSERT INTO public.network_referral_access_tokens (
        referral_facility_id,
        token_hash,
        expires_at,
        created_by
    ) VALUES (
        v_referral_facility_id,
        p_token_hash,
        p_expires_at,
        p_actor_user_id
    )
    RETURNING id INTO v_access_token_id;

    INSERT INTO public.network_referral_notifications (
        referral_facility_id,
        access_token_id,
        recipient_email,
        status,
        created_by
    ) VALUES (
        v_referral_facility_id,
        v_access_token_id,
        LOWER(TRIM(p_notification_email)),
        'queued',
        p_actor_user_id
    )
    RETURNING id INTO v_notification_id;

    INSERT INTO public.network_referral_events (
        referral_id,
        referral_facility_id,
        actor_user_id,
        actor_type,
        event_type,
        details
    ) VALUES (
        p_referral_id,
        v_referral_facility_id,
        p_actor_user_id,
        'navigator',
        'provider_access_reissued',
        jsonb_strip_nulls(jsonb_build_object(
            'expiresAt', p_expires_at,
            'note', NULLIF(LEFT(p_note, 1000), '')
        ))
    );

    RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reissue_network_referral_access(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reissue_network_referral_access(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.open_network_referral_access(
    p_token_hash TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access_token_id UUID;
    v_referral_facility_id UUID;
    v_access_count INTEGER;
    v_referral_id UUID;
    v_facility_id UUID;
    v_facility_status TEXT;
BEGIN
    SELECT token.id, token.referral_facility_id, token.access_count
    INTO v_access_token_id, v_referral_facility_id, v_access_count
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

    IF v_facility_status NOT IN ('delivered', 'viewed', 'accepted', 'tour_scheduled', 'placed', 'declined') THEN
        RAISE EXCEPTION 'Referral access is unavailable';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.network_referral_consents consent
        WHERE consent.referral_id = v_referral_id
          AND v_facility_id = ANY(consent.facility_ids)
          AND consent.revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Referral consent is no longer active';
    END IF;

    UPDATE public.network_referral_access_tokens
    SET last_accessed_at = NOW(),
        access_count = access_count + 1
    WHERE id = v_access_token_id;

    IF v_facility_status = 'delivered' THEN
        UPDATE public.network_referral_facilities
        SET status = 'viewed',
            viewed_at = COALESCE(viewed_at, NOW())
        WHERE id = v_referral_facility_id;

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
            'referral_viewed',
            jsonb_strip_nulls(jsonb_build_object('userAgent', LEFT(p_user_agent, 500)))
        );
    ELSIF v_access_count = 0 THEN
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
            'provider_access_opened',
            jsonb_strip_nulls(jsonb_build_object('userAgent', LEFT(p_user_agent, 500)))
        );
    END IF;

    RETURN v_referral_facility_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_network_referral_access(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_network_referral_access(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.respond_network_referral_access(
    p_token_hash TEXT,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL
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
    v_next_status TEXT;
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

    IF v_facility_status NOT IN ('delivered', 'viewed') THEN
        RAISE EXCEPTION 'This referral already has a response';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.network_referral_consents consent
        WHERE consent.referral_id = v_referral_id
          AND v_facility_id = ANY(consent.facility_ids)
          AND consent.revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Referral consent is no longer active';
    END IF;

    IF p_action = 'accept' THEN
        v_next_status := 'accepted';
        v_event_type := 'referral_accepted';
    ELSIF p_action = 'decline' THEN
        IF NULLIF(TRIM(p_reason), '') IS NULL THEN
            RAISE EXCEPTION 'A decline reason is required';
        END IF;
        v_next_status := 'declined';
        v_event_type := 'referral_declined';
    ELSE
        RAISE EXCEPTION 'Unsupported provider response';
    END IF;

    UPDATE public.network_referral_facilities
    SET status = v_next_status,
        responded_at = COALESCE(responded_at, NOW()),
        decline_reason = CASE
            WHEN v_next_status = 'declined' THEN LEFT(p_reason, 1000)
            ELSE decline_reason
        END
    WHERE id = v_referral_facility_id;

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
        jsonb_strip_nulls(jsonb_build_object('reason', NULLIF(LEFT(p_reason, 1000), '')))
    );

    RETURN v_next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_network_referral_access(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_network_referral_access(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.network_facilities IS
    'Normalized Crown Network discovery and referral eligibility data linked to Crown Pages marketing content.';
COMMENT ON TABLE public.network_referral_consents IS
    'Versioned, append-only evidence of a consumer authorizing referral delivery to named facilities.';
COMMENT ON TABLE public.network_referral_events IS
    'Append-only audit history written by trusted server-side referral workflows.';
COMMENT ON TABLE public.network_referral_access_tokens IS
    'Hashed, expiring provider access credentials. Raw access tokens are never persisted.';
COMMENT ON TABLE public.network_referral_notifications IS
    'Privacy-minimized delivery outbox containing provider contact data but no family referral details.';
