import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onSend: (body: string) => void;
  onOpenFile: () => void;
  onOpenCamera: () => void;
  onToggleVoice: () => void;
  isRecording?: boolean;
  durationMillis?: number;
  disabled?: boolean;
};

export default function MessageComposer({
  onSend,
  onOpenFile,
  onOpenCamera,
  onToggleVoice,
  isRecording = false,
  durationMillis = 0,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const [body, setBody] = useState('');
  const canSend = body.trim().length > 0 && !disabled;
  const recordingSeconds = Math.floor(durationMillis / 1000);

  const handleSend = () => {
    if (!canSend) return;
    onSend(body);
    setBody('');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
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

      <View style={styles.composerRow}>
        <TextInput
          value={body}
          onChangeText={setBody}
          mode="outlined"
          placeholder="Message your date"
          multiline
          maxLength={2000}
          style={styles.input}
          contentStyle={styles.inputContent}
          outlineStyle={{ borderRadius: 18 }}
        />
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.send,
            { backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons name="send" size={20} color={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 66,
    maxHeight: 150,
  },
  inputContent: {
    minHeight: 62,
    paddingTop: 10,
    paddingBottom: 10,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
