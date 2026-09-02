"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Search, Share2, Trash2, Wallet } from "lucide-react";
import { createClient, generatePublicUrl, generateSignedUrl } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WalletPage = {
  id: string;
  title: string;
  slug: string;
  og_image_url: string | null;
  favicon_image_url: string | null;
  description: string | null;
  business: {
    name: string;
    slug: string;
  } | null;
};

type WalletEntry = {
  id: string;
  saved_at: string | null;
  page_id: string;
  page: WalletPage | null;
};

function normalizeWalletEntry(raw: any): WalletEntry | null {
  const pageValue = Array.isArray(raw?.page) ? raw.page[0] : raw?.page;
  const businessValue = Array.isArray(pageValue?.business)
    ? pageValue.business[0]
    : pageValue?.business;

  if (!pageValue?.id) {
    return null;
  }

  return {
    id: raw.id,
    saved_at: raw.saved_at,
    page_id: raw.page_id,
    page: {
      id: pageValue.id,
      title: pageValue.title,
      slug: pageValue.slug,
      og_image_url: pageValue.og_image_url,
      favicon_image_url: pageValue.favicon_image_url,
      description: pageValue.description,
      business: businessValue
        ? {
            name: businessValue.name,
            slug: businessValue.slug,
          }
        : null,
    },
  };
}

function formatSavedDate(value?: string | null) {
  if (!value) return "Saved";
  return `Saved ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getWalletItemUrl(item: WalletEntry) {
  const businessSlug = item.page?.business?.slug;
  const pageSlug = item.page?.slug;
  const rootUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "https://crownpages.com");

  if (!businessSlug || !pageSlug) return null;
  return `${rootUrl}/${businessSlug}/${pageSlug}`;
}

function WalletThumbnail({ title, imagePath }: { title: string; imagePath: string | null }) {
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

      if (!cancelled) {
        setImageUrls(Array.from(new Set(candidates)));
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
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${title} preview`}
          className="h-full w-full object-cover"
          onError={() =>
            setActiveIndex((current) => (current < imageUrls.length - 1 ? current + 1 : current))
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <Wallet className="h-8 w-8 text-slate-400" />
    </div>
  );
}

export function WalletManager() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [items, setItems] = useState<WalletEntry[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadWalletItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("wallet_items")
        .select(
          `
            id,
            saved_at,
            page_id,
            page:pages(
              id,
              title,
              slug,
              og_image_url,
              favicon_image_url,
              description,
              business:businesses(
                name,
                slug
              )
            )
          `,
        )
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;

      setItems(((data || []) as any[]).map(normalizeWalletEntry).filter(Boolean) as WalletEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadWalletItems();
  }, [loadWalletItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.page?.title || "",
        item.page?.business?.name || "",
        item.page?.description || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search]);

  const openItem = (item: WalletEntry) => {
    const url = getWalletItemUrl(item);
    if (!url) {
      setError("This saved page does not have a valid public URL.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async (item: WalletEntry) => {
    const url = getWalletItemUrl(item);
    if (!url) {
      setError("This saved page does not have a valid public URL.");
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const shareItem = async (item: WalletEntry) => {
    const url = getWalletItemUrl(item);
    if (!url) {
      setError("This saved page does not have a valid public URL.");
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: item.page?.title || "Crown Pages",
        text: `Check out this Crown Pages digital page: ${url}`,
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const removeItem = async (item: WalletEntry) => {
    const confirmed = window.confirm(`Remove "${item.page?.title || "this page"}" from your wallet?`);
    if (!confirmed) return;

    setRemovingId(item.id);
    setError(null);

    try {
      const { error } = await supabase.from("wallet_items").delete().eq("id", item.id);
      if (error) throw error;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove page from wallet.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Saved Pages</CardTitle>
          </div>
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search saved pages..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-muted-foreground dark:border-slate-700">
              Loading wallet...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-muted-foreground dark:border-slate-700">
              No saved pages yet.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <WalletThumbnail
                      title={item.page?.title || "Saved Page"}
                      imagePath={item.page?.og_image_url || item.page?.favicon_image_url || null}
                    />
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                        {item.page?.title || "Saved Page"}
                      </h3>
                      {item.page?.business?.name ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {item.page.business.name}
                        </p>
                      ) : null}
                      {item.page?.description ? (
                        <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                          {item.page.description}
                        </p>
                      ) : null}
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatSavedDate(item.saved_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Button variant="outline" size="sm" onClick={() => openItem(item)}>
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void shareItem(item)}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void copyLink(item)}>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void removeItem(item)}
                      disabled={removingId === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      {removingId === item.id ? "Removing..." : "Remove"}
                    </Button>
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
