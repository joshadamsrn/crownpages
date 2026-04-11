import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify the user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = user.id;
        const userEmail = user.email;

        // Additional security: Get the request body to verify email match
        const body = await request.json().catch(() => ({}));

        // Verify the email in the request matches the authenticated user's email
        // This prevents any potential token hijacking or session manipulation
        if (body.email && body.email !== userEmail) {
            return NextResponse.json(
                { error: 'Unauthorized: Email mismatch' },
                { status: 403 }
            );
        }

        // Verify this is specifically a delete account request and not accidental
        if (body.confirmAction !== 'DELETE_ACCOUNT') {
            return NextResponse.json(
                { error: 'Invalid deletion request' },
                { status: 400 }
            );
        }

        // Start a transaction-like approach by deleting data in dependency order
        // Note: Supabase doesn't support transactions, so we handle cascading deletes manually

        console.log(`Starting account deletion for user: ${userId}`);

        // 1. Delete analytics events (no dependencies)
        await supabase
            .from('analytics_events')
            .delete()
            .eq('user_id', userId);

        await supabase
            .from('business_page_analytics')
            .delete()
            .eq('user_id', userId);

        // 2. Delete wallet items and folders
        await supabase
            .from('wallet_items')
            .delete()
            .eq('user_id', userId);

        await supabase
            .from('wallet_folders')
            .delete()
            .eq('user_id', userId);

        // 3. Delete share links created by user
        await supabase
            .from('share_links')
            .delete()
            .eq('created_by', userId);

        // 4. Delete media uploaded by user
        await supabase
            .from('media')
            .delete()
            .eq('uploaded_by', userId);

        // 5. Handle business memberships - remove user from businesses they're a member of
        await supabase
            .from('business_members')
            .delete()
            .eq('user_id', userId);

        // Also remove memberships where user was the inviter
        await supabase
            .from('business_members')
            .delete()
            .eq('invited_by', userId);

        // 6. Delete pages created by user (this will cascade to related analytics)
        await supabase
            .from('pages')
            .delete()
            .eq('created_by', userId);

        // 7. Delete business pages created by user
        await supabase
            .from('business_pages')
            .delete()
            .eq('created_by', userId);

        // 8. Handle businesses owned by user
        // First, check if user owns any businesses
        const { data: ownedBusinesses } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', userId);

        if (ownedBusinesses && ownedBusinesses.length > 0) {
            for (const business of ownedBusinesses) {
                // Delete all business-related data
                // Note: This will make the business inaccessible to members

                // Delete business page analytics
                await supabase
                    .from('business_page_analytics')
                    .delete()
                    .eq('business_id', business.id);

                // Delete business pages
                await supabase
                    .from('business_pages')
                    .delete()
                    .eq('business_id', business.id);

                // Delete pages belonging to this business
                await supabase
                    .from('pages')
                    .delete()
                    .eq('business_id', business.id);

                // Delete media for this business
                await supabase
                    .from('media')
                    .delete()
                    .eq('business_id', business.id);

                // Delete business members
                await supabase
                    .from('business_members')
                    .delete()
                    .eq('business_id', business.id);
            }

            // Finally delete the businesses themselves
            await supabase
                .from('businesses')
                .delete()
                .eq('owner_id', userId);
        }

        // 9. Handle organizations owned by user
        const { data: ownedOrganizations } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', userId);

        if (ownedOrganizations && ownedOrganizations.length > 0) {
            // Delete organizations owned by user
            // Note: This will affect other users who are members of these organizations
            await supabase
                .from('organizations')
                .delete()
                .eq('owner_id', userId);
        }

        // 10. Finally, delete the user record itself
        const { error: userDeleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (userDeleteError) {
            console.error('Error deleting user record:', userDeleteError);
            throw new Error('Failed to delete user record');
        }

        // 11. Delete the authentication user
        // Note: This should be done last as it will invalidate the session
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error('Error deleting auth user:', authDeleteError);
            // Continue anyway as the user data has been deleted
        }

        console.log(`Account deletion completed for user: ${userId}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Account successfully deleted'
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Account deletion error:', error);

        return NextResponse.json(
            {
                error: 'Failed to delete account. Please try again or contact support.'
            },
            { status: 500 }
        );
    }
} 