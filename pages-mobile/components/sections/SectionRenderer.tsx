import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PageSection, PageStyles } from '../../types/page-builder.types';
import { ContactSection } from './ContactSection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';
import { MultiContactSection } from './MultiContactSection';

interface SectionRendererProps {
  section: PageSection;
  pageStyles?: PageStyles;
  onButtonPress?: (link: string) => void;
}

export function SectionRenderer({ section, pageStyles, onButtonPress }: SectionRendererProps) {
  // Map section types to components
  const sectionComponents: Record<string, React.ComponentType<any>> = {
    hero: HeroSection,
    contact: ContactSection,
    multiContact: MultiContactSection,
    features: FeaturesSection,
    // Add more section types as we create them
    // about: AboutSection,
    // gallery: GallerySection,
    // testimonials: TestimonialsSection,
    // cta: CTASection,
    // faq: FAQSection,
    // documents: DocumentsSection,
    // social: SocialSection,
  };

  const SectionComponent = sectionComponents[section.type];

  if (!SectionComponent) {
    return (
      <View style={styles.unknownSection}>
        <Text style={styles.unknownText}>Unknown section type: {section.type}</Text>
      </View>
    );
  }

  // Build custom styles based on page styles
  const customStyles = pageStyles ? {
    title: {
      fontFamily: pageStyles.fonts?.heading,
      color: section.type === 'hero' ? '#fff' : pageStyles.colors?.primary,
    },
    subtitle: {
      fontFamily: pageStyles.fonts?.body,
    },
    text: {
      fontFamily: pageStyles.fonts?.body,
    },
    button: pageStyles.colors?.primary ? {
      backgroundColor: pageStyles.colors.primary,
    } : undefined,
  } : undefined;

  return (
    <SectionComponent 
      section={section} 
      styles={customStyles}
      onButtonPress={onButtonPress}
    />
  );
}

const styles = StyleSheet.create({
  unknownSection: {
    padding: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  unknownText: {
    color: '#666',
    fontStyle: 'italic',
  },
}); 