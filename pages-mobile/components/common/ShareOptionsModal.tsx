import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createTrackableLink, generateTrackableUrls } from '../../utils/trackableLinksService';
import { supabase } from '../../utils/supabase';

interface ShareOptionsModalProps {
  visible: boolean;
  pageUrl: string;
  pageId: string;
  businessSlug: string;
  pageSlug: string;
  onClose: () => void;
}

type ModalMode = 'choice' | 'tracker';

export default function ShareOptionsModal({
  visible,
  pageUrl,
  pageId,
  businessSlug,
  pageSlug,
  onClose,
}: ShareOptionsModalProps) {
  const [mode, setMode] = useState<ModalMode>('choice');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setMode('choice');
    setName('');
    setDescription('');
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const recordShareEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('analytics_events').insert({
        page_id: pageId,
        event_type: 'share',
        event_data: { source: 'mobile_app' },
        user_id: user?.id || null,
      });
    } catch { /* non-critical */ }
  };

  const triggerShare = (url: string) => {
    // Dismiss the modal first, then wait for the dismiss animation to fully
    // complete before presenting the native share sheet. Calling Share.share()
    // while a Modal is still animating out causes iOS to silently swallow the
    // request because there's no stable presenting view controller.
    reset();
    onClose();
    recordShareEvent();
    setTimeout(async () => {
      try {
        if (Platform.OS === 'ios') {
          await Share.share({ message: url });
        } else {
          await Share.share({ message: url, url });
        }
      } catch (err) {
        console.error('Share error:', err);
      }
    }, 400);
  };

  const doQuickShare = () => {
    triggerShare(pageUrl);
  };

  const doTrackerShare = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this tracked link.');
      return;
    }
    setCreating(true);
    try {
      const link = await createTrackableLink({
        name: name.trim(),
        description: description.trim() || undefined,
        pageId,
        utmSource: 'tracker_link',
        utmMedium: 'mobile_share',
      });

      const urls = generateTrackableUrls(link!.tracking_code, pageUrl, businessSlug, pageSlug);
      triggerShare(urls.shortUrl);
    } catch (err: any) {
      console.error('Tracker share error:', err);
      const msg = err?.message || 'Unknown error';
      Alert.alert('Could Not Create Tracker Link', `${msg}\n\nIf this keeps happening, please screenshot this message and send it to support.`);
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {mode === 'choice' ? (
            <>
              <Text style={styles.title}>Share Options</Text>
              <Text style={styles.subtitle}>Choose how you want to share this page.</Text>

              <TouchableOpacity style={styles.optionRow} onPress={doQuickShare} activeOpacity={0.7}>
                <View style={[styles.optionIcon, { backgroundColor: '#E8F4FF' }]}>
                  <Ionicons name="send-outline" size={22} color="#007AFF" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Quick Share</Text>
                  <Text style={styles.optionDesc}>Share standard page link</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setMode('tracker')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#E8F0FF' }]}>
                  <Ionicons name="locate-outline" size={22} color="#3A5BFF" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Tracker Link</Text>
                  <Text style={styles.optionDesc}>Create recipient-specific tracked link</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backRow} onPress={() => setMode('choice')} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color="#007AFF" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Tracker Link</Text>
              <Text style={styles.subtitle}>Name the recipient so you can track their engagement.</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Josh"
                  placeholderTextColor="#aaa"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Discharge Planner"
                  placeholderTextColor="#aaa"
                  value={description}
                  onChangeText={setDescription}
                  returnKeyType="done"
                  onSubmitEditing={doTrackerShare}
                />
              </View>

              <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={doTrackerShare}
                disabled={creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.createButtonText}>Create & Share</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 16,
    marginBottom: 10,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
