import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onOpenFile: () => void;
  onOpenCamera: () => void;
  onToggleVoice: () => void;
  isRecording?: boolean;
  durationMillis?: number;
  disabled?: boolean;
};

export function RoundMediaActions({
  onOpenFile,
  onOpenCamera,
  onToggleVoice,
  isRecording = false,
  durationMillis = 0,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const recordingSeconds = Math.floor(durationMillis / 1000);

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.mediaAction} onPress={onOpenFile} disabled={disabled} activeOpacity={0.75}>
        <MaterialCommunityIcons name="file-image-outline" size={21} color={theme.colors.primary} />
        <Text style={[styles.mediaLabel, { color: theme.colors.onSurfaceVariant }]}>File</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mediaAction} onPress={onOpenCamera} disabled={disabled} activeOpacity={0.75}>
        <MaterialCommunityIcons name="camera-outline" size={21} color={theme.colors.primary} />
        <Text style={[styles.mediaLabel, { color: theme.colors.onSurfaceVariant }]}>Camera</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.mediaAction, isRecording && { backgroundColor: 'rgba(239,68,68,0.1)' }]}
        onPress={onToggleVoice}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name={isRecording ? 'stop' : 'microphone-outline'} size={21} color={isRecording ? '#EF4444' : theme.colors.primary} />
        <Text style={[styles.mediaLabel, { color: isRecording ? '#EF4444' : theme.colors.onSurfaceVariant }]}>
          {isRecording ? `${recordingSeconds}s` : 'Voice'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mediaAction: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  mediaLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});
