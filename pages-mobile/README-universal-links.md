# CrownPages Universal Links Setup

This document explains how Universal Links are configured for CrownPages mobile app to handle `crownpages.com` links.

## What's Implemented

✅ **Universal Links Configuration**

- iOS: Associated Domains for `crownpages.com` and `www.crownpages.com`
- Android: Intent Filters for both domains
- Automatic deep link handling

✅ **Link Handler Utility**

- Parses CrownPages URLs to extract business and page information
- Validates links against database
- Saves valid pages to user's wallet

✅ **Wallet Integration**

- Automatic save prompts when Universal Links are opened
- Manual save feature in wallet screen
- Duplicate prevention

✅ **User Experience**

- Automatic prompts to save pages to wallet
- Success notifications with option to view wallet
- Error handling for invalid or missing pages

## How It Works

### 1. Universal Links Detection

When a user clicks on a `crownpages.com` link:

- iOS/Android recognizes the domain and opens your app
- The app receives the full URL
- Link handler parses the URL format: `https://crownpages.com/{businessSlug}/{pageSlug}`

### 2. Automatic Processing

- Validates the URL format
- Fetches page data from Supabase database
- Checks if page exists and is published
- Verifies business slug matches
- Prompts user to save to wallet

### 3. Wallet Save

- Prevents duplicate saves
- Updates page save count analytics
- Shows success notification
- Option to navigate to wallet

## Server-Side Requirements

⚠️ **Important**: You need to add Apple App Site Association (AASA) files to your `crownpages.com` domain:

### Apple App Site Association File

Create `/.well-known/apple-app-site-association` on your server:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.phnteam.pagesmobile",
        "paths": ["*"]
      }
    ]
  }
}
```

**Note**: Replace `TEAMID` with your actual Apple Developer Team ID.

### Android Asset Links (Optional but Recommended)

Create `/.well-known/assetlinks.json` on your server:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.phnteam.pagesmobile",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

## Testing Universal Links

### Method 1: Using Simulator/Device

1. Build and install the app on device/simulator
2. Open Safari (iOS) or Chrome (Android)
3. Navigate to a test CrownPages URL like:
   ```
   https://crownpages.com/test-business/test-page
   ```
4. Tap the link - your app should open with a save prompt

### Method 2: Using Command Line (iOS Simulator)

```bash
xcrun simctl openurl booted "https://crownpages.com/business-name/page-name"
```

### Method 3: Using ADB (Android)

```bash
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "https://crownpages.com/business-name/page-name" \
  com.phnteam.pagesmobile
```

### Method 4: Manual Testing in App

1. Open the app and go to Wallet tab
2. Tap the "+" button (or "Add Your First Page" if wallet is empty)
3. Enter a CrownPages URL manually
4. Test the save functionality

## URL Format Expected

The app expects CrownPages URLs in this format:

```
https://crownpages.com/{businessSlug}/{pageSlug}
```

Example:

```
https://crownpages.com/sunset-dental/welcome-new-patients
```

This will:

- Extract `businessSlug`: "sunset-dental"
- Extract `pageSlug`: "welcome-new-patients"
- Find the page in database where `slug = "welcome-new-patients"`
- Verify the associated business has `slug = "sunset-dental"`

## User Flows

### First-Time Link Opening

1. User clicks CrownPages link in browser/message
2. iOS/Android opens your app
3. App shows "CrownPages Link Detected" alert
4. User taps "Save to Wallet"
5. App saves page and shows success message
6. Option to view wallet or continue

### Duplicate Link Handling

1. User clicks link for already-saved page
2. App shows "Already Saved" message
3. User can still navigate to view the page

### Invalid Link Handling

1. User clicks invalid/broken CrownPages link
2. App shows appropriate error message:
   - "Page Not Found" if page doesn't exist
   - "Invalid Link" if URL format is wrong
   - "Business mismatch" if slugs don't align

## Features

### Manual Save Feature

Users can manually save CrownPages links:

- Floating action button in wallet (when items exist)
- "Add Your First Page" button (when wallet empty)
- Modal with URL input field
- Same validation as automatic links

### Error Handling

- Network errors during page lookup
- Invalid URL formats
- Missing or unpublished pages
- Business slug mismatches
- Authentication requirements

### Analytics Integration

- Tracks save events in page analytics
- Updates page save_count
- Can be extended to track link source

## Development Notes

### File Structure

```
utils/
├── linkHandler.ts          # Main Universal Links logic
└── index.ts               # Exports for easy importing

app/
├── _layout.tsx            # Root layout with link listener
└── (app)/(tabs)/wallet.tsx # Wallet screen with manual save
```

### Key Functions

- `parseCrownPagesUrl()`: Extracts business/page slugs from URL
- `saveToWallet()`: Saves valid pages to user's wallet
- `handleCrownPagesLink()`: Main handler for incoming links

### Dependencies Used

- `expo-linking`: Universal Links handling
- `expo-router`: Navigation after link processing
- `@supabase/supabase-js`: Database operations

## Troubleshooting

### Universal Links Not Working

1. Verify AASA file is accessible at `https://crownpages.com/.well-known/apple-app-site-association`
2. Check Team ID in AASA file matches your Apple Developer account
3. Ensure app is signed with correct provisioning profile
4. Test with fresh app install (Universal Links cache on device)

### Links Opening in Browser Instead of App

- AASA file might be missing or incorrect
- Domain verification may be failing
- Try testing with a fresh app install

### Save Function Not Working

- Check user authentication status
- Verify database permissions in Supabase
- Check console logs for error messages
- Ensure page exists and is published

### Database Issues

- Verify wallet_items table structure matches expectations
- Check RLS (Row Level Security) policies in Supabase
- Ensure user has permission to insert wallet items

## Next Steps

1. **Deploy AASA Files**: Add the required files to your `crownpages.com` server
2. **Test with Real URLs**: Use actual CrownPages URLs from your production database
3. **Monitor Analytics**: Track how many users are saving pages via Universal Links
4. **Consider Extensions**:
   - Support for share links (`crownpages.com/share/abc123`)
   - Deep linking to specific app screens
   - Custom folder organization for saved links

## Security Considerations

- URL validation prevents malicious link injection
- Database queries use parameterized statements
- User authentication required for wallet saves
- RLS policies should restrict wallet access to page owners
