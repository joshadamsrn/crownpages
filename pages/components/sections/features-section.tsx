import React from "react";
import * as LucideIcons from "lucide-react";
import { BusinessData } from '@crown-pages/types';
import { useTheme } from "../page-renderer";
import { SectionStyles, ThemeConfig } from "@/types";
import { getIconForPlatform } from "@crown-pages/types";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

interface FeaturesData {
  title?: string;
  features: Feature[];
}

interface FeaturesSectionProps {
  data: FeaturesData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

const getDefaultIcon = (theme: ThemeConfig, sectionStyle?: SectionStyles) => (
  <LucideIcons.Zap
    className="w-8 h-8"
    style={{ color: sectionStyle && sectionStyle.primary ? sectionStyle.primary : theme.primary }}
  />
);

export function FeaturesSection({ data, styles }: FeaturesSectionProps) {
  const { title, features } = data;
  const theme = useTheme();

  if (!features || features.length === 0) {
    return null;
  }

  const renderIcon = (iconName: string) => {
    const lucideIconName = getIconForPlatform(iconName, "web");
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[
      lucideIconName.charAt(0).toUpperCase() + lucideIconName.slice(1)
    ];
    return IconComponent ? <IconComponent className="w-8 h-8" /> : getDefaultIcon(theme, styles);
  };

  return (
    <section className="py-16 px-4" style={{ backgroundColor: styles?.surface || theme.surface }}>
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-12 text-center"
            style={{
              color: styles?.text?.primary || theme.text.primary,
            }}
          >
            {title}
          </h2>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: styles?.background || theme.background }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: `${styles?.primary ? styles?.primary : theme.primary
                    }10`,
                }}
              >
                {feature.icon ? (
                  renderIcon(feature.icon)
                ) : (
                  getDefaultIcon(theme, styles)
                )}
              </div>

              <h3
                className="text-xl font-semibold mb-3"
                style={{
                  color: styles?.text?.primary
                    ? styles?.text?.primary
                    : theme.text.primary,
                }}
              >
                {feature.title}
              </h3>

              <p
                className="leading-relaxed"
                style={{
                  color: styles?.text?.secondary
                    ? styles?.text?.secondary
                    : theme.text.secondary,
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
