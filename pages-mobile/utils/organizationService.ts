import { supabase } from './supabase';

// Types for organization data
export interface OrganizationInfo {
    id: string;
    name: string;
    email: string;
}

export interface TeamMembership {
    id: string;
    is_active: boolean;
    license: {
        id: string;
        code: string;
        purchased_by: string;
        is_active: boolean;
        expiry_date: string | null;
        max_seats: number;
        users: {
            first_name: string | null;
            last_name: string | null;
            email: string;
        };
    };
}

export interface UserOrganizationStatus {
    isOrgOwner: boolean;
    isTeamMember: boolean;
    ownedOrgs: OrganizationInfo[];
    teamMemberships: TeamMembership[];
    organizationData: OrganizationInfo | null;
}

// Internal type for raw license membership data from Supabase
interface RawLicenseMembership {
    id: string;
    is_active: boolean;
    license: {
        id: string;
        code: string;
        purchased_by: string;
        is_active: boolean;
        expiry_date: string | null;
        max_seats: number;
        users: {
            first_name: string | null;
            last_name: string | null;
            email: string;
        };
    } | null;
}

/**
 * Check if a user owns any organizations
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function checkOrganizationOwnership(
    userId: string,
    supabaseClient: any = supabase
): Promise<{ isOwner: boolean; ownedOrgs: OrganizationInfo[] }> {
    try {
        console.log('Checking organization ownership for user:', userId);

        const { data: ownedOrgs, error } = await supabaseClient
            .from("organizations")
            .select("id, name, email")
            .eq("owner_id", userId)
            .eq("is_active", true);

        if (error) {
            console.error("Error checking organization ownership:", {
                error,
                userId,
                code: error.code,
                message: error.message,
                details: error.details
            });
            return { isOwner: false, ownedOrgs: [] };
        }

        console.log('Organization ownership check result:', {
            userId,
            count: ownedOrgs?.length || 0,
            isOwner: ownedOrgs && ownedOrgs.length > 0
        });

        return {
            isOwner: ownedOrgs && ownedOrgs.length > 0,
            ownedOrgs: ownedOrgs || []
        };
    } catch (error) {
        console.error("Exception checking organization ownership:", {
            error,
            userId,
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        return { isOwner: false, ownedOrgs: [] };
    }
}

/**
 * Check if a user is a team member via license_membership with parent license active status
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function checkTeamMembership(
    userId: string,
    supabaseClient: any = supabase
): Promise<{ isMember: boolean; teamMemberships: TeamMembership[] }> {
    try {
        console.log('Checking team membership for user:', userId);

        // Use the database function to get team memberships (bypasses RLS issues)
        const { data: teamMemberships, error } = await supabaseClient
            .rpc('get_user_team_memberships', { p_user_id: userId });

        console.log('Raw team memberships data from function:', teamMemberships);
        console.log('Team memberships error:', error);

        if (error) {
            console.error("Error checking team membership:", {
                error,
                userId,
                code: error.code,
                message: error.message,
                details: error.details
            });
            // Return graceful fallback instead of failing
            return { isMember: false, teamMemberships: [] };
        }

        // Transform the function results to match our interface
        const transformedMemberships: TeamMembership[] = (teamMemberships || [])
            .filter((membership: any) => membership.license_is_active) // Only active licenses
            .map((membership: any) => ({
                id: membership.membership_id,
                is_active: membership.membership_is_active,
                license: {
                    id: membership.license_id,
                    code: membership.license_code,
                    purchased_by: membership.license_purchased_by,
                    is_active: membership.license_is_active,
                    expiry_date: membership.license_expiry_date,
                    max_seats: membership.license_max_seats,
                    users: {
                        first_name: membership.purchaser_first_name,
                        last_name: membership.purchaser_last_name,
                        email: membership.purchaser_email
                    }
                }
            }));

        console.log('Team membership check result:', {
            userId,
            totalMemberships: teamMemberships?.length || 0,
            activeMemberships: transformedMemberships.length,
            isMember: transformedMemberships.length > 0
        });

        return {
            isMember: transformedMemberships.length > 0,
            teamMemberships: transformedMemberships
        };
    } catch (error) {
        console.error("Exception checking team membership:", {
            error,
            userId,
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        // Graceful fallback - assume no team memberships rather than breaking the app
        return { isMember: false, teamMemberships: [] };
    }
}

/**
 * Get complete organization status for a user (combines ownership and membership checks)
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function getUserOrganizationStatus(
    userId: string,
    supabaseClient: any = supabase
): Promise<UserOrganizationStatus> {
    // Run both checks in parallel
    const [ownershipResult, membershipResult] = await Promise.all([
        checkOrganizationOwnership(userId, supabaseClient),
        checkTeamMembership(userId, supabaseClient)
    ]);

    // Determine organization data to display
    let organizationData: OrganizationInfo | null = null;
    if (ownershipResult.isOwner && ownershipResult.ownedOrgs[0]) {
        organizationData = ownershipResult.ownedOrgs[0];
    }

    return {
        isOrgOwner: ownershipResult.isOwner,
        isTeamMember: membershipResult.isMember,
        ownedOrgs: ownershipResult.ownedOrgs,
        teamMemberships: membershipResult.teamMemberships,
        organizationData
    };
}

/**
 * Check if user can manage licenses (must be organization owner)
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function canManageLicenses(
    userId: string,
    supabaseClient: any = supabase
): Promise<boolean> {
    const { isOwner } = await checkOrganizationOwnership(userId, supabaseClient);
    return isOwner;
}

/**
 * Validate that a user can upgrade to organization (doesn't already own one)
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function canUpgradeToOrganization(
    userId: string,
    supabaseClient: any = supabase
): Promise<{ canUpgrade: boolean; reason?: string }> {
    const { isOwner, ownedOrgs } = await checkOrganizationOwnership(userId, supabaseClient);

    if (isOwner) {
        return {
            canUpgrade: false,
            reason: `You already own an organization: ${ownedOrgs[0]?.name}`
        };
    }

    return { canUpgrade: true };
}

/**
 * Check if user has Pro access via team membership (checks parent license active status)
 * @param userId - The user ID to check
 * @param supabaseClient - Supabase client (optional - will use default if not provided)
 */
export async function hasProAccessViaTeamMembership(
    userId: string,
    supabaseClient: any = supabase
): Promise<{
    hasAccess: boolean;
    expiresAt?: string;
    licenseCode?: string;
    maxSeats?: number;
    currentSeats?: number;
}> {
    try {
        const { isMember, teamMemberships } = await checkTeamMembership(userId, supabaseClient);

        if (!isMember || teamMemberships.length === 0) {
            return { hasAccess: false };
        }

        // Use the first active membership
        const activeMembership = teamMemberships[0];
        const license = activeMembership.license;

        // Check if license has expired
        const isExpired = license.expiry_date && new Date(license.expiry_date) < new Date();

        if (isExpired) {
            return { hasAccess: false };
        }

        // Get current seat count for this license using the license ID
        const { count: currentSeats } = await supabaseClient
            .from('license_membership')
            .select('*', { count: 'exact', head: true })
            .eq('license_id', license.id)
            .eq('is_active', true);

        return {
            hasAccess: true,
            expiresAt: license.expiry_date || undefined,
            licenseCode: license.code,
            maxSeats: license.max_seats,
            currentSeats: currentSeats || 0
        };
    } catch (error) {
        console.error('Error checking Pro access via team membership:', error);
        return { hasAccess: false };
    }
}

export class OrganizationService {
    /**
     * Get organization status for current authenticated user
     */
    static async getCurrentUserOrganizationStatus(): Promise<UserOrganizationStatus> {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) {
            return {
                isOrgOwner: false,
                isTeamMember: false,
                ownedOrgs: [],
                teamMemberships: [],
                organizationData: null
            };
        }

        return getUserOrganizationStatus(user.user.id);
    }

    /**
     * Check if current user has Pro access via team membership
     */
    static async hasProAccessViaTeamMembership(): Promise<{
        hasAccess: boolean;
        expiresAt?: string;
        licenseCode?: string;
        maxSeats?: number;
        currentSeats?: number;
    }> {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) {
            return { hasAccess: false };
        }

        return hasProAccessViaTeamMembership(user.user.id);
    }

    /**
     * Check if current user can manage licenses
     */
    static async canManageLicenses(): Promise<boolean> {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) {
            return false;
        }

        return canManageLicenses(user.user.id);
    }
} 