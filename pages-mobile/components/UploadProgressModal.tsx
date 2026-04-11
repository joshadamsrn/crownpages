import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface UploadProgressInfo {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  fileName?: string;
  /** When set to 'processing', shows an indeterminate bar instead of byte progress */
  muxPhase?: 'uploading' | 'processing';
}

interface UploadProgressModalProps {
  visible: boolean;
  progress: UploadProgressInfo | null;
  /** Number of concurrent uploads — shows "+N more" when > 1 */
  queueCount?: number;
  onCancel?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Non-blocking upload progress banner.
 * Renders as a compact strip at the bottom of the screen — no overlay,
 * no blocking interaction. User can keep editing while uploads run.
 * Supports concurrent uploads via queueCount prop.
 */
const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  visible,
  progress,
  queueCount = 1,
  onCancel,
}) => {
  if (!visible || !progress) return null;

  const { bytesUploaded, bytesTotal, percentage, fileName, muxPhase } = progress;
  const pct = Math.min(percentage, 100);
  const isCompressing = fileName?.startsWith('Compressing');
  const isMuxProcessing = muxPhase === 'processing';
  const isMuxUploading = muxPhase === 'uploading';
  const hasQueue = queueCount > 1;

  const mainLabel = isMuxProcessing
    ? 'Processing video…'
    : isMuxUploading
    ? (fileName ? `Uploading ${fileName}` : 'Uploading…')
    : isCompressing
    ? fileName
    : (fileName ? `Uploading ${fileName}` : 'Uploading…');

  const displayLabel = hasQueue
    ? `${mainLabel} (+${queueCount - 1} more)`
    : mainLabel;

  return (
    <View style={styles.banner}>
      {/* Progress bar along the top edge of the banner */}
      <View style={styles.progressTrack}>
        {isMuxProcessing ? (
          <View style={styles.progressIndeterminate} />
        ) : (
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        )}
      </View>

      <View style={styles.row}>
        <Ionicons
          name={isCompressing ? 'git-compare-outline' : isMuxProcessing ? 'cloud-done-outline' : 'cloud-upload-outline'}
          size={18}
          color="#fff"
        />

        <View style={styles.textBlock}>
          <Text style={styles.label} numberOfLines={1}>
            {displayLabel}
          </Text>
          {isMuxProcessing && (
            <Text style={styles.subLabel}>Processing your video, this may take a moment...</Text>
          )}
          {!isMuxProcessing && !isMuxUploading && !isCompressing && bytesTotal > 0 && (
            <Text style={styles.subLabel}>
              {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)} · {pct.toFixed(0)}%
            </Text>
          )}
          {isCompressing && (
            <Text style={styles.subLabel}>Compressing to reduce file size…</Text>
          )}
        </View>

        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 20,
    left: 12,
    right: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
  },
  progressIndeterminate: {
    height: '100%',
    width: '65%',
    backgroundColor: '#4A9EFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  subLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cancelBtn: {
    padding: 2,
  },
});

export default UploadProgressModal;
