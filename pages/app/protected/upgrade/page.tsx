"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Crown, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { canUpgradeToOrganization } from "@/lib/organization-utils";

export default function UpgradePage() {
    const [orgName, setOrgName] = useState("");
    const [orgEmail, setOrgEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"info" | "upgrade" | "success">("info");
    const router = useRouter();

    const handleUpgrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const supabase = createClient();

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Check if user can upgrade (centralized logic)
            const { canUpgrade, reason } = await canUpgradeToOrganization(user.id, supabase);

            if (!canUpgrade) {
                throw new Error(reason || "Cannot upgrade to organization");
            }

            // Create organization
            const { data: orgData, error: orgError } = await supabase
                .from("organizations")
                .insert([
                    {
                        name: orgName,
                        email: orgEmail || user.email,
                        owner_id: user.id,
                        is_active: true,
                    },
                ])
                .select()
                .single();

            if (orgError) {
                console.error("Organization creation error:", orgError);
                throw new Error(`Failed to create organization: ${orgError.message}`);
            }

            setStep("success");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === "success") {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Upgrade Complete!</h1>
                                <p className="text-muted-foreground">
                                    Your account has been successfully upgraded to an organization account.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Button onClick={() => window.location.href = "/protected"} className="w-full">
                                    Go to Dashboard
                                </Button>
                                <Button onClick={() => window.location.href = "/protected/licenses"} variant="outline" className="w-full">
                                    Buy Licenses
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upgrade to Organization</h1>
                    <p className="text-muted-foreground">
                        Transform your individual account into an organization account
                    </p>
                </div>
            </div>

            {step === "info" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-primary" />
                                Organization Benefits
                            </CardTitle>
                            <CardDescription>
                                Unlock powerful features for team collaboration
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Team License Management</p>
                                            <p className="text-sm text-muted-foreground">
                                                Purchase and manage licenses for your team members
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Scalable Pricing</p>
                                            <p className="text-sm text-muted-foreground">
                                                Seat-based pricing that grows with your organization
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Team Collaboration</p>
                                            <p className="text-sm text-muted-foreground">
                                                Share license codes with team members
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Advanced Analytics</p>
                                            <p className="text-sm text-muted-foreground">
                                                Monitor team usage and page performance
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Subscription Management</p>
                                            <p className="text-sm text-muted-foreground">
                                                Manage renewals, cancellations, and billing
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Priority Support</p>
                                            <p className="text-sm text-muted-foreground">
                                                Get dedicated support for your organization
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>What happens when you upgrade?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                        1
                                    </div>
                                    <p>Your account type changes from &quot;Individual&quot; to &quot;Organization Owner&quot;</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                        2
                                    </div>
                                    <p>You gain access to license management and team features</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                        3
                                    </div>
                                    <p>You can purchase team licenses and invite members</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                        4
                                    </div>
                                    <p>All your existing pages remain unchanged</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={() => setStep("upgrade")} size="lg">
                            <Building2 className="h-4 w-4 mr-2" />
                            Start Upgrade Process
                        </Button>
                    </div>
                </div>
            )}

            {step === "upgrade" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Details</CardTitle>
                        <CardDescription>
                            Provide your organization information to complete the upgrade
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpgrade} className="space-y-4">
                            <div>
                                <Label htmlFor="orgName">Organization Name *</Label>
                                <Input
                                    id="orgName"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="Acme Inc."
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="orgEmail">Organization Email (optional)</Label>
                                <Input
                                    id="orgEmail"
                                    type="email"
                                    value={orgEmail}
                                    onChange={(e) => setOrgEmail(e.target.value)}
                                    placeholder="contact@acme.com (defaults to your email)"
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    If not provided, your current email will be used
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep("info")}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button type="submit" disabled={isLoading || !orgName} className="flex-1">
                                    {isLoading ? "Upgrading..." : "Complete Upgrade"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 