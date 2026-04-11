# Business Check System - Bulletproof Implementation

## Overview

The business check system ensures that users **always** have a business set up before they can create pages or access business settings. This is implemented using a custom React hook that provides consistent, reusable business checking logic across the entire app.

## The Three Critical Checkpoints

### 1. **After Sign Up (My Pages Screen)**
- **Location:** `app/(app)/(tabs)/my-pages.tsx`
- **Trigger:** User lands on My Pages after login
- **Behavior:** Automatically redirects to business setup if no businesses exist
- **Implementation:** `useBusinessCheck` hook with `redirectOnNoBusinesses: true`

### 2. **Create Page Flow**
- **Location:** `app/(app)/create-page.tsx`
- **Trigger:** User tries to create a new page
- **Behavior:** Checks for businesses before allowing page creation
- **Implementation:** `useBusinessCheck` hook prevents access without business

### 3. **Business Settings**
- **Location:** `app/(app)/business-settings.tsx`
- **Trigger:** User opens business settings from hamburger menu
- **Behavior:** Redirects to business setup if no businesses exist
- **Implementation:** `useBusinessCheck` hook validates business exists before showing settings

## The `useBusinessCheck` Hook

### Purpose
A reusable React hook that provides consistent business checking logic across the app.

### Location
`hooks/useBusinessCheck.ts`

### Features
- ✅ Checks if user has any businesses
- ✅ Returns business count
- ✅ Optional automatic redirect to business setup
- ✅ Manual check function for on-demand validation
- ✅ Loading states for UI feedback
- ✅ Handles edge cases (no session, errors, etc.)

### API

```typescript
const {
  isChecking,      // boolean: Is the check in progress?
  hasBusinesses,   // boolean | null: Does user have businesses?
  businessCount,   // number: How many businesses?
  checkBusinesses, // function: Manually trigger a check
} = useBusinessCheck({
  redirectOnNoBusinesses: true,  // Auto-redirect if no businesses
  checkOnMount: true,             // Check immediately on mount
});
```

### Usage Examples

#### Example 1: My Pages Screen (Auto-redirect)
```typescript
export default function MyPagesScreen() {
  // Automatically redirects if no businesses
  const { isCheckingBusinesses } = useBusinessCheck({
    redirectOnNoBusinesses: true,
    checkOnMount: true,
  });

  if (isCheckingBusinesses || isLoading) {
    return <LoadingSpinner />;
  }

  // Rest of component...
}
```

#### Example 2: Create Page (Block Access)
```typescript
export default function CreatePageScreen() {
  // Blocks access and redirects if no businesses
  const { isChecking, hasBusinesses } = useBusinessCheck({
    redirectOnNoBusinesses: true,
    checkOnMount: true,
  });

  if (isChecking || isLoading) {
    return <Loader />;
  }

  if (hasBusinesses === false) {
    return <Loader />; // Will redirect
  }

  // Rest of component...
}
```

#### Example 3: Business Settings (Validate Before Access)
```typescript
export default function BusinessSettings() {
  // Ensures businesses exist before showing settings
  const { isChecking, hasBusinesses } = useBusinessCheck({
    redirectOnNoBusinesses: true,
    checkOnMount: true,
  });

  if (isChecking || isLoading) {
    return <LoadingScreen />;
  }

  if (hasBusinesses === false) {
    return <LoadingScreen />; // Will redirect
  }

  // Load and display business settings...
}
```

## Flow Diagrams

### New User Flow

```
1. User signs up
2. Logs in successfully
3. Lands on My Pages screen
4. useBusinessCheck runs on mount
5. Queries database for businesses
6. Finds 0 businesses
7. Automatically redirects to business-setup
8. User sees "Welcome to Crown Pages!" 👑
9. Creates business with unique slug
10. Redirects to My Pages
11. useBusinessCheck runs again
12. Finds 1 business
13. No redirect, shows My Pages normally
```

### Existing User Flow

```
1. User logs in
2. Lands on My Pages screen
3. useBusinessCheck runs on mount
4. Queries database for businesses
5. Finds 1+ businesses
6. No redirect, shows My Pages normally
```

### Edge Case: App Killed During Setup

```
1. User starts business setup
2. Kills app before completing
3. Reopens app
4. Logs in
5. Lands on My Pages screen
6. useBusinessCheck runs on mount
7. Queries database for businesses
8. Finds 0 businesses (setup never completed)
9. Automatically redirects back to business-setup
10. User completes setup
```

### Edge Case: Trying to Create Page Without Business

```
1. User somehow bypasses checks (dev tools, etc.)
2. Navigates to create-page screen
3. useBusinessCheck runs on mount
4. Queries database for businesses
5. Finds 0 businesses
6. Automatically redirects to business-setup
7. User must complete setup first
```

### Edge Case: Accessing Business Settings Without Business

```
1. User clicks "Business Settings" in menu
2. Screen loads
3. useBusinessCheck runs on mount
4. Queries database for businesses
5. Finds 0 businesses
6. Automatically redirects to business-setup
7. User must create business first
```

## Implementation Details

### Database Query
```typescript
const { data, error } = await supabase
  .from("businesses")
  .select("id")
  .eq("owner_id", session.user.id);

const count = data?.length || 0;
const hasBusinesses = count > 0;
```

### Why This Approach Works

1. **Single Source of Truth**: One hook, consistent behavior everywhere
2. **Declarative**: Components declare their needs, hook handles logic
3. **Reusable**: Easy to add to new screens
4. **Testable**: Hook can be tested independently
5. **Performance**: Only queries when needed, caches result
6. **Error Handling**: Gracefully handles errors and edge cases
7. **Type Safe**: Full TypeScript support

### Performance Considerations

- **Minimal Queries**: Only checks once on mount
- **Fast Query**: Only selects `id` field, not full business data
- **No Polling**: Doesn't continuously check
- **Cached**: React state caches the result
- **Conditional**: Only runs when session exists

## Best Practices

### ✅ DO:
- Use `useBusinessCheck` in any screen that requires a business
- Set `redirectOnNoBusinesses: true` for screens that can't function without a business
- Show loading state while `isChecking` is true
- Handle the `hasBusinesses === false` case with a fallback UI

### ❌ DON'T:
- Don't create custom business checking logic
- Don't assume a business exists without checking
- Don't skip the loading state
- Don't allow users to proceed if `hasBusinesses === false`

## Testing Checklist

- [x] New user signup → Redirects to business setup
- [x] App killed during setup → Redirects back to setup on reopen
- [x] Create page without business → Blocked and redirected
- [x] Business settings without business → Blocked and redirected
- [x] Existing user with business → No redirects, normal flow
- [x] Multiple businesses → Can access all features normally
- [x] Network error during check → Graceful error handling
- [x] No session → Doesn't crash, returns false

## Troubleshooting

### Issue: User stuck in redirect loop
**Cause:** Business setup screen not properly creating business
**Fix:** Ensure business is inserted into database before redirecting

### Issue: User can access pages without business
**Cause:** Screen missing `useBusinessCheck` hook
**Fix:** Add hook to screen with `redirectOnNoBusinesses: true`

### Issue: Loading screen flashes
**Cause:** Not showing loading state while checking
**Fix:** Add `if (isChecking) return <Loader />`

### Issue: Check runs multiple times
**Cause:** Dependencies in useEffect causing re-runs
**Fix:** Hook only depends on `checkOnMount` flag, runs once

## Future Enhancements

1. **Context Provider**: Move business check to context for global state
2. **Cache Duration**: Add time-based cache invalidation
3. **Optimistic Updates**: Assume business exists after creation
4. **Background Sync**: Periodically refresh business list
5. **Offline Support**: Cache business existence for offline use

## Conclusion

The business check system provides a **bulletproof** way to ensure users always have a business before accessing business-dependent features. By using a centralized hook, we maintain consistency, reduce bugs, and provide a better user experience.

**Key Takeaway:** Every screen that requires a business should use `useBusinessCheck` with `redirectOnNoBusinesses: true`.

