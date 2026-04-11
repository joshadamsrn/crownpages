# Mobile Preview API Documentation

## Overview

The mobile preview system allows your mobile app to display individual page sections for editing and preview purposes. There are three main endpoints:

## Endpoints

### 1. Visual Preview Page

**URL**: `/mobile/preview/[pageId]/[sectionId]`  
**Method**: GET  
**Purpose**: Renders a specific section with full visual styling for mobile preview

**Example URLs**:

- `/mobile/preview/8868423c-64e7-4efd-a94f-9fa164ae3c08/hero_welcome`
- `/mobile/preview/15ee7fcb-74ca-45e7-8287-ee39cdd5a76f/project_gallery`

**Features**:

- Mobile-optimized header showing section type and page title
- Complete theming using business colors and fonts
- Individual section rendering with proper styling
- Analytics tracking for preview views

### 2. Section Data API

**URL**: `/api/mobile/preview/[pageId]/[sectionId]`  
**Method**: GET  
**Purpose**: Returns JSON data for a specific section

**Example Request**:

```javascript
const response = await fetch(
  "/api/mobile/preview/8868423c-64e7-4efd-a94f-9fa164ae3c08/hero_welcome"
);
const data = await response.json();
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "section": {
      "id": "hero_welcome",
      "type": "hero",
      "data": {
        "title": "Welcome to Sunset Dental Care",
        "subtitle": "Your comfort and oral health are our top priorities...",
        "ctaButton": {
          "text": "Schedule Your Visit",
          "link": "tel:(555)123-4567"
        },
        "backgroundImage": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&h=600&fit=crop"
      }
    },
    "business": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Sunset Dental Care",
      "primary_color": "#2563EB",
      "secondary_color": "#1E40AF",
      "email": "info@sunsetdentalcare.com",
      "phone": "(555) 123-4567"
    },
    "pageData": {
      "id": "8868423c-64e7-4efd-a94f-9fa164ae3c08",
      "title": "New Patient Welcome Package",
      "styles": {}
    }
  }
}
```

### 3. Page Sections List API

**URL**: `/api/mobile/sections/[pageId]`  
**Method**: GET  
**Purpose**: Returns all sections in a page with preview metadata

**Example Request**:

```javascript
const response = await fetch(
  "/api/mobile/sections/8868423c-64e7-4efd-a94f-9fa164ae3c08"
);
const data = await response.json();
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "pageId": "8868423c-64e7-4efd-a94f-9fa164ae3c08",
    "pageTitle": "New Patient Welcome Package",
    "sections": [
      {
        "id": "hero_welcome",
        "type": "hero",
        "preview": {
          "title": "Welcome to Sunset Dental Care",
          "subtitle": "Your comfort and oral health are our top priorities...",
          "description": null
        }
      },
      {
        "id": "about_practice",
        "type": "about",
        "preview": {
          "title": "About Our Practice",
          "subtitle": null,
          "description": "At Sunset Dental Care, we believe that everyone deserves a healthy, beautiful smile. Our state-of-the-art facility combines..."
        }
      }
    ],
    "business": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Sunset Dental Care",
      "primary_color": "#2563EB",
      "secondary_color": "#1E40AF"
    }
  }
}
```

## Mobile App Integration

### Section List View

```javascript
// Get all sections for a page
async function loadPageSections(pageId) {
  try {
    const response = await fetch(`/api/mobile/sections/${pageId}`);
    const result = await response.json();

    if (result.success) {
      return result.data.sections.map((section) => ({
        id: section.id,
        type: section.type,
        title: section.preview.title || `${section.type} section`,
        description: section.preview.description || section.preview.subtitle,
      }));
    }
  } catch (error) {
    console.error("Failed to load sections:", error);
    return [];
  }
}
```

### Section Preview

```javascript
// Show section preview in webview
function previewSection(pageId, sectionId) {
  const previewUrl = `/mobile/preview/${pageId}/${sectionId}`;
  // Open in webview or browser
  window.open(previewUrl, "_blank");
}

// Or get section data for native rendering
async function getSectionData(pageId, sectionId) {
  try {
    const response = await fetch(`/api/mobile/preview/${pageId}/${sectionId}`);
    const result = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error("Failed to load section data:", error);
    return null;
  }
}
```

## Supported Section Types

1. **hero** - Hero sections with title, subtitle, CTA button, background image
2. **about** - About sections with title, content, optional image
3. **contact** - Contact information with email, phone, address, hours
4. **features** - Feature grids with icons, titles, descriptions
5. **gallery** - Image galleries with captions
6. **testimonials** - Customer testimonials with ratings
7. **faq** - FAQ sections with collapsible Q&A
8. **documents** - Document downloads with file types
9. **cta** - Call-to-action sections with buttons

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Page not found"
}
```

Common error scenarios:

- **400**: Missing pageId or sectionId
- **404**: Page not found or section not found
- **500**: Internal server error

## Example Pages

### Dental Practice Page

- **Page ID**: `8868423c-64e7-4efd-a94f-9fa164ae3c08`
- **Business**: Sunset Dental Care
- **Sections**: Hero, About, Services, Forms, Gallery, Testimonials, FAQ, Contact, CTA

### Landscaping Business Page

- **Page ID**: `15ee7fcb-74ca-45e7-8287-ee39cdd5a76f`
- **Business**: Green Valley Landscaping
- **Sections**: Hero, About, Services, Gallery, Testimonials, FAQ, Resources, Contact, CTA

## Testing URLs

You can test the endpoints with these real examples:

**Visual Previews**:

- `/mobile/preview/8868423c-64e7-4efd-a94f-9fa164ae3c08/hero_welcome`
- `/mobile/preview/15ee7fcb-74ca-45e7-8287-ee39cdd5a76f/project_gallery`

**API Endpoints**:

- `/api/mobile/sections/8868423c-64e7-4efd-a94f-9fa164ae3c08`
- `/api/mobile/preview/8868423c-64e7-4efd-a94f-9fa164ae3c08/hero_welcome`
