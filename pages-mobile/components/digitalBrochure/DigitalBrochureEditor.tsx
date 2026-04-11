import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { DigitalBrochureData, getDefaultDigitalBrochureData } from '@/types/digitalBrochure';
import { supabase } from '@/utils/supabase';

// Import individual section editors
import { HeroLogoEditor } from './HeroLogoEditor';
import { CompanyInfoEditor } from './CompanyInfoEditor';
import { MediaCarouselEditor } from './MediaCarouselEditor';
import { AboutEditor } from './AboutEditor';
import { AmenitiesEditor } from './AmenitiesEditor';
import { LinksTableEditor } from './LinksTableEditor';
import { ContactCardEditor } from './ContactCardEditor';

interface DigitalBrochureEditorProps {
  pageId: string;
  initialData?: DigitalBrochureData;
  onSave?: (data: DigitalBrochureData) => Promise<void>;
}

export function DigitalBrochureEditor({
  pageId,
  initialData,
  onSave,
}: DigitalBrochureEditorProps) {
  const [data, setData] = useState<DigitalBrochureData>(
    initialData || getDefaultDigitalBrochureData()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const autosaveTimeout = useRef<NodeJS.Timeout>();

  // Track changes for autosave
  useEffect(() => {
    if (!autosaveEnabled) return;

    // Clear existing timeout
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }

    // Set new timeout for autosave (2 seconds after last change)
    autosaveTimeout.current = setTimeout(() => {
      if (hasUnsavedChanges) {
        handleSave(false);
      }
    }, 2000);

    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, [data, hasUnsavedChanges, autosaveEnabled]);

  // Update function that marks changes
  const updateData = <K extends keyof DigitalBrochureData>(
    key: K,
    value: DigitalBrochureData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async (showAlert: boolean = true) => {
    try {
      setIsSaving(true);

      if (onSave) {
        await onSave(data);
      } else {
        // Default save to Supabase
        const { error } = await supabase
          .from('pages')
          .update({
            content: { digitalBrochure: data },
            updated_at: new Date().toISOString(),
          })
          .eq('id', pageId);

        if (error) throw error;
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());

      if (showAlert) {
        Alert.alert('Success', 'Digital Brochure saved successfully');
      }
    } catch (error) {
      console.error('Error saving Digital Brochure:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    // Navigate to preview
    router.push({
      pathname: '/(app)/preview-page/[slug]',
      params: { slug: pageId },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Digital Brochure</Text>
            {lastSaved && (
              <Text style={styles.lastSavedText}>
                Saved {formatTimeAgo(lastSaved)}
              </Text>
            )}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handlePreview} style={styles.iconButton}>
              <Ionicons name="eye-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSave(true)}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.editorContainer}>
              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoBannerText}>
                  Edit your digital brochure sections below. All sections are displayed in a fixed order.
                </Text>
              </View>

              {/* Hero & Logo */}
              <HeroLogoEditor
                heroImage={data.heroImage}
                logo={data.logo}
                onHeroChange={(heroImage) => updateData('heroImage', heroImage)}
                onLogoChange={(logo) => updateData('logo', logo)}
              />

              {/* Company Info */}
              <CompanyInfoEditor
                companyName={data.companyName}
                address={data.address}
                onCompanyNameChange={(name) => updateData('companyName', name)}
                onAddressChange={(address) => updateData('address', address)}
              />

              {/* Media Carousel */}
              <MediaCarouselEditor
                mediaItems={data.mediaItems}
                onChange={(items) => updateData('mediaItems', items)}
              />

              {/* About Section */}
              <AboutEditor
                content={data.about.content}
                onChange={(content) =>
                  updateData('about', { ...data.about, content })
                }
              />

              {/* Amenities */}
              <AmenitiesEditor
                items={data.amenities.items}
                onChange={(items) =>
                  updateData('amenities', { ...data.amenities, items })
                }
              />

              {/* Links Table */}
              <LinksTableEditor
                links={data.links}
                onChange={(links) => updateData('links', links)}
              />

              {/* Contact Card */}
              <ContactCardEditor
                contact={data.contact}
                onChange={(contact) => updateData('contact', contact)}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  lastSavedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  editorContainer: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
