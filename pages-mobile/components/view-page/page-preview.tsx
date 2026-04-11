// Native page preview component that renders sections using digitalBrochure components
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useViewPage } from '../../contexts/ViewPageContext';
import SwipableModalComponent from '../common/SwipableModal';
import ContactInfoPage from '../digitalBrochure/contactInfoPage';
import {
  HeroRenderer,
  AboutRenderer,
  CompanyHeaderRenderer,
  ContactCardRenderer,
  AmenitiesRenderer,
  LinksWithContactRenderer,
  GalleryRenderer,
  PersonalContactRenderer,
  ContactRenderer,
  FeaturesRenderer,
  TestimonialsRenderer,
  FAQRenderer,
  CTARenderer,
  SocialLinksRenderer,
} from './section-renderers';

interface PagePreviewProps {
  sections: any[];
  pageTitle?: string;
  showHeader?: boolean;
  onBack?: () => void;
}

export const PagePreview: React.FC<PagePreviewProps> = ({
  sections,
  pageTitle = 'Preview',
  showHeader = true,
  onBack,
}) => {
  const router = useRouter();
  const { setCompanyName, setMediaItems } = useViewPage();
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactCardData, setContactCardData] = useState<any>(null);

  // Extract and set page data from sections when they change
  useEffect(() => {
    if (!sections || sections.length === 0) return;

    // Find company name from companyHeader section
    const companyHeaderSection = sections.find(s => s.type === 'companyHeader');
    if (companyHeaderSection?.data?.companyName) {
      setCompanyName(companyHeaderSection.data.companyName);
    }

    // Find media items from gallery section
    const gallerySection = sections.find(s => s.type === 'gallery');
    if (gallerySection?.data) {
      const images = (gallerySection.data.images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        type: 'image' as const,
        thumbnail: img.thumbnail,
      }));

      const videos = (gallerySection.data.videos || []).map((vid: any) => ({
        id: vid.id,
        url: vid.url,
        type: 'video' as const,
        thumbnail: vid.thumbnail,
      }));

      setMediaItems([...images, ...videos]);
    }

    // Find contactCard section data for the contact modal
    const contactCardSection = sections.find(s => s.type === 'contactCard');
    if (contactCardSection?.data) {
      setContactCardData(contactCardSection.data);
    }

    // Also check linksWithContact section for contact data
    const linksWithContactSection = sections.find(s => s.type === 'linksWithContact');
    if (linksWithContactSection?.data?.contactName) {
      setContactCardData({
        name: linksWithContactSection.data.contactName,
        role: linksWithContactSection.data.contactRole,
        phone: linksWithContactSection.data.contactPhone,
        email: linksWithContactSection.data.contactEmail,
        imageUrl: linksWithContactSection.data.contactImageUrl,
        status: linksWithContactSection.data.contactStatus,
      });
    }
  }, [sections, setCompanyName, setMediaItems]);

  const openContactModal = () => {
    setContactModalVisible(true);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleButtonClick = (link: string) => {
    console.log('Button clicked:', link);
    // Handle link clicks - could open browser, make calls, etc.
  };

  const renderSection = (section: any, index: number) => {
    if (!section || !section.type) {
      console.warn('Invalid section:', section);
      return null;
    }

    const sectionProps = {
      section,
      handleButtonClick,
    };

    try {
      switch (section.type) {
        case 'hero':
          return <HeroRenderer key={section.id || index} {...sectionProps} />;

        case 'companyHeader':
          return <CompanyHeaderRenderer key={section.id || index} {...sectionProps} />;

        case 'contactCard':
          return <ContactCardRenderer key={section.id || index} {...sectionProps} />;

        case 'gallery':
          return <GalleryRenderer key={section.id || index} {...sectionProps} />;

        case 'about':
          return <AboutRenderer key={section.id || index} {...sectionProps} />;

        case 'amenities':
          return <AmenitiesRenderer key={section.id || index} {...sectionProps} />;

        case 'linksWithContact':
          return <LinksWithContactRenderer key={section.id || index} {...sectionProps} onContactPress={openContactModal} showContactButton={!!contactCardData} />;

        case 'personalContact':
          return <PersonalContactRenderer key={section.id || index} {...sectionProps} />;

        case 'contact':
          return <ContactRenderer key={section.id || index} {...sectionProps} />;

        case 'features':
          return <FeaturesRenderer key={section.id || index} {...sectionProps} />;

        case 'testimonials':
          return <TestimonialsRenderer key={section.id || index} {...sectionProps} />;

        case 'faq':
          return <FAQRenderer key={section.id || index} {...sectionProps} />;

        case 'cta':
          return <CTARenderer key={section.id || index} {...sectionProps} />;

        case 'socialLinks':
          return <SocialLinksRenderer key={section.id || index} {...sectionProps} />;

        default:
          return (
            <View key={section.id || index} style={styles.unknownSection}>
              <Ionicons name="alert-circle-outline" size={32} color="#999" />
              <Text style={styles.unknownSectionText}>
                Unknown section type: {section.type}
              </Text>
            </View>
          );
      }
    } catch (error) {
      console.error('Error rendering section:', section.type, error);
      return (
        <View key={section.id || index} style={styles.errorSection}>
          <Ionicons name="warning-outline" size={32} color="#ff3b30" />
          <Text style={styles.errorSectionText}>
            Error rendering {section.type}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#141414" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {pageTitle}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="bookmark-outline" size={24} color="#141414" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="share-outline" size={24} color="#141414" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sections && sections.length > 0 ? (
          sections.map((section, index) => renderSection(section, index))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No sections added yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Contact Modal - rendered at top level */}
      {contactCardData && (
        <SwipableModalComponent
          modalComparativeHeight={0.9}
          onClose={() => setContactModalVisible(false)}
          visible={contactModalVisible}
        >
          <ContactInfoPage userData={contactCardData} />
        </SwipableModalComponent>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  unknownSection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
  },
  unknownSectionText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorSection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorSectionText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
