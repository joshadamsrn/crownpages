# CrownPages NextJS App Architecture Documentation

## Overview

CrownPages is a NextJS 14 web application that renders business pages created through a mobile app. This documentation provides a comprehensive guide for mobile app developers to understand how to integrate with and utilize this web platform.

## Core Architecture

### Technology Stack

- **Framework**: NextJS 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Analytics**: Custom analytics system
- **Deployment**: Vercel-ready

### Project Structure

```
app/
├── [slug]/                    # Dynamic page routing
├── share/[shortCode]/         # Share link routing
├── mobile/preview/            # Mobile preview endpoints
├── api/                       # API routes
│   ├── mobile/               # Mobile-specific APIs
│   └── og/                   # Open Graph image generation
components/
├── page-renderer.tsx         # Main page rendering engine
├── sections/                 # Individual section components
├── analytics.tsx             # Analytics tracking
└── trackable-button.tsx      # Button with analytics
lib/
├── supabase/                 # Database client configuration
└── analytics.ts              # Analytics utilities
```

## Data Model & Database Schema

### Core Tables

#### 1. Pages Table

```sql
pages {
  id: UUID (primary key)
  business_id: UUID (foreign key to businesses)
  title: string
  slug: string (unique)
  content: JSON (page sections data)
  styles: JSON (custom styling)
  is_published: boolean
  is_active: boolean
  created_by: UUID (foreign key to users)
  meta_title: string
  meta_description: string
  og_image_url: string
  view_count: integer
  save_count: integer
  share_count: integer
}
```

#### 2. Businesses Table

```sql
businesses {
  id: UUID (primary key)
  name: string
  slug: string (unique)
  owner_id: UUID (foreign key to users)
  primary_color: string (hex color)
  secondary_color: string (hex color)
  font_family: string
  logo_url: string
  email: string
  phone: string
  website: string
  street_address: string
  city: string
  state: string
  zip_code: string
  country: string
}
```

#### 3. Analytics Events Table

```sql
analytics_events {
  id: UUID (primary key)
  page_id: UUID (foreign key to pages)
  event_type: enum (page_view, button_click, link_click, etc.)
  event_data: JSON (additional event metadata)
  visitor_id: string (anonymous visitor tracking)
  session_id: string (session tracking)
  user_id: UUID (authenticated user, optional)
  user_agent: string
  referrer: string
  platform: string (web_app, shared_link, mobile_preview)
}
```

#### 4. Share Links Table

```sql
share_links {
  id: UUID (primary key)
  page_id: UUID (foreign key to pages)
  short_code: string (unique, 8-character code)
  custom_message: string (optional message)
  expires_at: timestamp (optional expiration)
  max_views: integer (optional view limit)
  view_count: integer
  is_active: boolean
}
```

## Page Content Structure

### JSON Content Format

Pages store their content as JSON in the following structure:

```json
{
  "sections": [
    {
      "id": "unique_section_id",
      "type": "section_type",
      "data": {
        // Section-specific data
      }
    }
  ]
}
```

### Supported Section Types

#### 1. Hero Section (`hero`)

```json
{
  "id": "hero_welcome",
  "type": "hero",
  "data": {
    "title": "Welcome to Our Business",
    "subtitle": "We provide excellent services",
    "ctaButton": {
      "text": "Contact Us",
      "link": "tel:555-0123"
    },
    "backgroundImage": "https://example.com/hero-bg.jpg"
  }
}
```

#### 2. About Section (`about`)

```json
{
  "id": "about_us",
  "type": "about",
  "data": {
    "title": "About Our Company",
    "content": "<p>Rich HTML content describing the business...</p>",
    "image": "https://example.com/about-image.jpg"
  }
}
```

#### 3. Contact Section (`contact`)

```json
{
  "id": "contact_info",
  "type": "contact",
  "data": {
    "title": "Contact Information",
    "email": "info@business.com",
    "phone": "(555) 123-4567",
    "address": "123 Main St, City, State 12345",
    "hours": "Mon-Fri: 9AM-5PM"
  }
}
```

#### 4. Features Section (`features`)

```json
{
  "id": "our_features",
  "type": "features",
  "data": {
    "title": "Our Services",
    "features": [
      {
        "id": "feature_1",
        "title": "Service Name",
        "description": "Service description",
        "icon": "https://example.com/icon.svg"
      }
    ]
  }
}
```

#### 5. Gallery Section (`gallery`)

```json
{
  "id": "photo_gallery",
  "type": "gallery",
  "data": {
    "title": "Our Work",
    "images": [
      {
        "id": "img_1",
        "url": "https://example.com/image1.jpg",
        "alt": "Image description",
        "caption": "Optional caption"
      }
    ]
  }
}
```

#### 6. Testimonials Section (`testimonials`)

```json
{
  "id": "customer_reviews",
  "type": "testimonials",
  "data": {
    "title": "What Our Customers Say",
    "testimonials": [
      {
        "id": "review_1",
        "name": "John Doe",
        "role": "Customer",
        "company": "ABC Corp",
        "content": "Excellent service!",
        "rating": 5,
        "avatar": "https://example.com/avatar.jpg"
      }
    ]
  }
}
```

#### 7. FAQ Section (`faq`)

```json
{
  "id": "frequently_asked",
  "type": "faq",
  "data": {
    "title": "Frequently Asked Questions",
    "faqs": [
      {
        "id": "faq_1",
        "question": "What are your hours?",
        "answer": "We're open Monday through Friday, 9AM to 5PM."
      }
    ]
  }
}
```

#### 8. Documents Section (`documents`)

```json
{
  "id": "downloads",
  "type": "documents",
  "data": {
    "title": "Download Resources",
    "documents": [
      {
        "id": "doc_1",
        "title": "Patient Forms",
        "description": "Required forms for new patients",
        "url": "https://example.com/forms.pdf",
        "fileType": "pdf",
        "fileSize": "2.3 MB"
      }
    ]
  }
}
```

#### 9. CTA Section (`cta`)

```json
{
  "id": "call_to_action",
  "type": "cta",
  "data": {
    "title": "Ready to Get Started?",
    "description": "Contact us today for a consultation",
    "button": {
      "text": "Schedule Now",
      "link": "https://booking.example.com"
    }
  }
}
```

## URL Routing & Page Access

### 1. Direct Page Access

**URL Pattern**: `/{slug}`
**Example**: `/sunset-dental-welcome`

- Fetches page by slug from database
- Requires `is_published: true` and `is_active: true`
- Includes business data via JOIN
- Generates SEO metadata automatically
- Tracks page views in analytics

### 2. Share Link Access

**URL Pattern**: `/share/{shortCode}`
**Example**: `/share/abc123xy`

- Fetches page via share_links table
- Supports expiration dates and view limits
- Increments view count automatically
- Can display custom messages
- Same rendering as direct access

### 3. Mobile Preview Access

**URL Pattern**: `/mobile/preview/{pageId}/{sectionId}`
**Example**: `/mobile/preview/8868423c-64e7-4efd-a94f-9fa164ae3c08/hero_welcome`

- Renders individual sections for mobile app preview
- Includes mobile-optimized header
- Uses pageId instead of slug for direct access
- Bypasses published/active checks for preview

## API Endpoints for Mobile Integration

### 1. Section Data API

**Endpoint**: `GET /api/mobile/preview/{pageId}/{sectionId}`

Returns JSON data for a specific section:

```json
{
  "success": true,
  "data": {
    "section": {
      "id": "hero_welcome",
      "type": "hero",
      "data": {
        /* section data */
      }
    },
    "business": {
      /* business data */
    },
    "pageData": {
      "id": "page-uuid",
      "title": "Page Title",
      "styles": {
        /* custom styles */
      }
    }
  }
}
```

### 2. Page Sections List API

**Endpoint**: `GET /api/mobile/sections/{pageId}`

Returns all sections in a page with preview metadata:

```json
{
  "success": true,
  "data": {
    "pageId": "page-uuid",
    "pageTitle": "Page Title",
    "sections": [
      {
        "id": "section_id",
        "type": "hero",
        "preview": {
          "title": "Section Title",
          "subtitle": "Section Subtitle",
          "description": "Section Description"
        }
      }
    ],
    "business": {
      /* business data */
    }
  }
}
```

## Theming & Styling System

### Theme Configuration

The app uses a dynamic theming system based on business branding:

```typescript
interface ThemeConfig {
  primary: string; // Business primary color
  secondary: string; // Business secondary color
  accent: string; // System accent color
  background: string; // Page background
  surface: string; // Card/section backgrounds
  text: {
    primary: string; // Main text color
    secondary: string; // Secondary text color
    muted: string; // Muted text color
  };
  fontFamily: string; // Business font family
}
```

### CSS Custom Properties

Themes are applied via CSS custom properties:

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #1e40af;
  --accent-color: #f59e0b;
  --background-color: #ffffff;
  --surface-color: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-muted: #6b7280;
  --font-family: "Inter";
}
```

## Analytics & Tracking

### Event Types

The system tracks various user interactions:

- `page_view` - Page loads
- `button_click` - CTA button clicks
- `link_click` - Link clicks
- `phone_click` - Phone number clicks
- `email_click` - Email address clicks
- `address_click` - Address clicks
- `download` - Document downloads
- `save` - Page saves to wallet
- `share` - Page shares

### Analytics Implementation

```typescript
// Track page view (automatic)
trackPageView(pageId, userId?);

// Track button click
trackEvent({
  pageId: 'page-uuid',
  eventType: 'button_click',
  eventData: {
    button_text: 'Contact Us',
    button_position: 'hero_cta',
    target_url: 'tel:555-0123'
  },
  userId: 'user-uuid' // optional
});
```

### Visitor & Session Tracking

- **Visitor ID**: Persistent localStorage identifier
- **Session ID**: Session-based sessionStorage identifier
- **User ID**: Optional authenticated user tracking
- **Platform Detection**: Differentiates web_app, shared_link, mobile_preview

## Mobile App Integration Patterns

### 1. Page List Integration

```javascript
// Fetch user's pages
const response = await fetch("/api/user/pages");
const pages = await response.json();

// Display pages in mobile app list
pages.forEach((page) => {
  // Show page.title, page.description
  // Link to full page or section preview
});
```

### 2. Section Preview Integration

```javascript
// Get sections for a page
const sections = await fetch(`/api/mobile/sections/${pageId}`);

// Show section list in mobile app
sections.data.sections.forEach((section) => {
  // Display section.preview.title
  // Link to `/mobile/preview/${pageId}/${section.id}`
});
```

### 3. Full Page Integration

```javascript
// Open full page in webview
const pageUrl = `https://yourapp.com/${pageSlug}`;
// Or share link: `https://yourapp.com/share/${shortCode}`

// Open in mobile browser or webview
window.open(pageUrl, "_blank");
```

### 4. Analytics Integration

```javascript
// Track mobile app events
await fetch("/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pageId: "page-uuid",
    eventType: "mobile_app_view",
    eventData: { source: "mobile_app" },
  }),
});
```

## Environment Configuration

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Configuration

The app uses Supabase for:

- Database operations (PostgreSQL)
- Authentication (if needed)
- Real-time subscriptions (optional)
- File storage (for images/documents)

## Security & Performance

### Row Level Security (RLS)

- Pages: Users can only access published pages or their own pages
- Businesses: Users can only modify their own business data
- Analytics: Anonymous tracking with privacy considerations

### Performance Optimizations

- Server-side rendering for SEO
- Image optimization with Next.js Image component
- Lazy loading of sections
- Efficient database queries with proper indexing
- CDN delivery via Vercel

### Security Features

- Share link expiration and view limits
- Input sanitization for user content
- CORS configuration for API endpoints
- Rate limiting on analytics endpoints

## Development & Deployment

### Local Development

```bash
npm install
npm run dev
```

### Database Setup

1. Create Supabase project
2. Run database migrations
3. Set up RLS policies
4. Configure environment variables

### Deployment

- Optimized for Vercel deployment
- Automatic builds on git push
- Environment variable management
- CDN and edge optimization

## Integration Examples

### Example: Mobile App Page Browser

```javascript
// Mobile app component for browsing pages
class PageBrowser {
  async loadUserPages() {
    const pages = await this.api.getUserPages();
    return pages.map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description,
      thumbnail: page.og_image_url,
      url: `${this.webAppUrl}/${page.slug}`,
      previewUrl: `${this.webAppUrl}/mobile/preview/${page.id}`,
    }));
  }

  async previewPage(pageId) {
    // Get sections for preview
    const sections = await this.api.getPageSections(pageId);

    // Show section list in mobile UI
    this.showSectionList(sections.data.sections);
  }

  openFullPage(pageSlug) {
    // Open in webview or external browser
    this.openWebView(`${this.webAppUrl}/${pageSlug}`);
  }
}
```

### Example: Section Editor Integration

```javascript
// Mobile app section editor
class SectionEditor {
  async loadSection(pageId, sectionId) {
    const response = await fetch(
      `${this.webAppUrl}/api/mobile/preview/${pageId}/${sectionId}`
    );
    const data = await response.json();

    if (data.success) {
      return data.data.section;
    }
  }

  async previewSection(pageId, sectionId) {
    // Open section preview in webview
    const previewUrl = `${this.webAppUrl}/mobile/preview/${pageId}/${sectionId}`;
    this.openWebView(previewUrl);
  }

  async updateSection(pageId, sectionId, newData) {
    // Update section via API
    await this.api.updatePageSection(pageId, sectionId, newData);

    // Refresh preview
    this.previewSection(pageId, sectionId);
  }
}
```

This architecture provides a robust foundation for mobile app integration, allowing seamless creation, editing, and sharing of business pages across platforms.
