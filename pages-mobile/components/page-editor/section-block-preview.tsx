// Section block preview component for page editor
// Shows the actual rendered section with edit overlay
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ContactInfoPage from '../digitalBrochure/contactInfoPage';
import {
  AboutRenderer,
  AmenitiesRenderer,
  CompanyHeaderRenderer,
  ContactCardRenderer,
  ContactRenderer,
  CTARenderer,
  FAQRenderer,
  FeaturesRenderer,
  GalleryRenderer,
  HeroRenderer,
  LinksWithContactRenderer,
  PersonalContactRenderer,
  SocialLinksRenderer,
  TestimonialsRenderer,
} from '../view-page/section-renderers';

interface SectionBlockPreviewProps {
  section: any;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  sectionDefinition?: any;
  editContent?: React.ReactNode;
}

export const SectionBlockPreview: React.FC<SectionBlockPreviewProps> = ({
  section,
  isSelected,
  onSelect,
  onEdit,
  onPreview,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
  sectionDefinition,
  editContent,
}) => {
  const handleButtonClick = (link: string) => {
    console.log('Link clicked in preview:', link);
  };

  const renderSectionPreview = () => {
    if (!section || !section.type) {
      return (
        <View style={styles.errorSection}>
          <Ionicons name="alert-circle-outline" size={32} color="#ff3b30" />
          <Text style={styles.errorText}>Invalid section</Text>
        </View>
      );
    }

    const sectionProps = {
      section,
      handleButtonClick,
    };

    try {
      switch (section.type) {
        case 'hero':
          return <HeroRenderer {...sectionProps} />;

        case 'companyHeader':
          return <CompanyHeaderRenderer {...sectionProps} />;

        case 'contactCard':
          return <ContactCardRenderer {...sectionProps} />;

        case 'gallery':
          return <GalleryRenderer {...sectionProps} />;

        case 'about':
          return <AboutRenderer {...sectionProps} />;

        case 'amenities':
          return <AmenitiesRenderer {...sectionProps} />;

        case 'linksWithContact':
        case 'linksWithContact_links':
          return <LinksWithContactRenderer {...sectionProps} />;
        
        case 'linksWithContact_contact':
          // For contact preview, show the contact drawer info
          const contactDrawerData = {
            contactName: sectionProps.section.data.contactName,
            contactRole: sectionProps.section.data.contactRole,
            phone: sectionProps.section.data.contactPhone,
            personalPhone: sectionProps.section.data.contactPhone2,
            email: sectionProps.section.data.contactEmail,
            fax: sectionProps.section.data.contactFax,
            link: sectionProps.section.data.contactWebsite,
            logo: sectionProps.section.data.contactImageUrl,
          };
          return <ContactInfoPage userData={contactDrawerData} />;

        case 'personalContact':
          return <PersonalContactRenderer {...sectionProps} />;

        case 'contact':
          return <ContactRenderer {...sectionProps} />;

        case 'features':
          return <FeaturesRenderer {...sectionProps} />;

        case 'testimonials':
          return <TestimonialsRenderer {...sectionProps} />;

        case 'faq':
          return <FAQRenderer {...sectionProps} />;

        case 'cta':
          return <CTARenderer {...sectionProps} />;

        case 'socialLinks':
          return <SocialLinksRenderer {...sectionProps} />;

        default:
          return (
            <View style={styles.unknownSection}>
              <Ionicons name="help-circle-outline" size={32} color="#999" />
              <Text style={styles.unknownText}>Unknown: {section.type}</Text>
            </View>
          );
      }
    } catch (error) {
      console.error('Error rendering section preview:', section.type, error);
      return (
        <View style={styles.errorSection}>
          <Ionicons name="warning-outline" size={32} color="#ff3b30" />
          <Text style={styles.errorText}>Error rendering {section.type}</Text>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.sectionBlock,
        isSelected && styles.sectionBlockSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Section Label Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLabelContainer}>
          <Ionicons
            name={(typeof sectionDefinition?.icon === 'object' ? sectionDefinition?.icon?.mobile : sectionDefinition?.icon) || 'cube-outline'}
            size={18}
            color={isSelected ? '#007AFF' : '#666'}
          />
          <Text
            style={[
              styles.sectionLabel,
              isSelected && styles.sectionLabelSelected,
            ]}
          >
            {sectionDefinition?.name || section.type}
          </Text>
        </View>

        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Ionicons name="pencil-outline" size={20} color="#007AFF" />
          </TouchableOpacity>

          {/* Eye preview icon - hidden for now */}
          {/* <TouchableOpacity onPress={onPreview} style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color="#007AFF" />
          </TouchableOpacity> */}

          {/* Trash icon - hidden, no sections are optional anymore */}
          {/* <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Live Section Preview */}
      {!isSelected && (
        <>
          <View style={styles.previewContainer} pointerEvents="none">
            {renderSectionPreview()}
          </View>

          {/* Edit Overlay Hint */}
          <View style={styles.tapToEditOverlay}>
            <Text style={styles.tapToEditText}>Tap to edit</Text>
          </View>
        </>
      )}

      {/* Edit Fields - Shown when selected */}
      {isSelected && editContent && (
        <View style={styles.editContainer}>
          {editContent}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sectionBlock: {
    marginHorizontal: 12,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionBlockSelected: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sectionLabelSelected: {
    color: '#007AFF',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  previewContainer: {
    backgroundColor: '#fff',
    minHeight: 200,
    paddingBottom: 80,
  },
  tapToEditOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  tapToEditText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  editContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  unknownSection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  unknownText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  errorSection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff3b30',
  },
});
