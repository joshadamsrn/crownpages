# Business Setup & Management Flow

## Overview

The Crown Pages mobile app now includes a comprehensive business setup and management system. Each user is required to set up exactly one business when they first sign up, and all their pages will be housed under that business's unique URL slug.

## Key Features

### 1. **Mandatory Business Setup on First Login**
- When a new user signs up and logs in for the first time, they are automatically redirected to the business setup screen
- Users cannot create pages until they complete business setup
- The setup process is simple and user-friendly

### 2. **Unique Business URL (Slug)**
- Each business must have a unique slug across the entire Crown Pages platform
- The slug is used to create URLs: `crownpages.com/{business-slug}/{page-slug}`
- Real-time availability checking ensures no duplicate business slugs
- Auto-formatting ensures slugs follow the rules:
  - Lowercase letters only (a-z)
  - Numbers (0-9)
  - Dashes (-) for separating words
  - No special characters or spaces

### 3. **Smart Slug Validation**
- As users type their business name, a slug is automatically generated
- Users can customize the slug if they want
- Real-time validation with visual feedback:
  - ✅ Green checkmark: Slug is available
  - ❌ Red X: Slug is already taken
  - ⓘ Gray info icon: Checking availability
- Debounced API calls (500ms) to avoid excessive database queries

### 4. **Business Settings Management**
- Accessible from the hamburger menu → "Business Settings"
- **For users with one business:**
  - Direct access to edit their business details
- **For users with multiple businesses (legacy accounts):**
  - Business switcher at the top to select which business to edit
  - Modal with all businesses listed
  - Can switch between and manage each business separately
- Users can edit:
  - Business name
  - Business URL (slug) - with availability checking
  - Business email
  - Business phone
  - Website
  - Description
- Warning banner alerts users that changing the slug affects all page URLs
- Users can now edit these details themselves (previously admin-only)

## File Structure

### New Files Created

1. **`app/(app)/business-setup.tsx`**
   - First-time business setup screen
   - Required fields: Business name and slug
   - Real-time slug validation and availability checking
   - Beautiful, user-friendly interface with helpful hints

2. **`app/(app)/business-settings.tsx`**
   - Business settings management screen
   - **Backward compatible:** Supports both single and multiple business accounts
   - Business switcher for users with multiple businesses (legacy accounts)
   - Edit business details at any time
   - Slug validation with change warnings
   - Loads existing business data

### Modified Files

1. **`app/(app)/_layout.tsx`**
   - Added "Business Settings" menu item to drawer
   - Added routes for `business-setup` and `business-settings`
   - Styled menu items for consistency

2. **`app/(app)/(tabs)/index.tsx`**
   - Added business check on app load
   - Redirects to `business-setup` if no business exists
   - Shows loading indicator during check

3. **`app/(app)/(tabs)/my-pages.tsx`**
   - Updated "Create Page" flow to check for business
   - Redirects to business setup instead of auto-creating random business
   - Better user experience with clear prompts

## User Flow

### New User Journey

```
1. User signs up → Login successful
2. App checks for business → None found
3. Redirect to Business Setup screen
4. User enters business name (e.g., "Smith Dental Care")
5. Slug auto-generates (e.g., "smith-dental-care")
6. Real-time check: ✅ Available
7. User clicks "Create My Business"
8. Success! → Redirect to My Pages
9. User can now create pages under their business
```

### Creating Pages

```
1. User clicks "Create Page" button
2. App checks for business
3. If no business → Prompt to set up business
4. If business exists → Open page creation
5. Page created under: crownpages.com/{business-slug}/{page-slug}
```

### Editing Business Settings

**For users with one business:**
```
1. User opens hamburger menu
2. Clicks "Business Settings"
3. Edit any business details
4. Change slug (with availability check)
5. Save changes
6. All existing pages automatically use new slug
```

**For users with multiple businesses (legacy):**
```
1. User opens hamburger menu
2. Clicks "Business Settings"
3. Business switcher appears at top
4. Tap to select which business to edit
5. Modal shows all businesses
6. Select a business
7. Edit that business's details
8. Save changes
9. Can switch to another business and repeat
```

## Technical Implementation

### Slug Validation Logic

```typescript
// Format slug: lowercase, dashes only, no special chars
const formatSlug = (input: string) => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};
```

### Availability Check (Debounced)

```typescript
const checkSlugAvailability = useCallback(
  debounce(async (slugToCheck: string) => {
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slugToCheck)
      .maybeSingle();

    if (data) {
      // Slug taken
      setSlugAvailability({
        available: false,
        message: "This business URL is already taken",
      });
    } else {
      // Slug available
      setSlugAvailability({
        available: true,
        message: "Perfect! This business URL is available",
      });
    }
  }, 500),
  []
);
```

### Database Schema

The `businesses` table includes:
- `id` (UUID, primary key)
- `owner_id` (UUID, foreign key to users)
- `name` (text, business name)
- `slug` (text, unique, business URL)
- `email` (text, optional)
- `phone` (text, optional)
- `website` (text, optional)
- `description` (text, optional)
- Other fields for branding (colors, logo, etc.)

**Important:** The `slug` field has a UNIQUE constraint at the database level, ensuring no duplicates across the platform.

## Business Rules

1. **One Business Per User (New Users Only)**
   - **New users** (signing up now) can only create one business during setup
   - **Legacy users** (existing accounts) may have multiple businesses and can manage all of them
   - The system is backward compatible with multi-business accounts
   - Future: May expand to allow new users to create multiple businesses as a Pro feature

2. **Unique Slugs Required**
   - Business slugs must be unique across all of Crown Pages
   - This allows multiple businesses to have pages with the same name
   - Example: Both "smith-dental" and "jones-dental" can have a "contact" page

3. **Slug Changes Affect All Pages**
   - Changing a business slug updates the URL for all pages
   - Users are warned about this in the settings screen
   - Pages themselves maintain their own slugs (unique within business)

4. **Required Fields**
   - Business name: Required
   - Business slug: Required (auto-generated, can be customized)
   - All other fields: Optional

## UI/UX Highlights

### Business Setup Screen
- 👑 Welcoming header with crown icon
- Clear explanation of what's happening
- Auto-generation of slug from business name
- URL preview: `crownpages.com/your-business`
- Real-time validation with color-coded feedback
- Info button with detailed slug rules
- Disabled "Create" button until all validations pass
- Help text reassuring users they can contact support later

### Business Settings Screen
- Back button for easy navigation
- Info banner warning about slug changes
- All business details in one place
- Same slug validation as setup
- Save button with loading state
- Help text for support

### Hamburger Menu Integration
- Clean menu item with business icon
- Consistent styling with other menu items
- Easy access from anywhere in the app

## Future Enhancements

Potential improvements for future versions:

1. **Business Logo Upload**
   - Allow users to upload a logo
   - Use in page headers and branding

2. **Business Colors & Branding**
   - Set default colors for all pages
   - Custom fonts and styling

3. **Multiple Businesses (Pro Feature)**
   - Allow Pro users to manage multiple businesses
   - Business switcher in the UI

4. **Business Analytics**
   - Aggregate analytics across all pages
   - Business-level insights

5. **Team Members**
   - Invite team members to manage business
   - Role-based permissions

6. **Custom Domains**
   - Use business slug with custom domain
   - Example: `yourdomain.com/{page-slug}`

## Testing Checklist

### New User Flow
- [x] New user signup → Redirects to business setup
- [x] Business setup → Slug validation works
- [x] Business setup → Real-time availability check
- [x] Business setup → Auto-formatting of slug
- [x] Business setup → Create button disabled until valid
- [x] Business setup → Success redirects to My Pages
- [x] Business setup → Prevents duplicate business creation
- [x] Create page → Checks for business first
- [x] Create page → Redirects to setup if no business

### Legacy User Flow (Multiple Businesses)
- [x] Business settings → Loads all businesses
- [x] Business settings → Shows business switcher
- [x] Business settings → Can select different businesses
- [x] Business settings → Edits correct business
- [x] Business settings → Slug validation per business
- [x] Business settings → Save updates correct business

### Common Features
- [x] Hamburger menu → Business Settings appears
- [x] Business settings → Slug change validation
- [x] Business settings → Save updates database

## Support & Troubleshooting

### Common Issues

**Q: User can't create a business because slug is taken**
- A: Try different variations of the business name
- A: Add location or specialty to make it unique
- A: Contact support for assistance

**Q: User wants to change business slug but it's taken**
- A: Same as above - try variations
- A: Consider if the change is really necessary

**Q: User created business with wrong slug**
- A: They can change it in Business Settings
- A: Warn them it affects all page URLs

**Q: User wants multiple businesses**
- A: Currently limited to one business per user
- A: Future feature for Pro users

## Backward Compatibility

The system is fully backward compatible with existing accounts that have multiple businesses:

### How It Works

1. **Detection:**
   - The app checks how many businesses a user has
   - If 0: Redirect to business setup
   - If 1: Direct access to edit that business
   - If 2+: Show business switcher to select which to edit

2. **Business Setup Protection:**
   - If a user with existing businesses tries to access the setup screen
   - They are redirected to My Pages with a message
   - Prevents accidental duplicate business creation

3. **Business Settings Flexibility:**
   - Automatically adapts to single or multiple business scenarios
   - Business switcher only appears when needed
   - Same editing interface regardless of business count

4. **Page Creation:**
   - Users with multiple businesses see the business selector (existing behavior)
   - Users with one business go directly to page creation
   - Users with zero businesses are prompted to set up first

### Migration Path

- **Existing users:** No changes required, all businesses remain accessible
- **New users:** Guided through single business setup
- **Future:** Can enable multiple businesses for Pro users by removing the setup screen restriction

## Conclusion

The new business setup and management system provides a professional, user-friendly way for users to establish their presence on Crown Pages. The unique slug system ensures clean URLs and prevents conflicts, while the real-time validation provides immediate feedback. The integration into the app flow is seamless, and the settings screen gives users control over their business details.

**Most importantly:** The system maintains full backward compatibility with legacy accounts that have multiple businesses, while providing a streamlined experience for new users with a single business.

