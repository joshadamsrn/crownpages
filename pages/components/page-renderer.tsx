"use client";

/**
 * PageRenderer - Renders CrownPages with consistent theming
 *
 * Features:
 * - Default light theme with professional blue accent
 * - Theme context available to all child components via useTheme()
 * - Predefined theme presets (light, blue, green, purple, rose)
 * - Fallback to light theme when no business colors are provided
 * - CSS custom properties for easy styling
 *
 * Theme Structure:
 * - primary: Main brand color (buttons, accents)
 * - secondary: Darker variant of primary
 * - accent: Secondary accent color
 * - background: Main background (white)
 * - surface: Subtle background (light gray)
 * - text.primary: Main text color
 * - text.secondary: Secondary text color
 * - text.muted: Muted/disabled text color
 */

import React, { createContext, useContext } from "react";
import { HeroSection } from "./sections/hero-section";
import { AboutSection } from "./sections/about-section";
import { ContactSection } from "./sections/contact-section";
import { PersonalContactSection } from "./sections/personal-contact-section";
import { FeaturesSection } from "./sections/features-section";
import { GallerySection } from "./sections/gallery-section";
import { TestimonialsSection } from "./sections/testimonials-section";
import { FAQSection } from "./sections/faq-section";
import { DocumentsSection } from "./sections/documents-section";
import { CTASection } from "./sections/cta-section";
import type { Database } from "@/database.types";
import { SectionStyles } from "@/types";
import { ThemeConfig, DEFAULT_THEME } from '@/types';
import { BusinessData } from "@crown-pages/types";

export interface SectionData {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles?: SectionStyles;
}

export interface PageContent {
  sections: SectionData[];
}

// export interface BusinessData {
//   id: string;
//   name: string;
//   logo_url: string | null;
//   primary_color: string | null;
//   secondary_color: string | null;
//   font_family: string | null;
//   email: string | null;
//   phone: string | null;
//   website: string | null;
//   street_address: string | null;
//   city: string | null;
//   state: string | null;
//   zip_code: string | null;
//   country: string | null;
// }

interface PageRendererProps {
  content: PageContent;
  styles?: SectionStyles;
  business: BusinessData | null;
  pageData: Database["public"]["Tables"]["pages"]["Row"];
}

const ThemeContext = createContext<ThemeConfig>(DEFAULT_THEME);

export const useTheme = () => useContext(ThemeContext);

const sectionComponents = {
  hero: HeroSection,
  about: AboutSection,
  contact: ContactSection,
  personalContact: PersonalContactSection,
  features: FeaturesSection,
  gallery: GallerySection,
  testimonials: TestimonialsSection,
  faq: FAQSection,
  documents: DocumentsSection,
  cta: CTASection,
};

export function PageRenderer({
  content,
  styles,
  business,
  pageData,
}: PageRendererProps) {
  // Ensure business is not null and provide safe defaults
  const safeBusinessData = business || {
    id: "",
    name: "Unknown Business",
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

  // Create theme configuration with better defaults
  const theme: ThemeConfig = {
    primary: safeBusinessData.primary_color || DEFAULT_THEME.primary,
    secondary: safeBusinessData.secondary_color || DEFAULT_THEME.secondary,
    accent: DEFAULT_THEME.accent,
    background: DEFAULT_THEME.background,
    surface: DEFAULT_THEME.surface,
    text: DEFAULT_THEME.text,
    fontFamily: safeBusinessData.font_family || DEFAULT_THEME.fontFamily,
  };

  // Create CSS custom properties for theming
  const cssVariables = {
    "--primary-color": theme.primary,
    "--secondary-color": theme.secondary,
    "--accent-color": theme.accent,
    "--background-color": theme.background,
    "--surface-color": theme.surface,
    "--text-primary": theme.text.primary,
    "--text-secondary": theme.text.secondary,
    "--text-muted": theme.text.muted,
    "--font-family": theme.fontFamily,
    fontFamily: `${theme.fontFamily}, system-ui, -apple-system, sans-serif`,
    backgroundColor: theme.background,
    color: theme.text.primary,
  } as React.CSSProperties;

  if (!content?.sections || !Array.isArray(content.sections)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.surface }}
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: theme.text.primary }}
          >
            Page Content Not Available
          </h1>
          <p style={{ color: theme.text.secondary }}>
            This page doesn&apos;t have any content to display.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div className="page-renderer min-h-screen" style={cssVariables}>
        {content.sections.map((section, index) => {
          const sectionTheme = section?.styles;
          const SectionComponent =
            sectionComponents[section.type as keyof typeof sectionComponents];

          const sectionId = section.id || `section-${index}`;
          const sectionClass = `section-${index}`;

          if (!SectionComponent) {
            return (
              <div
                key={sectionId}
                className="py-8 px-4"
                style={{
                  backgroundColor: "#FEF3C7",
                  borderColor: "#F59E0B",
                  color: "#92400E",
                }}
              >
                <p>
                  Unknown section type:{" "}
                  <code
                    style={{
                      backgroundColor: "#FDE68A",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {section.type}
                  </code>
                </p>
              </div>
            );
          }

          return (
            <div key={sectionId} className={sectionClass}>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
            .${sectionClass} .btn-primary {
              background-color: ${sectionTheme?.primary ?? theme.primary};
              color: ${sectionTheme?.background ?? theme.background};
              border: 1px solid ${sectionTheme?.primary ?? theme.primary};
            }
            .${sectionClass} .btn-primary:hover {
              background-color: ${sectionTheme?.secondary ?? theme.secondary};
              border-color: ${sectionTheme?.secondary ?? theme.secondary};
            }
            .${sectionClass} .btn-secondary {
              background-color: transparent;
              color: ${sectionTheme?.primary ?? theme.primary};
              border: 1px solid ${sectionTheme?.primary ?? theme.primary};
            }
            .${sectionClass} .btn-secondary:hover {
              background-color: ${sectionTheme?.primary ?? theme.primary};
              color: ${sectionTheme?.background ?? theme.background};
            }
            .${sectionClass} .text-primary {
              color: ${sectionTheme?.primary ?? theme.primary};
            }
            .${sectionClass} .text-secondary {
              color: ${sectionTheme?.text?.secondary ?? theme.text.secondary};
            }
            .${sectionClass} .text-muted {
              color: ${sectionTheme?.text?.muted ?? theme.text.muted};
            }
            .${sectionClass} .bg-primary {
              background-color: ${sectionTheme?.primary ?? theme.primary};
            }
            .${sectionClass} .bg-surface {
              background-color: ${sectionTheme?.surface ?? theme.surface};
            }
            .${sectionClass} .border-primary {
              border-color: ${sectionTheme?.primary ?? theme.primary};
            }
          `,
                }}
              />
              <SectionComponent
                data={section.data as never}
                business={safeBusinessData}
                pageId={pageData.id}
                sectionId={section.id}
                styles={sectionTheme ? sectionTheme : styles}
              />
            </div>
          );
        })}
      </div>
    </ThemeContext.Provider>
  );
}
