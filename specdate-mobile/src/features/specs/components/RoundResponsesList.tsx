import React from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';
import { isAudioMedia, isVideoMedia } from '../specDetailsUtils';

type Props = {
  answers: any[];
  roundStatus: string;
  theme: any;
  onEliminate: (userId: number) => void;
  onOpenVideo: (uri: string) => void;
  onOpenReportMenu?: (answer: any) => void;
};

export function RoundResponsesList({ answers, roundStatus, theme, onEliminate, onOpenVideo, onOpenReportMenu }: Props) {
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
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant || theme.colors.outline + '30',
                  borderLeftColor: theme.colors.primary,
                },
                isEliminated && styles.answerRowEliminated,
              ]}
            >
              <Avatar.Image size={44} source={{ uri: avatarUri }} style={styles.answerAvatar} />
              <View style={styles.answerBody}>
                <View style={styles.answerHeader}>
                  <View style={styles.answerNameWrap}>
                    <Text style={[styles.answerName, { color: theme.colors.onSurface }]} numberOfLines={1}>{displayName}</Text>
                    <View style={[styles.answerStatusDot, { backgroundColor: isEliminated ? theme.colors.outline : theme.colors.primary }]} />
                  </View>
                </View>
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
              </View>
              <View style={styles.actionColumn}>
                {onOpenReportMenu ? (
                  <TouchableOpacity
                    onPress={() => onOpenReportMenu(answer)}
                    style={[styles.actionButton, styles.reportMenuButton]}
                    accessibilityLabel="Report response"
                  >
                    <MaterialCommunityIcons name="flag-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.reportMenuLabel}>Report</Text>
                  </TouchableOpacity>
                ) : null}
                {(canEliminate && !isEliminated) ? (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Eliminate?', `Eliminate ${displayName}?`, [
                        { text: 'Cancel' },
                        { text: 'Eliminate', style: 'destructive', onPress: () => onEliminate(answer.user_id) },
                      ]);
                    }}
                    style={[styles.actionButton, styles.eliminateButton]}
                    accessibilityLabel="Eliminate participant"
                  >
                    <MaterialCommunityIcons name="account-remove" size={20} color="#FFFFFF" />
                    <Text style={styles.eliminateButtonLabel}>Eliminate</Text>
                  </TouchableOpacity>
                ) : null}
                {isEliminated && (
                  <View style={styles.eliminatedChip}>
                    <MaterialCommunityIcons name="account-off" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text style={[styles.eliminatedLabel, { color: theme.colors.onSurfaceVariant }]}>Eliminated</Text>
                  </View>
                )}
              </View>
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
    borderLeftWidth: 3,
    gap: 14,
  },
  answerRowEliminated: { opacity: 0.55 },
  answerAvatar: {},
  answerBody: { flex: 1, minWidth: 0 },
  answerHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  answerNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  answerName: { fontSize: 15, fontWeight: '800' },
  answerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  answerText: { fontSize: 14, lineHeight: 20 },
  answerMedia: { marginTop: 8 },
  answerImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  actionColumn: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 12,
  },
  reportMenuButton: {
    backgroundColor: '#F97316',
  },
  actionButton: {
    width: 96,
    height: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  reportMenuLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  eliminateButton: {
    backgroundColor: '#7C3AED',
  },
  eliminateButtonLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  eliminatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  eliminatedLabel: { fontSize: 12, fontWeight: '700' },
});
