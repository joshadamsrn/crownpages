export type KioskTemplateKey = "template1" | "template2" | "template3" | "template4";

export type KioskTemplateSettingValues = {
  displayPageName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  scanTitle: string;
  scanDescription: string;
  scanItems: string[];
  hideIntakeFormButton: boolean;
  hideCheckInOutButton: boolean;
  hideReviewButton: boolean;
};

export type KioskTemplateDefinition = {
  key: KioskTemplateKey;
  label: string;
  routeName: "kiosk" | "kiosk2" | "kiosk3" | "kiosk4";
  editableFields: Array<keyof KioskTemplateSettingValues>;
  thumbnailSrc: string;
  defaults: KioskTemplateSettingValues;
};

export type KioskTemplateSettingsRow = {
  page_id: string;
  business_id: string;
  template_key: KioskTemplateKey;
  display_page_name: string | null;
  welcome_title: string | null;
  welcome_subtitle: string | null;
  scan_title: string | null;
  scan_description: string | null;
  scan_items: string[] | null;
  kiosk_logo_url?: string | null;
  hide_intake_form_button?: boolean | null;
  hide_check_in_out_button?: boolean | null;
  hide_review_button?: boolean | null;
  updated_at?: string | null;
};

export const KIOSK_TEMPLATE_DEFINITIONS: KioskTemplateDefinition[] = [
  {
    key: "template1",
    label: "Template 1",
    routeName: "kiosk",
    thumbnailSrc: "/kiosk-templates/template-1.png",
    editableFields: ["displayPageName", "welcomeTitle", "welcomeSubtitle", "scanTitle", "scanDescription"],
    defaults: {
      displayPageName: "",
      welcomeTitle: "WELCOME!",
      welcomeSubtitle: "Please select an option.",
      scanTitle: "SCAN FOR:",
      scanDescription: "Virtual Tour and Information",
      scanItems: [],
      hideIntakeFormButton: false,
      hideCheckInOutButton: false,
      hideReviewButton: true,
    },
  },
  {
    key: "template2",
    label: "Template 2",
    routeName: "kiosk2",
    thumbnailSrc: "/kiosk-templates/template-2.png",
    editableFields: ["displayPageName", "welcomeTitle", "welcomeSubtitle"],
    defaults: {
      displayPageName: "",
      welcomeTitle: "Welcome!",
      welcomeSubtitle: "Please choose an option.",
      scanTitle: "",
      scanDescription: "",
      scanItems: [],
      hideIntakeFormButton: false,
      hideCheckInOutButton: false,
      hideReviewButton: true,
    },
  },
  {
    key: "template3",
    label: "Template 3",
    routeName: "kiosk3",
    thumbnailSrc: "/kiosk-templates/template-3.png",
    editableFields: ["displayPageName", "welcomeTitle", "welcomeSubtitle", "scanTitle", "scanItems"],
    defaults: {
      displayPageName: "",
      welcomeTitle: "WELCOME!",
      welcomeSubtitle: "Please select an option.",
      scanTitle: "SCAN FOR:",
      scanDescription: "",
      scanItems: ["Virtual Tour", "Pricing", "Information"],
      hideIntakeFormButton: false,
      hideCheckInOutButton: false,
      hideReviewButton: true,
    },
  },
  {
    key: "template4",
    label: "Template 4",
    routeName: "kiosk4",
    thumbnailSrc: "/kiosk-templates/template-4.png",
    editableFields: ["displayPageName", "scanDescription"],
    defaults: {
      displayPageName: "",
      welcomeTitle: "",
      welcomeSubtitle: "",
      scanTitle: "",
      scanDescription: "Virtual Tour and Information",
      scanItems: [],
      hideIntakeFormButton: false,
      hideCheckInOutButton: false,
      hideReviewButton: true,
    },
  },
];

export const KIOSK_TEMPLATE_BY_KEY = Object.fromEntries(
  KIOSK_TEMPLATE_DEFINITIONS.map((template) => [template.key, template]),
) as Record<KioskTemplateKey, KioskTemplateDefinition>;

export const KIOSK_ROUTE_TO_TEMPLATE_KEY: Record<string, KioskTemplateKey> = {
  kiosk: "template1",
  kiosk2: "template2",
  kiosk3: "template3",
  kiosk4: "template4",
};

export function getKioskTemplateDefaults(templateKey: KioskTemplateKey) {
  return KIOSK_TEMPLATE_BY_KEY[templateKey].defaults;
}

export function normalizeKioskTemplateSettings(
  templateKey: KioskTemplateKey,
  row?: Partial<KioskTemplateSettingsRow> | null,
): KioskTemplateSettingValues {
  const defaults = getKioskTemplateDefaults(templateKey);

  return {
    displayPageName: row?.display_page_name?.trim() || defaults.displayPageName,
    welcomeTitle: row?.welcome_title?.trim() || defaults.welcomeTitle,
    welcomeSubtitle: row?.welcome_subtitle?.trim() || defaults.welcomeSubtitle,
    scanTitle: row?.scan_title?.trim() || defaults.scanTitle,
    scanDescription: row?.scan_description?.trim() || defaults.scanDescription,
    scanItems:
      Array.isArray(row?.scan_items) && row.scan_items.some((item) => item.trim().length > 0)
        ? row.scan_items.map((item) => item.trim()).filter(Boolean)
        : defaults.scanItems,
    hideIntakeFormButton: row?.hide_intake_form_button ?? defaults.hideIntakeFormButton,
    hideCheckInOutButton: row?.hide_check_in_out_button ?? defaults.hideCheckInOutButton,
    hideReviewButton: row?.hide_review_button ?? defaults.hideReviewButton,
  };
}

export function getKioskTemplateUrl(baseUrl: string, businessSlug: string, pageSlug: string, templateKey: KioskTemplateKey) {
  const template = KIOSK_TEMPLATE_BY_KEY[templateKey];
  return `${baseUrl.replace(/\/$/, "")}/${businessSlug}/${pageSlug}/${template.routeName}`;
}
