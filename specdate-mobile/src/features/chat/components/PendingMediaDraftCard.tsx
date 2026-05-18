import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { VideoThumbnailPlayer } from '../../specs/components';
import { PendingChatMediaDraft } from '../hooks/usePendingChatMediaDrafts';

type Props = {
  draft: PendingChatMediaDraft;
  isSending?: boolean;
  onDiscard: (draftId: string) => void;
  onOpenVideo?: (uri: string) => void;
  onSend: (draftId: string) => void;
  theme: any;
};

export default function PendingMediaDraftCard({
  draft,
  isSending = false,
  onDiscard,
  onOpenVideo,
  onSend,
  theme,
}: Props) {
  const approved = draft.status === 'approved';
  const title = approved ? 'Approved' : 'Under review';
  const helper = approved
    ? 'Send it now or discard it.'
    : 'You can send this after admin approval.';

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: approved ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        {draft.assetType === 'image' ? (
          <Image source={{ uri: draft.uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <VideoThumbnailPlayer
            uri={draft.uri}
            width={210}
            height={130}
            onPress={() => onOpenVideo?.(draft.uri)}
          />
        )}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>{helper}</Text>
        </View>
        <View style={styles.actions}>
          {approved ? (
            <Button
              mode="contained"
              compact
              loading={isSending}
              disabled={isSending}
              onPress={() => onSend(draft.id)}
              style={styles.actionButton}
            >
              Send now
            </Button>
          ) : null}
          <Button
            mode="outlined"
            compact
            disabled={isSending}
            onPress={() => onDiscard(draft.id)}
            style={styles.actionButton}
          >
            Discard
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  card: {
    width: 236,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  image: {
    width: 210,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  copy: {
    marginTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    borderRadius: 8,
  },
});
