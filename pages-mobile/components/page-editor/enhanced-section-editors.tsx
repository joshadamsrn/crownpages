import {
  ArrayField,
  getIconForPlatform,
  getSectionDefinition,
  ICON_OPTIONS,
  SECTION_DEFINITIONS,
  SectionDefinition,
} from "@crown-pages/types";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SectionStylesEditor } from "./section-editors";

// Export the React import for the component
import React from "react";

type EnhancedSectionEditorProps = {
  section: any;
  updateSectionData: (sectionId: string, newData: any) => void;
  updateSectionStyles: (sectionId: string, styles: any) => void;
  pickImage: (sectionId: string, field: string) => void;
};

// Icon Picker Component
const IconPicker = ({
  currentIcon,
  onSelectIcon,
  visible,
  onClose,
}: {
  currentIcon: string;
  onSelectIcon: (iconValue: string) => void;
  visible: boolean;
  onClose: () => void;
}) => {
  const renderIconOption = ({ item }: { item: (typeof ICON_OPTIONS)[0] }) => (
    <TouchableOpacity
      style={[
        styles.iconOption,
        currentIcon === item.value && styles.selectedIconOption,
      ]}
      onPress={() => {
        onSelectIcon(item.value);
        onClose();
      }}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={item.mobile as any}
          size={24}
          color={currentIcon === item.value ? "#007AFF" : "#666"}
        />
      </View>
      <Text
        style={[
          styles.iconLabel,
          currentIcon === item.value && styles.selectedIconLabel,
        ]}
      >
        {item.label}
      </Text>
      <Text style={styles.iconCategory}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={ICON_OPTIONS}
            renderItem={renderIconOption}
            keyExtractor={(item) => item.value}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.iconGrid}
          />
        </View>
      </View>
    </Modal>
  );
};

// Enhanced Features Editor with Icon Selection
export const EnhancedFeaturesEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: EnhancedSectionEditorProps) => {
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [editingFeatureId, setEditingFeatureId] = React.useState<string | null>(
    null
  );

  // Get section definition from shared schema
  const sectionDef = getSectionDefinition("features");
  if (!sectionDef) {
    return <Text>Error: Features section definition not found</Text>;
  }

  const featuresField = sectionDef.fields.features as ArrayField;

  const addFeature = () => {
    const currentFeatures = section.data.features || [];
    const newFeature = {
      id: `temp_${Date.now()}`,
      icon: "checkmark-circle", // Default from schema
      title: "New Feature",
      description: "Feature description",
    };
    updateSectionData(section.id, {
      features: [...currentFeatures, newFeature],
    });
  };

  const updateFeature = (featureId: string, field: string, value: string) => {
    const updatedFeatures = section.data.features.map((f: any) =>
      f.id === featureId ? { ...f, [field]: value } : f
    );
    updateSectionData(section.id, { features: updatedFeatures });
  };

  const removeFeature = (featureId: string) => {
    const updatedFeatures = section.data.features.filter(
      (f: any) => f.id !== featureId
    );
    updateSectionData(section.id, { features: updatedFeatures });
  };

  const openIconPicker = (featureId: string) => {
    setEditingFeatureId(featureId);
    setShowIconPicker(true);
  };

  const selectIcon = (iconValue: string) => {
    if (editingFeatureId) {
      updateFeature(editingFeatureId, "icon", iconValue);
    }
    setEditingFeatureId(null);
  };

  const getCurrentIcon = () => {
    if (!editingFeatureId) return "";
    const feature = section.data.features?.find(
      (f: any) => f.id === editingFeatureId
    );
    return feature?.icon || "";
  };

  return (
    <ScrollView style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder={sectionDef.fields.title.placeholder}
        placeholderTextColor="#999"
      />

      {section.data.features?.map((feature: any) => (
        <View key={feature.id} style={styles.featureItem}>
          <View style={styles.featureHeader}>
            <Text style={styles.featureLabel}>Feature</Text>
            <TouchableOpacity onPress={() => removeFeature(feature.id)}>
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>

          {/* Icon Selection */}
          <View style={styles.iconFieldContainer}>
            <Text style={styles.fieldLabel}>Icon</Text>
            <TouchableOpacity
              style={styles.iconSelector}
              onPress={() => openIconPicker(feature.id)}
            >
              <View style={styles.iconPreview}>
                <Ionicons
                  name={getIconForPlatform(feature.icon, "mobile") as any}
                  size={24}
                  color="#007AFF"
                />
              </View>
              <Text style={styles.iconSelectorText}>
                {ICON_OPTIONS.find((opt) => opt.value === feature.icon)
                  ?.label || "Select Icon"}{" "}
              </Text>
              {/* <Ionicons name="chevron-forward" size={16} color="#999" /> */}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={feature.title}
            onChangeText={(text) => updateFeature(feature.id, "title", text)}
            placeholder={featuresField.itemSchema.title.placeholder}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.smallTextArea]}
            value={feature.description}
            onChangeText={(text) =>
              updateFeature(feature.id, "description", text)
            }
            placeholder={featuresField.itemSchema.description.placeholder}
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addFeature}>
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addButtonText}>Add Feature</Text>
      </TouchableOpacity>

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />

      {/* Icon Picker Modal */}
      <IconPicker
        currentIcon={getCurrentIcon()}
        onSelectIcon={selectIcon}
        visible={showIconPicker}
        onClose={() => {
          setShowIconPicker(false);
          setEditingFeatureId(null);
        }}
      />
    </ScrollView>
  );
};

// Updated Section Type List Generator
export const generateSectionTypesList = () => {
  return Object.values(SECTION_DEFINITIONS).map((def: SectionDefinition) => ({
    type: def.type,
    name: def.name,
    icon: def.icon.mobile,
    description: def.description,
    category: def.category,
  }));
};

// Dynamic Default Data Generator
export const getDefaultSectionData = (sectionType: string) => {
  const definition = getSectionDefinition(sectionType);
  return definition?.defaultData || {};
};

const styles = StyleSheet.create({
  fieldContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  smallTextArea: {
    height: 80,
    textAlignVertical: "top",
  },
  featureItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  iconFieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 6,
  },
  iconSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  iconPreview: {
    width: 32,
    height: 32,
    backgroundColor: "#f0f8ff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  stylesSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  stylesHint: {
    fontSize: 12,
    color: "#666",
  },
  // Modal Styles
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  iconGrid: {
    padding: 16,
  },
  iconOption: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    margin: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedIconOption: {
    backgroundColor: "#e5f2ff",
    borderColor: "#007AFF",
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
  },
  selectedIconLabel: {
    color: "#007AFF",
  },
  iconCategory: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },
});
