import { Database } from '../database.types';

// Extract base types from database
export type PageCategory =
  Database['public']['Tables']['page_categories']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type Business = Database['public']['Tables']['businesses']['Row'];
export type SectionType = Database['public']['Tables']['section_types']['Row'];

// Enhanced Page type with SEO fields
export type Page = Database['public']['Tables']['pages']['Row'] & {
  // Explicit DB columns (in case your generated Row type is missing them)
  description?: string | null;
  slug: string;
  view_count?: number | null;
  share_count?: number | null;
  save_count?: number | null;
  unique_view_count?: number | null;
  is_published?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by: string;
  business_id: string;

  businesses?: Business;

  // SEO and Meta Fields
  meta_title?: string | null;
  meta_description?: string | null;

  // Images
  favicon_image_url?: string | null;
  og_image_url?: string | null;

  // Social Media / Open Graph
  og_title?: string | null;
  og_description?: string | null;

  // Advanced SEO
  keywords?: string | null;
  canonical_url?: string | null;

  // Relations (if needed)
  business?: Business;
};

// Section field types
export interface BaseField {
  type: string;
  required?: boolean;
  default?: any;
  maxLength?: number;
}

export interface TextField extends BaseField {
  type: 'text';
  default?: string;
  maxLength?: number;
}

export interface TextAreaField extends BaseField {
  type: 'textarea';
  default?: string;
  maxLength?: number;
  rows?: number;
}

export interface RichTextField extends BaseField {
  type: 'richtext';
  default?: string;
}

export interface ImageField extends BaseField {
  type: 'image';
  default?: string | null;
}

export interface ButtonField extends BaseField {
  type: 'button';
  default?: {
    text: string;
    link: string;
    style: 'primary' | 'secondary';
  };
}

export interface PhoneField extends BaseField {
  type: 'phone';
  default?: string;
}

export interface EmailField extends BaseField {
  type: 'email';
  default?: string;
}

export interface AddressField extends BaseField {
  type: 'address';
  default?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export interface ImageArrayField extends BaseField {
  type: 'image-array';
  default?: string[];
}

export interface FeatureListField extends BaseField {
  type: 'feature-list';
  default?: Array<{
    icon?: string;
    title: string;
    description?: string;
  }>;
}

export interface TestimonialListField extends BaseField {
  type: 'testimonial-list';
  default?: Array<{
    author: string;
    role?: string;
    content: string;
    avatar?: string;
  }>;
}

export interface FAQListField extends BaseField {
  type: 'faq-list';
  default?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface SocialLinksField extends BaseField {
  type: 'social-links';
  default?: Record<string, string>;
}

export interface HoursField extends BaseField {
  type: 'hours';
  default?: Record<string, { open: string; close: string }>;
}

// New field type for render type selection
export interface SelectField extends BaseField {
  type: 'select';
  options: Array<{
    label: string;
    value: string;
    icon?: string;
    preview?: string;
  }>;
  default?: string;
}

export type FieldType =
  | TextField
  | TextAreaField
  | RichTextField
  | ImageField
  | ButtonField
  | PhoneField
  | EmailField
  | AddressField
  | ImageArrayField
  | FeatureListField
  | TestimonialListField
  | FAQListField
  | SocialLinksField
  | HoursField
  | SelectField;

// Section structure in templates
export interface TemplateSection {
  id: string;
  type: string;
  name: string;
  fields: Record<string, FieldType>;
}

// Section content in pages
export interface PageSection {
  id: string;
  type: string;
  data: Record<string, any>;
  styles?: SectionStyles;
}

// Template structure
export interface TemplateStructure {
  sections: TemplateSection[];
  colorScheme?: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  fonts?: {
    heading: string;
    body: string;
  };
}

// Page content structure
export interface PageContent {
  sections: PageSection[];
}

// Enhanced section styles
export interface SectionStyles {
  // Colors
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;

  // Text colors
  text?: {
    primary?: string;
    secondary?: string;
    muted?: string;
  };

  // Typography
  fontFamily?: string;
  fontSize?: {
    small?: string;
    medium?: string;
    large?: string;
    xlarge?: string;
  };

  // Layout
  padding?: string;
  margin?: string;
  borderRadius?: string;

  // Custom CSS
  customCss?: string;
}

// Page styles (legacy - kept for compatibility)
export interface PageStyles {
  colors?: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  fonts?: {
    heading: string;
    body: string;
  };
  customCss?: string;
}

// Section configurations
export interface SectionConfig {
  layout?: string;
  height?: string;
  columns?: number;
  showIcons?: boolean;
  showForm?: boolean;
  showMap?: boolean;
  showFeed?: boolean;
  style?: string;
  render_type?: 'vertical' | 'horizontal' | 'masonry'; // For Links section
}

// File upload data interface
export interface FileUploadData {
  path: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

// Theme configuration
export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  fontFamily: string;
}

// Default theme
export const DEFAULT_THEME: ThemeConfig = {
  primary: '#007AFF',
  secondary: '#0056CC',
  accent: '#FF9500',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#1D1D1F',
    secondary: '#515154',
    muted: '#86868B',
  },
  fontFamily: 'system-ui',
};

// Business data interface
export interface BusinessData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
}

// Testimonial interface (enhanced)
export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: number;
  position?: string;
  company?: string;
  avatar?: string | null;
  testimonial_image?: string | null;
  video_uri?: string | null;
  asset_type?: 'image' | 'video' | null;
}

// Link item interface
export interface LinkItem {
  id: string;
  title: string;
  url?: string;
}

// Links data interface
export interface LinksData {
  title?: string;
  description?: string;
  render_type: 'horizontal' | 'vertical' | 'masonry';
  links: LinkItem[];
}

// Page settings interface for the settings modal
export interface PageSettings {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  favicon?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
}

// Export utility types
export type SectionEditorProps = {
  section: PageSection;
  updateSectionData: (sectionId: string, newData: any) => void;
  updateSectionStyles: (sectionId: string, styles: SectionStyles) => void;
  pickImage?: (
    sectionId: string,
    field?: string,
    uri?: string
  ) => Promise<FileUploadData | undefined>;
  pickVideo?: (
    sectionId: string,
    field?: string,
    uri?: string
  ) => Promise<FileUploadData | undefined>;
  setImagesData?: any;
  imagesData?: any;
  page?: Page | null;
  updateUploadData?: (url: string, type: 'remove' | 'add') => void;
};

// Updated Database types to include new SEO fields
export interface EnhancedDatabase extends Database {
  public: {
    Tables: {
      pages: {
        Row: Database['public']['Tables']['pages']['Row'] & {
          // SEO and Meta Fields
          meta_title: string | null;
          meta_description: string | null;

          // Images
          favicon_image_url: string | null;
          og_image_url: string | null;

          // Social Media / Open Graph
          og_title: string | null;
          og_description: string | null;

          // Advanced SEO
          keywords: string | null;
          canonical_url: string | null;
        };
        Insert: Database['public']['Tables']['pages']['Insert'] & {
          meta_title?: string | null;
          meta_description?: string | null;
          favicon_image_url?: string | null;
          og_image_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          keywords?: string | null;
          canonical_url?: string | null;
        };
        Update: Database['public']['Tables']['pages']['Update'] & {
          meta_title?: string | null;
          meta_description?: string | null;
          favicon_image_url?: string | null;
          og_image_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          keywords?: string | null;
          canonical_url?: string | null;
        };
      };
    } & Database['public']['Tables'];
  } & Database['public'];
}
