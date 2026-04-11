import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useSubscription } from '../../contexts/SubscriptionContext';

type Props = {
  isPublished: boolean;
  onToggle: () => void;
};

const PublishPageToggle: React.FC<Props> = ({ isPublished, onToggle }) => {
  const { hasExpiredTrial, hasProAccess } = useSubscription();

  const handleToggle = () => {
    // If user is trying to publish and they have expired trial (inactive), prevent it
    if (!isPublished && hasExpiredTrial) {
      Alert.alert(
        'Account Inactive',
        'Your free trial has expired. Upgrade to Crown Pages Pro to publish your pages.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/(app)/plans'),
          },
        ]
      );
      return;
    }

    // Allow unpublishing even for inactive users, but prevent publishing without Pro access
    if (!isPublished && !hasProAccess) {
      Alert.alert(
        'Pro Plan Required',
        'Upgrade to Crown Pages Pro to publish your pages.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/(app)/plans'),
          },
        ]
      );
      return;
    }

    // Proceed with toggle
    onToggle();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggle}>
      <FontAwesome
        name={isPublished ? 'toggle-on' : 'toggle-off'}
        size={32}
        color={isPublished ? '#4CAF50' : hasExpiredTrial ? '#ccc' : '#999'}
        style={styles.icon}
      />
    </TouchableOpacity>
  );
};

export default PublishPageToggle;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  icon: {
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
