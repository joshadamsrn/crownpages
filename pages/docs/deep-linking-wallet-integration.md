# Deep Linking & Wallet Integration Documentation

## Overview

This document outlines the complete implementation of deep linking and wallet integration for Crown Pages, enabling seamless transitions between web and mobile app experiences. **The system intelligently detects if the Crown Pages app is actually installed before showing any prompts, ensuring users only see relevant actions.**

## Key Features

### 🎯 Smart App Detection

- **Actual Installation Detection**: Tests if app is really installed, not just platform capability
- **User Agent Analysis**: Detects when browsing from within the Crown Pages app
- **Caching System**: Remembers app installation status for 5 minutes
- **Graceful Fallbacks**: Only shows install prompts when app is confirmed not installed

### 📱 Intelligent Prompting

- **Install Detection**: Prompts only appear when app is confirmed installed
- **In-App Detection**: No prompts when already browsing within the app
- **Desktop Exclusion**: No mobile app prompts on desktop browsers
- **Memory Persistence**: Remembers user dismissals and preferences

## Features Implemented

### 1. Universal Links & App Links Setup

#### iOS Universal Links

- **File**: `app/api/apple-app-site-association/route.ts`
- **Endpoint**: `/.well-known/apple-app-site-association`
- Configured for app ID: `643BVN45VK.com.phnteam.pagesmobile`
- Supports business pages (`/[business-slug]`) and individual pages (`/[business-slug]/[page-slug]`)
- Excludes web-only routes (API, auth, admin pages)

#### Android App Links

- **File**: `app/api/assetlinks.json/route.ts`
- **Endpoint**: `/.well-known/assetlinks.json`
- Package name: `com.phnteam.pagesmobile`
- **⚠️ IMPORTANT**: Update the SHA256 fingerprints with your actual app signing keys

### 2. Enhanced Platform Detection System

#### Core Utilities (`lib/platform-utils.ts`)

```typescript
// Key functions available:
detectPlatform(): PlatformInfo          // Enhanced with installation detection
testAppInstallation(): Promise<boolean> // Tests actual app installation
shouldShowAppPrompts(): boolean         // Determines if prompts should show
generateDeepLink(path: string): string
openInApp(path: string, fallbackToStore?: boolean): void
saveToWallet(pageId: string, businessSlug: string, pageSlug?: string): void
```

#### Enhanced Platform Information

- iOS/Android/Mobile/Desktop detection
- **In-app browsing detection** (Crown Pages app webview)
- **Actual app installation status** (not just capability)
- **Installation test history** (avoids repeated testing)
- App store URLs and platform-specific handling

#### App Installation Detection Methods

1. **User Agent Analysis**: Detects Crown Pages app webview
2. **Custom URL Scheme Testing**: Tests `crownpages://test-installation`
3. **Page Visibility Monitoring**: Detects if page becomes hidden (app opened)
4. **Focus Event Tracking**: Monitors if focus returns quickly (app not installed)
5. **Local Storage Caching**: Remembers results for 5 minutes

### 3. Smart Banner Component

#### Full Modal Banner (`SmartBanner`)

- **Installation Testing**: Automatically tests app installation on first visit
- **Smart Visibility**: Only shows when app is confirmed installed
- **Enhanced Messaging**: "App detected" instead of generic availability
- **No Store Fallbacks**: Since we know app is installed, no store redirects
- **Analytics Enhanced**: Tracks `app_installed: true` in all events

#### Minimal Top Banner (`SmartBannerMinimal`)

- Same smart detection as modal version
- Less intrusive top bar format
- Quick open/dismiss actions

### 4. Save to Wallet Integration (Enhanced)

#### Standard Button (`SaveToWalletButton`)

- **Installation Required**: Only visible when app is confirmed installed
- **Smart Messaging**: Clear indication that app is available
- **Direct Actions**: No fallback flows since app is known to be installed

#### Floating Action Button (`SaveToWalletFAB`)

- **Mobile-Only & App-Required**: Double filtering for optimal targeting
- **Enhanced Context**: Clear messaging about wallet functionality
- **Direct Save Flow**: Immediate deep link to save functionality

### 5. Deep Link URL Schemes

#### Web URLs (Universal/App Links)

```
https://crownpages.com/[business-slug]
https://crownpages.com/[business-slug]/[page-slug]
https://crownpages.com/share/[shortCode]
```

#### App-Specific URLs (Save to Wallet)

```
crownpages://save?pageId=xxx&businessSlug=xxx&pageSlug=xxx&source=web
crownpages://test-installation  # Used for installation testing
```

## Smart Detection Flow

### Initial Page Load

1. **Platform Detection**: Identify iOS/Android/Desktop
2. **User Agent Check**: Look for Crown Pages app indicators
3. **Cache Check**: Look for previous installation test results
4. **Installation Test**: If needed, test actual app installation
5. **Smart Display**: Show prompts only if app is confirmed installed

### Installation Testing Process

1. **Test URL Creation**: Generate `crownpages://test-installation`
2. **Event Listeners**: Set up visibility and focus change detection
3. **Invisible Iframe**: Attempt to open custom URL scheme
4. **Result Detection**:
   - Page becomes hidden → App opened (installed)
   - Focus returns quickly → App not opened (not installed)
5. **Caching**: Store result for 5 minutes to avoid repeat testing

### User Experience States

- **App Installed & First Visit**: Brief installation test, then show prompts
- **App Installed & Return Visit**: Immediate prompt display (cached result)
- **App Not Installed**: No prompts shown, clean browsing experience
- **Desktop Browser**: No mobile app prompts regardless of installation
- **In Crown Pages App**: No prompts (already in app)

## Implementation in Pages

### Business Pages (`app/[business_slug]/page.tsx`)

- Smart banner with installation detection
- Save to wallet FAB (mobile + app installed only)
- Enhanced analytics tracking

### Individual Pages (`app/[business_slug]/[slug]/page.tsx`)

- Smart banner (hidden in preview mode)
- Save to wallet FAB (hidden in preview mode)
- Installation detection integration

### Share Pages (`app/share/[shortCode]/page.tsx`)

- Smart banner for shared content
- Save to wallet FAB with context
- Full installation detection

## Configuration Required

### 1. Update App Store URLs

In `lib/platform-utils.ts`, replace placeholder URLs:

```typescript
appStoreUrl: isIOS
  ? 'https://apps.apple.com/app/crown-pages/YOUR_ACTUAL_APP_ID'
  : isAndroid
    ? 'https://play.google.com/store/apps/details?id=com.phnteam.pagesmobile'
    : undefined,
```

### 2. Android App Signing

In `app/api/assetlinks.json/route.ts`, replace:

```typescript
"sha256_cert_fingerprints": [
  "YOUR_SHA256_FINGERPRINT_HERE"
]
```

### 3. Mobile App Configuration

#### Custom User Agent (Recommended)

Set a custom user agent in your React Native app:

```typescript
// In your app's webview or global config
const customUserAgent = `${originalUserAgent} CrownPages-App/1.0`;
```

#### URL Schemes in app.json/app.config.js

```json
{
  "expo": {
    "scheme": "crownpages",
    "ios": {
      "associatedDomains": ["applinks:crownpages.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "crownpages.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

#### Deep Link Handling in App

```typescript
import * as Linking from "expo-linking";

// Handle incoming links
Linking.addEventListener("url", handleDeepLink);

function handleDeepLink(event: { url: string }) {
  const url = Linking.parse(event.url);

  if (url.scheme === "crownpages") {
    if (url.hostname === "save") {
      // Handle save to wallet
      const { pageId, businessSlug, pageSlug } = url.queryParams;
      // Navigate to save flow in app
    } else if (url.hostname === "test-installation") {
      // Installation test - can be ignored or logged
      console.log("Installation test detected");
    }
  } else if (url.scheme === "https" && url.hostname === "crownpages.com") {
    // Handle universal links - navigate to appropriate screen
    const path = url.path;
    // Parse and navigate to business/page
  }
}
```

## Analytics Events (Enhanced)

### Smart Banner Events

- `smart_banner_open_app`: User chose to open in app
- `smart_banner_continue_browser`: User chose to continue in browser
- `smart_banner_dismissed`: User dismissed the banner

### Save to Wallet Events

- `save_to_wallet_attempt`: User attempted to save to wallet
- `save_to_wallet_fab`: User used floating action button

### Enhanced Event Properties

- `app_installed: true`: All events now confirm app is installed
- `platform`: 'ios' or 'android'
- `page_type`: 'business' or 'page'
- `business_slug`: Business identifier
- `page_slug`: Page identifier (if applicable)

## Benefits of Smart Detection

### ✅ Improved User Experience

- **No False Prompts**: Users never see prompts for unavailable actions
- **Faster Interactions**: Direct actions without fallback flows
- **Cleaner Interface**: Fewer irrelevant UI elements
- **Better Performance**: Cached results avoid repeated testing

### ✅ Higher Conversion Rates

- **Targeted Prompts**: Only shown to users who can actually use them
- **Clear Messaging**: Users know the app is available and working
- **Direct Actions**: No uncertainty about whether actions will work

### ✅ Better Analytics

- **Accurate Metrics**: All tracked events confirm app installation
- **User Journey Clarity**: Clean separation of installed vs non-installed users
- **Optimization Insights**: Better understanding of app adoption

## Testing & Validation

### Testing Installation Detection

1. **With App Installed**: Should see smart banners and save buttons
2. **Without App Installed**: Should see clean page with no mobile app prompts
3. **In Crown Pages App**: Should see no prompts (already in app)
4. **Desktop Browser**: Should see no mobile app prompts

### Debug Testing

```javascript
// Test in browser console
import { detectPlatform, testAppInstallation } from "./lib/platform-utils";

// Check current detection
console.log(detectPlatform());

// Force installation test
testAppInstallation().then((result) => console.log("App installed:", result));

// Clear cache to retest
localStorage.removeItem("crownpages-app-status");
```

## Troubleshooting

### Installation Detection Issues

1. **False Negatives**: App installed but not detected

   - Check custom URL scheme registration
   - Verify `crownpages://` scheme works in app
   - Check for browser security restrictions

2. **False Positives**: App not installed but detected as installed

   - Clear localStorage cache
   - Check for other apps handling the scheme

3. **Cache Issues**: Detection not updating
   - Cache expires every 5 minutes
   - Clear with `localStorage.removeItem('crownpages-app-status')`

## Future Enhancements

### 🔮 Advanced Detection

- **Server-Side Hints**: Pass installation hints from authenticated users
- **Progressive Web App Detection**: Detect if PWA is installed
- **Cross-Platform Sync**: Remember installation across devices

### 🔮 Enhanced UX

- **Contextual Prompts**: Different messages based on page type
- **Timing Optimization**: Smart timing for prompt display
- **A/B Testing**: Different prompt styles and messaging

This smart detection system ensures users only see relevant prompts and actions, creating a much cleaner and more effective user experience! 🎯
