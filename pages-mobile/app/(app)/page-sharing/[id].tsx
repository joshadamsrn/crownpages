import AppHeader from "@/components/common/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../utils/supabase";

type PageShare = {
  id: string;
  shared_with_email: string;
  permission: string;
};

type BusinessMember = {
  id: string;
  invited_email: string | null;
  user_id: string | null;
};

type AccessPermission = "none" | "view" | "edit";

export default function PageSharingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [pageTitle, setPageTitle] = useState("");
  const [pageShares, setPageShares] = useState<PageShare[]>([]);
  const [teamMembers, setTeamMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [accessByEmail, setAccessByEmail] = useState<
    Record<string, AccessPermission>
  >({});
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const [externalEmail, setExternalEmail] = useState("");
  const [externalPermission, setExternalPermission] = useState<"view" | "edit">(
    "view",
  );
  const [isAddingExternal, setIsAddingExternal] = useState(false);

  const getMemberEmail = (m: BusinessMember) =>
    (m.invited_email || "").trim().toLowerCase();

  const teamEmails = useMemo(() => {
    return teamMembers
      .map(getMemberEmail)
      .filter((e, idx, arr) => !!e && arr.indexOf(e) === idx);
  }, [teamMembers]);

  const teamEmailSet = useMemo(() => new Set(teamEmails), [teamEmails]);

  const nonTeamShares = useMemo(
    () =>
      pageShares.filter(
        (s) => !teamEmailSet.has(s.shared_with_email.toLowerCase()),
      ),
    [pageShares, teamEmailSet],
  );

  const buildAccessMap = useCallback(
    (members: BusinessMember[], shares: PageShare[]) => {
      const map: Record<string, AccessPermission> = {};
      const memberEmails = members
        .map((m) => getMemberEmail(m))
        .filter(Boolean);

      memberEmails.forEach((email) => {
        const share = shares.find(
          (s) => s.shared_with_email.toLowerCase() === email,
        );
        if (!share) map[email] = "none";
        else map[email] = share.permission === "edit" ? "edit" : "view";
      });

      return map;
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (!id || !session?.user?.id) return;
    const pageIdStr = Array.isArray(id) ? id[0] : id;
    setIsLoading(true);
    try {
      const [pageRes, sharesRes] = await Promise.all([
        supabase
          .from("pages")
          .select("title, business_id")
          .eq("id", pageIdStr)
          .maybeSingle(),
        supabase
          .from("page_shares")
          .select("id, shared_with_email, permission")
          .eq("page_id", pageIdStr),
      ]);

      const shares = (sharesRes.data || []) as PageShare[];
      setPageTitle(pageRes.data?.title || "");
      setPageShares(shares);

      // IMPORTANT: load team members from the SAME business as this page
      // so Business Settings and Sharing & Access show the same roster.
      const pageBusinessId = pageRes.data?.business_id;
      if (pageBusinessId) {
        const { data: membersData } = await supabase
          .from("business_members")
          .select("id, invited_email, user_id")
          .eq("business_id", pageBusinessId)
          .order("created_at", { ascending: true });

        const selfEmail = session.user.email?.trim().toLowerCase();
        const seenEmails = new Set<string>();
        const members = ((membersData || []) as BusinessMember[])
          .map((m) => ({ ...m, invited_email: (m.invited_email || '').trim().toLowerCase() || null }))
          .filter((m) => {
            const email = m.invited_email || '';
            if (!email) return false;
            if (selfEmail && email === selfEmail) return false;
            if (seenEmails.has(email)) return false;
            seenEmails.add(email);
            return true;
          });
        setTeamMembers(members);
        setAccessByEmail(buildAccessMap(members, shares));
      } else {
        setTeamMembers([]);
        setAccessByEmail({});
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, session?.user?.id, buildAccessMap]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const setTeamAccess = (email: string, permission: AccessPermission) => {
    setAccessByEmail((prev) => ({ ...prev, [email]: permission }));
  };

  const handleSaveTeamAccess = async () => {
    if (!id || !session?.user?.id) return;
    const pageIdStr = Array.isArray(id) ? id[0] : id;

    const deleteIds: string[] = [];
    const upserts: {
      page_id: string;
      shared_by: string;
      shared_with_email: string;
      permission: string;
    }[] = [];

    teamEmails.forEach((email) => {
      const current = pageShares.find(
        (s) => s.shared_with_email.toLowerCase() === email,
      );
      const desired = accessByEmail[email] || "none";

      if (desired === "none") {
        if (current) deleteIds.push(current.id);
      } else {
        upserts.push({
          page_id: pageIdStr,
          shared_by: session.user.id,
          shared_with_email: email,
          permission: desired,
        });
      }
    });

    if (deleteIds.length === 0 && upserts.length === 0) {
      Alert.alert("No changes", "No team access changes to save.");
      return;
    }

    setIsSavingAccess(true);
    try {
      if (deleteIds.length > 0) {
        const { error } = await supabase
          .from("page_shares")
          .delete()
          .in("id", deleteIds);
        if (error) {
          console.error("page_shares delete error:", JSON.stringify(error));
          throw error;
        }
      }

      if (upserts.length > 0) {
        console.log("page_shares upsert payload:", JSON.stringify(upserts));
        const { error } = await supabase.from("page_shares").upsert(upserts, {
          onConflict: "page_id,shared_with_email",
        });
        if (error) {
          console.error("page_shares upsert error:", JSON.stringify(error));
          throw error;
        }
      }

      await loadData();
    } catch (err) {
      console.error("handleSaveTeamAccess caught:", JSON.stringify(err));
      Alert.alert("Error", "Failed to save access changes. Please try again.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleRemoveTeamAccess = async (email: string) => {
    const share = pageShares.find(
      (s) => s.shared_with_email.toLowerCase() === email,
    );
    if (share) {
      await supabase.from("page_shares").delete().eq("id", share.id);
      await loadData();
    } else {
      setTeamAccess(email, "none");
    }
  };

  const handleAddExternalShare = async () => {
    if (!id || !session?.user?.id || !externalEmail.trim()) return;
    const pageIdStr = Array.isArray(id) ? id[0] : id;

    const email = externalEmail.trim().toLowerCase();
    setIsAddingExternal(true);
    const { error } = await supabase.from("page_shares").upsert(
      {
        page_id: pageIdStr,
        shared_by: session.user.id,
        shared_with_email: email,
        permission: externalPermission,
      },
      { onConflict: "page_id,shared_with_email" },
    );
    setIsAddingExternal(false);

    if (error) {
      console.error("page_shares upsert error:", error);
      Alert.alert("Error", "Failed to share with that email.");
      return;
    }

    setExternalEmail("");
    setExternalPermission("view");
    await loadData();
  };

  const handleRemoveShare = async (shareId: string) => {
    await supabase.from("page_shares").delete().eq("id", shareId);
    loadData();
  };

  const handleTogglePermission = async (share: PageShare) => {
    const newPerm = share.permission === "view" ? "edit" : "view";
    await supabase
      .from("page_shares")
      .update({ permission: newPerm })
      .eq("id", share.id);
    loadData();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader title="Sharing & Access" showBackButton />
        <View style={styles.contentWrapper}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader title="Sharing & Access" showBackButton />
      <KeyboardAvoidingView
        style={styles.contentWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="people-outline" size={22} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {pageTitle}
              </Text>
              <Text style={styles.headerSub}>
                {pageShares.length === 0
                  ? "Not shared with anyone yet"
                  : `Shared with ${pageShares.length} person${pageShares.length > 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Team access</Text>
            <Text style={styles.cardSubtitle}>
              Set each teammate to No, View, or Edit.
            </Text>

            {teamMembers.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="people-outline" size={20} color="#ddd" />
                <Text style={styles.emptyText}>No team members yet</Text>
              </View>
            ) : (
              <View style={{ maxHeight: 420 }}>
                <ScrollView nestedScrollEnabled>
                  {teamMembers.map((member) => {
                    const email = getMemberEmail(member);
                    const permission = accessByEmail[email] || "none";
                    return (
                      <View key={member.id} style={styles.memberRow}>
                        <View style={styles.avatarCircle}>
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color="#666"
                          />
                        </View>
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {email}
                        </Text>

                        <View style={styles.radioGroup}>
                          <TouchableOpacity
                            style={[
                              styles.radioBtn,
                              permission === "none" &&
                                styles.radioBtnActiveNeutral,
                            ]}
                            onPress={() => setTeamAccess(email, "none")}
                          >
                            <Text
                              style={[
                                styles.radioText,
                                permission === "none" &&
                                  styles.radioTextActiveNeutral,
                              ]}
                            >
                              No
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.radioBtn,
                              permission === "view" &&
                                styles.radioBtnActiveView,
                            ]}
                            onPress={() => setTeamAccess(email, "view")}
                          >
                            <Text
                              style={[
                                styles.radioText,
                                permission === "view" && styles.radioTextActive,
                              ]}
                            >
                              View
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.radioBtn,
                              permission === "edit" &&
                                styles.radioBtnActiveEdit,
                            ]}
                            onPress={() => setTeamAccess(email, "edit")}
                          >
                            <Text
                              style={[
                                styles.radioText,
                                permission === "edit" && styles.radioTextActive,
                              ]}
                            >
                              Edit
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveAccessBtn, isSavingAccess && { opacity: 0.6 }]}
              onPress={handleSaveTeamAccess}
              disabled={isSavingAccess || teamMembers.length === 0}
            >
              {isSavingAccess ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveAccessBtnText}>Save team access</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share with external email</Text>
            <Text style={styles.cardSubtitle}>
              Use this only if someone is not on your team roster.
            </Text>

            <TextInput
              style={styles.emailInput}
              value={externalEmail}
              onChangeText={setExternalEmail}
              placeholder="email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.externalActionsRow}>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    externalPermission === "view" && styles.radioBtnActiveView,
                  ]}
                  onPress={() => setExternalPermission("view")}
                >
                  <Text
                    style={[
                      styles.radioText,
                      externalPermission === "view" && styles.radioTextActive,
                    ]}
                  >
                    View
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    externalPermission === "edit" && styles.radioBtnActiveEdit,
                  ]}
                  onPress={() => setExternalPermission("edit")}
                >
                  <Text
                    style={[
                      styles.radioText,
                      externalPermission === "edit" && styles.radioTextActive,
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.addExternalBtn,
                  (!externalEmail.trim() || isAddingExternal) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleAddExternalShare}
                disabled={!externalEmail.trim() || isAddingExternal}
              >
                {isAddingExternal ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addExternalBtnText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {nonTeamShares.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>External access</Text>
              <Text style={styles.cardSubtitle}>
                People with access who are not in your team roster.
              </Text>
              {nonTeamShares.map((share) => (
                <View key={share.id} style={styles.shareRow}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="mail-outline" size={16} color="#666" />
                  </View>
                  <Text style={styles.shareEmail} numberOfLines={1}>
                    {share.shared_with_email}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.permBadge,
                      share.permission === "edit"
                        ? styles.permEdit
                        : styles.permView,
                    ]}
                    onPress={() => handleTogglePermission(share)}
                  >
                    <Text
                      style={[
                        styles.permText,
                        {
                          color:
                            share.permission === "edit" ? "#E65100" : "#007AFF",
                        },
                      ]}
                    >
                      {share.permission === "edit" ? "Editor" : "View"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveShare(share.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {teamMembers.length === 0 && (
            <View style={styles.callout}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#007AFF"
              />
              <Text style={styles.calloutText}>
                Add people to your team in Business Settings, then manage page
                access with the inline No / View / Edit controls.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/business-settings" as any)}
              >
                <Text style={styles.calloutLink}>
                  Go to Business Settings →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  contentWrapper: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#000" },
  headerSub: { fontSize: 13, color: "#888", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  cardSubtitle: { fontSize: 12, color: "#777", marginTop: 3, marginBottom: 12 },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  emptyText: { fontSize: 14, color: "#bbb" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  memberEmail: { flex: 1, fontSize: 13, color: "#333" },
  radioGroup: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  radioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  radioBtnActiveNeutral: { backgroundColor: "#f1f1f1" },
  radioBtnActiveView: { backgroundColor: "#000" },
  radioBtnActiveEdit: { backgroundColor: "#E65100" },
  radioText: { fontSize: 11, fontWeight: "600", color: "#666" },
  radioTextActive: { color: "#fff" },
  radioTextActiveNeutral: { color: "#222" },
  saveAccessBtn: {
    marginTop: 12,
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveAccessBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emailInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#000",
    marginBottom: 10,
  },
  externalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addExternalBtn: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    minWidth: 64,
  },
  addExternalBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  shareEmail: { flex: 1, fontSize: 13, color: "#333" },
  permBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  permView: { backgroundColor: "#EEF5FF" },
  permEdit: { backgroundColor: "#FFF3E0" },
  permText: { fontSize: 12, fontWeight: "600" },
  callout: {
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  calloutText: { fontSize: 13, color: "#1a4b8c", lineHeight: 19 },
  calloutLink: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    marginTop: 2,
  },
});
