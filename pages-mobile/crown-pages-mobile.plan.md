# Crown Pages Mobile App Fixes & Enhancements

## Overview

Fix critical issues in the Crown Pages mobile app based on client feedback. The app allows users to create digital brochure-style web pages on mobile that replace printed materials.

**⚠️ SCOPE: MOBILE APP ONLY** - Focus exclusively on `pages-mobile` workspace. Web rendering issues are handled separately.

## Architecture Context

- **pages-mobile**: React Native/Expo mobile app (editor) - **THIS IS OUR FOCUS**
- **pages**: Next.js web app (renders brochures for viewers) - **DO NOT MODIFY**
- Digital brochures use a fixed template with sections: Hero, Company Info, Media, About, Amenities, Links, Contact
- Data stored in Supabase, rendered via `EnhancedPageRenderer` on web
- **DO NOT MODIFY**: `@crown-pages/types` shared package - it requires manual syncing
- **Local types only**: `pages-mobile/types/digitalBrochure.ts` is safe to modify

## Implementation Plan

### Phase 1: Critical Fix - Pages/Links System (#7 - Most Important)

**Current State**: Links and Contact are merged into one section (`LinksTableEditor` + `ContactCardEditor` in `DigitalBrochureEditor.tsx`)

**Required Changes**:

1. **Split sections in mobile editor**:
   - Separate `LinksTableEditor` from `ContactCardEditor` in `DigitalBrochureEditor.tsx` (lines 214-224)
   - Update `DigitalBrochureData` type in `types/digitalBrochure.ts` to have separate `links` and `contact` fields
   - Rename "Links" section to "Pages" in UI

2. **Update LinkItem type** (`types/digitalBrochure.ts` lines 47-53):
   ```typescript
   interface LinkItem {
     id: string;
     title: string;
     image?: string; // Optional thumbnail
     type: 'file' | 'external_link';
     fileUrl?: string; // For uploaded files
     fileType?: 'pdf' | 'image' | 'video' | 'other';
     url?: string; // For external links
   }
   ```

3. **Mobile editor behavior**:
   - Allow users to add either files (upload to Supabase) or external URLs
   - Files: Show upload interface, store in Supabase storage
   - External links: Show URL input field

4. **Mobile viewer behavior** (in-app preview):
   - Update `linksTable.tsx` to handle both file and external link types
   - Files: Could open in modal or external viewer
   - External links: Open in browser

**Files to modify**:
- `pages-mobile/components/digitalBrochure/DigitalBrochureEditor.tsx`
- `pages-mobile/types/digitalBrochure.ts`
- `pages-mobile/components/digitalBrochure/linksTable.tsx` (viewer component)
- Create new editor components for Pages section

**Note**: Web renderer already has `PagesSection` component that will work with this data structure.

---

### Phase 2: Quick Wins

#### ~~Fix #1: Scrolling Issue (Bottom Padding)~~ ❌ SKIP

**Status**: This is a web renderer issue, not a mobile app issue. Out of scope.

#### Fix #11: About Page Background Color

**Problem**: About section has darker background than other sections in mobile viewer

**Solution**: Standardize background colors
- File: `pages-mobile/components/digitalBrochure/aboutSection.tsx` (line 106)
- Verify background color matches other sections
- Ensure consistency in mobile app preview

#### Fix #3: Remove "check mark circle icon" Text

**Problem**: Amenities section shows confusing "check mark circle icon" text

**Solution**: Remove icon text from amenities
- File: `pages-mobile/components/digitalBrochure/amenitiesSection.tsx`
- Currently uses bullet points (line 64), which is correct
- Verify no "check mark circle icon" text appears in editor or viewer
- If found in editor component, remove that text

---

### Phase 3: Contact Card Enhancements (#8)

**Current State**: Contact card has limited fields (name, title, business, phone, email, address)

**Required Fields**:
1. Logo shot (upload image)
2. Name of Marketer (exists)
3. Main Office Phone (required)
4. Personal Phone (optional)
5. Email (required)
6. Fax Number (optional)
7. Website (optional)
8. Customizable button color (match business color)

**Changes**:

1. Update `ContactInfo` type in `types/digitalBrochure.ts` (lines 67-82):
   ```typescript
   interface ContactInfo {
     logo?: string; // Company logo
     profileImage: string; // Contact person photo
     name: string;
     title?: string; // Optional title field
     mainOfficePhone: string; // Required
     personalPhone?: string; // Optional
     email: string;
     fax?: string;
     website?: string;
     buttonColor?: string; // Custom button color
   }
   ```

2. Create/update ContactCardEditor component with all fields
3. Update mobile viewer component to display all fields
4. Add "Save Contact" vCard functionality with all fields

---

### Phase 4: Profile Picture Cropping (#5)

**Problem**: Profile picture editor doesn't show accurate crop preview - final published image gets cut off unexpectedly

**Solution**: Add live crop preview in editor
- File: `pages-mobile/components/digitalBrochure/HeroLogoEditor.tsx` (or create ProfileImageEditor)
- Use `expo-image-manipulator` or `react-native-image-crop-picker` with crop preview
- Show exact crop frame that matches final display dimensions
- Aspect ratio should match web renderer display (likely 1:1 or 4:5)

---

### Phase 5: Remaining Fixes

#### Fix #2: Disable Deep Links (Infinite Loading Spinner)

**Problem**: Mobile app tries to handle deep links when brochure links are opened from text messages, causing infinite loading spinner

**Solution**: Disable deep link handling in mobile app
- Find deep link configuration in `app.json` or expo-router config
- Remove/disable universal links and deep link handlers
- Brochure links should only open in web browser, not in the mobile app
- Check for any `Linking` API usage that intercepts URLs

**Files to check**:
- `app.json` - Look for `scheme`, `associatedDomains`, `intentFilters`
- Expo router configuration
- Any navigation linking configuration

#### ~~Fix #4: Video Upload Duration~~ ✅ DONE

**Status**: User already fixed this by changing Supabase max file size configuration

#### ~~Fix #6: Share Feature Covered in Preview Mode~~ ✅ DONE

**Status**: User already fixed this in the portal

#### Fix #9: Hide SEO Settings

**Problem**: Page Settings shows confusing SEO fields (meta title, description, keywords, etc.)

**Solution**: Hide advanced SEO fields in mobile app
- Find page settings screen in mobile app
- Conditionally hide: meta title, meta description, social media fields, keywords, preferred URL, SEO tips
- Keep only basic fields: page title, description, slug

#### Fix #10: Social Media Links Section (Optional/Future)

**Problem**: Current links section doesn't support social media logo layout

**Solution**: Create separate social links section
- Add horizontal logo row: Instagram, Facebook, YouTube, Website, Other
- Users input URLs for each platform
- Logos are clickable, open in new tab
- Similar to OVOU layout mentioned by client
- This might be separate from the "Pages" section

**Note**: This may be lower priority or future enhancement

---

## Testing Checklist

After implementation (Mobile App Only):

1. ✅ Test Pages section editor: upload PDF, image, video
2. ✅ Test Pages section editor: add external link with URL
3. ✅ Test Pages section viewer in app preview
4. ✅ Test contact card editor with all new fields
5. ✅ Test contact card viewer in app preview
6. ✅ Test profile picture cropping - verify preview matches final
7. ✅ Test brochure links from text messages open in browser (not app)
8. ✅ Test amenities section has no icon text in editor/viewer
9. ✅ Verify About section background matches other sections in app viewer
10. ✅ Test Save Contact button generates proper vCard
11. ✅ Verify SEO fields are hidden in page settings screen

---

## Key Files Reference

**Mobile App (pages-mobile)** - OUR FOCUS:

- `components/digitalBrochure/DigitalBrochureEditor.tsx` - Main editor
- `types/digitalBrochure.ts` - Local type definitions (NOT @crown-pages/types)
- `components/digitalBrochure/linksTable.tsx` - Links viewer (in-app preview)
- `components/digitalBrochure/amenitiesSection.tsx` - Amenities viewer (in-app preview)
- `components/digitalBrochure/aboutSection.tsx` - About viewer (in-app preview)
- `app.json` - Expo config (deep links configuration)

**Web Renderer (pages)** - DO NOT MODIFY:

- Web renderer already has `PagesSection` component that will work with new data structure
- No changes needed to web workspace for this scope

**Database**:

- Supabase `pages` table stores brochure data in `content` JSON field
- Structure: `{ digitalBrochure: DigitalBrochureData }`

---

## To-dos

**Phase 1 - Pages/Links System:**
- [ ] Split Links and Contact into separate sections in mobile editor
- [ ] Update LinkItem type to support files and external links
- [ ] Create Pages section editor with file upload and URL input
- [ ] Update Pages viewer component for in-app preview

**Phase 2 - Quick Wins:**
- [ ] Standardize About section background color in mobile viewer
- [ ] Remove confusing icon text from amenities section (if present)

**Phase 3 - Contact Card:**
- [ ] Add logo, office/personal phone, fax, website to contact card type
- [ ] Update contact card editor with all new fields
- [ ] Add customizable button color to contact card
- [ ] Update contact card viewer for in-app preview

**Phase 4 - Profile Cropping:**
- [ ] Add accurate crop preview for profile pictures in editor

**Phase 5 - Remaining:**
- [ ] Disable deep links in mobile app (fix infinite spinner)
- [ ] Hide advanced SEO fields in page settings screen
- [ ] (Optional) Add social media links section with logo layout

