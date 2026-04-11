import { OrganizationService } from './organizationService';
import { supabase } from './supabase';

/**
 * Get current seat count for a license (standalone function)
 * Updated to work with RLS by using the team membership function
 */
export async function getLicenseSeatCount(licenseId: string): Promise<{
    currentSeats: number;
    maxSeats: number;
    code: string;
    expiryDate: string | null;
}> {
    try {
        // Get current user to check their memberships
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) {
            throw new Error('User not authenticated');
        }

        // Use the database function to get user's team memberships
        const { data: memberships, error } = await supabase
            .rpc('get_user_team_memberships', { p_user_id: user.user.id });

        if (error) {
            console.error('Error getting team memberships:', error);
            throw new Error('Failed to get license information');
        }

        // Find the specific license
        const licenseData = memberships?.find((m: any) => m.license_id === licenseId);
        if (!licenseData) {
            throw new Error('License not found or user does not have access');
        }

        // Count active memberships for this license
        const { count: currentSeats, error: countError } = await supabase
            .from('license_membership')
            .select('*', { count: 'exact', head: true })
            .eq('license_id', licenseId)
            .eq('is_active', true);

        if (countError) {
            throw new Error('Failed to count seats');
        }

        console.log(`📊 License ${licenseData.license_code}: ${currentSeats}/${licenseData.license_max_seats} seats`);

        return {
            currentSeats: currentSeats || 0,
            maxSeats: licenseData.license_max_seats,
            code: licenseData.license_code,
            expiryDate: licenseData.license_expiry_date
        };
    } catch (error) {
        console.error('Error getting license seat count:', error);
        throw error;
    }
}

export class LicenseService {

    /**
     * Redeem a license code for the current user using Edge Function
     * This bypasses RLS issues by using service role privileges in the Edge Function
     */
    static async redeemLicenseCode(code: string): Promise<{
        success: boolean;
        message: string;
        licenseInfo?: {
            maxSeats: number;
            expiryDate: string | null;
        };
    }> {
        try {
            console.log(`🎫 Attempting to redeem license code: ${code}`);

            // Use Supabase's built-in function invocation
            const { data, error } = await supabase.functions.invoke('redeem-license', {
                body: {
                    licenseCode: code
                }
            });

            if (error) {
                console.error('Edge Function error:', error);
                return {
                    success: false,
                    message: error.message || 'Failed to redeem license code'
                };
            }

            console.log('✅ License redemption successful via Edge Function');
            return data;

        } catch (error) {
            console.error('License redemption error:', error);
            return {
                success: false,
                message: 'Network error - please check your connection and try again'
            };
        }
    }

    /**
     * Get current user's license membership info using new organization system
     */
    static async getUserLicenseInfo(): Promise<{
        hasLicense: boolean;
        licenseCode?: string;
        maxSeats?: number;
        currentSeats?: number;
        expiryDate?: string;
        isActive?: boolean;
    }> {
        try {
            const teamAccess = await OrganizationService.hasProAccessViaTeamMembership();

            if (!teamAccess.hasAccess) {
                return { hasLicense: false };
            }

            return {
                hasLicense: true,
                licenseCode: teamAccess.licenseCode,
                maxSeats: teamAccess.maxSeats,
                currentSeats: teamAccess.currentSeats,
                expiryDate: teamAccess.expiresAt,
                isActive: true
            };
        } catch (error) {
            console.error('Error getting license info:', error);
            return { hasLicense: false };
        }
    }

    /**
     * Leave a license (for users who want to switch to individual subscription)
     * 
     * IMPORTANT: This DELETES the license_membership record to free up the seat for others.
     * After calling this, UI components should:
     * 1. Use SubscriptionService.leaveLicenseAndRefresh() for automatic UI handling
     * 2. Or manually navigate to plans page after successful leave
     * 
     * @returns Promise with success status and message
     */
    static async leaveLicense(): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user?.id) {
                return {
                    success: false,
                    message: 'User not authenticated'
                };
            }

            // DELETE license membership to free up the seat for others
            const { error: membershipError } = await supabase
                .from('license_membership')
                .delete()
                .eq('user_id', user.user.id); // Simple: delete user's membership, period

            if (membershipError) {
                console.error('Error leaving license:', membershipError);
                return {
                    success: false,
                    message: 'Error leaving license'
                };
            }

            console.log('✅ User left license successfully - seat freed up for others');

            // Refresh subscription status to update Pro access using the convenient method
            const { SubscriptionService } = await import('./subscriptionService');
            await SubscriptionService.handleLicenseChange('left');

            return {
                success: true,
                message: 'You have successfully left the license group. The seat is now available for others.'
            };
        } catch (error) {
            console.error('Leave license error:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    }
} 