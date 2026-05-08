import React from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';
import { EmojiPickerButton } from '../../../components';
import { insertEmojiAtSelection, type TextSelection } from '../../../utils/emojiText';

type Props = {
  round: any;
  answersCount: number;
  theme: any;
  isOwner: boolean;
  isEditing: boolean;
  editQuestionText: string;
  updatePending: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onChangeEditQuestionText: (text: string) => void;
  onSaveEdit: () => void;
  onOpenVideo: (uri: string) => void;
};

function isAudioMedia(media?: any) {
  return String(media?.type ?? '').includes('_audio') || String(media?.mime_type ?? '').startsWith('audio/');
}

function isVideoMedia(media?: any) {
  return String(media?.type ?? '').includes('_video') || String(media?.mime_type ?? '').startsWith('video/');
}

export function RoundQuestionCard({
  round,
  answersCount,
  theme,
  isOwner,
  isEditing,
  editQuestionText,
  updatePending,
  onStartEditing,
  onCancelEditing,
  onChangeEditQuestionText,
  onSaveEdit,
  onOpenVideo,
}: Props) {
  const [selection, setSelection] = React.useState<TextSelection>({ start: editQuestionText.length, end: editQuestionText.length });

  React.useEffect(() => {
    if (!isEditing) return;
    const end = editQuestionText.length;
    setSelection({ start: end, end });
  }, [isEditing]);

  const handleEmojiSelected = (emoji: string) => {
    const next = insertEmojiAtSelection(editQuestionText, emoji, selection);
    onChangeEditQuestionText(next.value);
    setSelection(next.selection);
  };

  return (
    <View style={[styles.questionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionLabel, { color: theme.colors.onSurfaceVariant }]}>QUESTION</Text>
        {isOwner && round.status === 'ACTIVE' && !isEditing && (
          <TouchableOpacity onPress={onStartEditing}>
            <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <View style={styles.editBlock}>
          <TextInput
            value={editQuestionText}
            onChangeText={onChangeEditQuestionText}
            selection={selection}
            onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
            style={[styles.flatInput, { color: theme.colors.onSurface, borderColor: theme.colors.primary, borderWidth: 2 }]}
            autoFocus
            multiline
          />
          <View style={styles.editToolbar}>
            <EmojiPickerButton onEmojiSelected={handleEmojiSelected} disabled={updatePending} />
          </View>
          <View style={styles.editActions}>
            <Button mode="text" onPress={onCancelEditing} compact>Cancel</Button>
            <Button
              mode="contained"
              onPress={onSaveEdit}
              loading={updatePending}
              disabled={!editQuestionText.trim() || updatePending}
              compact
            >
              Save
            </Button>
          </View>
        </View>
      ) : (
        <Text style={[styles.questionText, { color: theme.colors.onSurface }]}>
          {round.question_text?.trim() || 'Voice question'}
        </Text>
      )}

      {!isEditing && round.media?.url && (
        <View style={styles.questionMediaDisplay}>
          {isAudioMedia(round.media) ? (
            <AudioMessagePlayer uri={round.media.url} label="Audio question" />
          ) : isVideoMedia(round.media) ? (
            <VideoThumbnailPlayer
              uri={round.media.url}
              width={220}
              height={130}
              onPress={() => onOpenVideo(round.media.url)}
            />
          ) : (
            <Image source={{ uri: round.media.url }} style={styles.questionMediaImageLarge} />
          )}
        </View>
      )}

      <View style={[styles.questionMeta, { borderTopColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]}>
        <Text style={[styles.questionMetaText, { color: theme.colors.onSurfaceVariant }]}>
          {answersCount} response{answersCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  questionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  questionMediaDisplay: { marginTop: 14 },
  questionMediaImageLarge: {
    width: '100%',
    height: 190,
    borderRadius: 12,
  },
  questionMeta: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  questionMetaText: { fontSize: 13 },
  editBlock: { gap: 10, marginBottom: 10 },
  editToolbar: { flexDirection: 'row' },
  editActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  flatInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
