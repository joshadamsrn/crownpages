import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ICON_OPTIONS } from '@crown-pages/types';

interface IconPickerProps {
    visible: boolean;
    selectedIcon?: string;
    onSelectIcon: (iconValue: string) => void;
    onClose: () => void;
    title?: string;
}

export function IconPicker({
    visible,
    selectedIcon,
    onSelectIcon,
    onClose,
    title = "Choose Icon"
}: IconPickerProps) {
    
    const handleSelectIcon = (iconValue: string) => {
        onSelectIcon(iconValue);
        onClose();
    };

    const renderIconOption = ({ item }: { item: typeof ICON_OPTIONS[0] }) => {
        const isSelected = selectedIcon === item.value;
        
        return (
            <TouchableOpacity
                style={[
                    styles.iconOption,
                    isSelected && styles.selectedIconOption
                ]}
                onPress={() => handleSelectIcon(item.value)}
            >
                <View style={[
                    styles.iconContainer,
                    isSelected && styles.selectedIconContainer
                ]}>
                    <Ionicons 
                        name={item.mobile as any} 
                        size={24} 
                        color={isSelected ? '#fff' : '#007AFF'} 
                    />
                </View>
                <Text style={[
                    styles.iconLabel,
                    isSelected && styles.selectedIconLabel
                ]} numberOfLines={2}>
                    {item.label}
                </Text>
                {isSelected && (
                    <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Icon Grid */}
                    <FlatList
                        data={ICON_OPTIONS}
                        renderItem={renderIconOption}
                        keyExtractor={(item) => item.value}
                        numColumns={4}
                        contentContainerStyle={styles.iconGrid}
                        showsVerticalScrollIndicator={false}
                        columnWrapperStyle={styles.row}
                    />
                </View>
            </View>
        </Modal>
    );
}

// Simple IconButton component for displaying selected icons
interface IconButtonProps {
    iconValue?: string;
    onPress: () => void;
    label?: string;
    placeholder?: string;
    style?: any;
}

export function IconButton({ 
    iconValue, 
    onPress, 
    label, 
    placeholder = "Select Icon",
    style 
}: IconButtonProps) {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconValue);
    
    return (
        <View style={style}>
            {label && <Text style={styles.fieldLabel}>{label}</Text>}
            <TouchableOpacity
                style={styles.iconButton}
                onPress={onPress}
            >
                <View style={styles.iconButtonContent}>
                    <View style={styles.iconButtonIcon}>
                        <Ionicons 
                            name={(iconOption?.mobile || 'help-circle') as any}
                            size={20} 
                            color={iconValue ? "#007AFF" : "#999"} 
                        />
                    </View>
                    <Text style={[
                        styles.iconButtonText,
                        !iconValue && styles.placeholderText
                    ]}>
                        {iconOption?.label || placeholder}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    
    // Icon grid styles
    iconGrid: {
        padding: 20,
        paddingTop: 10,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    iconOption: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    selectedIconOption: {
        borderColor: '#007AFF',
        backgroundColor: '#f0f8ff',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    selectedIconContainer: {
        backgroundColor: '#007AFF',
    },
    iconLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
        minHeight: 28,
    },
    selectedIconLabel: {
        color: '#007AFF',
        fontWeight: '500',
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    
    // IconButton styles
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    iconButton: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    iconButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconButtonIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    },
});
