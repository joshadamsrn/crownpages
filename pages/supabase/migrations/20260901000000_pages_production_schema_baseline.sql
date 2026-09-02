-- Crown Pages production schema baseline.
-- Generated from the live Pages project on 2026-09-01 with schema-only pg_dump,
-- plus the application-owned signup trigger attached to auth.users.
-- This file intentionally contains no customer rows or seed data.
-- Do not edit this baseline after it has been recorded in migration history;
-- add a new timestamped migration for subsequent schema changes.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."user_type_enum" AS ENUM (
    'individual',
    'organization_owner',
    'organization_member'
);


ALTER TYPE "public"."user_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_business_member"("p_business_id" "uuid", "p_user_id" "uuid", "p_role" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (p_business_id, p_user_id, p_role)
    ON CONFLICT (business_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."add_business_member"("p_business_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_crm_business"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND (
        b.owner_id = auth.uid()
        OR public.is_kiosk_admin(b.id)
        OR EXISTS (
          SELECT 1
          FROM public.business_members bm
          WHERE bm.business_id = b.id
            AND (
              bm.user_id = auth.uid()
              OR lower(coalesce(bm.invited_email, '')) =
                 lower(coalesce(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_access_crm_business"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_crm_page"("p_page_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.id = p_page_id
        AND (
          p.created_by = auth.uid()
          OR public.can_access_crm_business(p.business_id)
          OR EXISTS (
            SELECT 1
            FROM public.page_shares ps
            WHERE ps.page_id = p.id
              AND (
                ps.shared_with_user_id = auth.uid()
                OR lower(coalesce(ps.shared_with_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
              )
          )
        )
    );
  $$;


ALTER FUNCTION "public"."can_access_crm_page"("p_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_trial"("p_trial_id" "uuid", "p_conversion_source" "text" DEFAULT 'individual'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update trial status
    UPDATE public.free_trials
    SET 
        status = 'converted',
        conversion_source = p_conversion_source,
        converted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_trial_id AND status = 'active'
    RETURNING user_id INTO v_user_id;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."convert_trial"("p_trial_id" "uuid", "p_conversion_source" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."crm_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "page_id" "uuid",
    "created_by" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "message" "text",
    "description" "text",
    "source" "text" DEFAULT 'Manual'::"text" NOT NULL,
    "status" "text" DEFAULT 'New'::"text" NOT NULL,
    "source_page_name" "text",
    "visitor_id" "text",
    "session_id" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_contacted_at" timestamp with time zone,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_contacts_source_check" CHECK (("source" = ANY (ARRAY['Connect Form'::"text", 'Schedule Tour'::"text", 'Manual'::"text"]))),
    CONSTRAINT "crm_contacts_status_check" CHECK (("status" = ANY (ARRAY['New'::"text", 'In Process'::"text", 'Closed'::"text", 'Lost'::"text"])))
);


ALTER TABLE "public"."crm_contacts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_manual_crm_contact"("p_business_id" "uuid", "p_page_id" "uuid" DEFAULT NULL::"uuid", "p_created_by" "uuid" DEFAULT NULL::"uuid", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_message" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'Manual'::"text", "p_status" "text" DEFAULT 'New'::"text", "p_source_page_name" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT '{}'::"text"[]) RETURNS "public"."crm_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
      v_user_id uuid := auth.uid();
      v_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
      v_created_by uuid := coalesce(p_created_by, v_user_id);
      v_has_business_access boolean := false;
      v_has_page_access boolean := false;
      v_contact public.crm_contacts;
  BEGIN
      IF v_user_id IS NULL THEN
          RAISE EXCEPTION USING errcode = '42501', message = 'Not authenticated';
      END IF;

      IF coalesce(trim(p_first_name), '') = '' OR coalesce(trim(p_last_name), '') = '' THEN
          RAISE EXCEPTION 'First name and last name are required';
      END IF;

      IF p_source NOT IN ('Connect Form', 'Schedule Tour', 'Manual') THEN
          RAISE EXCEPTION 'Invalid contact source';
      END IF;

      IF p_status NOT IN ('New', 'In Process', 'Closed', 'Lost') THEN
          RAISE EXCEPTION 'Invalid contact status';
      END IF;

      SELECT (
          EXISTS (
              SELECT 1
              FROM public.businesses b
              WHERE b.id = p_business_id
                AND (
                  b.owner_id = v_user_id
                  OR EXISTS (
                      SELECT 1
                      FROM public.business_members bm
                      WHERE bm.business_id = b.id
                        AND (
                          bm.user_id = v_user_id
                          OR lower(coalesce(bm.invited_email, '')) = v_user_email
                        )
                  )
                )
          )
          OR EXISTS (
              SELECT 1
              FROM public.pages p
              WHERE p.business_id = p_business_id
                AND p.is_active = true
                AND (
                  p.created_by = v_user_id
                  OR EXISTS (
                      SELECT 1
                      FROM public.page_shares ps
                      WHERE ps.page_id = p.id
                        AND (
                          ps.shared_with_user_id = v_user_id
                          OR lower(coalesce(ps.shared_with_email, '')) = v_user_email
                        )
                  )
                )
          )
      ) INTO v_has_business_access;

      IF NOT v_has_business_access THEN
          RAISE EXCEPTION USING errcode = '42501', message = 'new row violates row-level security policy for table
  "crm_contacts"';
      END IF;

      IF p_page_id IS NULL THEN
          v_has_page_access := true;
      ELSE
          SELECT (
              EXISTS (
                  SELECT 1
                  FROM public.pages p
                  WHERE p.id = p_page_id
                    AND p.business_id = p_business_id
                    AND (
                      p.created_by = v_user_id
                      OR EXISTS (
                          SELECT 1
                          FROM public.page_shares ps
                          WHERE ps.page_id = p.id
                            AND (
                              ps.shared_with_user_id = v_user_id
                              OR lower(coalesce(ps.shared_with_email, '')) = v_user_email
                            )
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.businesses b
                          WHERE b.id = p.business_id
                            AND (
                              b.owner_id = v_user_id
                              OR EXISTS (
                                  SELECT 1
                                  FROM public.business_members bm
                                  WHERE bm.business_id = b.id
                                    AND (
                                      bm.user_id = v_user_id
                                      OR lower(coalesce(bm.invited_email, '')) = v_user_email
                                    )
                              )
                            )
                      )
                    )
              )
          ) INTO v_has_page_access;
      END IF;

      IF NOT v_has_page_access THEN
          RAISE EXCEPTION USING errcode = '42501', message = 'new row violates row-level security policy for table
  "crm_contacts"';
      END IF;

      INSERT INTO public.crm_contacts (
          business_id,
          page_id,
          created_by,
          first_name,
          last_name,
          email,
          phone,
          message,
          description,
          source,
          status,
          source_page_name,
          submitted_at,
          tags
      )
      VALUES (
          p_business_id,
          p_page_id,
          v_created_by,
          trim(p_first_name),
          trim(p_last_name),
          nullif(trim(coalesce(p_email, '')), ''),
          nullif(trim(coalesce(p_phone, '')), ''),
          nullif(trim(coalesce(p_message, '')), ''),
          nullif(trim(coalesce(p_description, '')), ''),
          p_source,
          p_status,
          nullif(trim(coalesce(p_source_page_name, '')), ''),
          now(),
          coalesce(p_tags, '{}'::text[])
      )
      RETURNING * INTO v_contact;

      INSERT INTO public.crm_contact_activity (
          contact_id,
          created_by,
          activity_type,
          title,
          details,
          metadata
      )
      VALUES (
          v_contact.id,
          v_created_by,
          'contact_created',
          'Contact created',
          'Manual contact added',
          '{}'::jsonb
      );

      RETURN v_contact;
  END;
  $$;


ALTER FUNCTION "public"."create_manual_crm_contact"("p_business_id" "uuid", "p_page_id" "uuid", "p_created_by" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_message" "text", "p_description" "text", "p_source" "text", "p_status" "text", "p_source_page_name" "text", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_kiosk_admin_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Prevent simultaneous requests from exceeding the limit.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.business_id::text, 0)
  );

  NEW.first_name := btrim(NEW.first_name);
  NEW.last_name := btrim(NEW.last_name);
  NEW.email := lower(btrim(NEW.email));
  NEW.updated_at := now();

  IF (
    SELECT count(*)
    FROM public.kiosk_admins ka
    WHERE ka.business_id = NEW.business_id
      AND (TG_OP = 'INSERT' OR ka.id <> NEW.id)
  ) >= 2 THEN
    RAISE EXCEPTION
      'A business can have no more than two additional kiosk administrators.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_kiosk_admin_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_trial"("p_trial_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update trial status
    UPDATE public.free_trials
    SET 
        status = 'expired',
        trial_ended_at = NOW(),
        updated_at = NOW()
    WHERE id = p_trial_id AND status = 'active'
    RETURNING user_id INTO v_user_id;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update user subscription status if they don't have other active subscriptions
    UPDATE public.users
    SET 
        subscription_status = CASE 
            WHEN plan_type = 'pro' AND plan_expires_at > NOW() THEN subscription_status
            WHEN subscription_source IS NOT NULL THEN subscription_status
            ELSE 'free'
        END,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."expire_trial"("p_trial_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_business_slug"("business_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from business name
    base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    -- Ensure slug is not empty
    IF base_slug = '' THEN
        base_slug := 'business';
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness in both businesses and pages
    WHILE EXISTS (
        SELECT 1 FROM public.businesses WHERE slug = final_slug
    ) OR EXISTS (
        SELECT 1 FROM public.pages WHERE slug = final_slug
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;$$;


ALTER FUNCTION "public"."generate_business_slug"("business_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_page_slug"("page_title" "text", "business_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from page title
    base_slug := lower(regexp_replace(page_title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    -- Ensure slug is not empty
    IF base_slug = '' THEN
        base_slug := 'page';
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness within business and add counter if needed
    WHILE EXISTS (SELECT 1 FROM public.pages WHERE slug = final_slug AND pages.business_id = generate_page_slug.business_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$;


ALTER FUNCTION "public"."generate_page_slug"("page_title" "text", "business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_summary"("p_page_id" "uuid", "p_start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "p_end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("total_views" bigint, "unique_visitors" bigint, "total_shares" bigint, "total_saves" bigint, "total_clicks" bigint, "top_referrers" "jsonb", "daily_views" "jsonb", "device_breakdown" "jsonb", "location_breakdown" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH analytics AS (
        SELECT * FROM public.analytics_events
        WHERE page_id = p_page_id
        AND created_at BETWEEN p_start_date AND p_end_date
    )
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'page_view') as total_views,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') as unique_visitors,
        COUNT(*) FILTER (WHERE event_type = 'share') as total_shares,
        COUNT(*) FILTER (WHERE event_type = 'save') as total_saves,
        COUNT(*) FILTER (WHERE event_type LIKE '%_click') as total_clicks,
        
        -- Top referrers
        (SELECT jsonb_agg(jsonb_build_object('referrer', referrer, 'count', count))
         FROM (
             SELECT referrer, COUNT(*) as count
             FROM analytics
             WHERE event_type = 'page_view' AND referrer IS NOT NULL
             GROUP BY referrer
             ORDER BY count DESC
             LIMIT 10
         ) r) as top_referrers,
        
        -- Daily views
        (SELECT jsonb_agg(jsonb_build_object('date', date, 'views', views) ORDER BY date)
         FROM (
             SELECT date_trunc('day', created_at) as date, COUNT(*) as views
             FROM analytics
             WHERE event_type = 'page_view'
             GROUP BY date
         ) d) as daily_views,
        
        -- Device breakdown
        (SELECT jsonb_build_object(
             'mobile', COUNT(*) FILTER (WHERE device_type = 'mobile'),
             'tablet', COUNT(*) FILTER (WHERE device_type = 'tablet'),
             'desktop', COUNT(*) FILTER (WHERE device_type = 'desktop')
         ) FROM analytics WHERE event_type = 'page_view') as device_breakdown,
        
        -- Location breakdown (top 10 countries)
        (SELECT jsonb_agg(jsonb_build_object('country', country, 'count', count))
         FROM (
             SELECT country, COUNT(*) as count
             FROM analytics
             WHERE event_type = 'page_view' AND country IS NOT NULL
             GROUP BY country
             ORDER BY count DESC
             LIMIT 10
         ) l) as location_breakdown;
END;
$$;


ALTER FUNCTION "public"."get_analytics_summary"("p_page_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_license_members_safe"("p_license_id" "uuid") RETURNS TABLE("membership_id" "uuid", "user_id" "uuid", "joined_at" timestamp with time zone, "is_active" boolean, "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify the caller owns this license
  IF NOT EXISTS (
    SELECT 1 FROM license 
    WHERE id = p_license_id AND purchased_by = auth.uid()
  ) THEN
    RETURN; -- Return empty result if not authorized
  END IF;
  
  -- Return member data
  RETURN QUERY
  SELECT 
    lm.id,
    lm.user_id,
    lm.joined_at,
    lm.is_active,
    u.email
  FROM license_membership lm
  JOIN users u ON u.id = lm.user_id
  WHERE lm.license_id = p_license_id;
END;
$$;


ALTER FUNCTION "public"."get_license_members_safe"("p_license_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_memberships"("p_user_id" "uuid") RETURNS TABLE("membership_id" "uuid", "membership_is_active" boolean, "license_id" "uuid", "license_code" "text", "license_purchased_by" "uuid", "license_is_active" boolean, "license_expiry_date" timestamp with time zone, "license_max_seats" integer, "purchaser_first_name" "text", "purchaser_last_name" "text", "purchaser_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id as membership_id,
        lm.is_active as membership_is_active,
        l.id as license_id,
        l.code as license_code,
        l.purchased_by as license_purchased_by,
        l.is_active as license_is_active,
        l.expiry_date as license_expiry_date,
        l.max_seats as license_max_seats,
        u.first_name as purchaser_first_name,
        u.last_name as purchaser_last_name,
        u.email as purchaser_email
    FROM license_membership lm
    JOIN license l ON l.id = lm.license_id
    JOIN users u ON u.id = l.purchased_by
    WHERE lm.user_id = p_user_id
    AND lm.is_active = true;
END;
$$;


ALTER FUNCTION "public"."get_user_team_memberships"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_trial_info"("p_user_id" "uuid") RETURNS TABLE("has_active_trial" boolean, "trial_id" "uuid", "trial_ends_at" timestamp with time zone, "trial_duration_days" integer, "trial_type" "text", "days_remaining" integer, "trial_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_trial RECORD;
BEGIN
    -- Get active trial
    SELECT 
        ft.id,
        ft.trial_ends_at,
        ft.trial_duration_days,
        ft.trial_type,
        ft.status,
        GREATEST(0, EXTRACT(days FROM ft.trial_ends_at - NOW())::INTEGER) as days_left
    INTO v_trial
    FROM public.free_trials ft
    WHERE ft.user_id = p_user_id AND ft.status = 'active'  AND ft.trial_ends_at > NOW()
    ORDER BY ft.created_at DESC
    LIMIT 1;
    
    IF v_trial IS NULL THEN
        -- No active trial
        RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            NULL::TIMESTAMPTZ, 
            NULL::INTEGER, 
            NULL::TEXT, 
            NULL::INTEGER,
            NULL::TEXT;
    ELSE
        -- Return trial info
        RETURN QUERY SELECT 
            TRUE,
            v_trial.id,
            v_trial.trial_ends_at,
            v_trial.trial_duration_days,
            v_trial.trial_type,
            v_trial.days_left,
            v_trial.status;
    END IF;
END;$$;


ALTER FUNCTION "public"."get_user_trial_info"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    trial_duration INTEGER := 30;
    trial_type_val TEXT := 'free';
    trial_end_date TIMESTAMPTZ;
BEGIN
    -- This function only handles new user creation (INSERT operations)
    -- Get trial settings from database, fallback to defaults
    BEGIN
        SELECT 
            COALESCE(ts.trial_duration_days, 30),
            COALESCE(ts.trial_type, 'free')
        INTO trial_duration, trial_type_val
        FROM public.trial_settings ts 
        WHERE ts.is_active = true 
        ORDER BY ts.created_at DESC 
        LIMIT 1;
    EXCEPTION 
        WHEN OTHERS THEN
            -- Use defaults if query fails
            trial_duration := 30;
            trial_type_val := 'free';
    END;
    
    -- Calculate trial end date
    trial_end_date := NOW() + (trial_duration || ' days')::INTERVAL;
    
    -- 1. Create user record in public.users
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        last_name,
        plan_type,
        subscription_status,
        user_type,
        trial_started_at,
        trial_ends_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'free',
        'trial',
        'individual',
        NOW(),
        trial_end_date,
        NOW(),
        NOW()
    );
    
    -- 2. Create default wallet folder
    BEGIN
        INSERT INTO public.wallet_folders (user_id, name, is_default, sort_order)
        VALUES (NEW.id, 'My Saved Pages', TRUE, 0);
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create wallet folder for user %: %', NEW.id, SQLERRM;
    END;
    
    -- 3. Create free trial record
    BEGIN
        INSERT INTO public.free_trials (
            user_id,
            trial_duration_days,
            trial_type,
            trial_started_at,
            trial_ends_at,
            status,
            trial_settings_snapshot
        )
        VALUES (
            NEW.id,
            trial_duration,
            trial_type_val,
            NOW(),
            trial_end_date,
            'active',
            jsonb_build_object(
                'trial_duration_days', trial_duration,
                'trial_type', trial_type_val,
                'created_at', NOW(),
                'source', 'signup_trigger'
            )
        );
        
        RAISE NOTICE 'Successfully created free trial for user % (% days, type: %)', NEW.id, trial_duration, trial_type_val;
        
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create free trial for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            -- Don't fail the user creation if trial creation fails
    END;
    
    RAISE NOTICE 'Successfully created new user: % (email: %)', NEW.id, NEW.email;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_page_share_permission"("page_uuid" "uuid", "required_permission" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.page_shares
    WHERE page_shares.page_id = page_uuid
      AND page_shares.permission = required_permission
      AND (
        page_shares.shared_with_user_id = auth.uid()
        OR lower(page_shares.shared_with_email) = (
          SELECT lower(email) FROM public.users WHERE id = auth.uid()
        )
      )
  );
$$;


ALTER FUNCTION "public"."has_page_share_permission"("page_uuid" "uuid", "required_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_business_member"("bid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = bid
      AND (
        user_id = auth.uid()
        OR invited_email = (
          SELECT email FROM public.users WHERE id = auth.uid()
        )
      )
  );
$$;


ALTER FUNCTION "public"."is_business_member"("bid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_kiosk_admin"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kiosk_admins ka
    WHERE ka.business_id = p_business_id
      AND ka.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_kiosk_admin"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_subscription_active"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT 
        subscription_status,
        plan_expires_at,
        current_period_end,
        trial_ends_at
    INTO user_record
    FROM public.users 
    WHERE id = user_id;
    
    IF user_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if in active trial
    IF user_record.subscription_status = 'trial' AND user_record.trial_ends_at > NOW() THEN
        RETURN TRUE;
    END IF;
    
    -- Check if has active subscription
    IF user_record.subscription_status = 'active' AND 
       (user_record.current_period_end > NOW() OR user_record.plan_expires_at > NOW()) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_subscription_active"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_pending_business_member_invites"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.business_members
  SET user_id = NEW.id
  WHERE
    user_id IS NULL
    AND lower(invited_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_pending_business_member_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_pending_kiosk_admin_invites"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.kiosk_admins
  SET
    user_id = NEW.id,
    updated_at = now()
  WHERE user_id IS NULL
    AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_pending_kiosk_admin_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_expired_trials"() RETURNS TABLE("expired_count" integer, "processed_trials" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_expired_trials UUID[];
    v_trial_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- Get all trials that should be expired
    SELECT array_agg(id)
    INTO v_expired_trials
    FROM public.free_trials
    WHERE status = 'active' 
    AND trial_ends_at <= NOW();
    
    -- Process each expired trial
    IF v_expired_trials IS NOT NULL THEN
        FOREACH v_trial_id IN ARRAY v_expired_trials LOOP
            IF public.expire_trial(v_trial_id) THEN
                v_count := v_count + 1;
            END IF;
        END LOOP;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT v_count, COALESCE(v_expired_trials, ARRAY[]::UUID[]);
END;
$$;


ALTER FUNCTION "public"."process_expired_trials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_pages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_business_pages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_page_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    CASE NEW.event_type
        WHEN 'page_view' THEN
            UPDATE public.pages 
            SET view_count = view_count + 1,
                unique_view_count = unique_view_count + 
                    CASE WHEN NOT EXISTS (
                        SELECT 1 FROM public.analytics_events 
                        WHERE page_id = NEW.page_id 
                        AND visitor_id = NEW.visitor_id
                        AND id != NEW.id
                    ) THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE id = NEW.page_id;
        WHEN 'share' THEN
            UPDATE public.pages 
            SET share_count = share_count + 1,
                updated_at = NOW()
            WHERE id = NEW.page_id;
        WHEN 'save' THEN
            UPDATE public.pages 
            SET save_count = save_count + 1,
                updated_at = NOW()
            WHERE id = NEW.page_id;
        ELSE
            -- Do nothing for other event types like download, button_click, link_click, etc.
            NULL;
    END CASE;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_page_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_super_table_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_super_table_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trackable_link_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.event_type = 'click' THEN
        UPDATE public.trackable_links 
        SET 
            click_count = click_count + 1,
            unique_click_count = unique_click_count + 
                CASE WHEN NOT EXISTS (
                    SELECT 1 FROM public.trackable_link_events 
                    WHERE trackable_link_id = NEW.trackable_link_id 
                    AND visitor_id = NEW.visitor_id
                    AND event_type = 'click'
                    AND id != NEW.id
                ) THEN 1 ELSE 0 END,
            last_clicked_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.trackable_link_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_trackable_link_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_business"("p_business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = auth.uid()
    )
    OR public.is_kiosk_admin(p_business_id)
    OR EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = p_business_id
        AND (
          bm.user_id = auth.uid()
          OR lower(coalesce(bm.invited_email, '')) =
             lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.business_id = p_business_id
        AND public.user_can_access_page(p.id)
    );
$$;


ALTER FUNCTION "public"."user_can_access_business"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_page"("p_page_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.id = p_page_id
        AND (
          p.created_by = auth.uid()
          OR public.is_kiosk_admin(p.business_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.page_shares ps
      WHERE ps.page_id = p_page_id
        AND (
          ps.shared_with_user_id = auth.uid()
          OR lower(coalesce(ps.shared_with_email, '')) =
             lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );
$$;


ALTER FUNCTION "public"."user_can_access_page"("p_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_page_share"("p_page_id" "uuid", "p_shared_with_user_id" "uuid", "p_shared_with_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.id = p_page_id
        AND p.created_by = auth.uid()
    )
    OR p_shared_with_user_id = auth.uid()
    OR lower(coalesce(p_shared_with_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;


ALTER FUNCTION "public"."user_can_access_page_share"("p_page_id" "uuid", "p_shared_with_user_id" "uuid", "p_shared_with_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_edit_page"("p_page_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.id = p_page_id
        AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.page_shares ps
      WHERE ps.page_id = p_page_id
        AND ps.permission = 'edit'
        AND (
          ps.shared_with_user_id = auth.uid()
          OR lower(coalesce(ps.shared_with_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );
$$;


ALTER FUNCTION "public"."user_can_edit_page"("p_page_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "visitor_id" "text",
    "user_id" "uuid",
    "session_id" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "platform" "text",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "country" "text",
    "region" "text",
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['page_view'::"text", 'link_click'::"text", 'button_click'::"text", 'form_submit'::"text", 'share'::"text", 'save'::"text", 'print'::"text", 'download'::"text", 'phone_click'::"text", 'email_click'::"text", 'address_click'::"text", 'social_click'::"text", 'contact_open'::"text", 'page_exit'::"text", 'photo_click'::"text", 'video_click'::"text", 'media_click'::"text", 'save_contact'::"text"]))),
    CONSTRAINT "analytics_events_platform_check" CHECK (("platform" = ANY (ARRAY['mobile_app'::"text", 'web_app'::"text", 'shared_link'::"text"])))
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_ai_assistant_settings" (
    "business_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "welcome_message" "text" DEFAULT 'Hi! What would you like to know about this community?'::"text" NOT NULL,
    "vector_store_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."business_ai_assistant_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."business_ai_assistant_settings" IS 'Per-business public page AI assistant settings. Access is mediated by server routes.';



CREATE TABLE IF NOT EXISTS "public"."business_ai_knowledge_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "openai_file_id" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "byte_size" bigint DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid",
    CONSTRAINT "business_ai_knowledge_files_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."business_ai_knowledge_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."business_ai_knowledge_files" IS 'Metadata for private business knowledge files indexed in OpenAI vector stores.';



CREATE TABLE IF NOT EXISTS "public"."business_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invited_email" "text"
);


ALTER TABLE "public"."business_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_page_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_page_id" "uuid" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "visitor_id" "text",
    "session_id" "text",
    "user_id" "uuid",
    "user_agent" "text",
    "referrer" "text",
    "platform" "text",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "country" "text",
    "region" "text",
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "business_page_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['page_view'::"text", 'link_click'::"text", 'button_click'::"text", 'form_submit'::"text", 'share'::"text", 'save'::"text", 'print'::"text", 'download'::"text", 'phone_click'::"text", 'email_click'::"text", 'address_click'::"text", 'social_click'::"text", 'website_click'::"text"]))),
    CONSTRAINT "business_page_analytics_platform_check" CHECK (("platform" = ANY (ARRAY['mobile_app'::"text", 'web_app'::"text", 'shared_link'::"text", 'business_page'::"text"])))
);


ALTER TABLE "public"."business_page_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" "text" DEFAULT 'Welcome'::"text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "page_links" "jsonb" DEFAULT '[]'::"jsonb",
    "social_links" "jsonb" DEFAULT '[]'::"jsonb",
    "contact_info" "jsonb" DEFAULT '{}'::"jsonb",
    "styles" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "unique_view_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "save_count" integer DEFAULT 0
);


ALTER TABLE "public"."business_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "email" "text",
    "phone" "text",
    "website" "text",
    "street_address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "country" "text" DEFAULT 'US'::"text",
    "primary_color" "text" DEFAULT '#000000'::"text",
    "secondary_color" "text" DEFAULT '#ffffff'::"text",
    "font_family" "text" DEFAULT 'Inter'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_contact_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "activity_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "details" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_contact_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_contact_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "body" "text" NOT NULL,
    "author_label" "text" DEFAULT 'You'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_contact_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."free_trials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trial_duration_days" integer NOT NULL,
    "trial_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "trial_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_ends_at" timestamp with time zone NOT NULL,
    "trial_ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "trial_settings_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "conversion_source" "text",
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "free_trials_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'converted'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "free_trials_trial_type_check" CHECK (("trial_type" = ANY (ARRAY['free'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."free_trials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kiosk_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kiosk_admins_email_present" CHECK (("length"("btrim"("email")) > 0)),
    CONSTRAINT "kiosk_admins_first_name_present" CHECK (("length"("btrim"("first_name")) > 0)),
    CONSTRAINT "kiosk_admins_last_name_present" CHECK (("length"("btrim"("last_name")) > 0))
);


ALTER TABLE "public"."kiosk_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kiosk_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "page_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "source" "text",
    "action" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "positive_feedback" "text",
    "improvement_feedback" "text",
    "details_submitted_at" timestamp with time zone,
    "details_email_sent_at" timestamp with time zone,
    CONSTRAINT "kiosk_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."kiosk_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."kiosk_feedback" IS 'Anonymous star ratings submitted from kiosk thank-you screens.';



COMMENT ON COLUMN "public"."kiosk_feedback"."positive_feedback" IS 'Optional response describing what the facility is doing well.';



COMMENT ON COLUMN "public"."kiosk_feedback"."improvement_feedback" IS 'Optional response describing opportunities for the facility to improve.';



COMMENT ON COLUMN "public"."kiosk_feedback"."details_submitted_at" IS 'Time the phone feedback form was submitted for a one-to-four-star kiosk rating.';



COMMENT ON COLUMN "public"."kiosk_feedback"."details_email_sent_at" IS 'Time the detailed feedback email was successfully sent to the page owner.';



CREATE TABLE IF NOT EXISTS "public"."kiosk_feedback_settings" (
    "business_id" "uuid" NOT NULL,
    "review_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "kiosk_feedback_settings_review_url_check" CHECK ((("review_url" IS NULL) OR ("review_url" ~* '^https?://'::"text")))
);


ALTER TABLE "public"."kiosk_feedback_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."kiosk_feedback_settings" IS 'Business-level destination used by the five-star kiosk feedback QR screen.';



CREATE TABLE IF NOT EXISTS "public"."kiosk_overview_settings" (
    "business_id" "uuid" NOT NULL,
    "password_hash" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."kiosk_overview_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kiosk_template_settings" (
    "page_id" "uuid" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "template_key" "text" NOT NULL,
    "display_page_name" "text",
    "welcome_title" "text",
    "welcome_subtitle" "text",
    "scan_title" "text",
    "scan_description" "text",
    "scan_items" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "kiosk_logo_url" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hide_intake_form_button" boolean DEFAULT false NOT NULL,
    "hide_check_in_out_button" boolean DEFAULT false NOT NULL,
    "hide_review_button" boolean DEFAULT true NOT NULL,
    CONSTRAINT "kiosk_template_settings_template_key_check" CHECK (("template_key" = ANY (ARRAY['template1'::"text", 'template2'::"text", 'template3'::"text", 'template4'::"text"])))
);


ALTER TABLE "public"."kiosk_template_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."kiosk_template_settings"."hide_review_button" IS 'When true, hides the Leave Review action from the selected kiosk template header. New templates default to hidden.';



CREATE TABLE IF NOT EXISTS "public"."kiosk_visitor_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "page_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "visitor_type" "text" NOT NULL,
    "visitor_type_other" "text",
    "action" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "error_message" "text",
    "phone" "text",
    "company_name" "text",
    "visiting" "text",
    "purpose" "text",
    "responsible_party" "text",
    "checkout_duration" "text",
    "checkout_type" "text",
    "checking_out" "text",
    "checked_out_first_name" "text",
    "checked_out_last_name" "text",
    "checked_out_full_name" "text",
    CONSTRAINT "kiosk_visitor_logs_action_check" CHECK (("action" = ANY (ARRAY['check_in'::"text", 'check_out'::"text"]))),
    CONSTRAINT "kiosk_visitor_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text"]))),
    CONSTRAINT "kiosk_visitor_logs_visitor_type_check" CHECK (("visitor_type" = ANY (ARRAY['Resident'::"text", 'Current Patient Visitor'::"text", 'Vendor'::"text", 'Maintenance'::"text", 'Clinical Support'::"text", 'Future Patient / Family'::"text", 'Other'::"text"])))
);


ALTER TABLE "public"."kiosk_visitor_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."license" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "max_seats" integer NOT NULL,
    "code" "text" NOT NULL,
    "purchased_by" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "expiry_date" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "type" "text" NOT NULL,
    "plan_pricing_id" "uuid" NOT NULL,
    "stripe_price_id" "text",
    "deactivation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "license_type_check" CHECK (("type" = ANY (ARRAY['individual'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."license" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."license_membership" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "license_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."license_membership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer,
    "width" integer,
    "height" integer,
    "thumbnail_url" "text",
    "folder" "text" DEFAULT 'uncategorized'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_collection_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "page_record_id" "uuid",
    "asset_type" "text" NOT NULL,
    "source_page_url" "text",
    "asset_url" "text" NOT NULL,
    "normalized_asset_url" "text" NOT NULL,
    "filename" "text",
    "clean_filename" "text",
    "mime_type" "text",
    "width" integer,
    "height" integer,
    "byte_size" bigint,
    "content_hash" "text",
    "quality_score" numeric,
    "is_duplicate" boolean DEFAULT false NOT NULL,
    "duplicate_of" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_collection_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_collection_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "page_id" "uuid",
    "business_id" "uuid",
    "company_name" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "current_stage" "text" DEFAULT 'queued'::"text" NOT NULL,
    "options" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pages_scanned" integer DEFAULT 0 NOT NULL,
    "assets_found" integer DEFAULT 0 NOT NULL,
    "assets_downloaded" integer DEFAULT 0 NOT NULL,
    "duplicates_skipped" integer DEFAULT 0 NOT NULL,
    "failures_count" integer DEFAULT 0 NOT NULL,
    "report" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_error" "text",
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."media_collection_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_collection_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "normalized_url" "text" NOT NULL,
    "depth" integer DEFAULT 0 NOT NULL,
    "http_status" integer,
    "discovered_at" timestamp with time zone DEFAULT "now"(),
    "visited_at" timestamp with time zone,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "title" "text",
    "content_type" "text",
    "error_message" "text"
);


ALTER TABLE "public"."media_collection_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_collection_social_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "url" "text" NOT NULL,
    "confidence_score" numeric,
    "discovered_from" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_collection_social_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mux_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "asset_id" "text",
    "playback_id" "text",
    "status" "text" DEFAULT 'uploading'::"text" NOT NULL,
    "duration" double precision,
    "created_by" "uuid",
    "page_id" "uuid",
    "section_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mux_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nurse_assessment_settings" (
    "business_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."nurse_assessment_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."nurse_assessment_settings" IS 'Private per-business recipient email for kiosk nurse assessment submissions. Falls back to the page contact-card email when absent.';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "industries" "text"[] DEFAULT '{}'::"text"[],
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."page_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "shared_with_email" "text" NOT NULL,
    "shared_with_user_id" "uuid",
    "permission" "text" DEFAULT 'view'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "page_shares_permission_check" CHECK (("permission" = ANY (ARRAY['view'::"text", 'edit'::"text"])))
);


ALTER TABLE "public"."page_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "template_id" "uuid",
    "category_id" "uuid",
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "styles" "jsonb" DEFAULT '{}'::"jsonb",
    "media_urls" "text"[] DEFAULT '{}'::"text"[],
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "publish_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "view_count" integer DEFAULT 0,
    "unique_view_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "save_count" integer DEFAULT 0,
    "meta_title" "text",
    "meta_description" "text",
    "og_image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "favicon_image_url" "text",
    "og_title" "text",
    "og_description" "text",
    "keywords" "text",
    "canonical_url" "text"
);


ALTER TABLE "public"."pages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pages"."meta_title" IS 'SEO meta title for search engines';



COMMENT ON COLUMN "public"."pages"."meta_description" IS 'SEO meta description for search engines';



COMMENT ON COLUMN "public"."pages"."og_image_url" IS 'URL to Open Graph image for social sharing';



COMMENT ON COLUMN "public"."pages"."favicon_image_url" IS 'URL to favicon image';



COMMENT ON COLUMN "public"."pages"."og_title" IS 'Open Graph title for social sharing';



COMMENT ON COLUMN "public"."pages"."og_description" IS 'Open Graph description for social sharing';



COMMENT ON COLUMN "public"."pages"."keywords" IS 'Comma-separated SEO keywords';



COMMENT ON COLUMN "public"."pages"."canonical_url" IS 'Canonical URL for SEO';



CREATE TABLE IF NOT EXISTS "public"."plans_pricing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "min_seats" integer NOT NULL,
    "max_seats" integer,
    "base_price" integer NOT NULL,
    "additional_price" integer,
    "stripe_price_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pricing_type" "text",
    "is_active" boolean DEFAULT false,
    "interval_type" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "interval_count" integer DEFAULT 1 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "description" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "plans_pricing_interval_type_check" CHECK (("interval_type" = ANY (ARRAY['monthly'::"text", 'yearly'::"text", '6-month'::"text"])))
);


ALTER TABLE "public"."plans_pricing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."section_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "default_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "available_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."section_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."share_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "short_code" "text" DEFAULT "substr"("md5"(("random"())::"text"), 0, 9) NOT NULL,
    "custom_message" "text",
    "password_hash" "text",
    "expires_at" timestamp with time zone,
    "max_views" integer,
    "view_count" integer DEFAULT 0,
    "last_viewed_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."share_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_short_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "link_type" "text" NOT NULL,
    "target_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "click_count" integer DEFAULT 0 NOT NULL,
    "last_clicked_at" timestamp with time zone
);


ALTER TABLE "public"."sms_short_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "industries" "text"[] DEFAULT '{}'::"text"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "structure" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "use_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_premium" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trackable_link_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trackable_link_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "visitor_id" "text",
    "user_id" "uuid",
    "session_id" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "country" "text",
    "region" "text",
    "city" "text",
    "timezone" "text",
    "device_type" "text",
    "browser" "text",
    "browser_version" "text",
    "os" "text",
    "os_version" "text",
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trackable_link_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['click'::"text", 'view'::"text", 'email_collected'::"text", 'password_entered'::"text", 'blocked'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."trackable_link_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trackable_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "page_id" "uuid",
    "business_page_id" "uuid",
    "tracking_code" "text" DEFAULT "substr"("md5"((("random"())::"text" || EXTRACT(epoch FROM "now"()))), 0, 9) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "password_hash" "text",
    "expires_at" timestamp with time zone,
    "max_clicks" integer,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "redirect_delay" integer DEFAULT 0,
    "show_preview" boolean DEFAULT false,
    "collect_email" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "click_count" integer DEFAULT 0,
    "unique_click_count" integer DEFAULT 0,
    "last_clicked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trackable_links_target_check" CHECK (((("page_id" IS NOT NULL) AND ("business_page_id" IS NULL)) OR (("page_id" IS NULL) AND ("business_page_id" IS NOT NULL))))
);


ALTER TABLE "public"."trackable_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trial_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trial_duration_days" integer DEFAULT 30 NOT NULL,
    "trial_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trial_settings_trial_type_check" CHECK (("trial_type" = ANY (ARRAY['free'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."trial_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "bio" "text",
    "plan_type" "text" DEFAULT 'free'::"text",
    "plan_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_type" "public"."user_type_enum" DEFAULT 'individual'::"public"."user_type_enum",
    "organization_id" "uuid",
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "subscription_status" "text" DEFAULT 'trial'::"text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "subscription_source" "text",
    "admin" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'pro'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "users_subscription_source_check" CHECK (("subscription_source" = ANY (ARRAY['individual'::"text", 'license'::"text"]))),
    CONSTRAINT "users_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'incomplete'::"text", 'free'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_folders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text" DEFAULT '#6B7280'::"text",
    "sort_order" integer DEFAULT 0,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "page_id" "uuid" NOT NULL,
    "folder_id" "uuid",
    "notes" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_favorite" boolean DEFAULT false,
    "last_viewed_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "saved_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_items" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_ai_assistant_settings"
    ADD CONSTRAINT "business_ai_assistant_settings_pkey" PRIMARY KEY ("business_id");



ALTER TABLE ONLY "public"."business_ai_knowledge_files"
    ADD CONSTRAINT "business_ai_knowledge_files_openai_file_id_key" UNIQUE ("openai_file_id");



ALTER TABLE ONLY "public"."business_ai_knowledge_files"
    ADD CONSTRAINT "business_ai_knowledge_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_business_id_user_id_key" UNIQUE ("business_id", "user_id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_page_analytics"
    ADD CONSTRAINT "business_page_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_pages"
    ADD CONSTRAINT "business_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."crm_contact_activity"
    ADD CONSTRAINT "crm_contact_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_contact_notes"
    ADD CONSTRAINT "crm_contact_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_business_id_name_key" UNIQUE ("business_id", "name");



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."free_trials"
    ADD CONSTRAINT "free_trials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kiosk_admins"
    ADD CONSTRAINT "kiosk_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kiosk_feedback"
    ADD CONSTRAINT "kiosk_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kiosk_feedback_settings"
    ADD CONSTRAINT "kiosk_feedback_settings_pkey" PRIMARY KEY ("business_id");



ALTER TABLE ONLY "public"."kiosk_overview_settings"
    ADD CONSTRAINT "kiosk_overview_settings_pkey" PRIMARY KEY ("business_id");



ALTER TABLE ONLY "public"."kiosk_template_settings"
    ADD CONSTRAINT "kiosk_template_settings_pkey" PRIMARY KEY ("page_id", "template_key");



ALTER TABLE ONLY "public"."kiosk_visitor_logs"
    ADD CONSTRAINT "kiosk_visitor_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license"
    ADD CONSTRAINT "license_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."license_membership"
    ADD CONSTRAINT "license_membership_license_id_user_id_key" UNIQUE ("license_id", "user_id");



ALTER TABLE ONLY "public"."license_membership"
    ADD CONSTRAINT "license_membership_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license"
    ADD CONSTRAINT "license_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_collection_assets"
    ADD CONSTRAINT "media_collection_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_collection_jobs"
    ADD CONSTRAINT "media_collection_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_collection_pages"
    ADD CONSTRAINT "media_collection_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_collection_social_links"
    ADD CONSTRAINT "media_collection_social_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mux_assets"
    ADD CONSTRAINT "mux_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nurse_assessment_settings"
    ADD CONSTRAINT "nurse_assessment_settings_pkey" PRIMARY KEY ("business_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_categories"
    ADD CONSTRAINT "page_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_categories"
    ADD CONSTRAINT "page_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."page_shares"
    ADD CONSTRAINT "page_shares_page_id_shared_with_email_key" UNIQUE ("page_id", "shared_with_email");



ALTER TABLE ONLY "public"."page_shares"
    ADD CONSTRAINT "page_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_business_id_slug_key" UNIQUE ("business_id", "slug");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans_pricing"
    ADD CONSTRAINT "plans_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_types"
    ADD CONSTRAINT "section_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_types"
    ADD CONSTRAINT "section_types_type_key" UNIQUE ("type");



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."sms_short_links"
    ADD CONSTRAINT "sms_short_links_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."sms_short_links"
    ADD CONSTRAINT "sms_short_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trackable_link_events"
    ADD CONSTRAINT "trackable_link_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trackable_links"
    ADD CONSTRAINT "trackable_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trackable_links"
    ADD CONSTRAINT "trackable_links_tracking_code_key" UNIQUE ("tracking_code");



ALTER TABLE ONLY "public"."trial_settings"
    ADD CONSTRAINT "trial_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_folders"
    ADD CONSTRAINT "wallet_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_items"
    ADD CONSTRAINT "wallet_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_items"
    ADD CONSTRAINT "wallet_items_user_id_page_id_key" UNIQUE ("user_id", "page_id");



CREATE INDEX "business_ai_knowledge_files_business_id_idx" ON "public"."business_ai_knowledge_files" USING "btree" ("business_id", "created_at" DESC);



CREATE INDEX "idx_analytics_page" ON "public"."analytics_events" USING "btree" ("page_id", "created_at");



CREATE INDEX "idx_analytics_type" ON "public"."analytics_events" USING "btree" ("event_type", "created_at");



CREATE INDEX "idx_analytics_visitor" ON "public"."analytics_events" USING "btree" ("visitor_id", "created_at");



CREATE INDEX "idx_business_members_business" ON "public"."business_members" USING "btree" ("business_id");



CREATE INDEX "idx_business_members_user" ON "public"."business_members" USING "btree" ("user_id");



CREATE INDEX "idx_business_page_analytics_business_id" ON "public"."business_page_analytics" USING "btree" ("business_id");



CREATE INDEX "idx_business_page_analytics_business_page_id" ON "public"."business_page_analytics" USING "btree" ("business_page_id");



CREATE INDEX "idx_business_page_analytics_created_at" ON "public"."business_page_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_business_page_analytics_event_type" ON "public"."business_page_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_business_page_analytics_session_id" ON "public"."business_page_analytics" USING "btree" ("session_id");



CREATE INDEX "idx_business_page_analytics_visitor_id" ON "public"."business_page_analytics" USING "btree" ("visitor_id");



CREATE INDEX "idx_business_pages_business_id" ON "public"."business_pages" USING "btree" ("business_id");



CREATE INDEX "idx_business_pages_created_by" ON "public"."business_pages" USING "btree" ("created_by");



CREATE INDEX "idx_business_pages_is_active" ON "public"."business_pages" USING "btree" ("is_active");



CREATE INDEX "idx_business_pages_is_published" ON "public"."business_pages" USING "btree" ("is_published");



CREATE INDEX "idx_businesses_owner" ON "public"."businesses" USING "btree" ("owner_id");



CREATE INDEX "idx_businesses_slug" ON "public"."businesses" USING "btree" ("slug");



CREATE INDEX "idx_crm_contact_activity_contact" ON "public"."crm_contact_activity" USING "btree" ("contact_id", "created_at" DESC);



CREATE INDEX "idx_crm_contact_notes_contact" ON "public"."crm_contact_notes" USING "btree" ("contact_id", "created_at" DESC);



CREATE INDEX "idx_crm_contacts_business" ON "public"."crm_contacts" USING "btree" ("business_id", "submitted_at" DESC);



CREATE INDEX "idx_crm_contacts_page_visitor" ON "public"."crm_contacts" USING "btree" ("page_id", "visitor_id");



CREATE INDEX "idx_crm_contacts_status" ON "public"."crm_contacts" USING "btree" ("status", "submitted_at" DESC);



CREATE INDEX "idx_crm_tags_business" ON "public"."crm_tags" USING "btree" ("business_id", "name");



CREATE INDEX "idx_free_trials_active_user" ON "public"."free_trials" USING "btree" ("user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_free_trials_ends_at" ON "public"."free_trials" USING "btree" ("trial_ends_at");



CREATE INDEX "idx_free_trials_status" ON "public"."free_trials" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_free_trials_user_active_unique" ON "public"."free_trials" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_free_trials_user_id" ON "public"."free_trials" USING "btree" ("user_id");



CREATE INDEX "idx_kiosk_template_settings_business" ON "public"."kiosk_template_settings" USING "btree" ("business_id", "updated_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_business_time" ON "public"."kiosk_visitor_logs" USING "btree" ("business_id", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_checked_out_name_time" ON "public"."kiosk_visitor_logs" USING "btree" ("checked_out_full_name", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_checkout_duration_time" ON "public"."kiosk_visitor_logs" USING "btree" ("checkout_duration", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_checkout_type_time" ON "public"."kiosk_visitor_logs" USING "btree" ("checkout_type", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_company_time" ON "public"."kiosk_visitor_logs" USING "btree" ("company_name", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_page_time" ON "public"."kiosk_visitor_logs" USING "btree" ("page_id", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_phone_time" ON "public"."kiosk_visitor_logs" USING "btree" ("phone", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_purpose_time" ON "public"."kiosk_visitor_logs" USING "btree" ("purpose", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_responsible_party_time" ON "public"."kiosk_visitor_logs" USING "btree" ("responsible_party", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_status_time" ON "public"."kiosk_visitor_logs" USING "btree" ("status", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_type_time" ON "public"."kiosk_visitor_logs" USING "btree" ("visitor_type", "occurred_at" DESC);



CREATE INDEX "idx_kiosk_visitor_logs_visiting_time" ON "public"."kiosk_visitor_logs" USING "btree" ("visiting", "occurred_at" DESC);



CREATE INDEX "idx_license_code" ON "public"."license" USING "btree" ("code");



CREATE INDEX "idx_license_created_by" ON "public"."license" USING "btree" ("purchased_by");



CREATE INDEX "idx_license_membership_license_id" ON "public"."license_membership" USING "btree" ("license_id");



CREATE INDEX "idx_license_membership_user_id" ON "public"."license_membership" USING "btree" ("user_id");



CREATE INDEX "idx_license_plan_pricing_id" ON "public"."license" USING "btree" ("plan_pricing_id");



CREATE INDEX "idx_license_purchased_by" ON "public"."license" USING "btree" ("purchased_by");



CREATE INDEX "idx_media_business" ON "public"."media" USING "btree" ("business_id", "folder");



CREATE INDEX "idx_organizations_owner_id" ON "public"."organizations" USING "btree" ("owner_id");



CREATE INDEX "idx_pages_business" ON "public"."pages" USING "btree" ("business_id", "is_published");



CREATE INDEX "idx_pages_canonical_url" ON "public"."pages" USING "btree" ("canonical_url");



CREATE INDEX "idx_pages_creator" ON "public"."pages" USING "btree" ("created_by");



CREATE INDEX "idx_pages_meta_title" ON "public"."pages" USING "btree" ("meta_title");



CREATE INDEX "idx_pages_published" ON "public"."pages" USING "btree" ("is_published", "published_at");



CREATE INDEX "idx_pages_slug" ON "public"."pages" USING "btree" ("business_id", "slug");



CREATE INDEX "idx_plans_pricing_seat_range" ON "public"."plans_pricing" USING "btree" ("min_seats", "max_seats");



CREATE INDEX "idx_share_links_code" ON "public"."share_links" USING "btree" ("short_code") WHERE ("is_active" = true);



CREATE INDEX "idx_trackable_link_events_link_id" ON "public"."trackable_link_events" USING "btree" ("trackable_link_id", "created_at");



CREATE INDEX "idx_trackable_link_events_type" ON "public"."trackable_link_events" USING "btree" ("event_type", "created_at");



CREATE INDEX "idx_trackable_link_events_visitor" ON "public"."trackable_link_events" USING "btree" ("visitor_id", "created_at");



CREATE INDEX "idx_trackable_links_active" ON "public"."trackable_links" USING "btree" ("is_active", "created_at");



CREATE INDEX "idx_trackable_links_business_page_id" ON "public"."trackable_links" USING "btree" ("business_page_id");



CREATE INDEX "idx_trackable_links_created_by" ON "public"."trackable_links" USING "btree" ("created_by");



CREATE INDEX "idx_trackable_links_page_id" ON "public"."trackable_links" USING "btree" ("page_id");



CREATE INDEX "idx_trackable_links_tracking_code" ON "public"."trackable_links" USING "btree" ("tracking_code") WHERE ("is_active" = true);



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_organization_id" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_wallet_folder" ON "public"."wallet_items" USING "btree" ("folder_id");



CREATE INDEX "idx_wallet_user" ON "public"."wallet_items" USING "btree" ("user_id", "is_favorite");



CREATE UNIQUE INDEX "kiosk_admins_business_email_unique" ON "public"."kiosk_admins" USING "btree" ("business_id", "lower"("email"));



CREATE INDEX "kiosk_admins_user_id_idx" ON "public"."kiosk_admins" USING "btree" ("user_id");



CREATE INDEX "kiosk_feedback_business_created_at_idx" ON "public"."kiosk_feedback" USING "btree" ("business_id", "created_at" DESC);



CREATE INDEX "kiosk_feedback_page_created_at_idx" ON "public"."kiosk_feedback" USING "btree" ("page_id", "created_at" DESC);



CREATE INDEX "media_collection_assets_job_id_idx" ON "public"."media_collection_assets" USING "btree" ("job_id");



CREATE INDEX "media_collection_jobs_created_by_idx" ON "public"."media_collection_jobs" USING "btree" ("created_by");



CREATE INDEX "media_collection_jobs_page_id_idx" ON "public"."media_collection_jobs" USING "btree" ("page_id");



CREATE INDEX "media_collection_pages_job_id_idx" ON "public"."media_collection_pages" USING "btree" ("job_id");



CREATE INDEX "media_collection_social_links_job_id_idx" ON "public"."media_collection_social_links" USING "btree" ("job_id");



CREATE INDEX "mux_assets_created_by_idx" ON "public"."mux_assets" USING "btree" ("created_by");



CREATE INDEX "mux_assets_upload_id_idx" ON "public"."mux_assets" USING "btree" ("upload_id");



CREATE INDEX "sms_short_links_code_idx" ON "public"."sms_short_links" USING "btree" ("code");



CREATE INDEX "sms_short_links_expires_at_idx" ON "public"."sms_short_links" USING "btree" ("expires_at");



CREATE OR REPLACE TRIGGER "enforce_kiosk_admin_limit_trigger" BEFORE INSERT OR UPDATE ON "public"."kiosk_admins" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_kiosk_admin_limit"();



CREATE OR REPLACE TRIGGER "on_analytics_event_insert" AFTER INSERT ON "public"."analytics_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_page_counters"();



CREATE OR REPLACE TRIGGER "on_trackable_link_event_insert" AFTER INSERT ON "public"."trackable_link_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_trackable_link_counters"();



CREATE OR REPLACE TRIGGER "on_user_created_link_invites" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."link_pending_business_member_invites"();



CREATE OR REPLACE TRIGGER "on_user_created_link_kiosk_admin_invites" AFTER INSERT OR UPDATE OF "email" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."link_pending_kiosk_admin_invites"();



CREATE OR REPLACE TRIGGER "trigger_update_business_pages_updated_at" BEFORE UPDATE ON "public"."business_pages" FOR EACH ROW EXECUTE FUNCTION "public"."update_business_pages_updated_at"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_ai_assistant_settings"
    ADD CONSTRAINT "business_ai_assistant_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_ai_assistant_settings"
    ADD CONSTRAINT "business_ai_assistant_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_ai_knowledge_files"
    ADD CONSTRAINT "business_ai_knowledge_files_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_ai_knowledge_files"
    ADD CONSTRAINT "business_ai_knowledge_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_page_analytics"
    ADD CONSTRAINT "business_page_analytics_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_page_analytics"
    ADD CONSTRAINT "business_page_analytics_business_page_id_fkey" FOREIGN KEY ("business_page_id") REFERENCES "public"."business_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_page_analytics"
    ADD CONSTRAINT "business_page_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_pages"
    ADD CONSTRAINT "business_pages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_pages"
    ADD CONSTRAINT "business_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_contact_activity"
    ADD CONSTRAINT "crm_contact_activity_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_contact_activity"
    ADD CONSTRAINT "crm_contact_activity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_contact_notes"
    ADD CONSTRAINT "crm_contact_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_contact_notes"
    ADD CONSTRAINT "crm_contact_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."free_trials"
    ADD CONSTRAINT "free_trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_admins"
    ADD CONSTRAINT "kiosk_admins_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_admins"
    ADD CONSTRAINT "kiosk_admins_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_admins"
    ADD CONSTRAINT "kiosk_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kiosk_feedback"
    ADD CONSTRAINT "kiosk_feedback_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_feedback"
    ADD CONSTRAINT "kiosk_feedback_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_feedback_settings"
    ADD CONSTRAINT "kiosk_feedback_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_feedback_settings"
    ADD CONSTRAINT "kiosk_feedback_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kiosk_overview_settings"
    ADD CONSTRAINT "kiosk_overview_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_overview_settings"
    ADD CONSTRAINT "kiosk_overview_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kiosk_template_settings"
    ADD CONSTRAINT "kiosk_template_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_template_settings"
    ADD CONSTRAINT "kiosk_template_settings_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_template_settings"
    ADD CONSTRAINT "kiosk_template_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kiosk_visitor_logs"
    ADD CONSTRAINT "kiosk_visitor_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kiosk_visitor_logs"
    ADD CONSTRAINT "kiosk_visitor_logs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."license"
    ADD CONSTRAINT "license_created_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."license_membership"
    ADD CONSTRAINT "license_membership_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "public"."license"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."license_membership"
    ADD CONSTRAINT "license_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."license"
    ADD CONSTRAINT "license_plan_pricing_id_fkey" FOREIGN KEY ("plan_pricing_id") REFERENCES "public"."plans_pricing"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_collection_assets"
    ADD CONSTRAINT "media_collection_assets_duplicate_of_fkey" FOREIGN KEY ("duplicate_of") REFERENCES "public"."media_collection_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_collection_assets"
    ADD CONSTRAINT "media_collection_assets_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."media_collection_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_collection_assets"
    ADD CONSTRAINT "media_collection_assets_page_record_id_fkey" FOREIGN KEY ("page_record_id") REFERENCES "public"."media_collection_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_collection_jobs"
    ADD CONSTRAINT "media_collection_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_collection_jobs"
    ADD CONSTRAINT "media_collection_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_collection_jobs"
    ADD CONSTRAINT "media_collection_jobs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_collection_pages"
    ADD CONSTRAINT "media_collection_pages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."media_collection_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_collection_social_links"
    ADD CONSTRAINT "media_collection_social_links_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."media_collection_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mux_assets"
    ADD CONSTRAINT "mux_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nurse_assessment_settings"
    ADD CONSTRAINT "nurse_assessment_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nurse_assessment_settings"
    ADD CONSTRAINT "nurse_assessment_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_shares"
    ADD CONSTRAINT "page_shares_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_shares"
    ADD CONSTRAINT "page_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."page_shares"
    ADD CONSTRAINT "page_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."page_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."page_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trackable_link_events"
    ADD CONSTRAINT "trackable_link_events_trackable_link_id_fkey" FOREIGN KEY ("trackable_link_id") REFERENCES "public"."trackable_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trackable_link_events"
    ADD CONSTRAINT "trackable_link_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."trackable_links"
    ADD CONSTRAINT "trackable_links_business_page_id_fkey" FOREIGN KEY ("business_page_id") REFERENCES "public"."business_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trackable_links"
    ADD CONSTRAINT "trackable_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trackable_links"
    ADD CONSTRAINT "trackable_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_folders"
    ADD CONSTRAINT "wallet_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_items"
    ADD CONSTRAINT "wallet_items_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."wallet_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_items"
    ADD CONSTRAINT "wallet_items_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_items"
    ADD CONSTRAINT "wallet_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public insert for analytics tracking" ON "public"."business_page_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can create analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can create trackable link events" ON "public"."trackable_link_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view active page categories" ON "public"."page_categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active section types" ON "public"."section_types" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active share links" ON "public"."share_links" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active templates" ON "public"."templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active trackable links for tracking" ON "public"."trackable_links" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view businesses" ON "public"."businesses" FOR SELECT USING (true);



CREATE POLICY "Anyone can view published pages" ON "public"."pages" FOR SELECT USING ((("is_published" = true) OR ("is_active" = true)));



CREATE POLICY "Business admins can delete pages" ON "public"."pages" FOR DELETE USING (("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE (("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."role" = 'admin'::"text")))));



CREATE POLICY "Business members can create pages" ON "public"."pages" FOR INSERT WITH CHECK ((("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE (("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Business members can update pages" ON "public"."pages" FOR UPDATE USING (("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE (("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Business members can upload media" ON "public"."media" FOR INSERT WITH CHECK ((("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE (("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Business members can view analytics" ON "public"."analytics_events" FOR SELECT USING (("page_id" IN ( SELECT "p"."id"
   FROM "public"."pages" "p"
  WHERE ("p"."business_id" IN ( SELECT "business_members"."business_id"
           FROM "public"."business_members"
          WHERE ("business_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Business members can view media" ON "public"."media" FOR SELECT USING (("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Business members can view pages" ON "public"."pages" FOR SELECT USING (("business_id" IN ( SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Business members can view their analytics" ON "public"."business_page_analytics" FOR SELECT USING (("business_id" IN ( SELECT "bm"."business_id"
   FROM "public"."business_members" "bm"
  WHERE (("bm"."user_id" = "auth"."uid"()) AND ("bm"."accepted_at" IS NOT NULL)))));



CREATE POLICY "Business owners can create pages" ON "public"."pages" FOR INSERT WITH CHECK ((("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Business owners can delete media" ON "public"."media" FOR DELETE USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can delete pages" ON "public"."pages" FOR DELETE USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can delete their analytics" ON "public"."business_page_analytics" FOR DELETE USING (("business_id" IN ( SELECT "b"."id"
   FROM "public"."businesses" "b"
  WHERE ("b"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can delete their business" ON "public"."businesses" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Business owners can manage all members" ON "public"."business_members" USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can update pages" ON "public"."pages" FOR UPDATE USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can update their business" ON "public"."businesses" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Business owners can upload media" ON "public"."media" FOR INSERT WITH CHECK ((("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Business owners can view all members" ON "public"."business_members" FOR SELECT USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can view all pages" ON "public"."pages" FOR SELECT USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can view analytics" ON "public"."analytics_events" FOR SELECT USING (("page_id" IN ( SELECT "p"."id"
   FROM ("public"."pages" "p"
     JOIN "public"."businesses" "b" ON (("b"."id" = "p"."business_id")))
  WHERE ("b"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can view media" ON "public"."media" FOR SELECT USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Business owners can view their analytics" ON "public"."business_page_analytics" FOR SELECT USING (("business_id" IN ( SELECT "b"."id"
   FROM "public"."businesses" "b"
  WHERE ("b"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Link owners can view events for their links" ON "public"."trackable_link_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trackable_links" "tl"
  WHERE (("tl"."id" = "trackable_link_events"."trackable_link_id") AND ("tl"."created_by" = "auth"."uid"())))));



CREATE POLICY "Media uploaders can delete their uploads" ON "public"."media" FOR DELETE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Owner manages page shares" ON "public"."page_shares" USING (("shared_by" = "auth"."uid"())) WITH CHECK (("shared_by" = "auth"."uid"()));



CREATE POLICY "Public can view published business pages" ON "public"."business_pages" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Users can be added as members" ON "public"."business_members" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create businesses" ON "public"."businesses" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can create trackable links for their content" ON "public"."trackable_links" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ((("page_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."id" = "trackable_links"."page_id") AND ("p"."created_by" = "auth"."uid"()))))) OR (("page_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."pages" "p"
     JOIN "public"."business_members" "bm" ON (("bm"."business_id" = "p"."business_id")))
  WHERE (("p"."id" = "trackable_links"."page_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"])))))) OR (("business_page_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."business_pages" "bp"
     JOIN "public"."business_members" "bm" ON (("bm"."business_id" = "bp"."business_id")))
  WHERE (("bp"."id" = "trackable_links"."business_page_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"])))))))));



CREATE POLICY "Users can delete business pages for their businesses" ON "public"."business_pages" FOR DELETE USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"())
UNION
 SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own trackable links" ON "public"."trackable_links" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can insert business pages for their businesses" ON "public"."business_pages" FOR INSERT WITH CHECK (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"())
UNION
 SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own mux_assets" ON "public"."mux_assets" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own trials" ON "public"."free_trials" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own share links" ON "public"."share_links" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update business pages for their businesses" ON "public"."business_pages" FOR UPDATE USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"())
UNION
 SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own mux_assets" ON "public"."mux_assets" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own trackable links" ON "public"."trackable_links" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own trials" ON "public"."free_trials" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view business pages for their businesses" ON "public"."business_pages" FOR SELECT USING (("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"())
UNION
 SELECT "business_members"."business_id"
   FROM "public"."business_members"
  WHERE ("business_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own membership" ON "public"."business_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own mux_assets" ON "public"."mux_assets" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own trackable links" ON "public"."trackable_links" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can view their own trials" ON "public"."free_trials" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own wallet folders" ON "public"."wallet_folders" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own wallet items" ON "public"."wallet_items" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_select_owner_or_member" ON "public"."analytics_events" FOR SELECT USING (("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE (("pages"."created_by" = "auth"."uid"()) OR "public"."is_business_member"("pages"."business_id")))));



CREATE POLICY "analytics_events_select_shared_user" ON "public"."analytics_events" FOR SELECT USING (("public"."has_page_share_permission"("page_id", 'edit'::"text") OR "public"."has_page_share_permission"("page_id", 'view'::"text")));



ALTER TABLE "public"."business_ai_assistant_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_ai_knowledge_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_members_select" ON "public"."business_members" FOR SELECT USING ((("business_id" IN ( SELECT "businesses"."id"
   FROM "public"."businesses"
  WHERE ("businesses"."owner_id" = "auth"."uid"()))) OR ("user_id" = "auth"."uid"()) OR ("lower"("invited_email") = ( SELECT "lower"("users"."email") AS "lower"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



ALTER TABLE "public"."business_page_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "businesses_select_shared_page_businesses" ON "public"."businesses" FOR SELECT USING ("public"."user_can_access_business"("id"));



ALTER TABLE "public"."crm_contact_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_contact_activity_accessible" ON "public"."crm_contact_activity" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_contacts" "c"
  WHERE (("c"."id" = "crm_contact_activity"."contact_id") AND "public"."can_access_crm_business"("c"."business_id")))));



ALTER TABLE "public"."crm_contact_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_contact_notes_accessible" ON "public"."crm_contact_notes" USING ((EXISTS ( SELECT 1
   FROM "public"."crm_contacts" "c"
  WHERE (("c"."id" = "crm_contact_notes"."contact_id") AND ("public"."can_access_crm_business"("c"."business_id") OR (("c"."page_id" IS NOT NULL) AND "public"."can_access_crm_page"("c"."page_id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_contacts" "c"
  WHERE (("c"."id" = "crm_contact_notes"."contact_id") AND ("public"."can_access_crm_business"("c"."business_id") OR (("c"."page_id" IS NOT NULL) AND "public"."can_access_crm_page"("c"."page_id")))))));



ALTER TABLE "public"."crm_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_contacts_delete_accessible" ON "public"."crm_contacts" FOR DELETE USING (("public"."can_access_crm_business"("business_id") OR (("page_id" IS NOT NULL) AND "public"."can_access_crm_page"("page_id"))));



CREATE POLICY "crm_contacts_insert_owner_member_or_shared_page_user" ON "public"."crm_contacts" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."businesses" "b"
  WHERE (("b"."id" = "crm_contacts"."business_id") AND (("b"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."business_members" "bm"
          WHERE (("bm"."business_id" = "b"."id") AND ("bm"."user_id" = "auth"."uid"())))))))) OR ((EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."business_id" = "crm_contacts"."business_id") AND ("p"."is_active" = true) AND (("p"."created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."page_shares" "ps"
          WHERE (("ps"."page_id" = "p"."id") AND (("ps"."shared_with_user_id" = "auth"."uid"()) OR ("lower"("ps"."shared_with_email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))))))))))) AND (("page_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."id" = "crm_contacts"."page_id") AND ("p"."business_id" = "crm_contacts"."business_id") AND (("p"."created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."page_shares" "ps"
          WHERE (("ps"."page_id" = "p"."id") AND (("ps"."shared_with_user_id" = "auth"."uid"()) OR ("lower"("ps"."shared_with_email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))))))))))));



CREATE POLICY "crm_contacts_public_insert_published_page" ON "public"."crm_contacts" FOR INSERT WITH CHECK ((("page_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."id" = "crm_contacts"."page_id") AND ("p"."business_id" = "crm_contacts"."business_id") AND ("p"."is_active" = true) AND ("p"."is_published" = true))))));



CREATE POLICY "crm_contacts_select_accessible" ON "public"."crm_contacts" FOR SELECT USING ("public"."can_access_crm_business"("business_id"));



CREATE POLICY "crm_contacts_update_accessible" ON "public"."crm_contacts" FOR UPDATE USING ("public"."can_access_crm_business"("business_id")) WITH CHECK ("public"."can_access_crm_business"("business_id"));



ALTER TABLE "public"."crm_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_tags_accessible" ON "public"."crm_tags" USING (("public"."can_access_crm_business"("business_id") OR (EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."business_id" = "crm_tags"."business_id") AND "public"."can_access_crm_page"("p"."id")))))) WITH CHECK (("public"."can_access_crm_business"("business_id") OR (EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."business_id" = "crm_tags"."business_id") AND "public"."can_access_crm_page"("p"."id"))))));



ALTER TABLE "public"."free_trials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kiosk_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kiosk_admins_select_owner_or_self" ON "public"."kiosk_admins" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."businesses" "b"
  WHERE (("b"."id" = "kiosk_admins"."business_id") AND ("b"."owner_id" = "auth"."uid"())))) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."kiosk_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kiosk_feedback_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kiosk_overview_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kiosk_template_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kiosk_template_settings_delete_accessible" ON "public"."kiosk_template_settings" FOR DELETE TO "authenticated" USING (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



CREATE POLICY "kiosk_template_settings_insert_accessible" ON "public"."kiosk_template_settings" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



CREATE POLICY "kiosk_template_settings_public_select_published_page" ON "public"."kiosk_template_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."id" = "kiosk_template_settings"."page_id") AND ("p"."business_id" = "kiosk_template_settings"."business_id") AND ("p"."is_active" = true) AND ("p"."is_published" = true)))));



CREATE POLICY "kiosk_template_settings_select_accessible" ON "public"."kiosk_template_settings" FOR SELECT TO "authenticated" USING (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



CREATE POLICY "kiosk_template_settings_update_accessible" ON "public"."kiosk_template_settings" FOR UPDATE TO "authenticated" USING (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id"))) WITH CHECK (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



ALTER TABLE "public"."kiosk_visitor_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kiosk_visitor_logs_delete_accessible" ON "public"."kiosk_visitor_logs" FOR DELETE USING (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



CREATE POLICY "kiosk_visitor_logs_public_insert_published_page" ON "public"."kiosk_visitor_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pages" "p"
  WHERE (("p"."id" = "kiosk_visitor_logs"."page_id") AND ("p"."business_id" = "kiosk_visitor_logs"."business_id") AND ("p"."is_active" = true) AND ("p"."is_published" = true)))));



CREATE POLICY "kiosk_visitor_logs_select_accessible" ON "public"."kiosk_visitor_logs" FOR SELECT USING (("public"."can_access_crm_business"("business_id") OR "public"."can_access_crm_page"("page_id")));



ALTER TABLE "public"."license" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."license_membership" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "license_membership_basic_access" ON "public"."license_membership" FOR SELECT USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "license_membership_basic_access" ON "public"."license_membership" IS 'Simple basic access: users can only read their own license memberships';



CREATE POLICY "license_membership_join_access" ON "public"."license_membership" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "license_membership_own_access" ON "public"."license_membership" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "license_membership_purchaser_manage" ON "public"."license_membership" USING (("auth"."uid"() IN ( SELECT "l"."purchased_by"
   FROM "public"."license" "l"
  WHERE ("l"."id" = "license_membership"."license_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "l"."purchased_by"
   FROM "public"."license" "l"
  WHERE ("l"."id" = "license_membership"."license_id"))));



CREATE POLICY "license_org_owner_access" ON "public"."license" USING ((EXISTS ( SELECT 1
   FROM ("public"."organizations" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "license"."purchased_by")))
  WHERE (("o"."owner_id" = "auth"."uid"()) AND ("u"."organization_id" = "o"."id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."organizations" "o"
     JOIN "public"."users" "u" ON (("u"."id" = "license"."purchased_by")))
  WHERE (("o"."owner_id" = "auth"."uid"()) AND ("u"."organization_id" = "o"."id")))));



COMMENT ON POLICY "license_org_owner_access" ON "public"."license" IS 'Organization owners can manage licenses purchased by their org members';



CREATE POLICY "license_purchaser_access" ON "public"."license" USING (("auth"."uid"() = "purchased_by")) WITH CHECK (("auth"."uid"() = "purchased_by"));



COMMENT ON POLICY "license_purchaser_access" ON "public"."license" IS 'License purchasers have full access to their licenses';



CREATE POLICY "license_redemption_access" ON "public"."license" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "license_service_role_access" ON "public"."license" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media collection assets owner select" ON "public"."media_collection_assets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."media_collection_jobs" "jobs"
  WHERE (("jobs"."id" = "media_collection_assets"."job_id") AND ("jobs"."created_by" = "auth"."uid"())))));



CREATE POLICY "media collection jobs owner insert" ON "public"."media_collection_jobs" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "media collection jobs owner select" ON "public"."media_collection_jobs" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "media collection jobs owner update" ON "public"."media_collection_jobs" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "media collection pages owner select" ON "public"."media_collection_pages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."media_collection_jobs" "jobs"
  WHERE (("jobs"."id" = "media_collection_pages"."job_id") AND ("jobs"."created_by" = "auth"."uid"())))));



CREATE POLICY "media collection social links owner select" ON "public"."media_collection_social_links" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."media_collection_jobs" "jobs"
  WHERE (("jobs"."id" = "media_collection_social_links"."job_id") AND ("jobs"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."media_collection_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_collection_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_collection_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_collection_social_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mux_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nurse_assessment_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_owner_access" ON "public"."organizations" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



COMMENT ON POLICY "organizations_owner_access" ON "public"."organizations" IS 'Organization owners have full access via owner_id field - this should allow basic reads';



ALTER TABLE "public"."page_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_shares" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_shares_delete" ON "public"."page_shares" FOR DELETE USING ((("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE ("pages"."created_by" = "auth"."uid"()))) OR ("lower"("shared_with_email") = "lower"("auth"."email"()))));



CREATE POLICY "page_shares_insert" ON "public"."page_shares" FOR INSERT WITH CHECK (("shared_by" = "auth"."uid"()));



CREATE POLICY "page_shares_select" ON "public"."page_shares" FOR SELECT USING ("public"."user_can_access_page_share"("page_id", "shared_with_user_id", "shared_with_email"));



CREATE POLICY "page_shares_update" ON "public"."page_shares" FOR UPDATE USING (("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE ("pages"."created_by" = "auth"."uid"()))));



ALTER TABLE "public"."pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pages_delete_owner_only" ON "public"."pages" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "pages_insert_owner_only" ON "public"."pages" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "pages_select_owner_or_member" ON "public"."pages" FOR SELECT USING ((("auth"."uid"() = "created_by") OR "public"."is_business_member"("business_id")));



CREATE POLICY "pages_select_shared_access" ON "public"."pages" FOR SELECT USING ("public"."user_can_access_page"("id"));



CREATE POLICY "pages_update_owner_or_editor" ON "public"."pages" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR "public"."has_page_share_permission"("id", 'edit'::"text")));



CREATE POLICY "pages_update_shared_editors" ON "public"."pages" FOR UPDATE USING ("public"."user_can_edit_page"("id")) WITH CHECK ("public"."user_can_edit_page"("id"));



ALTER TABLE "public"."plans_pricing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_pricing_select_authenticated" ON "public"."plans_pricing" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "plans_pricing_select_authenticated" ON "public"."plans_pricing" IS 'All authenticated users can view pricing plans';



CREATE POLICY "plans_pricing_server_select" ON "public"."plans_pricing" FOR SELECT USING (("auth"."uid"() IS NULL));



ALTER TABLE "public"."section_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."share_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "share_links_select_owner_or_member" ON "public"."share_links" FOR SELECT USING (("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE (("pages"."created_by" = "auth"."uid"()) OR "public"."is_business_member"("pages"."business_id")))));



ALTER TABLE "public"."sms_short_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trackable_link_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trackable_link_events_select_shared_user" ON "public"."trackable_link_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trackable_links" "tl"
  WHERE (("tl"."id" = "trackable_link_events"."trackable_link_id") AND ("public"."has_page_share_permission"("tl"."page_id", 'edit'::"text") OR "public"."has_page_share_permission"("tl"."page_id", 'view'::"text"))))));



ALTER TABLE "public"."trackable_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trackable_links_insert_owner_or_shared" ON "public"."trackable_links" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (("page_id" IS NULL) OR ("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE ("pages"."created_by" = "auth"."uid"()))) OR "public"."has_page_share_permission"("page_id", 'edit'::"text") OR "public"."has_page_share_permission"("page_id", 'view'::"text"))));



CREATE POLICY "trackable_links_select_owner_or_member" ON "public"."trackable_links" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR ("page_id" IN ( SELECT "pages"."id"
   FROM "public"."pages"
  WHERE (("pages"."created_by" = "auth"."uid"()) OR "public"."is_business_member"("pages"."business_id")))) OR ("page_id" IN ( SELECT "page_shares"."page_id"
   FROM "public"."page_shares"
  WHERE (("page_shares"."shared_with_user_id" = "auth"."uid"()) OR ("lower"("page_shares"."shared_with_email") = ( SELECT "lower"("users"."email") AS "lower"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



ALTER TABLE "public"."trial_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trial_settings_select_authenticated" ON "public"."trial_settings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "trial_settings_select_authenticated" ON "public"."trial_settings" IS 'All authenticated users can view trial settings';



CREATE POLICY "user_can_delete_own_membership" ON "public"."license_membership" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_can_update_own_membership" ON "public"."license_membership" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_own_profile_read" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



COMMENT ON POLICY "users_own_profile_read" ON "public"."users" IS 'Clean policy: users can only read their own profile - no complex joins';



CREATE POLICY "users_own_profile_update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



COMMENT ON POLICY "users_own_profile_update" ON "public"."users" IS 'Users can update their own profile';



CREATE POLICY "users_server_select" ON "public"."users" FOR SELECT USING (("auth"."uid"() IS NULL));



ALTER TABLE "public"."wallet_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_items" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_business_member"("p_business_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_business_member"("p_business_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_business_member"("p_business_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_crm_business"("p_business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_crm_business"("p_business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_crm_business"("p_business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_crm_page"("p_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_crm_page"("p_page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_crm_page"("p_page_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_trial"("p_trial_id" "uuid", "p_conversion_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_trial"("p_trial_id" "uuid", "p_conversion_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_trial"("p_trial_id" "uuid", "p_conversion_source" "text") TO "service_role";



GRANT ALL ON TABLE "public"."crm_contacts" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_manual_crm_contact"("p_business_id" "uuid", "p_page_id" "uuid", "p_created_by" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_message" "text", "p_description" "text", "p_source" "text", "p_status" "text", "p_source_page_name" "text", "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_manual_crm_contact"("p_business_id" "uuid", "p_page_id" "uuid", "p_created_by" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_message" "text", "p_description" "text", "p_source" "text", "p_status" "text", "p_source_page_name" "text", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_manual_crm_contact"("p_business_id" "uuid", "p_page_id" "uuid", "p_created_by" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_message" "text", "p_description" "text", "p_source" "text", "p_status" "text", "p_source_page_name" "text", "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_kiosk_admin_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_kiosk_admin_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_kiosk_admin_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_trial"("p_trial_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."expire_trial"("p_trial_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_trial"("p_trial_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_business_slug"("business_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_business_slug"("business_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_business_slug"("business_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_page_slug"("page_title" "text", "business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_page_slug"("page_title" "text", "business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_page_slug"("page_title" "text", "business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_summary"("p_page_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_summary"("p_page_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_summary"("p_page_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_license_members_safe"("p_license_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_license_members_safe"("p_license_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_license_members_safe"("p_license_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_trial_info"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_trial_info"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_trial_info"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_page_share_permission"("page_uuid" "uuid", "required_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_page_share_permission"("page_uuid" "uuid", "required_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_page_share_permission"("page_uuid" "uuid", "required_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_business_member"("bid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_business_member"("bid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_business_member"("bid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_kiosk_admin"("p_business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_kiosk_admin"("p_business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_kiosk_admin"("p_business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_pending_business_member_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_pending_business_member_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_pending_business_member_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_pending_kiosk_admin_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_pending_kiosk_admin_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_pending_kiosk_admin_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_expired_trials"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_expired_trials"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_expired_trials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_pages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_pages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_pages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_page_counters"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_page_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_page_counters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_super_table_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_super_table_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_super_table_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trackable_link_counters"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trackable_link_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trackable_link_counters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_business"("p_business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_business"("p_business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_business"("p_business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_page"("p_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_page"("p_page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_page"("p_page_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_page_share"("p_page_id" "uuid", "p_shared_with_user_id" "uuid", "p_shared_with_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_page_share"("p_page_id" "uuid", "p_shared_with_user_id" "uuid", "p_shared_with_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_page_share"("p_page_id" "uuid", "p_shared_with_user_id" "uuid", "p_shared_with_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_edit_page"("p_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_edit_page"("p_page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_edit_page"("p_page_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."business_ai_assistant_settings" TO "anon";
GRANT ALL ON TABLE "public"."business_ai_assistant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."business_ai_assistant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."business_ai_knowledge_files" TO "anon";
GRANT ALL ON TABLE "public"."business_ai_knowledge_files" TO "authenticated";
GRANT ALL ON TABLE "public"."business_ai_knowledge_files" TO "service_role";



GRANT ALL ON TABLE "public"."business_members" TO "anon";
GRANT ALL ON TABLE "public"."business_members" TO "authenticated";
GRANT ALL ON TABLE "public"."business_members" TO "service_role";



GRANT ALL ON TABLE "public"."business_page_analytics" TO "anon";
GRANT ALL ON TABLE "public"."business_page_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."business_page_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."business_pages" TO "anon";
GRANT ALL ON TABLE "public"."business_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."business_pages" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."crm_contact_activity" TO "anon";
GRANT ALL ON TABLE "public"."crm_contact_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contact_activity" TO "service_role";



GRANT ALL ON TABLE "public"."crm_contact_notes" TO "anon";
GRANT ALL ON TABLE "public"."crm_contact_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contact_notes" TO "service_role";



GRANT ALL ON TABLE "public"."crm_tags" TO "anon";
GRANT ALL ON TABLE "public"."crm_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_tags" TO "service_role";



GRANT ALL ON TABLE "public"."free_trials" TO "anon";
GRANT ALL ON TABLE "public"."free_trials" TO "authenticated";
GRANT ALL ON TABLE "public"."free_trials" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_admins" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_admins" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_feedback" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_feedback_settings" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_feedback_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_feedback_settings" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_overview_settings" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_template_settings" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_template_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_template_settings" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_visitor_logs" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_visitor_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_visitor_logs" TO "service_role";



GRANT ALL ON TABLE "public"."license" TO "anon";
GRANT ALL ON TABLE "public"."license" TO "authenticated";
GRANT ALL ON TABLE "public"."license" TO "service_role";



GRANT ALL ON TABLE "public"."license_membership" TO "anon";
GRANT ALL ON TABLE "public"."license_membership" TO "authenticated";
GRANT ALL ON TABLE "public"."license_membership" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."media_collection_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_collection_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_collection_assets" TO "service_role";



GRANT ALL ON TABLE "public"."media_collection_jobs" TO "anon";
GRANT ALL ON TABLE "public"."media_collection_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."media_collection_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."media_collection_pages" TO "anon";
GRANT ALL ON TABLE "public"."media_collection_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."media_collection_pages" TO "service_role";



GRANT ALL ON TABLE "public"."media_collection_social_links" TO "anon";
GRANT ALL ON TABLE "public"."media_collection_social_links" TO "authenticated";
GRANT ALL ON TABLE "public"."media_collection_social_links" TO "service_role";



GRANT ALL ON TABLE "public"."mux_assets" TO "anon";
GRANT ALL ON TABLE "public"."mux_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."mux_assets" TO "service_role";



GRANT ALL ON TABLE "public"."nurse_assessment_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."page_categories" TO "anon";
GRANT ALL ON TABLE "public"."page_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."page_categories" TO "service_role";



GRANT ALL ON TABLE "public"."page_shares" TO "anon";
GRANT ALL ON TABLE "public"."page_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."page_shares" TO "service_role";



GRANT ALL ON TABLE "public"."pages" TO "anon";
GRANT ALL ON TABLE "public"."pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pages" TO "service_role";



GRANT ALL ON TABLE "public"."plans_pricing" TO "anon";
GRANT ALL ON TABLE "public"."plans_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."plans_pricing" TO "service_role";



GRANT ALL ON TABLE "public"."section_types" TO "anon";
GRANT ALL ON TABLE "public"."section_types" TO "authenticated";
GRANT ALL ON TABLE "public"."section_types" TO "service_role";



GRANT ALL ON TABLE "public"."share_links" TO "anon";
GRANT ALL ON TABLE "public"."share_links" TO "authenticated";
GRANT ALL ON TABLE "public"."share_links" TO "service_role";



GRANT ALL ON TABLE "public"."sms_short_links" TO "anon";
GRANT ALL ON TABLE "public"."sms_short_links" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_short_links" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."trackable_link_events" TO "anon";
GRANT ALL ON TABLE "public"."trackable_link_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trackable_link_events" TO "service_role";



GRANT ALL ON TABLE "public"."trackable_links" TO "anon";
GRANT ALL ON TABLE "public"."trackable_links" TO "authenticated";
GRANT ALL ON TABLE "public"."trackable_links" TO "service_role";



GRANT ALL ON TABLE "public"."trial_settings" TO "anon";
GRANT ALL ON TABLE "public"."trial_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_settings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_folders" TO "anon";
GRANT ALL ON TABLE "public"."wallet_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_folders" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_items" TO "anon";
GRANT ALL ON TABLE "public"."wallet_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_items" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- pg_dump was scoped to public, so explicitly preserve this application-owned
-- cross-schema trigger. Supabase provisions auth.users before migrations run.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();





