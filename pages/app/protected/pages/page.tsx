"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient, generatePublicUrl, generateSignedUrl } from "@/lib/supabase/client";
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
    ImagePlus,
    Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface Page {
    id: string;
    title: string;
    created_by: string;
    slug: string;
    description: string | null;
    canonical_url: string | null;
    category_id: string | null;
    og_image_url: string | null;
    favicon_image_url: string | null;
    keywords: string | null;
    media_urls: string[] | null;
    meta_description: string | null;
    meta_title: string | null;
    og_description: string | null;
    og_title: string | null;
    publish_settings: Record<string, unknown> | null;
    content: {
        sections?: Array<{
            type?: string;
            data?: Record<string, unknown>;
        }>;
    } | null;
    styles: Record<string, unknown> | null;
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
    sharedPermission?: "view" | "edit";
    shareRowId?: string;
}

function comparePagesAlphabetically(firstPage: Page, secondPage: Page) {
    const titleComparison = firstPage.title.trim().localeCompare(
        secondPage.title.trim(),
        undefined,
        { sensitivity: "base", numeric: true },
    );

    return titleComparison || firstPage.id.localeCompare(secondPage.id);
}

function getPageThumbnailSource(page: Page) {
    if (page.og_image_url) {
        return page.og_image_url;
    }

    const sections = Array.isArray(page.content?.sections) ? page.content.sections : [];

    for (const section of sections) {
        const data = section?.data || {};
        const imageCandidates = [
            data.backgroundImage,
            data.heroImage,
            data.logoUrl,
            data.logo,
            data.imageUrl,
            data.image,
        ];

        for (const candidate of imageCandidates) {
            if (typeof candidate === "string" && candidate.trim()) {
                return candidate;
            }
        }
    }

    return page.favicon_image_url;
}

function PageThumbnail({ title, imagePath }: { title: string; imagePath: string | null }) {
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function resolveImage() {
            if (!imagePath) {
                if (!cancelled) {
                    setImageUrls([]);
                    setActiveIndex(0);
                }
                return;
            }

            const candidates = [
                await generateSignedUrl(imagePath, 60 * 60 * 24),
                await generatePublicUrl(imagePath),
                imagePath.startsWith("http://") || imagePath.startsWith("https://") ? imagePath : null,
            ].filter((value): value is string => Boolean(value));

            const uniqueCandidates = Array.from(new Set(candidates));

            if (!cancelled) {
                setImageUrls(uniqueCandidates);
                setActiveIndex(0);
            }
        }

        void resolveImage();

        return () => {
            cancelled = true;
        };
    }, [imagePath]);

    const imageUrl = imageUrls[activeIndex] ?? null;

    if (imageUrl) {
        return (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900">
                <Image
                    src={imageUrl}
                    alt={`${title} OG image`}
                    fill
                    className="object-cover"
                    sizes="56px"
                    onError={() => {
                        setActiveIndex((current) => {
                            if (current >= imageUrls.length - 1) {
                                return current;
                            }

                            return current + 1;
                        });
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-slate-100 dark:bg-slate-900">
            <FileEdit className="h-5 w-5 text-muted-foreground" />
        </div>
    );
}

export default function PagesPage() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [duplicatingPageId, setDuplicatingPageId] = useState<string | null>(null);
    const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

    const showSharedOnly = pathname === "/protected/pages/shared";

    const fetchPages = useCallback(async () => {
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
            const ownPages = (data || []) as Page[];
            const userEmail = (user.email || "").toLowerCase();

            const { data: shareRows, error: shareError } = await supabase
                .from("page_shares")
                .select("id, page_id, permission")
                .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${userEmail}`);

            if (shareError) throw shareError;

            let sharedPages: Page[] = [];
            if (shareRows && shareRows.length > 0) {
                const sharedPageIds = Array.from(new Set(shareRows.map((row) => row.page_id).filter(Boolean)));
                const ownPageIdSet = new Set(ownPages.map((page) => page.id));
                const filteredSharedPageIds = sharedPageIds.filter((pageId) => !ownPageIdSet.has(pageId));

                if (filteredSharedPageIds.length > 0) {
                    const { data: sharedData, error: sharedPagesError } = await supabase
                        .from("pages")
                        .select(`
                            *,
                            businesses (
                                name,
                                slug
                            )
                        `)
                        .in("id", filteredSharedPageIds)
                        .order("updated_at", { ascending: false, nullsFirst: false })
                        .order("created_at", { ascending: false });

                    if (sharedPagesError) throw sharedPagesError;

                    sharedPages = ((sharedData || []) as Page[]).map((page) => {
                        const share = shareRows.find((row) => row.page_id === page.id);
                        return {
                            ...page,
                            sharedPermission: (share?.permission ?? "view") as "view" | "edit",
                            shareRowId: share?.id,
                        };
                    });
                }
            }

            const pagesToDisplay = showSharedOnly ? sharedPages : ownPages;
            setPages([...pagesToDisplay].sort(comparePagesAlphabetically));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch pages");
        } finally {
            setLoading(false);
        }
    }, [showSharedOnly]);

    useEffect(() => {
        void fetchPages();
    }, [fetchPages]);

    const duplicatePage = async (page: Page) => {
        const confirmed = window.confirm(`Copy "${page.title}"?`);
        if (!confirmed) {
            return;
        }

        setDuplicatingPageId(page.id);
        setError(null);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            const copiedTitle = `${page.title} copied`;
            const baseSlug = `${page.slug}-copied`;
            let candidateSlug = baseSlug;
            let suffix = 2;

            while (true) {
                const { data: existingSlug, error: slugError } = await supabase
                    .from("pages")
                    .select("id")
                    .eq("slug", candidateSlug)
                    .maybeSingle();

                if (slugError) {
                    throw slugError;
                }

                if (!existingSlug) {
                    break;
                }

                candidateSlug = `${baseSlug}-${suffix}`;
                suffix += 1;
            }

            const insertPayload = {
                title: copiedTitle,
                slug: candidateSlug,
                description: page.description,
                business_id: page.business_id,
                created_by: user.id,
                canonical_url: page.canonical_url,
                category_id: page.category_id,
                content: page.content ?? { sections: [] },
                favicon_image_url: page.favicon_image_url,
                is_active: page.is_active,
                is_published: page.is_published,
                keywords: page.keywords,
                media_urls: page.media_urls,
                meta_description: page.meta_description,
                meta_title: page.meta_title,
                og_description: page.og_description,
                og_image_url: page.og_image_url,
                og_title: page.og_title,
                publish_settings: page.publish_settings,
                published_at: page.is_published ? new Date().toISOString() : null,
                save_count: 0,
                share_count: 0,
                styles: page.styles,
                unique_view_count: 0,
                view_count: 0,
            };

            const { data: duplicatedPage, error: insertError } = await supabase
                .from("pages")
                .insert(insertPayload)
                .select(`
                    *,
                    businesses (
                        name,
                        slug
                    )
                `)
                .single();

            if (insertError) {
                throw insertError;
            }

            setPages((current) => (
                [...current, duplicatedPage as Page].sort(comparePagesAlphabetically)
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to copy page");
        } finally {
            setDuplicatingPageId(null);
        }
    };

    const deletePage = async (page: Page) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${page.title}"?`);
        if (!confirmed) {
            return;
        }

        setDeletingPageId(page.id);
        setError(null);

        try {
            const supabase = createClient();
            const { error: deleteError } = await supabase
                .from("pages")
                .delete()
                .eq("id", page.id);

            if (deleteError) {
                throw deleteError;
            }

            setPages((current) => current.filter((item) => item.id !== page.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete page");
        } finally {
            setDeletingPageId(null);
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
    const editableSharedPages = pages.filter((page) => page.sharedPermission === "edit").length;
    const statusMessage = searchParams.get("status");

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {showSharedOnly ? "Pages Shared With Me" : "My Pages"}
                    </h1>
                    <p className="text-muted-foreground">
                        {showSharedOnly ? "Review and edit pages others have shared with you" : "Create and manage your dynamic pages"}
                    </p>
                </div>
                <div className="text-center py-12">Loading pages...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {showSharedOnly ? "Pages Shared With Me" : "My Pages"}
                    </h1>
                    <p className="text-muted-foreground">
                        {showSharedOnly ? "Review and edit pages others have shared with you" : "Create and manage your dynamic pages"}
                    </p>
                </div>
                {!showSharedOnly ? (
                    <Button asChild>
                        <Link href="/protected/pages/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Page
                        </Link>
                    </Button>
                ) : null}
            </div>

            {statusMessage === "created" && (
                <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                    Crown Page created successfully from the website.
                </div>
            )}

            {statusMessage === "updated" && (
                <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                    Crown Page changes saved successfully.
                </div>
            )}

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
                            {showSharedOnly ? "Pages shared with you" : "Pages created"}
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
                            {showSharedOnly ? "Shared drafts" : "Unpublished pages"}
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
                            {showSharedOnly ? `${editableSharedPages} editable` : "Across all pages"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{showSharedOnly ? "Shared Pages" : "Your Pages"}</CardTitle>
                    <CardDescription>
                        {showSharedOnly ? "Pages teammates have shared with you" : "Manage all your created pages"}
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
                                        ? showSharedOnly
                                            ? "No pages have been shared with you yet."
                                            : "You haven't created any pages yet. Get started by creating your first page."
                                        : "No pages match your current filters."
                                    }
                                </p>
                            </div>
                            {pages.length === 0 && !showSharedOnly && (
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
                            {filteredPages.map((page) => {
                                const isSharedPage = Boolean(page.sharedPermission);
                                const canEditPage = !isSharedPage || page.sharedPermission === "edit";
                                const livePageHref = page.businesses?.slug
                                    ? `/${page.businesses.slug}/${page.slug}`
                                    : "#";

                                return (
                                <div key={page.id} className="flex flex-col gap-4 p-4 border rounded-lg lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                                        <PageThumbnail title={page.title} imagePath={getPageThumbnailSource(page)} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {canEditPage ? (
                                                    <Link
                                                        href={`/protected/pages/${page.id}/edit`}
                                                        className="font-medium truncate underline-offset-4 hover:underline"
                                                    >
                                                        {page.title}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium truncate">{page.title}</span>
                                                )}
                                                {getStatusBadge(page)}
                                                {isSharedPage ? (
                                                    <Badge variant="secondary">
                                                        {page.sharedPermission === "edit" ? "Editor" : "View only"}
                                                    </Badge>
                                                ) : null}
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
                                            {canEditPage ? (
                                                <div className="mt-2">
                                                    <Link
                                                        href={`/protected/pages/${page.id}/edit`}
                                                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                                    >
                                                        Edit Page
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start lg:self-center">
                                        {!isSharedPage ? (
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/protected/pages/${page.id}/analytics`}>
                                                    <BarChart3 className="h-4 w-4 mr-2" />
                                                    Analytics
                                                </Link>
                                            </Button>
                                        ) : null}

                                        {canEditPage ? (
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/protected/pages/${page.id}/edit`}>
                                                    <FileEdit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Link>
                                            </Button>
                                        ) : null}

                                        {!isSharedPage ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => void duplicatePage(page)}
                                                    disabled={duplicatingPageId === page.id || deletingPageId === page.id}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => void deletePage(page)}
                                                    disabled={duplicatingPageId === page.id || deletingPageId === page.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : null}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={canEditPage ? `/protected/pages/${page.id}/edit` : livePageHref}>
                                                        <FileEdit className="h-4 w-4 mr-2" />
                                                        {canEditPage ? "Edit Page" : "View Page"}
                                                    </Link>
                                                </DropdownMenuItem>
                                                {page.is_published && page.businesses?.slug && (
                                                    <DropdownMenuItem asChild>
                                                        <a
                                                            href={livePageHref}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            View Live
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                {!isSharedPage ? (
                                                    <>
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
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/protected/pages/${page.id}/og-image`}>
                                                                <ImagePlus className="h-4 w-4 mr-2" />
                                                                Update OG Image
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : null}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 
