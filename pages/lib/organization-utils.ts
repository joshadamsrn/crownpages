import { createClient } from '@/lib/supabase/client';

const CROWN_ADMIN_EMAILS = new Set([
    "jkuya@hotmail.com",
    "afrasure74@gmail.com",
    "frasurekenny@yahoo.com",
    "parkerfrasure@gmail.com",
    "utahdavebrown@gmail.com",
    "frasurepaxton@gmail.com",
]);

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
        code: string;
        purchased_by: string;
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

/**
 * Check if a user owns any organizations
 * @param userId - The user ID to check
 * @param supabase - Supabase client (required - pass the appropriate client for your context)
 */
export async function checkOrganizationOwnership(
    userId: string,
    supabase: any
): Promise<{ isOwner: boolean; ownedOrgs: OrganizationInfo[] }> {
    try {
        console.log('Checking organization ownership for user:', userId);

        const { data: ownedOrgs, error } = await supabase
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
 * Check if a user is a team member via license_membership
 * @param userId - The user ID to check
 * @param supabase - Supabase client (required - pass the appropriate client for your context)
 */
export async function checkTeamMembership(
    userId: string,
    supabase: any
): Promise<{ isMember: boolean; teamMemberships: TeamMembership[] }> {
    try {
        console.log('Checking team membership for user:', userId);

        // Simplified query to avoid complex joins that might cause RLS issues
        const { data: teamMemberships, error } = await supabase
            .from("license_membership")
            .select("id, is_active")
            .eq("user_id", userId)
            .eq("is_active", true);

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

        console.log('Team membership check result:', {
            userId,
            count: teamMemberships?.length || 0,
            isMember: teamMemberships && teamMemberships.length > 0
        });

        return {
            isMember: teamMemberships && teamMemberships.length > 0,
            teamMemberships: teamMemberships || []
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
 * @param supabase - Supabase client (required - pass the appropriate client for your context)
 */
export async function getUserOrganizationStatus(
    userId: string,
    supabase: any
): Promise<UserOrganizationStatus> {
    // Run both checks in parallel
    const [ownershipResult, membershipResult] = await Promise.all([
        checkOrganizationOwnership(userId, supabase),
        checkTeamMembership(userId, supabase)
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
 * @param supabase - Supabase client (required - pass the appropriate client for your context)
 */
export async function canManageLicenses(
    userId: string,
    supabase: any
): Promise<boolean> {
    const { isOwner } = await checkOrganizationOwnership(userId, supabase);
    return isOwner;
}

/**
 * Validate that a user can upgrade to organization (doesn't already own one)
 * @param userId - The user ID to check
 * @param supabase - Supabase client (required - pass the appropriate client for your context)
 */
export async function canUpgradeToOrganization(
    userId: string,
    supabase: any
): Promise<{ canUpgrade: boolean; reason?: string }> {
    const { isOwner, ownedOrgs } = await checkOrganizationOwnership(userId, supabase);

    if (isOwner) {
        return {
            canUpgrade: false,
            reason: `You already own an organization: ${ownedOrgs[0]?.name}`
        };
    }

    return { canUpgrade: true };
}

// Client-side convenience functions that create their own client
// Use these when calling from client components

/**
 * Client-side version - creates its own client automatically
 * @param userId - The user ID to check
 */
export async function getUserOrganizationStatusClient(
    userId: string
): Promise<UserOrganizationStatus> {
    const supabase = createClient();
    return getUserOrganizationStatus(userId, supabase);
}

/**
 * Client-side version - creates its own client automatically
 * @param userId - The user ID to check
 */
export async function canManageLicensesClient(
    userId: string
): Promise<boolean> {
    const supabase = createClient();
    return canManageLicenses(userId, supabase);
}

export function isCrownAdminEmail(email: string | null | undefined): boolean {
    return Boolean(email && CROWN_ADMIN_EMAILS.has(email.trim().toLowerCase()));
}

export async function hasCrownAdminAccess(
    userId: string,
    supabase: any
): Promise<boolean> {
    const { data: userProfile } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

    return isCrownAdminEmail(userProfile?.email);
}

/**
 * Check if a user belongs to the TEAMCROWNPAGE organization.
 * This is used to gate internal-only tools in both web and mobile surfaces.
 */
export async function isTeamCrownPageMember(
    userId: string,
    supabase: any
): Promise<boolean> {
    const [{ data: userProfile }, organizationStatus] = await Promise.all([
        supabase
            .from("users")
            .select("organization_id")
            .eq("id", userId)
            .single(),
        getUserOrganizationStatus(userId, supabase),
    ]);

    if (userProfile?.organization_id) {
        const { data: organization } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", userProfile.organization_id)
            .single();

        if (organization?.name?.trim().toUpperCase() === "TEAMCROWNPAGE") {
            return true;
        }
    }

    return organizationStatus.ownedOrgs.some(
        (organization) => organization.name?.trim().toUpperCase() === "TEAMCROWNPAGE",
    );
}
