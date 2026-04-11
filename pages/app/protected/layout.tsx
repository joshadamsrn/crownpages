import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Home,
  CreditCard,
  Users,
  FileEdit,
  Settings,
  Building2,
  Crown
} from "lucide-react";
import { getUserOrganizationStatus } from "@/lib/organization-utils";

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
  const { isOrgOwner, isTeamMember } = await getUserOrganizationStatus(user.id, supabase);

  return (
    <main className="min-h-screen flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-background border-r border-border">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Crown className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Crown Pages</span>
          </div>

          <nav className="flex flex-col gap-1">
            <Link
              href="/protected"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>

            {!isOrgOwner && (
              <Link
                href="/protected/upgrade"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200"
              >
                <Building2 className="h-4 w-4" />
                Upgrade to Organization
              </Link>
            )}

            {(isOrgOwner || isTeamMember) && (
              <Link
                href="/protected/licenses"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent"
              >
                <Crown className="h-4 w-4" />
                License Management
              </Link>
            )}

            <Link
              href="/protected/pages"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent"
            >
              <FileEdit className="h-4 w-4" />
              My Pages
            </Link>

            <Link
              href="/protected/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            {userProfile?.admin && (
              <Link
                href="/protected/admin/generate-license"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent text-green-700 border border-green-200 bg-green-50"
              >
                <Crown className="h-4 w-4" />
                Generate Team Code
              </Link>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome{userProfile?.first_name ? `, ${userProfile.first_name}` : ""}!
              </h1>
              {isOrgOwner && (
                <p className="text-muted-foreground">Organization Owner</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <AuthButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </main>
  );
}
