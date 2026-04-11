// app/(app)/business-settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { Database } from "../../database.types";
import { useBusinessCheck } from "../../hooks/useBusinessCheck";
import { supabase } from "../../utils/supabase";
import { isReservedSlug, getReservedSlugError } from "../../constants/reserved-slugs";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

type BusinessMember = Omit<Database["public"]["Tables"]["business_members"]["Row"], "user_id"> & {
  user_id: string | null;
  invited_email?: string | null;
  users?: { email?: string | null } | null;
};

function TeamMembersSection({ businessId, ownerId }: { businessId?: string; ownerId?: string }) {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchMembers = async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });
      if (!error && data) setMembers(data as BusinessMember[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [businessId]);

  const handleInvite = async () => {
    if (!businessId || !ownerId || !inviteEmail.trim()) return;
    setIsInviting(true);
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    try {
      // Check if already a member by email (covers both linked and pending invites)
      const alreadyExists = members.some(
        (m) =>
          (m as any).invited_email?.toLowerCase() === normalizedEmail ||
          (m as any).users?.email?.toLowerCase() === normalizedEmail
      );
      if (alreadyExists) {
        Alert.alert('Already a member', 'This person is already part of your team.');
        return;
      }

      const { data: insertedMember, error } = await supabase
        .from('business_members')
        .insert({
          business_id: businessId,
          user_id: null,
          invited_email: normalizedEmail,
          invited_by: ownerId,
          role: 'member',
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .select('id, user_id, invited_email, role')
        .maybeSingle();

      if (error) throw error;

      Alert.alert(
        'Team member added!',
        `${normalizedEmail} was added to your team roster. They will not have access to any pages until you share pages in Manage Page Access.`
      );
      setInviteEmail('');
      setShowInviteModal(false);
      // Immediate local update for responsive UX, then authoritative refresh.
      if (insertedMember) {
        setMembers((prev) => {
          const exists = prev.some(
            (m) =>
              (m as any).invited_email?.toLowerCase() === normalizedEmail ||
              (m as any).users?.email?.toLowerCase() === normalizedEmail
          );
          return exists ? prev : [...prev, insertedMember as BusinessMember];
        });
      }
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = (memberId: string, memberEmail?: string | null) => {
    Alert.alert('Remove Member', `Remove ${memberEmail || 'this member'} from your team? This will revoke their access to all shared pages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (memberEmail) {
            await supabase.from('page_shares').delete().eq('shared_with_email', memberEmail.toLowerCase());
          }
          const { error } = await supabase.from('business_members').delete().eq('id', memberId);
          if (!error) fetchMembers();
        }
      }
    ]);
  };

  return (
    <View style={teamStyles.container}>
      <View style={teamStyles.header}>
        <View>
          <Text style={teamStyles.title}>Team Members</Text>
          <Text style={teamStyles.subtitle}>Manage who's on your team</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={teamStyles.inviteButton} onPress={() => setShowInviteModal(true)}>
            <Ionicons name="person-add-outline" size={16} color="#007AFF" />
            <Text style={teamStyles.inviteButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manage Page Access link */}
      <TouchableOpacity
        style={teamStyles.manageAccessButton}
        onPress={() =>
          router.push({
            pathname: '/(app)/team-sharing' as any,
            params: businessId ? { businessId } : undefined,
          })
        }
      >
        <Ionicons name="share-social-outline" size={16} color="#555" />
        <Text style={teamStyles.manageAccessText}>Manage Page Access</Text>
        <Ionicons name="chevron-forward" size={16} color="#aaa" />
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : members.length === 0 ? (
        <View style={teamStyles.emptyState}>
          <Ionicons name="people-outline" size={32} color="#ccc" />
          <Text style={teamStyles.emptyText}>No team members yet</Text>
          <Text style={teamStyles.emptySubtext}>Add teammates to your roster, then share page access explicitly</Text>
        </View>
      ) : (
        members.map((member) => (
          <View key={member.id} style={teamStyles.memberRow}>
            <View style={teamStyles.memberAvatar}>
              <Ionicons name="person-outline" size={20} color="#666" />
            </View>
            <View style={teamStyles.memberInfo}>
              <Text style={teamStyles.memberEmail} numberOfLines={1}>
                {member.users?.email || member.invited_email || 'Unknown user'}
              </Text>
              <Text style={teamStyles.memberRole}>team member</Text>
            </View>
            {member.user_id !== ownerId && (
              <TouchableOpacity onPress={() => handleRemove(member.id, member.users?.email || member.invited_email)}>
                <Ionicons name="remove-circle-outline" size={22} color="#ff3b30" />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      <Modal visible={showInviteModal} transparent animationType="slide" onRequestClose={() => setShowInviteModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={teamStyles.modalOverlay}>
            <View style={teamStyles.modalContent}>
              <Text style={teamStyles.modalTitle}>Add Team Member</Text>
              <Text style={teamStyles.modalSubtitle}>Add someone to your team roster. Use "Manage Page Access" to choose which pages to share with them.</Text>
              <TextInput
                style={teamStyles.emailInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <View style={teamStyles.modalActions}>
                <TouchableOpacity style={teamStyles.cancelButton} onPress={() => setShowInviteModal(false)}>
                  <Text style={teamStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[teamStyles.confirmButton, (!inviteEmail.trim() || isInviting) && { opacity: 0.5 }]}
                  onPress={handleInvite}
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  {isInviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={teamStyles.confirmButtonText}>Add Member</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const teamStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginTop: 24, marginHorizontal: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '600', color: '#000' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#F0F8FF' },
  inviteButtonText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: '#bbb', textAlign: 'center' },
  manageAccessButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4 },
  manageAccessText: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  memberInfo: { flex: 1 },
  memberEmail: { fontSize: 14, color: '#333', fontWeight: '500' },
  memberRole: { fontSize: 12, color: '#999', textTransform: 'capitalize', marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  emailInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#fafafa' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelButtonText: { fontSize: 15, color: '#666', fontWeight: '500' },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  confirmButtonText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default function BusinessSettings() {
  const { session } = useAuth();
  
  // Use business check hook - redirects if no businesses
  const { isChecking: isCheckingBusinesses, hasBusinesses } = useBusinessCheck({
    redirectOnNoBusinesses: true,
    checkOnMount: true,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [originalSlug, setOriginalSlug] = useState("");

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Slug validation
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: "" });

  // Format slug (lowercase, replace spaces with hyphens, remove special chars)
  const formatSlug = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(
    debounce(async (slugToCheck: string) => {
      if (!slugToCheck || slugToCheck === originalSlug) {
        setSlugAvailability({ available: null, message: "" });
        setIsCheckingSlug(false);
        return;
      }

      // Check if slug is reserved
      if (isReservedSlug(slugToCheck)) {
        setSlugAvailability({
          available: false,
          message: getReservedSlugError(slugToCheck),
        });
        setIsCheckingSlug(false);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", slugToCheck)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSlugAvailability({
            available: false,
            message: "This business URL is already taken",
          });
        } else {
          setSlugAvailability({
            available: true,
            message: "Perfect! This business URL is available",
          });
        }
      } catch (error) {
        console.error("Error checking slug availability:", error);
        setSlugAvailability({
          available: false,
          message: "Error checking availability",
        });
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500),
    [originalSlug]
  );

  const handleSlugChange = (text: string) => {
    const formattedSlug = formatSlug(text);
    setSlug(formattedSlug);
    setSlugError(null);

    if (formattedSlug && formattedSlug !== originalSlug) {
      checkSlugAvailability(formattedSlug);
    } else {
      setSlugAvailability({ available: null, message: "" });
    }
  };

  const getSlugStatusColor = () => {
    if (slugAvailability.available === true) return "#10B981";
    if (slugAvailability.available === false) return "#EF4444";
    return "#6B7280";
  };

  const getSlugStatusIcon = () => {
    if (slugAvailability.available === true) return "checkmark-circle";
    if (slugAvailability.available === false) return "close-circle";
    return "information-circle-outline";
  };

  // Load all businesses for the user
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session?.user?.id)
          .order("created_at", { ascending: false });

        if (error && error.code !== "PGRST116") throw error;

        if (!data || data.length === 0) {
          // No business found
          Alert.alert(
            "No Business Found",
            "You need to set up your business first.",
            [
              {
                text: "Set Up Now",
                onPress: () => router.replace("/(app)/business-setup"),
              },
            ]
          );
          return;
        }

        setBusinesses(data);
        // Select the first business by default
        setSelectedBusinessId(data[0].id);
      } catch (error) {
        console.error("Error fetching businesses:", error);
        Alert.alert("Error", "Failed to load business settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [session?.user?.id]);

  // Load selected business data when selection changes
  useEffect(() => {
    if (!selectedBusinessId || businesses.length === 0) return;

    const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);
    if (!selectedBusiness) return;

    setBusiness(selectedBusiness);
    setBusinessName(selectedBusiness.name);
    setSlug(selectedBusiness.slug);
    setOriginalSlug(selectedBusiness.slug);
    setEmail(selectedBusiness.email || "");
    setPhone(selectedBusiness.phone || "");
    setWebsite(selectedBusiness.website || "");
    setDescription(selectedBusiness.description || "");
  }, [selectedBusinessId, businesses]);

  const handleSave = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert("Error", "Please enter a business name");
      return;
    }

    if (!slug.trim()) {
      setSlugError("Business URL is required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("URL can only contain lowercase letters, numbers, and dashes");
      return;
    }

    if (slug !== originalSlug && isReservedSlug(slug)) {
      setSlugError(getReservedSlugError(slug));
      return;
    }

    if (slug !== originalSlug && slugAvailability.available === false) {
      setSlugError("This business URL is already taken");
      return;
    }

    setSlugError(null);
    setIsSaving(true);

    try {
      // If slug changed, double-check availability
      if (slug !== originalSlug) {
        // Check reserved slugs again
        if (isReservedSlug(slug)) {
          setSlugError(getReservedSlugError(slug));
          setIsSaving(false);
          return;
        }

        const { data: existingBusiness } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existingBusiness) {
          setSlugError("This business URL is already taken");
          setIsSaving(false);
          return;
        }
      }

      // Update the business
      const { error } = await supabase
        .from("businesses")
        .update({
          name: businessName,
          slug: slug,
          email: email || null,
          phone: phone || null,
          website: website || null,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business!.id);

      if (error) throw error;

      setOriginalSlug(slug);
      Alert.alert("Success", "Business settings updated successfully");
    } catch (error) {
      console.error("Error updating business:", error);
      Alert.alert("Error", "Failed to update business settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isCheckingBusinesses || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {isCheckingBusinesses ? "Checking businesses..." : "Loading business settings..."}
        </Text>
      </View>
    );
  }

  // If hook determined no businesses, it will redirect, but show loading meanwhile
  if (hasBusinesses === false) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Redirecting to business setup...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Business Selector (if multiple businesses) */}
        {businesses.length > 1 && (
          <View style={styles.businessSelectorContainer}>
            <TouchableOpacity
              style={styles.businessSelector}
              onPress={() => setShowBusinessSelector(true)}
            >
              <View style={styles.businessSelectorContent}>
                <Ionicons name="business" size={20} color="#007AFF" />
                <Text style={styles.businessSelectorText}>
                  {business?.name || "Select Business"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.businessSelectorHint}>
              Tap to switch between your businesses
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color="#1976D2" />
            <Text style={styles.infoBannerText}>
              Your business URL is used for all your pages. Changing it will
              affect all existing page URLs.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Business Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smith Dental Care"
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            {/* Business URL/Slug */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business URL *</Text>
              <View style={styles.urlPreviewContainer}>
                <Text style={styles.urlPrefix}>crownpages.com/</Text>
                <Text
                  style={[
                    styles.urlSlug,
                    { color: slug ? "#007AFF" : "#999" },
                  ]}
                >
                  {slug || "your-business"}
                </Text>
              </View>

              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.input,
                    styles.slugInput,
                    {
                      borderColor:
                        slugAvailability.available === false
                          ? "#EF4444"
                          : slugAvailability.available === true
                          ? "#10B981"
                          : "#DDD",
                    },
                  ]}
                  placeholder="your-business-name"
                  value={slug}
                  onChangeText={handleSlugChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSaving}
                />
                <View style={styles.slugStatusIcon}>
                  {isCheckingSlug ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : slug !== originalSlug ? (
                    <Ionicons
                      name={getSlugStatusIcon()}
                      size={24}
                      color={getSlugStatusColor()}
                    />
                  ) : null}
                </View>
              </View>

              {slugAvailability.message && slug !== originalSlug && (
                <View
                  style={[
                    styles.availabilityMessage,
                    {
                      backgroundColor:
                        slugAvailability.available === true
                          ? "#ECFDF5"
                          : "#FEF2F2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      {
                        color:
                          slugAvailability.available === true
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {slugAvailability.message}
                  </Text>
                </View>
              )}

              {slugError && <Text style={styles.errorText}>{slugError}</Text>}

              <Text style={styles.hint}>
                Lowercase letters, numbers, and dashes only
              </Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Email</Text>
              <TextInput
                style={styles.input}
                placeholder="contact@yourbusiness.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSaving}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            {/* Website */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="https://yourbusiness.com"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                keyboardType="url"
                editable={!isSaving}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your business"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving ||
                !businessName.trim() ||
                !slug.trim() ||
                (slug !== originalSlug &&
                  slugAvailability.available !== true)) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={
              isSaving ||
              !businessName.trim() ||
              !slug.trim() ||
              (slug !== originalSlug && slugAvailability.available !== true)
            }
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Team Members Section */}
          <TeamMembersSection businessId={business?.id} ownerId={session?.user?.id} />

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.helpText}>
              Need help? Contact support for assistance with your business
              settings.
            </Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Business Selector Modal */}
      <Modal
        visible={showBusinessSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBusinessSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business</Text>
              <TouchableOpacity
                onPress={() => setShowBusinessSelector(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.businessList}>
              {businesses.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={[
                    styles.businessItem,
                    selectedBusinessId === biz.id && styles.businessItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedBusinessId(biz.id);
                    setShowBusinessSelector(false);
                  }}
                >
                  <View style={styles.businessItemContent}>
                    <Ionicons
                      name="business"
                      size={24}
                      color={selectedBusinessId === biz.id ? "#007AFF" : "#666"}
                    />
                    <View style={styles.businessItemText}>
                      <Text
                        style={[
                          styles.businessItemName,
                          selectedBusinessId === biz.id &&
                            styles.businessItemNameSelected,
                        ]}
                      >
                        {biz.name}
                      </Text>
                      <Text style={styles.businessItemSlug}>
                        crownpages.com/{biz.slug}
                      </Text>
                    </View>
                  </View>
                  {selectedBusinessId === biz.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  textArea: {
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  urlPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  urlPrefix: {
    fontSize: 14,
    color: "#666",
  },
  urlSlug: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWithIcon: {
    position: "relative",
  },
  slugInput: {
    paddingRight: 48,
  },
  slugStatusIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  availabilityMessage: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#CCC",
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    flex: 1,
  },
  businessSelectorContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  businessSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  businessSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  businessSelectorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  businessSelectorHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  modalCloseButton: {
    padding: 4,
  },
  businessList: {
    padding: 16,
  },
  businessItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  businessItemSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007AFF",
  },
  businessItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  businessItemText: {
    flex: 1,
  },
  businessItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  businessItemNameSelected: {
    color: "#007AFF",
  },
  businessItemSlug: {
    fontSize: 13,
    color: "#666",
  },
});

