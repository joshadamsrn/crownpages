"use client";

import Image from "next/image";
import { ExternalLink, Image as ImageIcon, Play, Video } from "lucide-react";
import { getOptimizedPublicImageUrl } from "@/lib/supabase/client";

type GalleryImage = {
  id?: string;
  url?: string;
  caption?: string;
};

type GalleryVideo = {
  id?: string;
  url?: string;
  thumbnail?: string;
  caption?: string;
};

interface MobilePreviewGallerySectionProps {
  data: {
    title?: string;
    images?: GalleryImage[];
    videos?: GalleryVideo[];
  };
}

function getStorageUrl(path?: string | null, width = 800) {
  if (!path) return null;
  if (path.startsWith("http")) {
    return getOptimizedPublicImageUrl(path, { width, quality: 78, resize: "cover" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
  return getOptimizedPublicImageUrl(publicUrl, { width, quality: 78, resize: "cover" });
}

export function MobilePreviewGallerySection({
  data,
}: MobilePreviewGallerySectionProps) {
  const images = (data.images || []).map((img) => ({
    id: img.id,
    url: getStorageUrl(img.url, 800),
    caption: img.caption,
    type: "image" as const,
  }));

  const videos = (data.videos || []).map((vid) => ({
    id: vid.id,
    url: getStorageUrl(vid.thumbnail, 800) || getStorageUrl(vid.url, 800),
    caption: vid.caption,
    type: "video" as const,
  }));

  const mediaItems = [...videos, ...images].filter((item) => item.url);

  if (!mediaItems.length) {
    return null;
  }

  const isFeaturedSingle = mediaItems.length === 1;
  const isSplitPair = mediaItems.length === 2;
  const fallbackTitle =
    data.title?.trim() ||
    (videos.length && !images.length
      ? "Videos"
      : images.length && !videos.length
        ? "Photos"
        : "Photos / Videos");

  const countIcon =
    videos.length && !images.length ? (
      <Video className="h-4 w-4 text-slate-600" />
    ) : (
      <ImageIcon className="h-4 w-4 text-slate-600" />
    );

  const renderMediaCard = (
    item: (typeof mediaItems)[number],
    index: number,
    className: string,
  ) => (
    <div
      key={item.id || `${item.type}-${index}`}
      className={`relative overflow-hidden rounded-[24px] bg-slate-200 ${className}`}
    >
      <Image
        src={item.url!}
        alt={item.caption || fallbackTitle}
        fill
        unoptimized
        loading={index < 2 ? "eager" : "lazy"}
        decoding="async"
        sizes="393px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      {item.type === "video" ? (
        <div className="absolute left-1/2 top-1/2 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
          <Play className="ml-0.5 h-[18px] w-[18px] fill-slate-900 text-slate-900" />
        </div>
      ) : null}
      {item.caption ? (
        <p className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white drop-shadow">
          {item.caption}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="bg-white px-4 pb-5 pt-3">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="flex-1 text-[22px] font-bold text-slate-900">
          {fallbackTitle}
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">
              {mediaItems.length}
            </span>
            {countIcon}
          </div>
          <div className="flex min-h-12 items-center gap-1.5 rounded-[14px] border border-slate-300 bg-white px-4 py-2">
            <ExternalLink className="h-[14px] w-[14px] text-slate-900" />
            <span className="text-sm font-bold text-slate-900">View All</span>
          </div>
        </div>
      </div>

      {isFeaturedSingle ? (
        <div>{renderMediaCard(mediaItems[0], 0, "h-[320px] w-full")}</div>
      ) : isSplitPair ? (
        <div className="grid grid-cols-2 gap-3">
          {mediaItems.map((item, index) =>
            renderMediaCard(item, index, "h-[220px]"),
          )}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {mediaItems.map((item, index) =>
            renderMediaCard(item, index, "h-[280px] w-[220px] shrink-0"),
          )}
        </div>
      )}

      {mediaItems.length > 8 ? (
        <p className="mt-3 text-sm text-slate-500">
          +{mediaItems.length - 8} more item
          {mediaItems.length - 8 === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}
