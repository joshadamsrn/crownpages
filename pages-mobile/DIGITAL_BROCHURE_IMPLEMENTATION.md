# Digital Brochure Implementation Status

## ✅ Completed (Phase 1 - Quick Fixes)

### 1. URL Parser Fix
- **File**: `utils/linkHandler.ts`
- **Changes**: Added system route filtering to prevent parsing `(app)/(tabs)` as business slugs
- **Status**: ✅ Complete

### 2. Force Browser Opening
- **File**: `utils/linkHandler.ts`
- **Changes**: Modified `openCrownPageInViewer()` to always open Crown Pages in browser
- **Status**: ✅ Complete

### 3. Simplified Navigation
- **File**: `app/(app)/(tabs)/_layout.tsx`
- **Changes**: Reduced to 2 visible tabs (My Pages, Analytics), hidden wallet/my-business/test
- **Status**: ✅ Complete

## 🚧 In Progress (Phase 2 - Digital Brochure Template)

### Core Architecture Created

#### 1. Type Definitions ✅
- **File**: `types/digitalBrochure.ts`
- **Includes**:
  - `DigitalBrochureData` interface
  - `MediaItem`, `LinkItem`, `ContactInfo` interfaces
  - `VCardData` for contact saving
  - `getDefaultDigitalBrochureData()` helper

#### 2. Main Editor Component ✅
- **File**: `components/digitalBrochure/DigitalBrochureEditor.tsx`
- **Features**:
  - Auto-save functionality
  - State management
  - Save/Preview actions
  - Imports all section editors

#### 3. Hero & Logo Editor ✅
- **File**: `components/digitalBrochure/HeroLogoEditor.tsx`
- **Features**:
  - Image picker integration
  - Hero image upload (16:9)
  - Logo upload (1:1)
  - Required field indicators

## 📋 TODO - Remaining Components

### Section Editors Needed

1. **CompanyInfoEditor.tsx**
   - Company name input (mandatory)
   - Address input with Google Maps link
   - Save Contact vCard button

2. **MediaCarouselEditor.tsx**
   - Horizontal scrollable carousel
   - Add/remove images & videos
   - Reorder items
   - Caption editing

3. **AboutEditor.tsx**
   - Rich text input
   - Character counter
   - Preview with "Read More/Less" behavior

4. **AmenitiesEditor.tsx**
   - 2-column list editor
   - Add/remove amenities
   - Drag to reorder
   - Preview with collapse

5. **LinksTableEditor.tsx**
   - Add/remove link items
   - Upload title card images
   - Choose content type (document/image/images)
   - Upload documents/images
   - Reorder items

6. **ContactCardEditor.tsx**
   - Profile image upload
   - Name input
   - Phone numbers (1-2) with labels
   - Email, fax, website inputs
   - vCard generation

### Mobile View Components Needed

Create renderer components in `components/view-page/digitalBrochure/`:

1. **DigitalBrochureRenderer.tsx** - Main wrapper
2. **ShareButton.tsx** - Floating share button (top-right)
3. **HeroSection.tsx** - Hero image + logo display
4. **CompanyHeader.tsx** - Name, address, Save Contact button
5. **MediaCarousel.tsx** - Horizontal scrollable media
6. **AboutSection.tsx** - Collapsible about text
7. **AmenitiesSection.tsx** - 2-column collapsible list
8. **LinksTable.tsx** - Clickable links with images
9. **ContactDrawer.tsx** - Slide-up contact card

### Web Renderer Components Needed

Create in `C:\Users\u5\Desktop\pages\components\digitalBrochure/`:

1. **DigitalBrochureWeb.tsx** - Main web renderer
2. All the same section components adapted for web
3. vCard download functionality
4. Document viewer integration

## 🎯 Key Features to Implement

### 1. Save Contact (vCard)
- Generate .vcf file with contact info
- Trigger native contact manager (iOS/Android)
- Include: name, org, phones, email, website, address

### 2. Share Button
- Native share dialog
- Share page URL
- Floating button with icon

### 3. Media Carousel
- Horizontal scroll
- Image & video support
- Lightbox/fullscreen view
- Smooth animations

### 4. Collapsible Sections
- Smooth expand/collapse animation
- "Read More" / "Read Less" button
- 3 lines preview for About
- 2 rows preview for Amenities

### 5. Links Table
- 2-column layout (image | content)
- Support for:
  - Single image view
  - Multi-image gallery
  - PDF viewer
  - Document preview

### 6. Contact Drawer
- Slide up from bottom
- Hero profile image
- Clickable phone (tel:)
- Clickable email (mailto:)
- Clickable website
- Collapsible with down arrow

## 📝 Integration Tasks

1. **Update Page Creation Flow**
   - Default new pages to Digital Brochure template
   - Migrate existing pages (optional)

2. **Update My Pages List**
   - Show "Digital Brochure" badge
   - Quick preview/edit buttons

3. **Update Analytics**
   - Track saves, shares, link clicks
   - Contact drawer opens
   - Media views

4. **Testing**
   - iOS testing
   - Android testing
   - Web rendering
   - Share functionality
   - vCard downloads
   - Document viewing

## 🎨 Design Notes

### Inspiration Sources
- **Ovou** (ovou.com) - Polish and user experience
- **PHN Mobile App** - Layout and structure for Assisted Living facilities
- **VHN App** - Contact drawer design

### Key Design Principles
1. Single fixed template (no rearranging)
2. Mandatory vs optional fields clearly marked
3. User-friendly upload experience
4. Professional, clean aesthetic
5. Mobile-first design

## 📦 Next Steps

1. Complete remaining section editors
2. Create mobile view components
3. Create web renderer
4. Implement vCard generation
5. Implement share functionality
6. Test on actual devices
7. Polish animations and transitions
8. Update onboarding/tutorial

## 🔄 Migration Strategy

For existing pages using the old block system:

1. Add template type field to pages table
2. Keep old editor for legacy pages
3. New pages use Digital Brochure by default
4. Provide migration tool (optional)
