"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Play,
  Share2,
  Star,
  Bookmark,
  FileText,
  Image as ImageIcon,
  Video,
  Check,
  Users,
} from "lucide-react";
import type { BusinessData } from "@crown-pages/types";
import { SocialBrandIcon } from "./social-brand-icons";

type PreviewSection = {
  id: string;
  type: string;
  data: Record<string, any>;
};

interface MobileNativePreviewProps {
  sections: PreviewSection[];
  business: BusinessData | null;
  pageTitle: string;
  includeInstaConnect?: boolean;
  includeScheduleMeeting?: boolean;
}

function getStorageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (
    path.startsWith("./assets/") ||
    path.startsWith("../assets/") ||
    path.startsWith("assets/") ||
    path.startsWith("/assets/")
  ) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
}

function splitAddress(address?: string) {
  if (!address) return [];

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return parts;
  if (parts.length === 3) return [parts[0], `${parts[1]}, ${parts[2]}`];
  return [parts[0], `${parts[1]}, ${parts[2]}`, parts.slice(3).join(", ")];
}

function SectionShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`bg-white px-4 ${className}`}>{children}</section>;
}

function MobileActionButtonsPreview({
  includeInstaConnect,
  includeScheduleMeeting,
}: {
  includeInstaConnect: boolean;
  includeScheduleMeeting: boolean;
}) {
  if (!includeInstaConnect && !includeScheduleMeeting) return null;

  const buttonClassName =
    "flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-full border-[2px] border-[#2c6bed] bg-white px-5 py-3.5";

  return (
    <section className="bg-white px-4 pb-4 pt-1">
      <div className="flex gap-3">
        {includeInstaConnect ? (
          <div className={buttonClassName}>
            <Users className="h-5 w-5 text-[#0f4fb3]" />
            <span className="text-[15px] font-semibold text-[#1b2431]">Connect</span>
          </div>
        ) : null}
        {includeScheduleMeeting ? (
          <div className={buttonClassName}>
            <CalendarDays className="h-5 w-5 text-[#0f4fb3]" />
            <span className="text-[15px] font-semibold text-[#1b2431]">Visit</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PreviewImage({
  src,
  alt,
  className,
  sizes = "400px",
  contain = false,
}: {
  src: string;
  alt: string;
  className: string;
  sizes?: string;
  contain?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        className={contain ? "object-contain" : "object-cover"}
      />
    </div>
  );
}

function HeroPreview({ section }: { section: PreviewSection }) {
  const [isSaved, setIsSaved] = useState(false);
  const heroImage = getStorageUrl(section.data.backgroundImage || section.data.heroImage);
  const logoUrl = getStorageUrl(section.data.logoUrl || section.data.logo);
  const fallbackTitle = section.data.title || section.data.subtitle || "No Hero Image";

  return (
    <section className="bg-white pt-0">
      <div className="relative w-full pb-9">
        <div className="overflow-hidden bg-slate-200">
          {heroImage ? (
            <PreviewImage src={heroImage} alt={fallbackTitle} className="h-[300px] w-full" />
          ) : (
            <div className="flex h-[300px] w-full flex-col items-center justify-center bg-slate-200 text-slate-500">
              <ImageIcon className="h-11 w-11" />
              <p className="mt-2 text-sm font-semibold">{fallbackTitle}</p>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4">
          <button
            type="button"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#2b3f96] shadow-[0_10px_22px_rgba(15,23,42,0.18)]"
            onClick={() => setIsSaved((current) => !current)}
            aria-label={isSaved ? "Saved" : "Save"}
          >
            <Bookmark
              className={`h-8 w-8 ${isSaved ? "fill-[#2b3f96] text-[#2b3f96]" : "text-[#2b3f96]"}`}
            />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#2b3f96] shadow-[0_10px_22px_rgba(15,23,42,0.18)]"
            aria-label="Share"
          >
            <Share2 className="h-8 w-8 text-[#2b3f96]" />
          </button>
        </div>
        {logoUrl ? (
          <div className="absolute bottom-0 left-4 flex h-[90px] w-[90px] items-center justify-center rounded-xl border-2 border-white bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
            <PreviewImage src={logoUrl} alt="Logo" className="h-full w-full" sizes="90px" contain />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CompanyHeaderPreview({ section }: { section: PreviewSection }) {
  const addressLines = splitAddress(section.data.address);

  return (
    <SectionShell className="pb-3 pt-4">
      <h2 className="mb-2 text-[22px] font-black leading-7 text-[#1a1a1a]">
        {section.data.companyName || "Unnamed Business"}
      </h2>
      {section.data.ctaText ? (
        <p className="mb-2 text-[15px] leading-5 text-slate-600">{section.data.ctaText}</p>
      ) : null}
      {addressLines.length ? (
        <div className="flex-1">
          {addressLines.map((line) => (
            <p key={line} className="text-[15px] leading-5 text-[#555]">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}

function ContactCardPreview({ section }: { section: PreviewSection }) {
  const [saved, setSaved] = useState(false);
  const name = section.data.name || section.data.contactName || "";
  const role = section.data.role || section.data.contactRole;
  const imageUrl = getStorageUrl(section.data.imageUrl || section.data.logo);

  return (
    <SectionShell className="pb-3 pt-1">
      <div className="rounded-[24px] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {imageUrl ? (
              <PreviewImage src={imageUrl} alt={name || "Contact"} className="h-[90px] w-[70px] rounded-[14px] bg-slate-100" sizes="70px" />
            ) : (
              <div className="flex h-[90px] w-[70px] items-center justify-center rounded-[14px] bg-slate-100 text-slate-400">
                <Mail className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold leading-[22px] text-black">{name}</p>
              {role ? <p className="mt-1 text-base leading-5 text-[#666]">{role}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2 ${
              saved
                ? "border-black bg-black"
                : "border-[#c5c3c3] bg-white"
            }`}
            onClick={() => setSaved((current) => !current)}
          >
            {saved ? (
              <Check className="h-5 w-5 text-white" />
            ) : (
              <Users className="h-5 w-5 text-black" />
            )}
            <span className={`text-[14px] font-semibold ${saved ? "text-white" : "text-black"}`}>
              {saved ? "Saved" : "Save Contact"}
            </span>
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function AboutPreview({ section }: { section: PreviewSection }) {
  const imageUrl = getStorageUrl(section.data.image);
  const plainText = String(section.data.content || "").replace(/<[^>]*>/g, "").trim();
  const [showFullContent, setShowFullContent] = useState(false);
  const truncatedContent =
    plainText.length > 150 ? `${plainText.slice(0, 150).trim()}...` : plainText;

  return (
    <SectionShell className="pb-[14px] pt-2">
      {imageUrl ? (
        <PreviewImage src={imageUrl} alt={section.data.title || "About"} className="mb-1 h-[220px] w-full rounded-2xl" />
      ) : null}
      {section.data.title ? (
        <h3 className="mb-3 text-2xl font-bold leading-[30px] text-slate-900">{section.data.title}</h3>
      ) : null}
      <p className="text-[15px] leading-6 text-slate-600">
        {showFullContent ? plainText : truncatedContent}
      </p>
      {plainText.length > 150 ? (
        <button
          type="button"
          className="ml-auto mt-4 flex items-center gap-1 text-base font-bold text-black"
          onClick={() => setShowFullContent((current) => !current)}
        >
          <span>{showFullContent ? "Read Less" : "Read More"}</span>
          {showFullContent ? (
            <ChevronUp className="h-[18px] w-[18px]" />
          ) : (
            <ChevronDown className="h-[18px] w-[18px]" />
          )}
        </button>
      ) : null}
    </SectionShell>
  );
}

function GalleryPreview({ section }: { section: PreviewSection }) {
  const images = (section.data.images || []).map((img: any) => ({
    id: img.id,
    url: getStorageUrl(img.url),
    caption: img.caption,
    type: "image" as const,
  }));

  const videos = (section.data.videos || []).map((vid: any) => ({
    id: vid.id,
    url: getStorageUrl(vid.thumbnail) || getStorageUrl(vid.url),
    caption: vid.caption,
    type: "video" as const,
  }));

  const mediaItems = [...videos, ...images].filter((item) => item.url);
  if (!mediaItems.length) return null;

  const isFeaturedSingle = mediaItems.length === 1;
  const isSplitPair = mediaItems.length === 2;
  const fallbackTitle =
    section.data.title?.trim() ||
    (videos.length && !images.length
      ? "Videos"
      : images.length && !videos.length
        ? "Photos"
        : "Photos / Videos");

  const countIcon = videos.length && !images.length ? (
    <Video className="h-4 w-4 text-slate-600" />
  ) : (
    <ImageIcon className="h-4 w-4 text-slate-600" />
  );

  const renderMediaCard = (item: (typeof mediaItems)[number], index: number, className: string) => (
    <div key={item.id || `${item.type}-${index}`} className={`relative overflow-hidden rounded-[24px] ${className}`}>
      <Image
        src={item.url!}
        alt={item.caption || fallbackTitle}
        fill
        unoptimized
        sizes="320px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      {item.type === "video" ? (
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
          <Play className="ml-0.5 h-[18px] w-[18px] fill-slate-900 text-slate-900" />
        </div>
      ) : null}
      {item.caption ? (
        <p className="absolute bottom-3 left-3 right-3 text-sm font-medium text-white drop-shadow">
          {item.caption}
        </p>
      ) : null}
    </div>
  );

  return (
    <SectionShell className="pb-5 pt-3">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="flex-1 text-[22px] font-bold text-slate-900">{fallbackTitle}</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">{mediaItems.length}</span>
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
          {mediaItems.map((item, index) => renderMediaCard(item, index, "h-[220px]"))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {mediaItems.map((item, index) => renderMediaCard(item, index, "h-[280px] w-[220px] shrink-0"))}
        </div>
      )}

      {mediaItems.length > 8 ? (
        <p className="mt-3 text-sm text-slate-500">
          +{mediaItems.length - 8} more item{mediaItems.length - 8 === 1 ? "" : "s"}
        </p>
      ) : null}
    </SectionShell>
  );
}

function ResourceRowsPreview({
  title,
  items,
  showContactButton = false,
}: {
  title: string;
  items: Array<{ id?: string; title: string; subtitle?: string; image?: string | null; icon?: React.ReactNode }>;
  showContactButton?: boolean;
}) {
  if (!items.length && !showContactButton) return null;

  return (
    <SectionShell className="pb-5 pt-6">
      {items.length ? <h3 className="mb-4 text-[22px] font-bold text-black">{title}</h3> : null}
      {items.length ? (
        <div className="overflow-hidden rounded-[3px] border border-[#E5E5E5] bg-white">
          {items.map((item, index) => (
            <div
              key={item.id || `${item.title}-${index}`}
              className={`flex min-h-20 items-center justify-between gap-3 px-3 py-[14px] ${index !== items.length - 1 ? "border-b border-[#E5E5E5]" : ""}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-[50px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-slate-100">
                  {item.image ? (
                    <PreviewImage src={item.image} alt={item.title} className="h-full w-full" sizes="60px" />
                  ) : (
                    item.icon || <FileText className="h-6 w-6 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-5 text-black">{item.title}</p>
                  {item.subtitle ? <p className="mt-0.5 text-xs leading-4 text-slate-500">{item.subtitle}</p> : null}
                </div>
              </div>
              <span className="shrink-0 text-[22px] leading-none text-slate-400">›</span>
            </div>
          ))}
        </div>
      ) : null}
      {showContactButton ? (
        <div className="mb-5 mt-6 flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_100%)] shadow-[0_22px_44px_rgba(15,23,42,0.14)]">
          <span className="text-lg font-bold text-white">Contact</span>
        </div>
      ) : null}
    </SectionShell>
  );
}

function AmenitiesPreview({ section }: { section: PreviewSection }) {
  const [showAll, setShowAll] = useState(false);
  const amenities = (section.data.amenities || [])
    .map((amenity: any, index: number) => {
      if (typeof amenity === "string") return { id: `amenity-${index}`, label: amenity };
      if (amenity && typeof amenity === "object") {
        return {
          id: amenity.id || `amenity-${index}`,
          label:
            typeof amenity.name === "string"
              ? amenity.name
              : typeof amenity.label === "string"
                ? amenity.label
                : "",
        };
      }
      return null;
    })
    .filter((item: any) => item?.label);

  if (!amenities.length) return null;

  const displayLimit = 8;
  const displayed = showAll ? amenities : amenities.slice(0, displayLimit);
  const columns = displayed.reduce(
    (result: Array<Array<{ id: string; label: string }>>, amenity: { id: string; label: string }, index: number) => {
      result[index % 2].push(amenity);
      return result;
    },
    [[], []],
  );

  return (
    <SectionShell className="pb-[14px] pt-2">
      {section.data.title ? <h3 className="mb-3 text-2xl font-bold leading-[30px] text-slate-900">{section.data.title}</h3> : null}
      <div className="flex gap-4">
        {columns.map((column: Array<{ id: string; label: string }>, columnIndex: number) => (
          <div key={columnIndex} className="flex-1">
            {column.map((amenity: { id: string; label: string }) => (
              <div key={amenity.id} className="mb-[10px] flex items-start">
                <span className="mr-2 text-lg font-bold leading-[22px] text-black">•</span>
                <span className="flex-1 text-[15px] leading-[22px] text-slate-800">{amenity.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {amenities.length > displayLimit ? (
        <button
          type="button"
          className="ml-auto mt-2 flex items-center gap-1 text-base font-semibold text-black"
          onClick={() => setShowAll((current) => !current)}
        >
          <span>{showAll ? "Show Less" : "Show More"}</span>
          {showAll ? <ChevronUp className="h-[18px] w-[18px]" /> : <ChevronDown className="h-[18px] w-[18px]" />}
        </button>
      ) : null}
    </SectionShell>
  );
}

function ContactPreview({ section }: { section: PreviewSection }) {
  const cards = [
    section.data.email
      ? { label: "Email", value: section.data.email, icon: <Mail className="h-[22px] w-[22px] text-[#0f4fb3]" /> }
      : null,
    section.data.phone
      ? { label: "Phone", value: section.data.phone, icon: <Phone className="h-[22px] w-[22px] text-[#1d4ed8]" /> }
      : null,
    section.data.address
      ? { label: "Address", value: section.data.address, icon: <MapPin className="h-[22px] w-[22px] text-[#4f46e5]" /> }
      : null,
    section.data.hours
      ? { label: "Hours", value: section.data.hours, icon: <Globe className="h-[22px] w-[22px] text-[#d97706]" /> }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: React.ReactNode }>;

  if (!cards.length) return null;

  return (
    <SectionShell className="pb-4 pt-3">
      {section.data.title ? <h3 className="mb-3 text-2xl font-bold text-slate-900">{section.data.title}</h3> : null}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[20px] border border-slate-200 bg-white p-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              {card.icon}
            </div>
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-sm text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function FeaturesPreview({ section }: { section: PreviewSection }) {
  const items = section.data.features || [];
  if (!items.length) return null;

  return (
    <SectionShell className="pb-4 pt-3">
      {section.data.title ? <h3 className="mb-3 text-2xl font-bold text-slate-900">{section.data.title}</h3> : null}
      <div className="grid grid-cols-2 gap-3">
        {items.map((feature: any) => (
          <div key={feature.id || feature.title} className="rounded-[22px] border border-slate-200 bg-white p-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eff6ff]">
              <Check className="h-8 w-8 text-[#2563eb]" />
            </div>
            <p className="text-base font-bold text-slate-900">{feature.title}</p>
            <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function TestimonialsPreview({ section }: { section: PreviewSection }) {
  const items = section.data.testimonials || [];
  if (!items.length) return null;

  return (
    <SectionShell className="pb-4 pt-3">
      {section.data.title ? <h3 className="mb-3 text-2xl font-bold text-slate-900">{section.data.title}</h3> : null}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((testimonial: any) => (
          <div key={testimonial.id || testimonial.name} className="w-[260px] shrink-0 rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="mb-3 flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < (testimonial.rating || 0) ? "fill-[#FFD700] text-[#FFD700]" : "text-slate-300"}`}
                />
              ))}
            </div>
            <p className="text-sm leading-6 text-slate-700">&quot;{testimonial.text}&quot;</p>
            <div className="mt-4">
              <p className="font-bold text-slate-900">{testimonial.name}</p>
              {(testimonial.position || testimonial.company) ? (
                <p className="text-sm text-slate-500">
                  {testimonial.position}
                  {testimonial.position && testimonial.company ? " • " : ""}
                  {testimonial.company}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function FAQPreview({ section }: { section: PreviewSection }) {
  const items = section.data.questions || [];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (!items.length) return null;

  return (
    <SectionShell className="pb-4 pt-3">
      {section.data.title ? <h3 className="mb-3 text-2xl font-bold text-slate-900">{section.data.title}</h3> : null}
      <div className="space-y-3">
        {items.map((qa: any) => {
          const id = qa.id || qa.question;
          const open = expanded.has(id);
          return (
            <button
              type="button"
              key={id}
              className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-left"
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{qa.question}</p>
                {open ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
              {open ? <p className="mt-3 text-sm leading-6 text-slate-600">{qa.answer}</p> : null}
            </button>
          );
        })}
      </div>
    </SectionShell>
  );
}

function CTAPreview({ section }: { section: PreviewSection }) {
  return (
    <SectionShell className="pb-6 pt-4">
      <div className="rounded-[28px] bg-[#0f172a] px-5 py-7 text-center text-white">
        <h3 className="text-[28px] font-bold leading-8">{section.data.title}</h3>
        {section.data.description ? (
          <p className="mt-3 text-sm leading-6 text-white/75">{section.data.description}</p>
        ) : null}
        {section.data.button ? (
          <div className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900">
            {section.data.button.text}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function SocialLinksPreview({ section }: { section: PreviewSection }) {
  const items = section.data.links || section.data.socialLinks || [];
  if (!items.length) return null;

  return (
    <SectionShell className="pb-4 pt-3">
      <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
        {section.data.title ? (
          <h3 className="mb-4 text-[18px] font-semibold text-slate-900">{section.data.title}</h3>
        ) : null}
        <div className="flex gap-4 overflow-x-auto pb-1">
          {items.map((item: any, index: number) => (
            <SocialBrandIcon
              key={item.id || item.platform || index}
              platform={item.platform || item.type || "other"}
              size={60}
              className="rounded-[18px] shadow-sm"
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function FallbackPreview({ section }: { section: PreviewSection }) {
  return (
    <SectionShell className="pb-4 pt-3">
      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Preview fallback for section type <strong>{section.type}</strong>. This section is not fully ported to the mobile-style preview yet.
      </div>
    </SectionShell>
  );
}

export function MobileNativePreview({
  sections,
  business,
  pageTitle,
  includeInstaConnect = false,
  includeScheduleMeeting = false,
}: MobileNativePreviewProps) {
  const renderSection = (section: PreviewSection, index: number) => {
    switch (section.type) {
      case "hero":
        return <HeroPreview key={section.id || index} section={section} />;
      case "companyHeader":
        return (
          <div key={section.id || index}>
            <CompanyHeaderPreview section={section} />
            <MobileActionButtonsPreview
              includeInstaConnect={includeInstaConnect}
              includeScheduleMeeting={includeScheduleMeeting}
            />
          </div>
        );
      case "contactCard":
        return <ContactCardPreview key={section.id || index} section={section} />;
      case "about":
        return <AboutPreview key={section.id || index} section={section} />;
      case "gallery":
        return <GalleryPreview key={section.id || index} section={section} />;
      case "amenities":
        return <AmenitiesPreview key={section.id || index} section={section} />;
      case "links":
        return (
          <ResourceRowsPreview
            key={section.id || index}
            title={section.data.title?.trim() || "Links"}
            items={(section.data.links || [])
              .filter((item: any) => item?.title?.trim())
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                image: getStorageUrl(item.image),
              }))}
          />
        );
      case "pages":
        return (
          <ResourceRowsPreview
            key={section.id || index}
            title={section.data.title?.trim() || "Pages"}
            items={(section.data.pages || [])
              .filter((item: any) => item?.title?.trim())
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                subtitle:
                  item.type === "file"
                    ? item.fileType?.toUpperCase?.() || "FILE"
                    : "External Link",
                image: getStorageUrl(item.image),
              }))}
          />
        );
      case "linksWithContact":
        return (
          <ResourceRowsPreview
            key={section.id || index}
            title={section.data.title?.trim() || "Pages"}
            showContactButton
            items={(section.data.links || [])
              .filter((item: any) => item?.title?.trim())
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                image: getStorageUrl(item.image || item.thumbnail),
              }))}
          />
        );
      case "documents":
        return (
          <ResourceRowsPreview
            key={section.id || index}
            title={section.data.title?.trim() || "Documents"}
            items={(section.data.documents || [])
              .filter((item: any) => item?.title?.trim())
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                subtitle: item.description,
                icon: <FileText className="h-6 w-6 text-[#2563eb]" />,
              }))}
          />
        );
      case "contact":
        return <ContactPreview key={section.id || index} section={section} />;
      case "features":
        return <FeaturesPreview key={section.id || index} section={section} />;
      case "testimonials":
        return <TestimonialsPreview key={section.id || index} section={section} />;
      case "faq":
        return <FAQPreview key={section.id || index} section={section} />;
      case "cta":
        return <CTAPreview key={section.id || index} section={section} />;
      case "socialLinks":
        return <SocialLinksPreview key={section.id || index} section={section} />;
      default:
        return <FallbackPreview key={section.id || index} section={section} />;
    }
  };

  return (
    <div className="bg-white text-slate-900">
      <div className="sr-only">
        Mobile native preview for {pageTitle} {business?.name ? `from ${business.name}` : ""}
      </div>
      {sections.map(renderSection)}
    </div>
  );
}
