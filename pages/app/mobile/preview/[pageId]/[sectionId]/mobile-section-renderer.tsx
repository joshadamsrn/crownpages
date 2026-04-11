"use client";

import React, { createContext, useEffect, useRef, useMemo } from "react";
import {
  SectionData,
  EnhancedSectionRenderer,
} from "@/components/enhanced-page-renderer";
import { ThemeConfig, DEFAULT_THEME, SectionStyles } from "@/types";
import type { Database } from "@/database.types";

// Import section components directly for individual rendering
import { HeroSection } from "@/components/sections/hero-section";
import { AboutSection } from "@/components/sections/about-section";
import { ContactSection } from "@/components/sections/contact-section";
import { PersonalContactSection } from "@/components/sections/personal-contact-section";
import { MultiContactSection } from "@/components/sections/multi-contact-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { GallerySection } from "@/components/sections/gallery-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { FAQSection } from "@/components/sections/faq-section";
import { DocumentsSection } from "@/components/sections/documents-section";
import { CTASection } from "@/components/sections/cta-section";
import { BusinessData } from "@crown-pages/types";
import { LinksSection } from "@/components/sections/links-section";
import { MedicalProviderSection } from "@/components/sections/medical-provider-section";
import { CompanyHeaderSection } from "@/components/sections/company-header-section";
import { ContactCardSection } from "@/components/sections/contact-card-section";
import { AmenitiesSection } from "@/components/sections/amenities-section";

const mobileSectionComponents = {
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
  medicalProvider: MedicalProviderSection,
  companyHeader: CompanyHeaderSection,
  contactCard: ContactCardSection,
  amenities: AmenitiesSection,
};

const MobileThemeContext = createContext<ThemeConfig>(DEFAULT_THEME);

interface MobileSectionRendererProps {
  section: SectionData;
  business: BusinessData;
  pageData: Database["public"]["Tables"]["pages"]["Row"];
  styles: Record<string, string>;
}

// Safe style injection function
function injectThemeStyles(theme: ThemeConfig): void {
  try {
    // Check if we can safely create style elements
    if (typeof document === "undefined") return;

    // Remove existing mobile preview styles
    const existingStyle = document.getElementById(
      "mobile-preview-theme-styles"
    );
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject new styles
    const styleElement = document.createElement("style");
    styleElement.id = "mobile-preview-theme-styles";
    styleElement.textContent = `
      .mobile-section-preview .btn-primary {
        background-color: ${theme.primary};
        color: ${theme.background};
        border: 1px solid ${theme.primary};
      }
      .mobile-section-preview .btn-primary:hover {
        background-color: ${theme.secondary};
        border-color: ${theme.secondary};
      }
      .mobile-section-preview .btn-secondary {
        background-color: transparent;
        color: ${theme.primary};
        border: 1px solid ${theme.primary};
      }
      .mobile-section-preview .btn-secondary:hover {
        background-color: ${theme.primary};
        color: ${theme.background};
      }
      .mobile-section-preview .text-primary {
        color: ${theme.primary};
      }
      .mobile-section-preview .text-secondary {
        color: ${theme.text.secondary};
      }
      .mobile-section-preview .text-muted {
        color: ${theme.text.muted};
      }
      .mobile-section-preview .bg-primary {
        background-color: ${theme.primary};
      }
      .mobile-section-preview .bg-surface {
        background-color: ${theme.surface};
      }
      .mobile-section-preview .border-primary {
        border-color: ${theme.primary};
      }
    `;

    document.head.appendChild(styleElement);
  } catch (error) {
    console.warn("Could not inject theme styles:", error);
    // Continue without custom styles
  }
}

export function MobileSectionRenderer({
  section,
  business,
  pageData,
  styles,
}: MobileSectionRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Create theme configuration with business colors - memoized to prevent useEffect dependency changes
  const theme: ThemeConfig = useMemo(
    () => ({
      primary: business.primary_color || DEFAULT_THEME.primary,
      secondary: business.secondary_color || DEFAULT_THEME.secondary,
      accent: DEFAULT_THEME.accent,
      background: DEFAULT_THEME.background,
      surface: DEFAULT_THEME.surface,
      text: DEFAULT_THEME.text,
      fontFamily: business.font_family || DEFAULT_THEME.fontFamily,
    }),
    [business.primary_color, business.secondary_color, business.font_family]
  );

  // Inject theme styles safely
  useEffect(() => {
    // injectThemeStyles(theme);

    // Cleanup on unmount
    return () => {
      try {
        const styleElement = document.getElementById(
          "mobile-preview-theme-styles"
        );
        if (styleElement) {
          styleElement.remove();
        }
      } catch (error) {
        console.warn("Could not cleanup theme styles:", error);
      }
    };
  }, [theme]);

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

  const SectionComponent =
    mobileSectionComponents[
    section.type as keyof typeof mobileSectionComponents
    ];

  if (!SectionComponent) {
    return (
      <div
        className="p-8 text-center"
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
    <MobileThemeContext.Provider value={theme}>
      <div
        ref={containerRef}
        className="mobile-section-preview"
        style={cssVariables}
      >


        <EnhancedSectionRenderer
          section={section}
          business={business}
          pageId={pageData.id}
          styles={section.styles || (styles as unknown as SectionStyles)}
        />
      </div>
    </MobileThemeContext.Provider>
  );
}
