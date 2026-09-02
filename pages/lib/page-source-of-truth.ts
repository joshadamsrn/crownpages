type PageSection = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles?: Record<string, unknown>;
};

type PageFeatureFlags = {
  includeInstaConnect: boolean;
  includeScheduleMeeting: boolean;
  disableLeadActions?: boolean;
};

type BuilderCreatePayloadArgs = {
  title: string;
  description?: string | null;
  slug: string;
  businessId: string;
  createdBy?: string | null;
  sections: PageSection[];
  ogImageUrl?: string | null;
  faviconImageUrl?: string | null;
  styles?: Record<string, unknown>;
  isPublished?: boolean;
  pageFeatures: PageFeatureFlags;
  now?: string;
};

type BuilderUpdatePayloadArgs = {
  sections: PageSection[];
  styles?: Record<string, unknown>;
  existingOgImageUrl?: string | null;
  existingFaviconImageUrl?: string | null;
  existingPublishSettings?: unknown;
  pageFeatures?: PageFeatureFlags;
  now?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPageFeatureSettings(publishSettings: unknown) {
  const pageFeatures =
    isRecord(publishSettings) && isRecord(publishSettings.pageFeatures)
      ? publishSettings.pageFeatures
      : isRecord(publishSettings)
        ? publishSettings
        : {};

  return {
    includeInstaConnect: Boolean(pageFeatures.includeInstaConnect),
    includeScheduleMeeting: Boolean(pageFeatures.includeScheduleMeeting),
  };
}

export function buildPagePublishSettings(
  existingPublishSettings: unknown,
  pageFeatures: PageFeatureFlags,
) {
  const existingSettings = isRecord(existingPublishSettings) ? existingPublishSettings : {};
  const existingPageFeatures = isRecord(existingSettings.pageFeatures)
    ? existingSettings.pageFeatures
    : {};

  const leadActionsEnabled = !pageFeatures.disableLeadActions;

  return {
    ...existingSettings,
    pageFeatures: {
      ...existingPageFeatures,
      includeInstaConnect: leadActionsEnabled && Boolean(pageFeatures.includeInstaConnect),
      includeScheduleMeeting:
        leadActionsEnabled && Boolean(pageFeatures.includeScheduleMeeting),
    },
  };
}

export function buildPageBuilderCreatePayload({
  title,
  description,
  slug,
  businessId,
  createdBy,
  sections,
  ogImageUrl,
  faviconImageUrl,
  styles,
  isPublished = false,
  pageFeatures,
  now = new Date().toISOString(),
}: BuilderCreatePayloadArgs) {
  return {
    title: title.trim(),
    description: description?.trim() ? description.trim() : null,
    slug: slug.trim(),
    business_id: businessId,
    created_by: createdBy ?? undefined,
    content: { sections },
    ...(ogImageUrl !== undefined ? { og_image_url: ogImageUrl } : {}),
    ...(faviconImageUrl !== undefined ? { favicon_image_url: faviconImageUrl } : {}),
    ...(styles ? { styles } : {}),
    is_published: isPublished,
    is_active: true,
    published_at: isPublished ? now : null,
    publish_settings: buildPagePublishSettings({}, pageFeatures),
  };
}

export function buildPageBuilderUpdatePayload({
  sections,
  styles,
  existingOgImageUrl,
  existingFaviconImageUrl,
  existingPublishSettings,
  pageFeatures,
  now = new Date().toISOString(),
}: BuilderUpdatePayloadArgs) {
  return {
    content: { sections },
    ...(existingOgImageUrl !== undefined ? { og_image_url: existingOgImageUrl } : {}),
    ...(existingFaviconImageUrl !== undefined ? { favicon_image_url: existingFaviconImageUrl } : {}),
    ...(styles ? { styles } : {}),
    ...(pageFeatures
      ? {
          publish_settings: buildPagePublishSettings(existingPublishSettings, pageFeatures),
        }
      : {}),
    updated_at: now,
  };
}
