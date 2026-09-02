export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          os: string | null
          page_id: string
          platform: string | null
          referrer: string | null
          region: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          os?: string | null
          page_id: string
          platform?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          os?: string | null
          page_id?: string
          platform?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_admins: {
        Row: {
          business_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          invited_by: string
          last_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          invited_by: string
          last_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_admins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_admins_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_page_analytics: {
        Row: {
          browser: string | null
          business_id: string
          business_page_id: string
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          os: string | null
          platform: string | null
          referrer: string | null
          region: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          business_id: string
          business_page_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          os?: string | null
          platform?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          business_id?: string
          business_page_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          os?: string | null
          platform?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_page_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_page_analytics_business_page_id_fkey"
            columns: ["business_page_id"]
            isOneToOne: false
            referencedRelation: "business_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_page_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pages: {
        Row: {
          business_id: string
          contact_info: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          logo_url: string | null
          page_links: Json | null
          published_at: string | null
          save_count: number | null
          share_count: number | null
          social_links: Json | null
          styles: Json | null
          title: string
          unique_view_count: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          business_id: string
          contact_info?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          logo_url?: string | null
          page_links?: Json | null
          published_at?: string | null
          save_count?: number | null
          share_count?: number | null
          social_links?: Json | null
          styles?: Json | null
          title?: string
          unique_view_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          business_id?: string
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          logo_url?: string | null
          page_links?: Json | null
          published_at?: string | null
          save_count?: number | null
          share_count?: number | null
          social_links?: Json | null
          styles?: Json | null
          title?: string
          unique_view_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_pages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          font_family: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          state: string | null
          street_address: string | null
          updated_at: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      free_trials: {
        Row: {
          conversion_source: string | null
          converted_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string
          trial_duration_days: number
          trial_ended_at: string | null
          trial_ends_at: string
          trial_settings_snapshot: Json
          trial_started_at: string
          trial_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversion_source?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          trial_duration_days: number
          trial_ended_at?: string | null
          trial_ends_at: string
          trial_settings_snapshot?: Json
          trial_started_at?: string
          trial_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversion_source?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          trial_duration_days?: number
          trial_ended_at?: string | null
          trial_ends_at?: string
          trial_settings_snapshot?: Json
          trial_started_at?: string
          trial_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_trials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      license: {
        Row: {
          code: string
          created_at: string | null
          deactivation_reason: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          max_seats: number
          plan_pricing_id: string
          purchased_by: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deactivation_reason?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_seats: number
          plan_pricing_id: string
          purchased_by: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deactivation_reason?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          max_seats?: number
          plan_pricing_id?: string
          purchased_by?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_created_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_plan_pricing_id_fkey"
            columns: ["plan_pricing_id"]
            isOneToOne: false
            referencedRelation: "plans_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      license_membership: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          license_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          license_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          license_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_membership_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "license"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_membership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          business_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          height: number | null
          id: string
          tags: string[] | null
          thumbnail_url: string | null
          uploaded_by: string
          width: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          folder?: string | null
          height?: number | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by: string
          width?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          height?: number | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      page_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          business_id: string
          canonical_url: string | null
          category_id: string | null
          content: Json
          created_at: string | null
          created_by: string
          description: string | null
          favicon_image_url: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          keywords: string | null
          media_urls: string[] | null
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          publish_settings: Json | null
          published_at: string | null
          save_count: number | null
          share_count: number | null
          slug: string
          styles: Json | null
          template_id: string | null
          title: string
          unique_view_count: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          business_id: string
          canonical_url?: string | null
          category_id?: string | null
          content?: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          favicon_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          keywords?: string | null
          media_urls?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          publish_settings?: Json | null
          published_at?: string | null
          save_count?: number | null
          share_count?: number | null
          slug: string
          styles?: Json | null
          template_id?: string | null
          title: string
          unique_view_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          business_id?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          favicon_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          keywords?: string | null
          media_urls?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          publish_settings?: Json | null
          published_at?: string | null
          save_count?: number | null
          share_count?: number | null
          slug?: string
          styles?: Json | null
          template_id?: string | null
          title?: string
          unique_view_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "page_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plans_pricing: {
        Row: {
          additional_price: number | null
          base_price: number
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          interval_count: number
          interval_type: string
          is_active: boolean | null
          max_seats: number | null
          min_seats: number
          pricing_type: string | null
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          additional_price?: number | null
          base_price: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval_count?: number
          interval_type?: string
          is_active?: boolean | null
          max_seats?: number | null
          min_seats: number
          pricing_type?: string | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_price?: number | null
          base_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval_count?: number
          interval_type?: string
          is_active?: boolean | null
          max_seats?: number | null
          min_seats?: number
          pricing_type?: string | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      section_types: {
        Row: {
          available_fields: Json
          created_at: string | null
          default_config: Json
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          available_fields?: Json
          created_at?: string | null
          default_config?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          available_fields?: Json
          created_at?: string | null
          default_config?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string | null
          created_by: string
          custom_message: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_viewed_at: string | null
          max_views: number | null
          page_id: string
          password_hash: string | null
          short_code: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          custom_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_viewed_at?: string | null
          max_views?: number | null
          page_id: string
          password_hash?: string | null
          short_code?: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          custom_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_viewed_at?: string | null
          max_views?: number | null
          page_id?: string
          password_hash?: string | null
          short_code?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          structure: Json
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          structure?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          structure?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "page_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_link_events: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          os: string | null
          os_version: string | null
          referrer: string | null
          region: string | null
          session_id: string | null
          timezone: string | null
          trackable_link_id: string
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          os?: string | null
          os_version?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          timezone?: string | null
          trackable_link_id: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          os?: string | null
          os_version?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          timezone?: string | null
          trackable_link_id?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trackable_link_events_trackable_link_id_fkey"
            columns: ["trackable_link_id"]
            isOneToOne: false
            referencedRelation: "trackable_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_link_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_links: {
        Row: {
          business_page_id: string | null
          click_count: number | null
          collect_email: boolean | null
          created_at: string | null
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_clicked_at: string | null
          max_clicks: number | null
          name: string
          page_id: string | null
          password_hash: string | null
          redirect_delay: number | null
          show_preview: boolean | null
          tracking_code: string
          unique_click_count: number | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          business_page_id?: string | null
          click_count?: number | null
          collect_email?: boolean | null
          created_at?: string | null
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_clicked_at?: string | null
          max_clicks?: number | null
          name: string
          page_id?: string | null
          password_hash?: string | null
          redirect_delay?: number | null
          show_preview?: boolean | null
          tracking_code?: string
          unique_click_count?: number | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          business_page_id?: string | null
          click_count?: number | null
          collect_email?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_clicked_at?: string | null
          max_clicks?: number | null
          name?: string
          page_id?: string | null
          password_hash?: string | null
          redirect_delay?: number | null
          show_preview?: boolean | null
          tracking_code?: string
          unique_click_count?: number | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trackable_links_business_page_id_fkey"
            columns: ["business_page_id"]
            isOneToOne: false
            referencedRelation: "business_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          trial_duration_days: number
          trial_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          trial_duration_days?: number
          trial_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          trial_duration_days?: number
          trial_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          admin: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone: string | null
          plan_expires_at: string | null
          plan_type: string | null
          subscription_source: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Insert: {
          admin?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          plan_expires_at?: string | null
          plan_type?: string | null
          subscription_source?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Update: {
          admin?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          plan_expires_at?: string | null
          plan_type?: string | null
          subscription_source?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_items: {
        Row: {
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          last_viewed_at: string | null
          notes: string | null
          page_id: string
          saved_at: string | null
          tags: string[] | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          last_viewed_at?: string | null
          notes?: string | null
          page_id: string
          saved_at?: string | null
          tags?: string[] | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          last_viewed_at?: string | null
          notes?: string | null
          page_id?: string
          saved_at?: string | null
          tags?: string[] | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wallet_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_business_member: {
        Args: { p_business_id: string; p_role: string; p_user_id: string }
        Returns: undefined
      }
      convert_trial: {
        Args: { p_conversion_source?: string; p_trial_id: string }
        Returns: boolean
      }
      expire_trial: {
        Args: { p_trial_id: string }
        Returns: boolean
      }
      generate_business_slug: {
        Args: { business_name: string }
        Returns: string
      }
      generate_page_slug: {
        Args: { business_id: string; page_title: string }
        Returns: string
      }
      get_analytics_summary: {
        Args: { p_end_date?: string; p_page_id: string; p_start_date?: string }
        Returns: {
          daily_views: Json
          device_breakdown: Json
          location_breakdown: Json
          top_referrers: Json
          total_clicks: number
          total_saves: number
          total_shares: number
          total_views: number
          unique_visitors: number
        }[]
      }
      get_license_members_safe: {
        Args: { p_license_id: string }
        Returns: {
          email: string
          is_active: boolean
          joined_at: string
          membership_id: string
          user_id: string
        }[]
      }
      get_user_team_memberships: {
        Args: { p_user_id: string }
        Returns: {
          license_code: string
          license_expiry_date: string
          license_id: string
          license_is_active: boolean
          license_max_seats: number
          license_purchased_by: string
          membership_id: string
          membership_is_active: boolean
          purchaser_email: string
          purchaser_first_name: string
          purchaser_last_name: string
        }[]
      }
      get_user_trial_info: {
        Args: { p_user_id: string }
        Returns: {
          days_remaining: number
          has_active_trial: boolean
          trial_duration_days: number
          trial_ends_at: string
          trial_id: string
          trial_status: string
          trial_type: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_subscription_active: {
        Args: { user_id: string }
        Returns: boolean
      }
      process_expired_trials: {
        Args: Record<PropertyKey, never>
        Returns: {
          expired_count: number
          processed_trials: string[]
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      user_type_enum:
        | "individual"
        | "organization_owner"
        | "organization_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_type_enum: [
        "individual",
        "organization_owner",
        "organization_member",
      ],
    },
  },
} as const
