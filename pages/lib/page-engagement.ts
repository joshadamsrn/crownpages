export interface PageEngagementSettings {
  includeInstaConnect: boolean;
  includeScheduleMeeting: boolean;
}

type PublishSettingsLike = Record<string, unknown> | null | undefined;

const DEFAULT_SETTINGS: PageEngagementSettings = {
  includeInstaConnect: false,
  includeScheduleMeeting: false,
};

export function getPageEngagementSettings(
  publishSettings: PublishSettingsLike
): PageEngagementSettings {
  if (!publishSettings || typeof publishSettings !== "object") {
    return DEFAULT_SETTINGS;
  }

  const pageFeatures =
    "pageFeatures" in publishSettings &&
    publishSettings.pageFeatures &&
    typeof publishSettings.pageFeatures === "object"
      ? (publishSettings.pageFeatures as Record<string, unknown>)
      : publishSettings;

  return {
    includeInstaConnect: Boolean(pageFeatures.includeInstaConnect),
    includeScheduleMeeting: Boolean(pageFeatures.includeScheduleMeeting),
  };
}

export function mergePageEngagementSettings(
  publishSettings: PublishSettingsLike,
  nextSettings: Partial<PageEngagementSettings>
) {
  const base =
    publishSettings && typeof publishSettings === "object"
      ? { ...publishSettings }
      : {};

  const existingFeatures =
    "pageFeatures" in base &&
    base.pageFeatures &&
    typeof base.pageFeatures === "object"
      ? (base.pageFeatures as Record<string, unknown>)
      : {};

  return {
    ...base,
    pageFeatures: {
      ...existingFeatures,
      ...nextSettings,
    },
  };
}

export function pageSupportsLeadActions(
  sections: Array<{ type?: string }> | undefined | null
) {
  if (!sections || !Array.isArray(sections)) {
    return false;
  }

  const sectionTypes = new Set(sections.map((section) => section.type));
  return sectionTypes.has("companyHeader") && sectionTypes.has("contactCard");
}
