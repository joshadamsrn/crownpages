import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon, CreditCard, Users, FileEdit, Building2, Crown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getUserOrganizationStatus } from "@/lib/organization-utils";

interface License {
  id: string;
  code: string;
  max_seats: number;
  is_active: boolean;
  created_at: string;
  stripe_subscription_id: string | null;
  plans_pricing: Array<{
    base_price: number;
    interval_type: string;
    currency: string;
  }> | null;
}

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  // Get user profile (minimal data)
  const { data: userProfile } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", data.user.id)
    .single();

  // Use centralized organization status check with server client
  const {
    isOrgOwner,
    isTeamMember,
    organizationData,
    ownedOrgs,
    teamMemberships
  } = await getUserOrganizationStatus(data.user.id, supabase);

  // Get licenses if user is organization owner
  let licenses: License[] = [];
  if (isOrgOwner) {
    const { data: licenseData } = await supabase
      .from("license")
      .select(`
        id, 
        code, 
        max_seats, 
        is_active, 
        created_at,
        stripe_subscription_id,
        plans_pricing (
          base_price,
          interval_type,
          currency
        )
      `)
      .eq("purchased_by", data.user.id)
      .eq("is_active", true);
    licenses = licenseData || [];
  }

  // Get user's pages count
  const { count: pagesCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("created_by", data.user.id);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {isOrgOwner && "Manage your organization, licenses, and team."}
          {isTeamMember && "Access your organization's resources and create pages."}
          {!isOrgOwner && !isTeamMember && "Welcome to Crown Pages! Start creating dynamic pages or upgrade to an organization account."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Created</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Dynamic pages you&apos;ve created
            </p>
          </CardContent>
        </Card>

        {isOrgOwner && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{licenses.length}</div>
                <p className="text-xs text-muted-foreground">
                  Current organization licenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Seats</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {licenses.reduce((sum, license) => sum + license.max_seats, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available team member seats
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organization</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizationData?.name?.substring(0, 10)}
                  {organizationData?.name && organizationData.name.length > 10 ? "..." : ""}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your organization
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {(isTeamMember || !isOrgOwner) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Type</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isTeamMember ? "Team Member" : "Individual"}
              </div>
              <p className="text-xs text-muted-foreground">
                {isTeamMember && organizationData?.name}
                {!isOrgOwner && "Personal account"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/protected/pages"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileEdit className="h-4 w-4" />
                <span>Create New Page</span>
              </div>
              <span className="text-sm text-muted-foreground">→</span>
            </Link>

            {!isOrgOwner && (
              <Link
                href="/protected/upgrade"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors border-primary/20 bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-primary">Upgrade to Organization</span>
                </div>
                <span className="text-sm text-primary">→</span>
              </Link>
            )}

            {isOrgOwner && (
              <>
                <Link
                  href="/protected/licenses"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="h-4 w-4" />
                    <span>Organization Management</span>
                  </div>
                  <span className="text-sm text-muted-foreground">→</span>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity or Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>
              {organizationData ? "Organization Info" : "Account Info"}
            </CardTitle>
            <CardDescription>
              {organizationData ? "Your organization details" : "Your account information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizationData ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Organization Name</p>
                  <p className="text-sm text-muted-foreground">{organizationData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Email</p>
                  <p className="text-sm text-muted-foreground">{organizationData.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Your Role</p>
                  <p className="text-sm text-muted-foreground">
                    {isOrgOwner ? "Organization Owner" : "Team Member"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{data.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Account Type</p>
                  <p className="text-sm text-muted-foreground">Individual</p>
                </div>
                <div className="bg-accent/50 p-3 rounded-lg">
                  <p className="text-sm">
                    <InfoIcon className="inline h-4 w-4 mr-1" />
                    Upgrade to an organization account to manage team licenses and collaborate with others.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* License Overview for Organization Owners */}
      {isOrgOwner && licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Licenses</CardTitle>
            <CardDescription>
              Your organization&apos;s active licenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {licenses.slice(0, 3).map((license) => (
                <div key={license.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">License Code: {license.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {license.max_seats} seats • Created {new Date(license.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${license.plans_pricing?.[0]?.base_price?.toFixed(2) || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {license.plans_pricing?.[0]?.interval_type || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
              {licenses.length > 3 && (
                <Link
                  href="/protected/licenses"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  View all {licenses.length} licenses →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
