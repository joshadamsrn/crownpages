import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Shield, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        redirect("/auth/login");
    }

    // Fetch user data
    const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", data.user.id)
        .single();

    if (profileError) {
        console.error("Error fetching user profile:", profileError);
    }

    // Check if user owns any organizations
    const { data: ownedOrgs } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", data.user.id)
        .eq("is_active", true);

    const isOrgOwner = ownedOrgs && ownedOrgs.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Account Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Account Information
                        </CardTitle>
                        <CardDescription>
                            Your basic account details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">Name</p>
                            <p className="text-sm text-muted-foreground">
                                {userProfile?.first_name && userProfile?.last_name
                                    ? `${userProfile.first_name} ${userProfile.last_name}`
                                    : "Not set"
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">{data.user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Account Type</p>
                            <p className="text-sm text-muted-foreground">
                                Individual
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Account ID</p>
                            <p className="text-sm text-muted-foreground font-mono text-xs">
                                {data.user.id}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security
                        </CardTitle>
                        <CardDescription>
                            Manage your password and security settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Password</p>
                            <p className="text-sm text-muted-foreground">
                                Last updated: {new Date(data.user.updated_at || data.user.created_at).toLocaleDateString()}
                            </p>
                            <Link href="/auth/update-password">
                                <Button variant="outline" size="sm">
                                    Change Password
                                </Button>
                            </Link>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">
                                Not enabled
                            </p>
                            <Button variant="outline" size="sm" disabled>
                                Enable 2FA (Coming Soon)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Organization Settings (if applicable) */}
                {isOrgOwner && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Organization Settings
                            </CardTitle>
                            <CardDescription>
                                Manage your organization settings and preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Link href="/protected/licenses" className="block">
                                    <div className="p-4 border rounded-lg hover:bg-accent transition-colors">
                                        <h3 className="font-medium">Organization Management</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Manage licenses, team members, subscriptions, and billing
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Danger Zone */}
                <Card className="md:col-span-2 border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible and destructive actions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
                                <div>
                                    <h3 className="font-medium text-red-800">Delete Account</h3>
                                    <p className="text-sm text-red-600">
                                        Permanently delete your account and all associated data. This action cannot be undone.
                                    </p>
                                </div>
                                <Link href="/auth/delete-account">
                                    <Button variant="destructive" size="sm">
                                        Delete Account
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 