import React from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';

type Props = {
  answers: any[];
  roundStatus: string;
  theme: any;
  onEliminate: (userId: number) => void;
  onOpenVideo: (uri: string) => void;
  onReportAnswer?: (answer: any) => void;
  onReportMedia?: (answer: any) => void;
};

function isAudioMedia(media?: any) {
  return String(media?.type ?? '').includes('_audio') || String(media?.mime_type ?? '').startsWith('audio/');
}

function isVideoMedia(media?: any) {
  return String(media?.type ?? '').includes('_video') || String(media?.mime_type ?? '').startsWith('video/');
}

export function RoundResponsesList({ answers, roundStatus, theme, onEliminate, onOpenVideo, onReportAnswer, onReportMedia }: Props) {
  const canEliminate = String(roundStatus).toUpperCase() === 'REVIEWING' || String(roundStatus).toUpperCase() === 'ACTIVE';

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Responses</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {answers.length} answer{answers.length !== 1 ? 's' : ''}
      </Text>

      {answers.length === 0 && (
        <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>No answers yet.</Text>
      )}

      <View style={styles.answersList}>
        {answers.map((answer: any) => {
          const displayName = answer.user?.profile?.full_name || answer.user?.name || 'User';
          const avatarUri = toImageUri(answer.user?.profile?.avatar) || undefined;
          const isEliminated = answer.is_eliminated;

          return (
            <View
              key={answer.id}
              style={[
                styles.answerRow,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '30' },
                isEliminated && styles.answerRowEliminated,
              ]}
            >
              <Avatar.Image size={44} source={{ uri: avatarUri }} style={styles.answerAvatar} />
              <View style={styles.answerBody}>
                <Text style={[styles.answerName, { color: theme.colors.onSurface }]} numberOfLines={1}>{displayName}</Text>
                <Text style={[styles.answerText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>
                  {answer.answer_text?.trim() || 'Voice answer'}
                </Text>
                {answer.media && (
                  isAudioMedia(answer.media) ? (
                    <View style={styles.answerMedia}>
                      <AudioMessagePlayer uri={answer.media.url} label="Audio answer" compact />
                    </View>
                  ) : isVideoMedia(answer.media) ? (
                    <View style={styles.answerMedia}>
                      <VideoThumbnailPlayer uri={answer.media.url} width={160} height={100} onPress={() => onOpenVideo(answer.media.url)} />
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => { }}>
                      <Image
                        source={{ uri: answer.media.url }}
                        style={[styles.answerImage, { backgroundColor: theme.colors.surfaceVariant }]}
                      />
                    </TouchableOpacity>
                  )
                )}
                <View style={styles.reportActions}>
                  {onReportAnswer ? (
                    <TouchableOpacity
                      onPress={() => onReportAnswer(answer)}
                      style={[styles.reportButton, { borderColor: theme.colors.outlineVariant }]}
                      accessibilityLabel="Report answer"
                    >
                      <MaterialCommunityIcons name="flag-outline" size={16} color={theme.colors.error} />
                      <Text style={[styles.reportButtonLabel, { color: theme.colors.error }]}>Report answer</Text>
                    </TouchableOpacity>
                  ) : null}
                  {answer.media && onReportMedia ? (
                    <TouchableOpacity
                      onPress={() => onReportMedia(answer)}
                      style={[styles.reportButton, { borderColor: theme.colors.outlineVariant }]}
                      accessibilityLabel="Report answer media"
                    >
                      <MaterialCommunityIcons name="file-image-outline" size={16} color={theme.colors.error} />
                      <Text style={[styles.reportButtonLabel, { color: theme.colors.error }]}>Report media</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {(canEliminate && !isEliminated) ? (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Eliminate?', `Eliminate ${displayName}?`, [
                      { text: 'Cancel' },
                      { text: 'Eliminate', style: 'destructive', onPress: () => onEliminate(answer.user_id) },
                    ]);
                  }}
                  style={styles.eliminateButton}
                  accessibilityLabel="Eliminate participant"
                >
                  <MaterialCommunityIcons name="account-remove" size={22} color={theme.colors.error} />
                  <Text style={[styles.eliminateButtonLabel, { color: theme.colors.error }]}>Eliminate</Text>
                </TouchableOpacity>
              ) : null}
              {isEliminated && (
                <View style={styles.eliminatedChip}>
                  <MaterialCommunityIcons name="account-off" size={20} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.eliminatedLabel, { color: theme.colors.onSurfaceVariant }]}>Eliminated</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 12 },
  hintText: { fontSize: 14 },
  answersList: { gap: 10 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  answerRowEliminated: { opacity: 0.55 },
  answerAvatar: {},
  answerBody: { flex: 1, minWidth: 0 },
  answerName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  answerText: { fontSize: 14, lineHeight: 20 },
  answerMedia: { marginTop: 8 },
  answerImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  reportActions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 10,
  },
  reportButton: {
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 1,
    minWidth: 0,
  },
  reportButtonLabel: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  eliminateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  eliminateButtonLabel: { fontSize: 13, fontWeight: '700' },
  eliminatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  eliminatedLabel: { fontSize: 13, fontWeight: '600' },
});
