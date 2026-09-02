import type { MediaCollectionAssetType } from "@/lib/media-collections/types";
import {
  extractCssUrlValues,
  extractSrcsetUrls,
  isKnownExtensionlessImageUrl,
  isLikelyDecorativeAssetUrl,
  isLikelyDocumentUrl,
  isLikelyImageUrl,
  isLikelyVideoUrl,
  normalizeCandidateUrl,
  sameDomain,
} from "@/lib/media-collections/url-utils";

export type DiscoveredAsset = {
  assetType: MediaCollectionAssetType;
  assetUrl: string;
  sourcePageUrl: string;
  metadata?: Record<string, unknown>;
};

export type DiscoveredSocialLink = {
  platform: string;
  url: string;
  discoveredFrom: string;
  confidenceScore: number;
};

export type DiscoveryPageResult = {
  nextPageUrls: string[];
  assets: DiscoveredAsset[];
  socialLinks: DiscoveredSocialLink[];
};

const TAG_URL_ATTR_REGEX =
  /<[^>]+\b(src|data-src|data-lazy-src|data-original|data-srcset|poster|href|content)\s*=\s*["']([^"']+)["'][^>]*>/gi;
const SRCSET_REGEX = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
const STYLE_REGEX = /\bstyle\s*=\s*["']([^"']+)["']/gi;
const HREF_REGEX = /\bhref\s*=\s*["']([^"']+)["']/gi;
const RAW_HTTP_URL_REGEX = /https?:\/\/[^\s"'<>\\]+/gi;

const SOCIAL_PLATFORM_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "facebook", pattern: /(^|\.)facebook\.com$/i },
  { platform: "instagram", pattern: /(^|\.)instagram\.com$/i },
  { platform: "linkedin", pattern: /(^|\.)linkedin\.com$/i },
  { platform: "x", pattern: /(^|\.)x\.com$/i },
  { platform: "twitter", pattern: /(^|\.)twitter\.com$/i },
  { platform: "youtube", pattern: /(^|\.)youtube\.com$/i },
  { platform: "youtube", pattern: /(^|\.)youtu\.be$/i },
  { platform: "tiktok", pattern: /(^|\.)tiktok\.com$/i },
  { platform: "pinterest", pattern: /(^|\.)pinterest\.com$/i },
  { platform: "vimeo", pattern: /(^|\.)vimeo\.com$/i },
  { platform: "wistia", pattern: /(^|\.)wistia\.(com|net)$/i },
  { platform: "matterport", pattern: /(^|\.)matterport\.com$/i },
  { platform: "kuula", pattern: /(^|\.)kuula\.co$/i },
  { platform: "professionalhealthnetwork", pattern: /(^|\.)professionalhealthnetwork\.com$/i },
];

function attributeValue(tag: string, attributeName: string) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function contextTextForTag(tag?: string) {
  if (!tag) return "";

  return [
    tag.startsWith("<img") ? "img" : "",
    tag.startsWith("<meta") ? "meta" : "",
    tag.startsWith("<iframe") ? "iframe" : "",
    attributeValue(tag, "alt"),
    attributeValue(tag, "title"),
    attributeValue(tag, "aria-label"),
    attributeValue(tag, "class"),
    attributeValue(tag, "id"),
    attributeValue(tag, "name"),
    attributeValue(tag, "property"),
    attributeValue(tag, "itemprop"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isImageContext(contextText: string) {
  return /img|image|photo|gallery|hero|thumbnail|mainimage|main image|exterior|interior|room|resident|community|facility|logo|floor plan/.test(
    contextText,
  );
}

function isLogoContext(url: string, contextText: string) {
  return url.toLowerCase().includes("logo") || contextText.includes("logo");
}

function isDecorativeContext(url: string, contextText: string) {
  if (isLogoContext(url, contextText)) return false;
  return (
    isLikelyDecorativeAssetUrl(url) ||
    /favicon|apple-touch-icon|sprite|placeholder|spinner|loader|tracking|pixel|badge|award|seal|rating/.test(
      contextText,
    )
  );
}

function classifyAssetUrl(
  url: string,
  context: { attrName?: string; tag?: string; contextText?: string } = {},
): MediaCollectionAssetType | null {
  const contextText = context.contextText ?? contextTextForTag(context.tag);
  if (isDecorativeContext(url, contextText)) return null;

  const allowExtensionlessCdn =
    isKnownExtensionlessImageUrl(url) &&
    (context.attrName !== "href" || isImageContext(contextText));

  if (isLikelyImageUrl(url, { allowExtensionlessCdn })) return "image";
  if (isLikelyDocumentUrl(url)) return "pdf";
  if (isLikelyVideoUrl(url)) return "video";
  return null;
}

function assetMetadataForContext(
  source: string,
  context: { attrName?: string; tag?: string; contextText?: string } = {},
) {
  const contextText = context.contextText ?? contextTextForTag(context.tag);
  return {
    discovery_source: source,
    html_attribute: context.attrName ?? null,
    media_role: isLogoContext("", contextText)
      ? "logo"
      : isImageContext(contextText)
        ? "facility_media"
        : null,
    context: contextText || null,
  };
}

function detectSocialPlatform(url: string) {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  for (const candidate of SOCIAL_PLATFORM_PATTERNS) {
    if (candidate.pattern.test(hostname)) {
      return candidate.platform;
    }
  }

  return null;
}

function cleanRawUrl(candidate: string) {
  return candidate
    .replace(/&amp;/g, "&")
    .replace(/[),.;\]}]+$/g, "");
}

export function discoverAssetsAndLinksFromHtml(params: {
  html: string;
  pageUrl: string;
  startUrl: string;
  searchSubpages: boolean;
}) {
  const { html, pageUrl, startUrl, searchSubpages } = params;
  const assets = new Map<string, DiscoveredAsset>();
  const nextPageUrls = new Set<string>();
  const socialLinks = new Map<string, DiscoveredSocialLink>();

  for (const match of html.matchAll(TAG_URL_ATTR_REGEX)) {
    const tag = match[0] || "";
    const attrName = match[1] || "";
    const rawValue = match[2] || "";

    if (attrName.toLowerCase().includes("srcset")) {
      for (const candidate of extractSrcsetUrls(rawValue, pageUrl)) {
        const assetType = classifyAssetUrl(candidate, { attrName, tag });
        if (!assetType) continue;

        assets.set(candidate, {
          assetType,
          assetUrl: candidate,
          sourcePageUrl: pageUrl,
          metadata: assetMetadataForContext("srcset", { attrName, tag }),
        });
      }
      continue;
    }

    const candidate = normalizeCandidateUrl(pageUrl, rawValue);
    if (!candidate) continue;

    const socialPlatform = detectSocialPlatform(candidate);
    if (socialPlatform) {
      socialLinks.set(candidate, {
        platform: socialPlatform,
        url: candidate,
        discoveredFrom: pageUrl,
        confidenceScore: 0.85,
      });
      continue;
    }

    const assetType = classifyAssetUrl(candidate, { attrName, tag });
    if (!assetType) continue;

    assets.set(candidate, {
      assetType,
      assetUrl: candidate,
      sourcePageUrl: pageUrl,
      metadata: assetMetadataForContext("html_attribute", { attrName, tag }),
    });
  }

  for (const match of html.matchAll(SRCSET_REGEX)) {
    for (const candidate of extractSrcsetUrls(match[1] || "", pageUrl)) {
      const assetType = classifyAssetUrl(candidate, {
        attrName: "srcset",
        contextText: "image srcset gallery photo",
      });
      if (!assetType) continue;

      assets.set(candidate, {
        assetType,
        assetUrl: candidate,
        sourcePageUrl: pageUrl,
        metadata: assetMetadataForContext("srcset", {
          attrName: "srcset",
          contextText: "image srcset gallery photo",
        }),
      });
    }
  }

  for (const match of html.matchAll(STYLE_REGEX)) {
    for (const candidate of extractCssUrlValues(match[1] || "", pageUrl)) {
      const assetType = classifyAssetUrl(candidate, {
        attrName: "style",
        contextText: "background image style",
      });
      if (!assetType) continue;

      assets.set(candidate, {
        assetType,
        assetUrl: candidate,
        sourcePageUrl: pageUrl,
        metadata: assetMetadataForContext("style", {
          attrName: "style",
          contextText: "background image style",
        }),
      });
    }
  }

  for (const match of html.matchAll(RAW_HTTP_URL_REGEX)) {
    const candidate = normalizeCandidateUrl(pageUrl, cleanRawUrl(match[0] || ""));
    if (!candidate) continue;

    const socialPlatform = detectSocialPlatform(candidate);
    if (socialPlatform) {
      socialLinks.set(candidate, {
        platform: socialPlatform,
        url: candidate,
        discoveredFrom: pageUrl,
        confidenceScore: 0.8,
      });
      continue;
    }

    const assetType = classifyAssetUrl(candidate, {
      contextText: "structured data image logo video tour",
    });
    if (!assetType) continue;

    assets.set(candidate, {
      assetType,
      assetUrl: candidate,
      sourcePageUrl: pageUrl,
      metadata: assetMetadataForContext("raw_url", {
        contextText: "structured data image logo video tour",
      }),
    });
  }

  if (searchSubpages) {
    for (const match of html.matchAll(HREF_REGEX)) {
      const href = normalizeCandidateUrl(pageUrl, match[1] || "");
      if (!href) continue;

      const linkedAssetType = classifyAssetUrl(href, {
        attrName: "href",
        contextText: "link",
      });
      if (linkedAssetType) {
        assets.set(href, {
          assetType: linkedAssetType,
          assetUrl: href,
          sourcePageUrl: pageUrl,
          metadata: assetMetadataForContext("href", {
            attrName: "href",
            contextText: "link",
          }),
        });
        continue;
      }

      const socialPlatform = detectSocialPlatform(href);
      if (socialPlatform) {
        socialLinks.set(href, {
          platform: socialPlatform,
          url: href,
          discoveredFrom: pageUrl,
          confidenceScore: 0.9,
        });
        continue;
      }

      if (sameDomain(href, startUrl)) {
        nextPageUrls.add(href);
      }
    }
  }

  return {
    nextPageUrls: Array.from(nextPageUrls),
    assets: Array.from(assets.values()),
    socialLinks: Array.from(socialLinks.values()),
  } satisfies DiscoveryPageResult;
}
