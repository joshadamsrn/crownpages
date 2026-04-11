"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { LicenseSuccessModal } from "@/components/license-success-modal";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    CreditCard,
    Users,
    Calendar,
    MoreVertical,
    Plus,
    ExternalLink,
    Copy,
    Check,
    AlertTriangle,
    RefreshCw,
    UserX,
    UserCheck,
    Settings,
    DollarSign,
    XCircle,
    PlayCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { canManageLicenses } from "@/lib/organization-utils";

interface License {
    id: string;
    code: string;
    max_seats: number;
    is_active: boolean;
    created_at: string;
    expiry_date: string | null;
    stripe_subscription_id: string | null;
    deactivation_reason: string | null;
    plans_pricing: {
        base_price: number;
        interval_type: string;
        currency: string;
        description: string | null;
    } | null;
    license_membership: Array<{
        id: string;
        user_id: string;
        joined_at: string;
        is_active: boolean;
        users: {
            email: string;
        } | null;
    }>;
}

interface SubscriptionData {
    id: string;
    status: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
    items: {
        data: Array<{
            price: {
                unit_amount: number;
                currency: string;
                recurring: {
                    interval: string;
                };
            };
        }>;
    };
}

export default function LicensesPage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [subscriptions, setSubscriptions] = useState<Record<string, SubscriptionData>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successLicenseCode, setSuccessLicenseCode] = useState<string>("");

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        fetchLicenses();

        // Check for success parameters from payment
        const success = searchParams.get('success');
        const licenseCode = searchParams.get('license_code');

        if (success === 'true' && licenseCode) {
            setSuccessLicenseCode(licenseCode);
            setShowSuccessModal(true);
            // Clean up the URL
            router.replace('/protected/licenses', { scroll: false });
        }
    }, [searchParams, router]);

    const fetchLicenses = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            console.log('Fetching licenses for user:', user.id);

            // Check if user can manage licenses (centralized logic)
            console.log('Checking if user can manage licenses...');
            const canManage = await canManageLicenses(user.id, supabase);
            console.log('Can manage licenses result:', canManage);

            if (!canManage) {
                throw new Error("Only organization owners can manage licenses");
            }

            console.log('Querying licenses...');
            const { data, error } = await supabase
                .from("license")
                .select(`
          *,
          plans_pricing (
            base_price,
            interval_type,
            currency,
            description
          )
        `)
                .eq("purchased_by", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error('License query error:', {
                    error,
                    code: error.code,
                    message: error.message,
                    details: error.details
                });
                throw error;
            }

            console.log('Licenses fetched successfully:', data?.length || 0, 'licenses');

            // Fetch member emails for each license using safe function
            const licensesWithMembers = await Promise.all(
                (data || []).map(async (license) => {
                    try {
                        const { data: memberData, error: memberError } = await supabase
                            .rpc('get_license_members_safe', { p_license_id: license.id });

                        if (memberError) {
                            console.error('Error fetching members for license:', license.id, memberError);
                        }

                        // Transform to match expected structure
                        const license_membership = (memberData || []).map((member: any) => ({
                            id: member.membership_id,
                            user_id: member.user_id,
                            joined_at: member.joined_at,
                            is_active: member.is_active,
                            users: {
                                email: member.email
                            }
                        }));

                        return {
                            ...license,
                            license_membership
                        };
                    } catch (err) {
                        console.error('Exception fetching members for license:', license.id, err);
                        return {
                            ...license,
                            license_membership: []
                        };
                    }
                })
            );

            setLicenses(licensesWithMembers);

            // Fetch subscription data for each license
            const subscriptionData: Record<string, SubscriptionData> = {};
            for (const license of licensesWithMembers || []) {
                if (license.stripe_subscription_id) {
                    try {
                        const response = await fetch(`/api/stripe/subscription/${license.stripe_subscription_id}`);
                        if (response.ok) {
                            const subscription = await response.json();
                            console.log('Subscription data for license:', license.id, subscription);
                            subscriptionData[license.stripe_subscription_id] = subscription;
                        } else {
                            console.error('Failed to fetch subscription, status:', response.status);
                        }
                    } catch (err) {
                        console.error("Failed to fetch subscription:", err);
                    }
                }
            }
            setSubscriptions(subscriptionData);
        } catch (err: any) {
            console.error("Failed to fetch licenses:", {
                error: err,
                message: err.message,
                stack: err.stack,
                code: err.code,
                details: err.details
            });
            setError(err.message || "Failed to fetch licenses. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyLicenseCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const rotateKey = async (licenseId: string) => {
        setActionLoading(`rotate-${licenseId}`);
        try {
            const supabase = createClient();

            // Generate new license code
            const newCode = Math.random().toString(36).substring(2, 12).toUpperCase();

            const { error } = await supabase
                .from("license")
                .update({ code: newCode })
                .eq("id", licenseId);

            if (error) throw error;

            toast.success(`🔑 License key rotated successfully! New code: ${newCode}`);
            fetchLicenses(); // Refresh data
        } catch (err) {
            toast.error("Failed to rotate key: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const revokeMember = async (membershipId: string, memberEmail: string, userId: string, licenseId: string) => {
        const confirmed = await new Promise<boolean>((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Revoke access for {memberEmail}? This will permanently remove their access and delete their membership record.</span>
                    <div className="flex gap-2">
                        <button
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(true); }}
                        >
                            Revoke
                        </button>
                        <button
                            className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(false); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });
        });

        if (!confirmed) return;

        setActionLoading(`revoke-${membershipId}`);
        try {
            const supabase = createClient();

            // DELETE the membership record entirely (as per user requirement)
            const { error } = await supabase
                .from("license_membership")
                .delete()
                .eq("id", membershipId);

            if (error) throw error;

            toast.success(`✅ Access permanently revoked for ${memberEmail}`);
            fetchLicenses(); // Refresh data
        } catch (err) {
            toast.error("Failed to revoke access: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const restoreMember = async (memberEmail: string, userId: string, licenseId: string) => {
        const confirmed = await new Promise<boolean>((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Restore access for {memberEmail}? This will create a new membership record.</span>
                    <div className="flex gap-2">
                        <button
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(true); }}
                        >
                            Restore
                        </button>
                        <button
                            className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(false); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });
        });

        if (!confirmed) return;

        setActionLoading(`restore-${userId}`);
        try {
            const supabase = createClient();

            // CREATE a new membership record (since old one was deleted)
            const { error } = await supabase
                .from("license_membership")
                .insert({
                    license_id: licenseId,
                    user_id: userId,
                    is_active: true,
                    joined_at: new Date().toISOString()
                });

            if (error) throw error;

            toast.success(`✅ Access restored for ${memberEmail}`);
            fetchLicenses(); // Refresh data
        } catch (err) {
            toast.error("Failed to restore access: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const cancelSubscription = async (subscriptionId: string) => {
        const confirmed = await new Promise<boolean>((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Cancel this subscription? It will remain active until the current billing period ends.</span>
                    <div className="flex gap-2">
                        <button
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(true); }}
                        >
                            Cancel Subscription
                        </button>
                        <button
                            className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(false); }}
                        >
                            Keep Active
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });
        });

        if (!confirmed) return;

        setActionLoading(`cancel-${subscriptionId}`);
        try {
            const response = await fetch(`/api/stripe/subscription/${subscriptionId}/cancel`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error("Failed to cancel subscription");

            toast.success("✅ Subscription canceled. Access will continue until the current billing period ends.");
            fetchLicenses(); // Refresh data
        } catch (err) {
            toast.error("Failed to cancel subscription: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const reactivateSubscription = async (subscriptionId: string) => {
        const confirmed = await new Promise<boolean>((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Reactivate this subscription? Billing will resume.</span>
                    <div className="flex gap-2">
                        <button
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(true); }}
                        >
                            Reactivate
                        </button>
                        <button
                            className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                            onClick={() => { toast.dismiss(t.id); resolve(false); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });
        });

        if (!confirmed) return;

        setActionLoading(`reactivate-${subscriptionId}`);
        try {
            const response = await fetch(`/api/stripe/subscription/${subscriptionId}/reactivate`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error("Failed to reactivate subscription");

            toast.success("✅ Subscription reactivated successfully!");
            fetchLicenses(); // Refresh data
        } catch (err) {
            toast.error("Failed to reactivate subscription: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const openCustomerPortal = async (subscriptionId: string) => {
        setActionLoading(`portal-${subscriptionId}`);
        try {
            const response = await fetch('/api/stripe/customer-portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId }),
            });

            if (!response.ok) throw new Error("Failed to create portal session");

            const { url } = await response.json();
            window.open(url, '_blank');
        } catch (err) {
            toast.error("Failed to open customer portal: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (license: License) => {
        if (!license.is_active) {
            const reason = license.deactivation_reason;
            if (reason === 'subscription_canceled') {
                return <Badge variant="outline" className="border-orange-200 text-orange-700">Canceled</Badge>;
            } else if (reason === 'subscription_deleted') {
                return <Badge variant="destructive">Deleted</Badge>;
            }
            return <Badge variant="destructive">Inactive</Badge>;
        }

        if (license.expiry_date) {
            const expiryDate = new Date(license.expiry_date);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
                return <Badge variant="destructive">Expired</Badge>;
            } else if (daysUntilExpiry <= 7) {
                return <Badge variant="outline" className="border-orange-200 text-orange-700">Expiring Soon</Badge>;
            }
        }

        return <Badge variant="default">Active</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getActiveMembersCount = (license: License) => {
        return license.license_membership.filter(member => member.is_active).length;
    };

    const formatInterval = (interval: string) => {
        return interval === 'month' ? 'monthly' : interval === 'year' ? 'yearly' : interval;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
                        <p className="text-muted-foreground">Manage your organization&apos;s licenses, subscriptions, and team access</p>
                    </div>
                </div>
                <div className="text-center py-12">Loading licenses...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
                    <p className="text-muted-foreground">Manage your organization&apos;s licenses, subscriptions, and team access</p>
                </div>
                <Link href="/organization/plans">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Buy New License
                    </Button>
                </Link>
            </div>

            {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            {licenses.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12 space-y-4">
                            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold">No licenses found</h3>
                                <p className="text-muted-foreground">
                                    You haven&apos;t purchased any licenses yet. Get started by buying your first license.
                                </p>
                            </div>
                            <Link href="/organization/plans">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Buy Your First License
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {licenses.map((license) => {
                        const subscription = license.stripe_subscription_id ? subscriptions[license.stripe_subscription_id] : null;
                        const isExpanded = expandedLicense === license.id;

                        return (
                            <Card key={license.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">License {license.code}</CardTitle>
                                                {getStatusBadge(license)}
                                            </div>
                                            <CardDescription>
                                                Created on {formatDate(license.created_at)}
                                                {license.expiry_date && ` • Expires ${formatDate(license.expiry_date)}`}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExpandedLicense(isExpanded ? null : license.id)}
                                            >
                                                <Settings className="h-4 w-4 mr-2" />
                                                {isExpanded ? 'Hide' : 'Manage'}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => copyLicenseCode(license.code)}>
                                                        {copiedCode === license.code ? (
                                                            <>
                                                                <Check className="h-4 w-4 mr-2" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-4 w-4 mr-2" />
                                                                Copy License Code
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => rotateKey(license.id)}
                                                        disabled={actionLoading === `rotate-${license.id}`}
                                                    >
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Rotate Key
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                Team Usage
                                            </div>
                                            <div className="text-2xl font-bold">
                                                {getActiveMembersCount(license)} / {license.max_seats}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {license.max_seats - getActiveMembersCount(license)} seats available
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <DollarSign className="h-4 w-4" />
                                                Pricing
                                            </div>
                                            <div className="text-2xl font-bold">
                                                ${license.plans_pricing?.base_price?.toFixed(2) || 'N/A'}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {formatInterval(license.plans_pricing?.interval_type || 'period')}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                Subscription
                                            </div>
                                            <div className="space-y-1">
                                                {subscription ? (
                                                    <>
                                                        <p className="text-sm font-medium capitalize">
                                                            {subscription.status}
                                                            {subscription.cancel_at_period_end && (
                                                                <span className="text-orange-600 ml-1">(Ending)</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {subscription.current_period_end ? (() => {
                                                                try {
                                                                    const date = new Date(subscription.current_period_end * 1000);
                                                                    if (isNaN(date.getTime())) {
                                                                        return 'Invalid date';
                                                                    }
                                                                    return `${subscription.cancel_at_period_end ? 'Ends' : 'Renews'} ${date.toLocaleDateString()}`;
                                                                } catch (error) {
                                                                    console.error('Date formatting error:', error, subscription.current_period_end);
                                                                    return 'Date unavailable';
                                                                }
                                                            })() : (
                                                                'No renewal date available'
                                                            )}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No subscription data</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Management Section */}
                                    {isExpanded && (
                                        <div className="mt-6 pt-6 border-t space-y-6">
                                            {/* Subscription Management */}
                                            {subscription && (
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-semibold">Subscription Management</h4>
                                                    <div className="flex gap-2">
                                                        {subscription.cancel_at_period_end ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => reactivateSubscription(subscription.id)}
                                                                disabled={actionLoading === `reactivate-${subscription.id}`}
                                                            >
                                                                <PlayCircle className="h-4 w-4 mr-2" />
                                                                Reactivate
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => cancelSubscription(subscription.id)}
                                                                disabled={actionLoading === `cancel-${subscription.id}`}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-2" />
                                                                Cancel at Period End
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openCustomerPortal(subscription.id)}
                                                            disabled={actionLoading === `portal-${subscription.id}`}
                                                        >
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            {actionLoading === `portal-${subscription.id}` ? 'Opening...' : 'Customer Portal'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Team Members Management */}
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-semibold">Team Members ({license.license_membership.length})</h4>
                                                {license.license_membership.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {license.license_membership.map((member) => (
                                                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                    <div>
                                                                        <div className="font-medium">
                                                                            {member.users?.email || 'No email'}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Joined {formatDate(member.joined_at)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant={member.is_active ? "default" : "secondary"}>
                                                                        {member.is_active ? "Active" : "Revoked"}
                                                                    </Badge>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => revokeMember(member.id, member.users?.email || '', member.user_id, license.id)}
                                                                        disabled={actionLoading === `revoke-${member.id}`}
                                                                    >
                                                                        <UserX className="h-4 w-4 mr-2" />
                                                                        {actionLoading === `revoke-${member.id}` ? 'Revoking...' : 'Revoke'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                                                        No team members have joined this license yet. Share the license code <span className="font-mono font-semibold">{license.code}</span> to invite members.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Alert for inactive licenses */}
                                    {!license.is_active && (
                                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <div className="flex">
                                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                                                <div className="text-sm">
                                                    <p className="font-medium text-yellow-800">License Inactive</p>
                                                    <p className="text-yellow-700">
                                                        {license.deactivation_reason === 'subscription_canceled'
                                                            ? 'This license is inactive due to subscription cancellation.'
                                                            : 'This license is no longer active. Team members cannot use this license code.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* License Success Modal */}
            <LicenseSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                licenseCode={successLicenseCode}
            />
        </div>
    );
} 