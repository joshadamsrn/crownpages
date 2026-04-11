import { getIconForPlatform } from "@crown-pages/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Import styled digitalBrochure components for pixel-perfect rendering
import CompanyHeader from '../digitalBrochure/companyHeader';
import ContactCard from '../digitalBrochure/contact';
import AmenitiesSection from '../digitalBrochure/amenitiesSection';
import { AboutSection } from '../digitalBrochure/aboutSection';
import HeroSection from '../digitalBrochure/heroSection';
import LinksTable from '../digitalBrochure/linksTable';
import MediaGallery from '../digitalBrochure/gallery/mediaGallery';
import ContactInfoPage from '../digitalBrochure/contactInfoPage';
import SwipableModalComponent from '../common/SwipableModal';

type SectionRendererProps = {
  section: any;
  handleButtonClick: (link: string) => void;
  contactCardData?: any;
  onContactPress?: () => void;
  showContactButton?: boolean;
};

// Hero Renderer - uses styled HeroSection component
export const HeroRenderer = ({ section }: SectionRendererProps) => (
  <HeroSection
    heroImageUrl={section.data.backgroundImage || section.data.heroImage}
    logoUrl={section.data.logoUrl || section.data.logo}
  />
);

// About Renderer - uses styled AboutSection component with collapsible feature
export const AboutRenderer = ({ section }: SectionRendererProps) => (
  <AboutSection aboutContent={section.data.content || ''} />
);

// Company Header Renderer - uses styled CompanyHeader component
export const CompanyHeaderRenderer = ({ section }: SectionRendererProps) => (
  <CompanyHeader
    companyName={section.data.companyName || ''}
    address={section.data.address}
    mapUrl={section.data.mapUrl}
  />
);

// Contact Card Renderer - uses styled ContactCard component
export const ContactCardRenderer = ({ section }: SectionRendererProps) => (
  <ContactCard
    name={section.data.name || ''}
    role={section.data.role}
    imageUrl={section.data.imageUrl}
    phone={section.data.phone}
    email={section.data.email}
    address={section.data.address}
  />
);

// Amenities Renderer - uses styled AmenitiesSection component
export const AmenitiesRenderer = ({ section }: SectionRendererProps) => (
  <AmenitiesSection
    amenities={section.data.amenities || []}
    itemsPerColumn={section.data.itemsPerColumn || 3}
    title={section.data.title}
  />
);

// Links With Contact Renderer - combines LinksTable with Contact button
export const LinksWithContactRenderer = ({ section, onContactPress, showContactButton }: SectionRendererProps) => {
  return (
    <View style={linksContactStyles.section}>
      <LinksTable
        links={section.data.links || []}
        title={section.data.title}
      />

      {showContactButton && onContactPress && (
        <TouchableOpacity
          style={linksContactStyles.contactButton}
          onPress={onContactPress}
        >
          <Text style={linksContactStyles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Gallery Renderer - uses styled MediaGallery component
export const GalleryRenderer = ({ section }: SectionRendererProps) => {
  // Combine images and videos arrays into single mediaItems array
  const images = (section.data.images || []).map((img: any) => ({
    id: img.id,
    url: img.url,
    type: 'image' as const,
    thumbnail: img.thumbnail,
  }));

  const videos = (section.data.videos || []).map((vid: any) => ({
    id: vid.id,
    url: vid.url,
    type: 'video' as const,
    thumbnail: vid.thumbnail,
  }));

  const mediaItems = [...images, ...videos];

  return <MediaGallery mediaItems={mediaItems} />;
};

// Personal Contact Renderer - displays contact modal content inline
export const PersonalContactRenderer = ({ section }: SectionRendererProps) => {
  const userData = {
    contactName: section.data.name || '',
    contactRole: section.data.title || '',
    phone: section.data.phone || '',
    email: section.data.email || '',
    link: section.data.website || '',
    logo: section.data.photo || '',
    // Additional fields that ContactInfoPage supports
    fax: section.data.fax || '',
    personalPhone: section.data.personalPhone || '',
    communityName: section.data.communityName || '',
    address: section.data.address || '',
  };

  return <ContactInfoPage userData={userData} />;
};

// === Keep existing renderers for other section types ===

export const ContactRenderer = ({ section }: SectionRendererProps) => (
  <View style={styles.contactSection}>
    {section.data.title && (
      <Text style={styles.sectionTitle}>{section.data.title}</Text>
    )}
    {section.data.phone && (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => console.log('Phone link disabled:', section.data.phone)}
      >
        <Ionicons name="call-outline" size={20} color="#007AFF" />
        <Text style={styles.contactText}>{section.data.phone}</Text>
      </TouchableOpacity>
    )}
    {section.data.email && (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => console.log('Email link disabled:', section.data.email)}
      >
        <Ionicons name="mail-outline" size={20} color="#007AFF" />
        <Text style={styles.contactText}>{section.data.email}</Text>
      </TouchableOpacity>
    )}
    {section.data.address && (
      <View style={styles.contactItem}>
        <Ionicons name="location-outline" size={20} color="#007AFF" />
        <Text style={styles.contactText}>{section.data.address}</Text>
      </View>
    )}
  </View>
);

export const FeaturesRenderer = ({ section }: SectionRendererProps) => (
  <View style={styles.featuresSection}>
    {section.data.title && (
      <Text style={styles.sectionTitle}>{section.data.title}</Text>
    )}
    <View style={styles.featuresGrid}>
      {section.data.features?.map((feature: any) => (
        <View key={feature.id} style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons
              name={getIconForPlatform(feature.icon, "mobile") as any}
              size={32}
              color="#007AFF"
            />
          </View>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      ))}
    </View>
  </View>
);

export const TestimonialsRenderer = ({ section }: SectionRendererProps) => (
  <View style={styles.testimonialsSection}>
    {section.data.title && (
      <Text style={styles.sectionTitle}>{section.data.title}</Text>
    )}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.testimonialsScroll}
    >
      {section.data.testimonials?.map((testimonial: any) => (
        <View key={testimonial.id} style={styles.testimonialCard}>
          <View style={styles.testimonialRating}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < testimonial.rating ? "star" : "star-outline"}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
          <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
          <View style={styles.testimonialAuthor}>
            <Text style={styles.testimonialName}>{testimonial.name}</Text>
            {testimonial.position && (
              <Text style={styles.testimonialPosition}>
                {testimonial.position}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
);

export const FAQRenderer = ({ section }: SectionRendererProps) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set()
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <View style={styles.faqSection}>
      {section.data.title && (
        <Text style={styles.sectionTitle}>{section.data.title}</Text>
      )}
      {section.data.questions?.map((qa: any) => (
        <TouchableOpacity
          key={qa.id}
          style={styles.faqItem}
          onPress={() => toggleExpanded(qa.id)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{qa.question}</Text>
            <Ionicons
              name={expandedItems.has(qa.id) ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
          {expandedItems.has(qa.id) && (
            <Text style={styles.faqAnswer}>{qa.answer}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const CTARenderer = ({
  section,
  handleButtonClick,
}: SectionRendererProps) => (
  <View style={styles.ctaSection}>
    <Text style={styles.ctaTitle}>{section.data.title}</Text>
    {section.data.description && (
      <Text style={styles.ctaDescription}>{section.data.description}</Text>
    )}
    {section.data.button && (
      <TouchableOpacity
        style={styles.ctaPrimaryButton}
        onPress={() => handleButtonClick(section.data.button.link)}
      >
        <Text style={styles.ctaPrimaryButtonText}>
          {section.data.button.text}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// Styles (only for non-digitalBrochure components)
const styles = StyleSheet.create({
  contactSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  contactText: {
    fontSize: 16,
    color: "#333",
  },
  featuresSection: {
    padding: 24,
  },
  featuresGrid: {
    gap: 16,
  },
  featureItem: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  testimonialsSection: {
    paddingVertical: 24,
  },
  testimonialsScroll: {
    paddingHorizontal: 24,
  },
  testimonialCard: {
    width: 300,
    backgroundColor: "#f8f8f8",
    padding: 20,
    borderRadius: 12,
    marginRight: 16,
  },
  testimonialRating: {
    flexDirection: "row",
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 16,
    fontStyle: "italic",
  },
  testimonialAuthor: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: "600",
  },
  testimonialPosition: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  faqSection: {
    padding: 24,
  },
  faqItem: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },
  documentsSection: {
    padding: 24,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "500",
  },
  documentSize: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  ctaSection: {
    padding: 32,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaDescription: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.9,
  },
  ctaPrimaryButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  ctaPrimaryButtonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

// Styles for LinksWithContact section
const linksContactStyles = StyleSheet.create({
  section: {
    marginBottom: 40, // Extra space to clear mobile browser bottom bars
  },
  contactButton: {
    backgroundColor: "#63b5f7",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#63b5f7",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  contactButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

// ─── Social Links Renderer ───────────────────────────────────────────────────

const SOCIAL_CONFIG: Record<string, { color: string; bgColor: string; ionicon: string }> = {
  facebook:  { color: '#fff', bgColor: '#1877F2', ionicon: 'logo-facebook' },
  instagram: { color: '#fff', bgColor: '#E4405F', ionicon: 'logo-instagram' },
  twitter:   { color: '#fff', bgColor: '#1DA1F2', ionicon: 'logo-twitter' },
  x:         { color: '#fff', bgColor: '#000000', ionicon: 'logo-twitter' },
  linkedin:  { color: '#fff', bgColor: '#0A66C2', ionicon: 'logo-linkedin' },
  youtube:   { color: '#fff', bgColor: '#FF0000', ionicon: 'logo-youtube' },
  tiktok:    { color: '#fff', bgColor: '#010101', ionicon: 'logo-tiktok' },
  pinterest: { color: '#fff', bgColor: '#E60023', ionicon: 'logo-pinterest' },
  snapchat:  { color: '#000', bgColor: '#FFFC00', ionicon: 'logo-snapchat' },
  whatsapp:  { color: '#fff', bgColor: '#25D366', ionicon: 'logo-whatsapp' },
  website:   { color: '#fff', bgColor: '#007AFF', ionicon: 'globe-outline' },
  other:     { color: '#fff', bgColor: '#555', ionicon: 'link-outline' },
};

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', twitter: 'Twitter', x: 'X',
  linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', pinterest: 'Pinterest',
  snapchat: 'Snapchat', whatsapp: 'WhatsApp', website: 'Website', other: 'Link',
};

export const SocialLinksRenderer = ({ section, handleButtonClick }: SectionRendererProps) => {
  const { title, links = [] } = section.data;
  const visibleLinks = (links as any[]).filter((l: any) => l.url?.trim());

  if (visibleLinks.length === 0) return null;

  return (
    <View style={socialStyles.container}>
      {title ? <Text style={socialStyles.title}>{title}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={socialStyles.row}
      >
        {visibleLinks.map((link: any) => {
          const config = SOCIAL_CONFIG[link.platform] ?? SOCIAL_CONFIG.other;
          const label = link.label || SOCIAL_LABELS[link.platform] || 'Link';
          const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
          return (
            <TouchableOpacity
              key={link.id}
              style={socialStyles.tile}
              onPress={() => handleButtonClick(href)}
              activeOpacity={0.8}
            >
              <View style={[socialStyles.iconBox, { backgroundColor: config.bgColor }]}>
                <Ionicons name={config.ionicon as any} size={28} color={config.color} />
              </View>
              <Text style={socialStyles.label} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const socialStyles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 16,
  },
  tile: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#444',
    textAlign: 'center',
    maxWidth: 64,
  },
});
