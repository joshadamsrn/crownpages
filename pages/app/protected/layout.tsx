import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserOrganizationStatus, hasCrownAdminAccess } from "@/lib/organization-utils";
import { ProtectedShell } from "@/components/protected-shell";
import { UserActivityTracker } from "@/components/user-activity-tracker";
import { getCurrentWhiteLabelTenant } from "@/lib/white-label-tenants";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get minimal user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("first_name, last_name, admin")
    .eq("id", user.id)
    .single();

  // Use centralized organization status check with server client
  const [{ isOrgOwner, isTeamMember }, canManageCustomers] = await Promise.all([
    getUserOrganizationStatus(user.id, supabase),
    hasCrownAdminAccess(user.id, supabase),
  ]);
  const tenant = await getCurrentWhiteLabelTenant();
  const displayName = [userProfile?.first_name, userProfile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <ProtectedShell
      firstName={userProfile?.first_name ?? null}
      isOrgOwner={isOrgOwner}
      isTeamMember={isTeamMember}
      isAdmin={Boolean(userProfile?.admin)}
      canManageCustomers={canManageCustomers}
      brandName={tenant.id === "crownpages" ? "Crown Pages" : tenant.shortName}
      logoUrl={tenant.logoUrl}
      isWhiteLabel={tenant.id !== "crownpages"}
      headerActions={
        <>
          {tenant.id !== "crownpages" ? <ThemeSwitcher /> : null}
          <AuthButton displayName={displayName || null} />
        </>
      }
    >
      <UserActivityTracker />
      {children}
    </ProtectedShell>
  );
}
