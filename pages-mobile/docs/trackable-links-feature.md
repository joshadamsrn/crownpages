# Trackable Links Feature

## Overview

The Trackable Links feature allows users to create trackable sharing links for their Crown Pages through the mobile app. This feature provides detailed analytics on who clicks their links, when, and from where - perfect for marketing campaigns, social media sharing, and understanding page engagement.

## How It Works

### For Users (Mobile App Only)

1. **Access**: Go to any page's "Page Options" → "Trackable Links"
2. **Create**: Tap the "+" button to create a new trackable link
3. **Configure**: Set name, description, UTM parameters, and behavior options
4. **Share**: Get both a short URL (`crownpages.com/t/abc123`) and a tracked URL (`crownpages.com/business/page?track=abc123`)
5. **Track**: View real-time analytics including clicks, countries, devices, and more

### For Recipients (Anyone)

1. **Click**: Click on either the short URL or tracked URL
2. **Redirect**: Automatically redirected to the Crown Page
3. **Tracked**: Their visit is anonymously tracked for analytics

## URL Formats

We support both URL formats as requested:

### Short URLs (Clean & Professional)
```
https://crownpages.com/t/abc123
```

### Tracked URLs (Business/Page Visible)
```
https://crownpages.com/mybusiness/mypage?track=abc123
```

Both URLs work identically and provide the same tracking data. Users can choose which format to share based on their preference.

## Database Schema

### Tables Created

1. **`trackable_links`** - Stores link metadata and settings
2. **`trackable_link_events`** - Stores individual click events for analytics

### Key Features

- **Row Level Security (RLS)** - Users can only see their own links
- **Automatic tracking code generation** - Unique, unassuming codes
- **UTM parameter support** - For campaign tracking
- **Advanced options** - Preview pages, email collection, expiration dates
- **Performance optimized** - Cached click counts, indexed queries

## Mobile App Integration

### New Page: `/trackable-links/[id]`

**Features:**
- List all trackable links for a page
- Create new trackable links with full configuration
- Copy short URLs and tracked URLs to clipboard
- Share links directly via native sharing
- View detailed analytics per link
- Delete links with confirmation

**UI Components:**
- Clean, card-based design
- Easy copy/share buttons
- Visual analytics with metrics
- Form validation and error handling

### Page Options Integration

Added "Trackable Links" button to the page options menu with:
- Icon: `link-outline`
- Description: "Create and manage trackable sharing links"
- Navigation: Direct to trackable links screen

## Web App Integration (Minimal)

### Tracking Handler: `/t/[trackingCode]`

**Purpose:** Handle clicks on short URLs and redirect appropriately

**Features:**
- Look up trackable link by code
- Track the click event
- Handle expired/disabled links
- Add UTM parameters automatically
- Support preview mode and redirect delays
- Redirect to final destination

**Note:** The web app does NOT have any UI for creating or managing trackable links - this is mobile-only as requested.

## Analytics & Tracking

### Data Collected (Anonymously)

- **Click Events**: When links are clicked
- **Visitor IDs**: Anonymous identifiers for unique visitor counting
- **Device Types**: Mobile, tablet, desktop
- **Geographic Data**: Country, region, city (when available)
- **Referrer Data**: Where clicks came from
- **Timestamps**: When clicks occurred

### Analytics Provided

- **Total Clicks**: Total number of clicks
- **Unique Visitors**: Number of unique people who clicked
- **Click-Through Rate**: Engagement metrics
- **Geographic Breakdown**: Top countries/regions
- **Device Breakdown**: Mobile vs desktop usage
- **Hourly Distribution**: When people are most active
- **Top Referrers**: Where traffic is coming from

## Privacy & Security

### Row Level Security

- Users can only create links for pages they have access to
- Users can only view analytics for their own links
- Public can access active links for tracking only

### Data Privacy

- No personally identifiable information is stored
- Visitor IDs are randomly generated and anonymous
- Geographic data is approximate (city-level at most)
- Users can delete their trackable links and all associated data

## Usage Examples

### Marketing Campaign
```
Name: "Summer Sale Email"
Description: "Email campaign for summer promotion"
UTM Source: "newsletter"
UTM Medium: "email"
UTM Campaign: "summer-sale-2024"
```

### Social Media Sharing
```
Name: "Instagram Bio Link"
Description: "Link in Instagram bio"
UTM Source: "instagram"
UTM Medium: "social"
UTM Campaign: "bio-link"
```

### Partnership Tracking
```
Name: "Partner Website"
Description: "Link from partner's website"
UTM Source: "partner-site"
UTM Medium: "referral"
UTM Campaign: "partnership"
```

## Technical Implementation

### Mobile App Files
- `utils/trackableLinksService.ts` - All API functions and types
- `app/(app)/trackable-links/[id].tsx` - Main trackable links screen
- `app/(app)/page-options/[id].tsx` - Updated with trackable links button
- `components/trackable-links/TrackableLinkManager.tsx` - Reusable component

### Web App Files
- `app/t/[trackingCode]/page.tsx` - Tracking handler for short URLs
- Database migrations applied via Supabase MCP

### Database Functions
- `update_trackable_link_counters()` - Automatically updates click counts
- Proper indexes for performance
- RLS policies for security

## Future Enhancements

Potential features that could be added:

1. **Password Protection** - Require password before accessing
2. **Click Limits** - Disable links after X clicks
3. **Geographic Restrictions** - Allow/block certain countries
4. **A/B Testing** - Multiple versions of the same page
5. **Conversion Tracking** - Track actions taken after clicking
6. **Team Sharing** - Share trackable links within business teams
7. **Webhook Integration** - Real-time notifications of clicks
8. **Custom Domains** - Use customer's own domain for short URLs

## Benefits

### For Users
- **Better Analytics**: Understand who's engaging with their content
- **Professional URLs**: Clean, branded short links
- **Campaign Tracking**: Measure marketing effectiveness
- **Easy Sharing**: Copy/paste or native sharing
- **Real-time Data**: See results immediately

### For Crown Pages Platform
- **Increased Engagement**: Users share more when they can track results
- **Better Insights**: Platform-wide analytics on sharing patterns
- **Competitive Advantage**: Advanced feature not found in simple page builders
- **User Retention**: More reasons to stay active on the platform

This trackable links feature transforms Crown Pages from a simple page builder into a comprehensive digital marketing tool, giving users professional-grade analytics and sharing capabilities while maintaining the platform's ease of use.
