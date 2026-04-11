"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
    FileEdit,
    Eye,
    Share,
    MoreVertical,
    Plus,
    Search,
    Calendar,
    BarChart3,
    ExternalLink,
    Copy,
    Check
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface Page {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    is_published: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    published_at: string | null;
    view_count: number | null;
    save_count: number | null;
    share_count: number | null;
    business_id: string;
    businesses: {
        name: string;
        slug: string;
    } | null;
}

export default function PagesPage() {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("pages")
                .select(`
          *,
          businesses (
            name,
            slug
          )
        `)
                .eq("created_by", user.id)
                .order("updated_at", { ascending: false, nullsFirst: false })
                .order("created_at", { ascending: false });

            if (error) throw error;

            setPages(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch pages");
        } finally {
            setLoading(false);
        }
    };

    const copyPageUrl = async (businessSlug: string, pageSlug: string) => {
        const url = `${window.location.origin}/${businessSlug}/${pageSlug}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(url);
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("pages")
                .update({
                    is_published: !currentStatus,
                    published_at: !currentStatus ? new Date().toISOString() : null
                })
                .eq("id", pageId);

            if (error) throw error;

            // Refresh pages
            await fetchPages();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update page status");
        }
    };

    const filteredPages = pages.filter(page => {
        const matchesSearch = !searchTerm ||
            page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.businesses?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "published" && page.is_published) ||
            (statusFilter === "draft" && !page.is_published) ||
            (statusFilter === "active" && page.is_active) ||
            (statusFilter === "inactive" && !page.is_active);

        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getStatusBadge = (page: Page) => {
        if (!page.is_active) {
            return <Badge variant="destructive">Inactive</Badge>;
        }
        if (page.is_published) {
            return <Badge variant="default">Published</Badge>;
        }
        return <Badge variant="outline">Draft</Badge>;
    };

    const totalViews = pages.reduce((sum, page) => sum + (page.view_count || 0), 0);
    const publishedPages = pages.filter(p => p.is_published).length;
    const draftPages = pages.filter(p => !p.is_published).length;

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Pages</h1>
                    <p className="text-muted-foreground">Create and manage your dynamic pages</p>
                </div>
                <div className="text-center py-12">Loading pages...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Pages</h1>
                    <p className="text-muted-foreground">Create and manage your dynamic pages</p>
                </div>
                <Button asChild>
                    <Link href="/protected/pages/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Page
                    </Link>
                </Button>
            </div>

            {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                        <FileEdit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pages.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Pages created
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{publishedPages}</div>
                        <p className="text-xs text-muted-foreground">
                            Live pages
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                        <FileEdit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{draftPages}</div>
                        <p className="text-xs text-muted-foreground">
                            Unpublished pages
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalViews}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all pages
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Your Pages</CardTitle>
                    <CardDescription>
                        Manage all your created pages
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search pages by title, description, or business..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[150px] justify-between">
                                    {statusFilter === "all" ? "All Pages" :
                                        statusFilter === "published" ? "Published" :
                                            statusFilter === "draft" ? "Drafts" :
                                                statusFilter === "active" ? "Active" : "Inactive"}
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Pages</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter("published")}>Published</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Drafts</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {filteredPages.length === 0 ? (
                        <div className="text-center py-12 space-y-4">
                            <FileEdit className="h-12 w-12 text-muted-foreground mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold">No pages found</h3>
                                <p className="text-muted-foreground">
                                    {pages.length === 0
                                        ? "You haven't created any pages yet. Get started by creating your first page."
                                        : "No pages match your current filters."
                                    }
                                </p>
                            </div>
                            {pages.length === 0 && (
                                <Button asChild>
                                    <Link href="/protected/pages/new">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Your First Page
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPages.map((page) => (
                                <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <FileEdit className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium truncate">{page.title}</h3>
                                                {getStatusBadge(page)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="truncate">
                                                    {page.businesses?.name || 'Unknown Business'}
                                                </span>
                                                <span>•</span>
                                                <span>{formatDate(page.updated_at || page.created_at)}</span>
                                                {page.view_count && page.view_count > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{page.view_count} views</span>
                                                    </>
                                                )}
                                            </div>
                                            {page.description && (
                                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                                    {page.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {page.is_published && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyPageUrl(page.businesses?.slug || '', page.slug)}
                                            >
                                                {copiedUrl === `${window.location.origin}/${page.businesses?.slug}/${page.slug}` ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/protected/pages/${page.id}/edit`}>
                                                        <FileEdit className="h-4 w-4 mr-2" />
                                                        Edit Page
                                                    </Link>
                                                </DropdownMenuItem>
                                                {page.is_published && (
                                                    <DropdownMenuItem asChild>
                                                        <a
                                                            href={`/${page.businesses?.slug}/${page.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            View Live
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => togglePageStatus(page.id, page.is_published)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {page.is_published ? 'Unpublish' : 'Publish'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/protected/pages/${page.id}/analytics`}>
                                                        <BarChart3 className="h-4 w-4 mr-2" />
                                                        View Analytics
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 