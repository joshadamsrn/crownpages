import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

interface CollapsibleThemeSectionProps {
    title?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

export function CollapsibleThemeSection({ 
    title = "Theme Colors", 
    children, 
    defaultExpanded = false 
}: CollapsibleThemeSectionProps) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Ionicons 
                            name="color-palette" 
                            size={20} 
                            color="#007AFF" 
                            style={styles.headerIcon}
                        />
                        <Text style={styles.headerTitle}>{title}</Text>
                    </View>
                </View>
            </View>

            {/* Always Visible Content */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        overflow: 'hidden',
    },
    header: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIcon: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    content: {
        padding: 16,
        backgroundColor: '#fff',
    },
});
