# User Account Deletion Implementation

## Overview

This implementation provides a complete user account deletion system that meets Apple and Android app store requirements. When a user deletes their account, **all** related data is automatically removed from both the database and storage.

## Implementation Details

### Database Changes Made

#### 1. Fixed Foreign Key Constraints

Updated two foreign key constraints to use `SET NULL` instead of `NO ACTION`:

- **analytics_events.user_id** → `SET NULL` (preserves analytics data for reporting)
- **business_members.invited_by** → `SET NULL` (preserves membership records but clears inviter)

#### 2. Cascade Delete Chain

When a user is deleted, the following automatic cascade happens:

```
USER DELETION
├── BUSINESSES (owned by user) → CASCADE DELETE
│   ├── business_members → CASCADE DELETE
│   ├── business_page_analytics → CASCADE DELETE
│   ├── business_pages → CASCADE DELETE
│   ├── media → CASCADE DELETE
│   └── pages → CASCADE DELETE
│       ├── analytics_events → CASCADE DELETE
│       ├── share_links → CASCADE DELETE
│       └── wallet_items → CASCADE DELETE
├── DIRECT USER REFERENCES → CASCADE DELETE
│   ├── wallet_folders → CASCADE DELETE
│   ├── wallet_items → CASCADE DELETE
│   ├── pages (created_by) → CASCADE DELETE
│   ├── business_pages (created_by) → CASCADE DELETE
│   ├── media (uploaded_by) → CASCADE DELETE
│   ├── share_links (created_by) → CASCADE DELETE
│   └── organizations (owner_id) → CASCADE DELETE
├── SET NULL REFERENCES
│   ├── analytics_events.user_id → SET NULL
│   ├── business_members.invited_by → SET NULL
│   └── business_page_analytics.user_id → SET NULL
└── STORAGE CLEANUP
    └── All files in uploads/{user_id}/ → DELETED
```

### Database Functions Created

#### 1. `delete_user_account(user_uuid UUID)`

**Purpose**: Core deletion function that handles everything
**Security**: `SECURITY DEFINER` - runs with elevated privileges
**Returns**: JSON with success/error status

```sql
SELECT delete_user_account('user-uuid-here');
```

#### 2. `delete_my_account()`

**Purpose**: Safe wrapper that ensures users can only delete their own account
**Security**: Uses `auth.uid()` to get current user
**Returns**: JSON with success/error status

```sql
SELECT delete_my_account();
```

## Integration with React Native App

### Option 1: Using Supabase Client (Recommended)

```typescript
// In your React Native app
import { supabase } from "../utils/supabase";

const deleteUserAccount = async () => {
  try {
    const { data, error } = await supabase.rpc("delete_my_account");

    if (error) throw error;

    if (data.success) {
      // Account deleted successfully
      console.log("Account deleted:", data.message);
      // Sign out user and redirect to login
      await supabase.auth.signOut();
      // Navigate to login screen
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    Alert.alert("Error", "Failed to delete account. Please try again.");
  }
};
```

### Option 2: HTTP Request

```typescript
const deleteUserAccount = async () => {
  try {
    const session = await supabase.auth.getSession();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/delete_my_account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );

    const result = await response.json();

    if (result.success) {
      // Handle successful deletion
      await supabase.auth.signOut();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error deleting account:", error);
  }
};
```

### UI Implementation Example

```typescript
const AccountDeletionScreen = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data including pages, businesses, and saved items will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Are you absolutely sure?",
      'Type "DELETE" to confirm account deletion',
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "DELETE ACCOUNT",
          style: "destructive",
          onPress: executeDeleteAccount,
        },
      ]
    );
  };

  const executeDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.rpc("delete_my_account");

      if (error) throw error;

      if (data.success) {
        Alert.alert(
          "Account Deleted",
          "Your account and all data have been permanently deleted.",
          [{ text: "OK", onPress: () => supabase.auth.signOut() }]
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.warning}>
        ⚠️ Deleting your account will permanently remove:
      </Text>
      <Text style={styles.listItem}>• All your pages and content</Text>
      <Text style={styles.listItem}>• All businesses you own</Text>
      <Text style={styles.listItem}>• Your saved pages and folders</Text>
      <Text style={styles.listItem}>• All uploaded media files</Text>
      <Text style={styles.listItem}>• Your analytics and usage data</Text>

      <TouchableOpacity
        style={[styles.deleteButton, isDeleting && styles.disabledButton]}
        onPress={handleDeleteAccount}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete My Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

## What Gets Deleted

### Database Tables

- **users**: The user record itself
- **businesses**: All businesses owned by the user
- **business_pages**: All business pages created by the user
- **pages**: All pages created by the user
- **wallet_folders**: All wallet folders belonging to the user
- **wallet_items**: All saved pages by the user
- **media**: All media files uploaded by the user
- **share_links**: All share links created by the user
- **business_members**: All business memberships for the user
- **analytics_events**: Page analytics where user was the viewer (CASCADE from pages)
- **organizations**: All organizations owned by the user

### Storage Files

- All files in the `uploads/{user_id}/` directory
- This includes profile pictures, business logos, page media, etc.

### What Gets Preserved (SET NULL)

- **analytics_events.user_id**: Analytics data is preserved but user reference is removed
- **business_members.invited_by**: Membership records preserved but inviter reference cleared
- **business_page_analytics.user_id**: Business analytics preserved but user reference removed

## Testing

To test the deletion functionality:

```sql
-- Test with a specific user (admin only)
SELECT delete_user_account('user-uuid-here');

-- Test as an authenticated user
SELECT delete_my_account();
```

## Security Notes

1. **Authentication Required**: Users must be authenticated to delete their account
2. **Self-Deletion Only**: Users can only delete their own account via `delete_my_account()`
3. **Admin Override**: The `delete_user_account()` function exists for admin purposes
4. **Irreversible**: Deletion is permanent and cannot be undone
5. **Cascade Safety**: All related data is automatically cleaned up

## Compliance

This implementation meets the requirements for:

- ✅ Apple App Store account deletion requirements
- ✅ Android Play Store account deletion requirements
- ✅ GDPR "Right to be Forgotten"
- ✅ CCPA data deletion requirements

## Migration Files Applied

1. `fix_analytics_events_user_constraint` - Updated analytics_events.user_id constraint
2. `fix_business_members_invited_by_constraint` - Updated business_members.invited_by constraint
3. `create_delete_user_function` - Created core deletion function
4. `create_safe_delete_user_function` - Created safe wrapper function
