-- CrownPages Database Schema
-- A mobile-first page builder platform for businesses
-- Run this in your new Supabase project's SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For better text search

-- Users table - simplified for general business use
CREATE TABLE public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Subscription/plan info (for future monetization)
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    plan_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses/Workspaces - supports multiple businesses per user
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Business details
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- for potential custom domains later
    description TEXT,
    logo_url TEXT,
    
    -- Contact information
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Address
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Settings
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#ffffff',
    font_family TEXT DEFAULT 'Inter',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business members for team collaboration
CREATE TABLE public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Page categories (configurable by platform admin)
CREATE TABLE public.page_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT, -- icon name or URL
    
    -- Industries this category is relevant for
    industries TEXT[] DEFAULT '{}',
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates - the core of the page builder
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.page_categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Industries this template works well for
    industries TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- The template structure - defines available sections and default content
    structure JSONB NOT NULL DEFAULT '{}',
    /* Example structure:
    {
        "sections": [
            {
                "id": "hero-1",
                "type": "hero",
                "name": "Hero Section",
                "fields": {
                    "title": { "type": "text", "default": "Welcome", "maxLength": 100 },
                    "subtitle": { "type": "text", "default": "", "maxLength": 200 },
                    "backgroundImage": { "type": "image", "default": null },
                    "ctaButton": { 
                        "type": "button", 
                        "default": { "text": "Learn More", "link": "#", "style": "primary" }
                    }
                }
            }
        ],
        "colorScheme": {
            "primary": "#000000",
            "secondary": "#ffffff",
            "accent": "#0066cc"
        },
        "fonts": {
            "heading": "Montserrat",
            "body": "Inter"
        }
    }
    */
    
    -- Usage tracking
    use_count INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Section types available in the platform
CREATE TABLE public.section_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT UNIQUE NOT NULL, -- hero, gallery, contact, etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    
    -- Default configuration for this section type
    default_config JSONB NOT NULL DEFAULT '{}',
    
    -- Which fields are available for this section type
    available_fields JSONB NOT NULL DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages - the actual pages created by users
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Page identification
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL will be crownpages.com/{page_id} or custom domain/{slug}
    description TEXT,
    
    -- Template and category
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.page_categories(id) ON DELETE SET NULL,
    
    -- Page content - the actual data for each section
    content JSONB NOT NULL DEFAULT '{}',
    /* Example content:
    {
        "sections": [
            {
                "id": "hero-1",
                "type": "hero",
                "data": {
                    "title": "Smith Dental Care",
                    "subtitle": "Your smile is our priority",
                    "backgroundImage": "https://...",
                    "ctaButton": { "text": "Book Now", "link": "tel:555-0123" }
                }
            }
        ]
    }
    */
    
    -- Page styling overrides
    styles JSONB DEFAULT '{}',
    /* Example styles:
    {
        "colors": {
            "primary": "#0066cc",
            "secondary": "#ffffff"
        },
        "fonts": {
            "heading": "Montserrat",
            "body": "Inter"
        },
        "customCss": ""
    }
    */
    
    -- Media gallery for the page
    media_urls TEXT[] DEFAULT '{}',
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    publish_settings JSONB DEFAULT '{}', -- password protection, expiry, etc.
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    unique_view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    og_image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, slug)
);

-- Media library for businesses
CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER, -- in bytes
    
    -- Image specific metadata
    width INTEGER,
    height INTEGER,
    thumbnail_url TEXT,
    
    -- Organization
    folder TEXT DEFAULT 'uncategorized',
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page analytics events
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
    
    event_type TEXT NOT NULL CHECK (event_type IN (
        'page_view', 'link_click', 'button_click', 'form_submit',
        'share', 'save', 'print', 'download',
        'phone_click', 'email_click', 'address_click'
    )),
    
    -- Event specific data
    event_data JSONB DEFAULT '{}',
    
    -- Visitor identification
    visitor_id TEXT, -- anonymous visitor ID from device/cookie
    user_id UUID REFERENCES public.users(id), -- if they're logged in
    session_id TEXT,
    
    -- Technical data
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    platform TEXT CHECK (platform IN ('mobile_app', 'web_app', 'shared_link')),
    device_type TEXT,
    browser TEXT,
    os TEXT,
    
    -- Location (approximate, from IP)
    country TEXT,
    region TEXT,
    city TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital wallet folders
CREATE TABLE public.wallet_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#6B7280',
    
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved pages in wallet
CREATE TABLE public.wallet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES public.wallet_folders(id) ON DELETE SET NULL,
    
    -- User's personal notes about this page
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Quick access
    is_favorite BOOLEAN DEFAULT FALSE,
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, page_id)
);

-- Sharing and short links
CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Short URL code (for crownpages.com/s/{code})
    short_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 0, 9),
    
    -- Customization
    custom_message TEXT,
    
    -- Access control
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,
    
    -- Analytics
    last_viewed_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);
CREATE INDEX idx_business_members_business ON public.business_members(business_id);
CREATE INDEX idx_pages_business ON public.pages(business_id, is_published);
CREATE INDEX idx_pages_creator ON public.pages(created_by);
CREATE INDEX idx_pages_slug ON public.pages(business_id, slug);
CREATE INDEX idx_pages_published ON public.pages(is_published, published_at);
CREATE INDEX idx_analytics_page ON public.analytics_events(page_id, created_at);
CREATE INDEX idx_analytics_visitor ON public.analytics_events(visitor_id, created_at);
CREATE INDEX idx_analytics_type ON public.analytics_events(event_type, created_at);
CREATE INDEX idx_wallet_user ON public.wallet_items(user_id, is_favorite);
CREATE INDEX idx_wallet_folder ON public.wallet_items(folder_id);
CREATE INDEX idx_share_links_code ON public.share_links(short_code) WHERE is_active = TRUE;
CREATE INDEX idx_media_business ON public.media(business_id, folder);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Can view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Businesses: View based on membership, manage if owner/admin
CREATE POLICY "Users can view businesses they belong to" ON public.businesses
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = businesses.id 
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create businesses" ON public.businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business owners can update their business" ON public.businesses
    FOR UPDATE USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = businesses.id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Business owners can delete their business" ON public.businesses
    FOR DELETE USING (owner_id = auth.uid());

-- Business members: View based on membership, manage if owner/admin
CREATE POLICY "Users can view members of their businesses" ON public.business_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        business_id IN (
            SELECT b.id FROM public.businesses b 
            WHERE b.owner_id = auth.uid()
        ) OR
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm 
            WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Business owners can manage members" ON public.business_members
    FOR ALL USING (
        business_id IN (
            SELECT b.id FROM public.businesses b 
            WHERE b.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business admins can manage members" ON public.business_members
    FOR ALL USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm 
            WHERE bm.user_id = auth.uid() AND bm.role IN ('admin')
        )
    );

-- Page categories, templates, section types: Public read
CREATE POLICY "Anyone can view active page categories" ON public.page_categories
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view active templates" ON public.templates
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view active section types" ON public.section_types
    FOR SELECT USING (is_active = TRUE);

-- Pages: Complex permissions
CREATE POLICY "Anyone can view published pages" ON public.pages
    FOR SELECT USING (is_published = TRUE AND is_active = TRUE);

CREATE POLICY "Business members can view all their pages" ON public.pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = pages.business_id 
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Business editors can create pages" ON public.pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = pages.business_id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin', 'editor')
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Business editors can update pages" ON public.pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = pages.business_id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Business admins can delete pages" ON public.pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = pages.business_id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin')
        )
    );

-- Media: Business members only
CREATE POLICY "Business members can view media" ON public.media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = media.business_id 
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Business editors can upload media" ON public.media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = media.business_id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin', 'editor')
        ) AND uploaded_by = auth.uid()
    );

CREATE POLICY "Media uploaders can delete their uploads" ON public.media
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = media.business_id 
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin')
        )
    );

-- Analytics: Anyone can insert, business members can view
CREATE POLICY "Anyone can create analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Business members can view analytics" ON public.analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pages p
            JOIN public.business_members bm ON bm.business_id = p.business_id
            WHERE p.id = analytics_events.page_id 
            AND bm.user_id = auth.uid()
        )
    );

-- Wallet: Users own their wallet
CREATE POLICY "Users manage their own wallet folders" ON public.wallet_folders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own wallet items" ON public.wallet_items
    FOR ALL USING (auth.uid() = user_id);

-- Share links: Creators manage, anyone can view active
CREATE POLICY "Users can manage their own share links" ON public.share_links
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view active share links" ON public.share_links
    FOR SELECT USING (is_active = TRUE);

-- Functions

-- Handle new user registration, updates, and deletion
CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle INSERT (new user registration)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users (id, email, first_name, last_name)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        );
        
        -- Create default wallet folder
        INSERT INTO public.wallet_folders (user_id, name, is_default, sort_order)
        VALUES (NEW.id, 'My Saved Pages', TRUE, 0);
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (user profile changes)
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.users 
        SET 
            email = NEW.email,
            first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
            last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (user account deletion)
    IF TG_OP = 'DELETE' THEN
        -- The CASCADE deletes will handle related records automatically
        -- due to foreign key constraints, but we can log or do cleanup here if needed
        DELETE FROM public.users WHERE id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Drop the old trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create comprehensive triggers for all auth.users changes
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

-- Increment page counters on analytics events
CREATE OR REPLACE FUNCTION public.update_page_counters()
RETURNS TRIGGER 
LANGUAGE plpgsql
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
    END CASE;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_analytics_event_insert
    AFTER INSERT ON public.analytics_events
    FOR EACH ROW EXECUTE FUNCTION public.update_page_counters();

-- Generate unique business slug
CREATE OR REPLACE FUNCTION public.generate_business_slug(business_name TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
AS $$
DECLARE
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
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Generate unique page slug within a business
CREATE OR REPLACE FUNCTION public.generate_page_slug(page_title TEXT, business_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
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

-- Get page analytics summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
    p_page_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    total_shares BIGINT,
    total_saves BIGINT,
    total_clicks BIGINT,
    top_referrers JSONB,
    daily_views JSONB,
    device_breakdown JSONB,
    location_breakdown JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Insert initial data for categories and section types
INSERT INTO public.page_categories (name, slug, description, industries, sort_order) VALUES
('Business Information', 'business-info', 'Share essential business details and contact information', ARRAY['general', 'retail', 'services'], 1),
('Marketing Materials', 'marketing', 'Digital brochures and promotional content', ARRAY['general', 'retail', 'services'], 2),
('Partnership Proposals', 'partnership', 'Professional pages for B2B partnerships', ARRAY['general', 'b2b', 'services'], 3),
('Product Catalogs', 'products', 'Showcase products and services', ARRAY['retail', 'ecommerce', 'manufacturing'], 4),
('Event Information', 'events', 'Event details and registration', ARRAY['general', 'hospitality', 'entertainment'], 5),
('Educational Content', 'education', 'Training materials and resources', ARRAY['education', 'healthcare', 'services'], 6),
('Customer Resources', 'resources', 'FAQs, guides, and support materials', ARRAY['general', 'services', 'technology'], 7);

-- Insert section types
INSERT INTO public.section_types (type, name, description, default_config, available_fields) VALUES
('hero', 'Hero Section', 'Eye-catching header with call-to-action', 
 '{"layout": "center", "height": "large"}',
 '{"title": {"type": "text", "required": true}, "subtitle": {"type": "text"}, "backgroundImage": {"type": "image"}, "ctaButton": {"type": "button"}}'
),
('about', 'About Section', 'Business or service description', 
 '{"layout": "left-right"}',
 '{"title": {"type": "text", "required": true}, "content": {"type": "richtext", "required": true}, "image": {"type": "image"}}'
),
('contact', 'Contact Information', 'Contact details and form', 
 '{"showForm": true, "showMap": true}',
 '{"title": {"type": "text"}, "phone": {"type": "phone"}, "email": {"type": "email"}, "address": {"type": "address"}, "hours": {"type": "hours"}}'
),
('gallery', 'Image Gallery', 'Photo or product gallery', 
 '{"layout": "grid", "columns": 3}',
 '{"title": {"type": "text"}, "images": {"type": "image-array", "required": true}}'
),
('features', 'Features List', 'Highlight key features or services', 
 '{"layout": "grid", "showIcons": true}',
 '{"title": {"type": "text"}, "features": {"type": "feature-list", "required": true}}'
),
('testimonials', 'Testimonials', 'Customer reviews and testimonials', 
 '{"layout": "carousel"}',
 '{"title": {"type": "text"}, "testimonials": {"type": "testimonial-list", "required": true}}'
),
('cta', 'Call to Action', 'Prominent call-to-action section', 
 '{"style": "centered"}',
 '{"title": {"type": "text", "required": true}, "description": {"type": "text"}, "button": {"type": "button", "required": true}}'
),
('faq', 'FAQ Section', 'Frequently asked questions', 
 '{"layout": "accordion"}',
 '{"title": {"type": "text"}, "questions": {"type": "faq-list", "required": true}}'
),
('social', 'Social Media Links', 'Social media profiles and feeds', 
 '{"showFeed": false}',
 '{"title": {"type": "text"}, "profiles": {"type": "social-links", "required": true}}'); 