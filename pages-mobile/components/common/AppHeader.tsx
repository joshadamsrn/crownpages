import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AppHeaderProps {
    title: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
}

// Custom header title component with crown icon
const HeaderTitleWithCrown = ({ title }: { title: string }) => (
    <View style={styles.headerTitleContainer}>
        <Image
            source={require('../../assets/images/logo/crown only.png')}
            style={styles.crownIcon}
            resizeMode="contain"
        />
        <Text style={styles.headerTitle}>{title}</Text>
    </View>
);

export default function AppHeader({
    title,
    showBackButton = true,
    onBackPress
}: AppHeaderProps) {
    const handleBackPress = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    return (
        <>
            <StatusBar style="light" />
            <View style={styles.header}>
                {showBackButton ? (
                    <TouchableOpacity onPress={handleBackPress}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
                <HeaderTitleWithCrown title={title} />
                <View style={{ width: 24 }} />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    crownIcon: {
        width: 24,
        height: 24,
        tintColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
}); 