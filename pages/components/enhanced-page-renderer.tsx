'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getSectionDefinition,
  SECTION_DEFINITIONS,
  validateSectionData,
  ThemeConfig,
  DEFAULT_THEME,
  SectionStyles,
  BusinessData,
} from '@crown-pages/types';
import Head from 'next/head';
import Image from 'next/image';

// Import existing section components
import type { Database } from '@/database.types';
import { AboutSection } from './sections/about-section';
import { ContactSection } from './sections/contact-section';
import { PersonalContactSection } from './sections/personal-contact-section';
import { MultiContactSection } from './sections/multi-contact-section';
import { CTASection } from './sections/cta-section';
import { DocumentsSection } from './sections/documents-section';
import { FAQSection } from './sections/faq-section';
import { FeaturesSection } from './sections/features-section';
import { GallerySection } from './sections/gallery-section';
import { MobilePreviewGallerySection } from './sections/mobile-preview-gallery-section';
import { HeroSection } from './sections/hero-section';
import { TestimonialsSection } from './sections/testimonials-section';
import { LinksSection } from './sections/links-section';
import { PagesSection } from './sections/pages-section';
import { LinksWithContactSection } from './sections/links-with-contact-section';
import { MedicalProviderSection } from './sections/medical-provider-section';
import { CompanyHeaderSection } from './sections/company-header-section';
import { ContactCardSection } from './sections/contact-card-section';
import { AmenitiesSection } from './sections/amenities-section';
import { SocialLinksSection } from './sections/social-links-section';
import { PageEngagementActions } from './page-engagement-actions';
import { getPageEngagementSettings, pageSupportsLeadActions } from '@/lib/page-engagement';

export interface SectionData {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles?: SectionStyles;
}

export interface PageContent {
  sections: SectionData[];
}

const ThemeContext = createContext<ThemeConfig>(DEFAULT_THEME);

export const useTheme = () => useContext(ThemeContext);

// Contact Modal Context
interface ContactModalContextType {
  openContactModal: () => void;
  contactCardData: any;
}

const ContactModalContext = createContext<ContactModalContextType>({
  openContactModal: () => {},
  contactCardData: null,
});

export const useContactModal = () => useContext(ContactModalContext);

interface EnhancedPageRendererProps {
  content: PageContent;
  styles?: SectionStyles;
  business: BusinessData | null;
  pageData: Database['public']['Tables']['pages']['Row'];
  isPreview?: boolean;
  referralSafeMode?: boolean;
  referralHref?: string;
}

// Local section definitions for sections not yet in @crown-pages/types
const LOCAL_SECTION_DEFINITIONS = [
  'companyHeader',
  'contactCard',
  'amenities',
  'links',
  'pages',
  'linksWithContact',
  'personalContact',
  'multiContact',
  'medicalProvider',
];

// Wrapper to check both SECTION_DEFINITIONS and LOCAL sections
const getLocalSectionDefinition = (type: string) => {
  const schemaDef = getSectionDefinition(type);
  if (schemaDef) {
    return schemaDef;
  }

  // If it's a local section, return a minimal definition
  if (LOCAL_SECTION_DEFINITIONS.includes(type)) {
    return {
      type,
      name: type,
      category: 'content',
      description: `Local section: ${type}`,
      fields: {},
      defaultData: {},
      icon: { mobile: 'square-outline', web: 'square-outline' },
    };
  }

  return null;
};

// Dynamic section component mapping using shared definitions
const getSectionComponent = (sectionType: string) => {
  const componentMap: Record<string, React.ComponentType<any>> = {
    hero: HeroSection,
    about: AboutSection,
    contact: ContactSection,
    personalContact: PersonalContactSection,
    multiContact: MultiContactSection,
    features: FeaturesSection,
    gallery: GallerySection,
    testimonials: TestimonialsSection,
    faq: FAQSection,
    documents: DocumentsSection,
    cta: CTASection,
    links: LinksSection,
    pages: PagesSection,
    linksWithContact: LinksWithContactSection,
    medicalProvider: MedicalProviderSection,
    companyHeader: CompanyHeaderSection,
    contactCard: ContactCardSection,
    amenities: AmenitiesSection,
    socialLinks: SocialLinksSection,
  };

  return componentMap[sectionType];
};

// SEO Head Component with complete meta tags
const SEOHead = ({
  pageData,
  business,
  referralSafeMode = false,
}: {
  pageData: Database['public']['Tables']['pages']['Row'];
  business: BusinessData | null;
  referralSafeMode?: boolean;
}) => {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const siteName = business?.name || 'Crown Pages';

  // SEO data with fallbacks
  const seoTitle = pageData.meta_title || pageData.title;
  const seoDescription =
    pageData.meta_description ||
    `${pageData.title} - ${business?.name || 'Learn more about our services and offerings.'
    }`;
  // Use meta_title and meta_description instead of og_title and og_description
  const ogTitle = seoTitle;
  const ogDescription = seoDescription;
  const canonicalUrl = currentUrl;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />

      {/* Remove keywords section as it doesn't exist in database */}

      {/* Canonical URL */}
      {canonicalUrl && !referralSafeMode ? <link rel="canonical" href={canonicalUrl} /> : null}

      {/* Favicon */}
      {pageData.favicon_image_url && (
        <>
          <link
            rel="icon"
            type="image/x-icon"
            href={pageData.favicon_image_url}
          />
          <link rel="shortcut icon" href={pageData.favicon_image_url} />
          <link rel="apple-touch-icon" href={pageData.favicon_image_url} />
        </>
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {pageData.og_image_url && (
        <>
          <meta property="og:image" content={pageData.og_image_url} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={ogTitle} />
        </>
      )}
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      {pageData.og_image_url && (
        <>
          <meta name="twitter:image" content={pageData.og_image_url} />
          <meta name="twitter:image:alt" content={ogTitle} />
        </>
      )}

      {/* Additional SEO Tags */}
      <meta name="robots" content={referralSafeMode ? "noindex, nofollow" : "index, follow"} />
      <meta name="author" content={business?.name || ''} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />

      {/* Structured Data for Business */}
      {business && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: business.name,
              url: currentUrl,
              logo: pageData.og_image_url,
              description: seoDescription,
              email: business.email,
              telephone: business.phone,
              address: business.street_address
                ? {
                  '@type': 'PostalAddress',
                  streetAddress: business.street_address,
                  addressLocality: business.city,
                  addressRegion: business.state,
                  postalCode: business.zip_code,
                  addressCountry: business.country,
                }
                : undefined,
            }),
          }}
        />
      )}

      {/* Page-specific Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: seoTitle,
            description: seoDescription,
            url: currentUrl,
            image: pageData.og_image_url,
            publisher: {
              '@type': 'Organization',
              name: business?.name || '',
            },
          }),
        }}
      />
    </Head>
  );
};

// Enhanced Section Renderer with Validation
export const EnhancedSectionRenderer = ({
  section,
  business,
  pageId,
  styles,
  pageUrl,
  pageTitle,
  pageSlug,
  businessSlug,
  brochureSections,
  isPreview,
  companyHeaderAddress,
  contactCardData,
  referralSafeMode,
  referralHref,
}: {
  section: SectionData;
  business: BusinessData;
  pageId: string;
  styles?: SectionStyles;
  pageUrl?: string;
  pageTitle?: string;
  pageSlug?: string;
  businessSlug?: string;
  brochureSections?: SectionData[];
  isPreview?: boolean;
  companyHeaderAddress?: string;
  contactCardData?: any;
  referralSafeMode?: boolean;
  referralHref?: string;
}) => {
  // Render contactCard as a visible section
  // (Also keep data for modal compatibility)
  // if (section.type === 'contactCard') {
  //   return null;
  // }

  // Get section definition
  const sectionDef = getLocalSectionDefinition(section.type);
  const theme = useTheme();
  const sectionClass = `section-${section.id}`;

  const generateSectionCSS = (sectionClass: string) => {
    const sanitize = (value: string) =>
      value?.replace(/[^a-zA-Z0-9#(),.\s%-]/g, '') ?? '';

    const primary = sanitize(styles?.primary || theme.primary);
    const background = sanitize(styles?.background || theme.background);
    const secondary = sanitize(styles?.secondary || theme.secondary);
    const surface = sanitize(styles?.surface || theme.surface);
    const textSecondary = sanitize(
      styles?.text?.secondary || theme.text?.secondary
    );
    const textMuted = sanitize(styles?.text?.muted || theme.text?.muted || '');

    return `
      .${sectionClass} .btn-primary {
        background-color: ${primary};
        color: ${background};
        border: 1px solid ${primary};
        transition: all 0.3s ease;
      }
      .${sectionClass} .btn-primary:hover {
        background-color: ${secondary};
        color: ${primary};
        border-color: ${primary};
        transform: translateY(-1px);
      }
      .${sectionClass} .btn-secondary {
        background-color: transparent;
        color: ${primary};
        border: 1px solid ${primary};
        transition: all 0.3s ease;
      }
      .${sectionClass} .btn-secondary:hover {
        background-color: ${primary};
        color: ${background};
        transform: translateY(-1px);
      }
      .${sectionClass} .text-primary {
        color: ${primary};
      }
      .${sectionClass} .text-secondary {
        color: ${textSecondary};
      }
      .${sectionClass} .text-muted {
        color: ${textMuted};
      }
      .${sectionClass} .bg-primary {
        background-color: ${primary};
      }
      .${sectionClass} .bg-surface {
        background-color: ${surface};
      }
      .${sectionClass} .border-primary {
        border-color: ${primary};
      }
    `;
  };

  if (!sectionDef) {
    console.warn(`Unknown section type: ${section.type}`);
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4 text-center">
        <div className="text-yellow-600 text-4xl mb-2">⚠️</div>
        <h3 className="text-yellow-800 font-semibold text-lg mb-2">
          Unknown Section Type
        </h3>
        <p className="text-yellow-700">
          Section type{' '}
          <code className="bg-yellow-200 px-2 py-1 rounded text-sm">
            {section.type}
          </code>{' '}
          is not defined in the shared schema.
        </p>
        <p className="text-yellow-600 text-sm mt-2">
          Available types: {Object.keys(SECTION_DEFINITIONS).join(', ')}
        </p>
      </div>
    );
  }

  // Validate section data (skip for local sections)
  let validation = { valid: true, errors: [] as string[] };
  if (!LOCAL_SECTION_DEFINITIONS.includes(section.type)) {
    validation = validateSectionData(section.type, section.data);
    if (!validation.valid) {
      console.warn(
        `Invalid section data for ${section.type}:`,
        validation.errors
      );
    }
  }

  // Get the appropriate component
  const SectionComponent = getSectionComponent(section.type);

  if (!SectionComponent) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4 text-center">
        <div className="text-red-600 text-4xl mb-2">🚫</div>
        <h3 className="text-red-800 font-semibold text-lg mb-2">
          Missing Component
        </h3>
        <p className="text-red-700">
          Section type{' '}
          <code className="bg-red-200 px-2 py-1 rounded text-sm">
            {section.type}
          </code>{' '}
          is defined but no component exists for it.
        </p>
        <p className="text-red-600 text-sm mt-2">
          Available components:{' '}
          {Object.keys(SECTION_DEFINITIONS)
            .filter((type) => getSectionComponent(type))
            .join(', ')}
        </p>
      </div>
    );
  }

  // Show validation errors in development
  if (process.env.NODE_ENV === 'development' && !validation.valid) {
    return (
      <div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 m-4">
          <h4 className="text-orange-800 font-semibold">
            Validation Issues for {section.type}:
          </h4>
          <ul className="text-orange-700 text-sm mt-2 list-disc ml-4">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
        <div className={sectionClass}>
          <style>{generateSectionCSS(sectionClass)}</style>
          <SectionComponent
            data={section.data}
            business={business}
            pageId={pageId}
            sectionId={section.id}
            styles={styles}
          />
        </div>
      </div>
    );
  }

  // Sections that should be full-width (no container)
  // Hero now has its own container, so only gallery is full-width
  const fullWidthSections = ['gallery'];
  const isFullWidth = fullWidthSections.includes(section.type);

  // Render with props that match existing section component interface
  // Special handling for hero section to pass page URL and title
  const isHeroSection = section.type === 'hero';
  const isContactCardSection = section.type === 'contactCard';
  const isLinksWithContactSection = section.type === 'linksWithContact';

  if (isPreview && section.type === 'gallery') {
    return (
      <div className={sectionClass}>
        <style>{generateSectionCSS(sectionClass)}</style>
        <MobilePreviewGallerySection data={section.data as any} />
      </div>
    );
  }

  const sectionProps = {
    data: section.data,
    business,
    pageId,
    pageTitle,
    pageSlug,
    businessSlug,
    sectionId: section.id,
    styles,
    forceMobileLayout: isPreview,
    ...(isHeroSection && { pageUrl, pageTitle, pageSlug, businessSlug, brochureSections, isPreview, companyHeaderAddress, contactCardData, referralSafeMode }),
    ...(isContactCardSection && { companyHeaderAddress }),
    ...(isLinksWithContactSection && {
      referralSafeHref: referralSafeMode ? referralHref : undefined,
    }),
  };

  return (
    <div className={sectionClass}>
      <style>{generateSectionCSS(sectionClass)}</style>
      {isFullWidth || isHeroSection ? (
        <SectionComponent {...sectionProps} />
      ) : (
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-0">
          <SectionComponent {...sectionProps} />
        </div>
      )}
    </div>
  );
};

export function EnhancedPageRenderer({
  content,
  styles,
  business,
  pageData,
  isPreview = false,
  referralSafeMode = false,
  referralHref,
}: EnhancedPageRendererProps) {
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [contactCardData, setContactCardData] = useState<any>(null);

  // Find contactCard data and companyHeader address
  const companyHeaderAddress = content?.sections?.find(s => s.type === 'companyHeader')?.data?.address as string | undefined;

  useEffect(() => {
    if (content?.sections) {
      const contactCardSection = content.sections.find(s => s.type === 'contactCard');
      if (contactCardSection?.data) {
        setContactCardData(contactCardSection.data);
      }
    }
  }, [content?.sections]);

  const openContactModal = () => {
    setContactModalVisible(true);
    setIsClosing(false);
    setIsAnimatingIn(false);
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    });
  };

  const closeContactModal = () => {
    setIsClosing(true);
    setIsAnimatingIn(false);
    // Wait for animation to complete before actually hiding
    setTimeout(() => {
      setContactModalVisible(false);
      setIsClosing(false);
    }, 300); // Match the animation duration
  };

  // Update favicon dynamically
  useEffect(() => {
    if (pageData?.favicon_image_url) {
      let link = document.querySelector(
        "link[rel*='icon']"
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = pageData.favicon_image_url;
    }
  }, [pageData?.favicon_image_url]);

  // Ensure business is not null and provide safe defaults
  const safeBusinessData = business || {
    id: '',
    name: 'Unknown Business',
    logo_url: null,
    primary_color: null,
    secondary_color: null,
    font_family: null,
    email: null,
    phone: null,
    website: null,
    street_address: null,
    city: null,
    state: null,
    zip_code: null,
    country: null,
  };

  // Create theme configuration
  const theme: ThemeConfig = {
    primary:
      safeBusinessData.primary_color ||
      styles?.primary ||
      DEFAULT_THEME.primary,
    secondary:
      safeBusinessData.secondary_color ||
      styles?.secondary ||
      DEFAULT_THEME.secondary,
    accent: DEFAULT_THEME.accent,
    background: styles?.background || DEFAULT_THEME.background,
    surface: styles?.surface || DEFAULT_THEME.surface,
    text: {
      primary: styles?.text?.primary || DEFAULT_THEME.text.primary,
      secondary: styles?.text?.secondary || DEFAULT_THEME.text.secondary,
      muted: styles?.text?.muted || DEFAULT_THEME.text.muted,
    },
    fontFamily:
      safeBusinessData.font_family ||
      DEFAULT_THEME.fontFamily,
  };

  // Create CSS custom properties for theming
  const cssVariables = {
    '--primary-color': theme.primary,
    '--secondary-color': theme.secondary,
    '--accent-color': theme.accent,
    '--background-color': theme.background,
    '--surface-color': theme.surface,
    '--surface-elevated': '#ffffff',
    '--surface-muted': 'rgba(255, 255, 255, 0.72)',
    '--surface-outline': 'rgba(15, 23, 42, 0.08)',
    '--surface-shadow': '0 22px 44px rgba(15, 23, 42, 0.08)',
    '--text-primary': theme.text.primary,
    '--text-secondary': theme.text.secondary,
    '--text-muted': theme.text.muted,
    '--font-family': theme.fontFamily,
    fontFamily: `${theme.fontFamily}, system-ui, -apple-system, sans-serif`,
    background:
      'radial-gradient(circle at top, rgba(255,255,255,0.96) 0%, rgba(245,247,250,0.98) 32%, rgba(239,243,248,1) 100%)',
    color: theme.text.primary,
  } as React.CSSProperties;

  if (!content?.sections || !Array.isArray(content.sections)) {
    return (
      <>
        <SEOHead pageData={pageData} business={safeBusinessData} referralSafeMode={referralSafeMode} />
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: theme.surface }}
        >
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-6xl mb-4">📄</div>
            <h1
              className="text-2xl font-bold mb-4"
              style={{ color: theme.text.primary }}
            >
              Page Content Not Available
            </h1>
            <p style={{ color: theme.text.secondary }} className="mb-6">
              This page doesn&apos;t have any content to display yet.
            </p>
            <div className="text-sm text-gray-500 bg-gray-100 rounded-lg p-4">
              <p>
                <strong>Page ID:</strong> {pageData.id}
              </p>
              <p>
                <strong>Title:</strong> {pageData.title}
              </p>
              <p>
                <strong>Sections:</strong> {content?.sections?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const contactModalContextValue = {
    openContactModal,
    contactCardData,
  };
  const pageFeatureSettings = getPageEngagementSettings(
    pageData.publish_settings as Record<string, unknown> | null | undefined
  );
  const hasConfiguredLeadAction =
    pageFeatureSettings.includeInstaConnect || pageFeatureSettings.includeScheduleMeeting;
  const showLeadActions =
    hasConfiguredLeadAction &&
    (referralSafeMode
      ? content.sections.some((section) => section.type === 'companyHeader')
      : pageSupportsLeadActions(content.sections));

  return (
    <>
      <SEOHead pageData={pageData} business={safeBusinessData} referralSafeMode={referralSafeMode} />
      <ThemeContext.Provider value={theme}>
        <ContactModalContext.Provider value={contactModalContextValue}>
          <div
            style={cssVariables}
            className={`${isPreview ? 'min-h-full block' : 'min-h-screen flex flex-col'}`}
          >
            <style>{`
              .page-shell-panel {
                background: var(--surface-muted);
                border: 1px solid var(--surface-outline);
                box-shadow: var(--surface-shadow);
                backdrop-filter: blur(18px);
              }
            `}</style>
            <div className={`${isPreview ? 'pb-12' : 'flex-1 pb-12'}`}>
              {content.sections.map((section, index) => (
                <React.Fragment key={section.id || `section-${index}`}>
                  <EnhancedSectionRenderer
                    section={section}
                    business={safeBusinessData}
                    pageId={pageData.id}
                    styles={section.styles || (styles as unknown as SectionStyles)}
                    pageUrl={typeof window !== 'undefined' ? window.location.href : ''}
                    pageTitle={pageData.title}
                    pageSlug={pageData.slug}
                    businessSlug={(safeBusinessData as BusinessData & { slug?: string }).slug}
                    brochureSections={content.sections}
                    isPreview={isPreview}
                    companyHeaderAddress={companyHeaderAddress}
                    contactCardData={contactCardData}
                    referralSafeMode={referralSafeMode}
                    referralHref={referralHref}
                  />
                  {showLeadActions && section.type === 'companyHeader' && (
                    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-0">
                      <PageEngagementActions
                        pageId={pageData.id}
                        pageTitle={pageData.title}
                        includeInstaConnect={pageFeatureSettings.includeInstaConnect}
                        includeScheduleMeeting={pageFeatureSettings.includeScheduleMeeting}
                        forceMobileLayout={isPreview}
                        referralSafeHref={referralSafeMode ? referralHref : undefined}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Contact Modal - rendered at top level with high z-index */}
          {!referralSafeMode && contactModalVisible && contactCardData ? (
            <div
              className="fixed inset-0 flex items-end justify-center bg-black/50 z-[999999]"
              onClick={closeContactModal}
            >
              <div
                className="bg-white w-full max-w-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black">Contact Information</h3>
                  <button
                    onClick={closeContactModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  {/* Logo/Photo */}
                  {contactCardData.logo && (
                    <div className="flex justify-center mb-6">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${contactCardData.logo}`}
                          alt={contactCardData.contactName || 'Contact'}
                          fill
                          sizes="96px"
                          className="object-contain p-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Contact Name & Role */}
                  {contactCardData.contactName && (
                    <div className="text-center mb-6">
                      <h4 className="text-2xl font-bold text-black mb-1">
                        {contactCardData.contactName}
                      </h4>
                      {contactCardData.contactRole && (
                        <p className="text-lg text-gray-600">
                          {contactCardData.contactRole}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Community Name */}
                  {contactCardData.communityName && (
                    <div className="mb-6">
                      <p className="text-center text-gray-700 font-medium">
                        {contactCardData.communityName}
                      </p>
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="space-y-4">
                    {contactCardData.phone && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Phone</span>
                        <a
                          href={`tel:${contactCardData.phone}`}
                          className="text-[#63b5f7] hover:underline font-semibold"
                        >
                          {contactCardData.phone}
                        </a>
                      </div>
                    )}

                    {contactCardData.personalPhone && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Personal Phone</span>
                        <a
                          href={`tel:${contactCardData.personalPhone}`}
                          className="text-[#63b5f7] hover:underline font-semibold"
                        >
                          {contactCardData.personalPhone}
                        </a>
                      </div>
                    )}

                    {contactCardData.fax && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Fax</span>
                        <span className="text-black font-semibold">{contactCardData.fax}</span>
                      </div>
                    )}

                    {contactCardData.email && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Email</span>
                        <a
                          href={`mailto:${contactCardData.email}`}
                          className="text-[#63b5f7] hover:underline font-semibold"
                        >
                          {contactCardData.email}
                        </a>
                      </div>
                    )}

                    {contactCardData.link && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Website</span>
                        <a
                          href={contactCardData.link.startsWith('http') ? contactCardData.link : `https://${contactCardData.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#63b5f7] hover:underline font-semibold"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}

                    {contactCardData.address && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium block mb-2">Address</span>
                        <p className="text-black font-semibold">{contactCardData.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </ContactModalContext.Provider>
      </ThemeContext.Provider>
    </>
  );
}

// Export utilities for use in other components
export const getAvailableSectionTypes = () => {
  return Object.keys(SECTION_DEFINITIONS);
};

export const getSectionIcon = (
  sectionType: string,
  platform: 'mobile' | 'web' = 'web'
) => {
  const definition = getLocalSectionDefinition(sectionType);
  return definition?.icon[platform] || 'help-circle';
};

export const getSectionCategories = () => {
  const categories = new Set<string>();
  Object.values(SECTION_DEFINITIONS).forEach((def) => {
    categories.add(def.category);
  });
  return Array.from(categories);
};

// Debug utilities
export const debugSectionValidation = (pageContent: PageContent) => {
  const results = pageContent.sections.map((section) => {
    const validation = LOCAL_SECTION_DEFINITIONS.includes(section.type)
      ? { valid: true, errors: [] as string[] }
      : validateSectionData(section.type, section.data);
    return {
      sectionId: section.id,
      sectionType: section.type,
      isValid: validation.valid,
      errors: validation.errors,
      hasDefinition: !!getLocalSectionDefinition(section.type),
      hasComponent: !!getSectionComponent(section.type),
    };
  });

  console.table(results);
  return results;
};
