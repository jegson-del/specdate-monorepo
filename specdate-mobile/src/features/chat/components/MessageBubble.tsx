import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { ChatMessage } from '../../../services/chat';
import { AudioMessagePlayer, VideoThumbnailPlayer } from '../../specs/components';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  theme: any;
  onOpenVideo?: (uri: string) => void;
  onReport?: (message: ChatMessage) => void;
  onOpenMenu?: (message: ChatMessage) => void;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, theme, onOpenVideo, onReport, onOpenMenu }: Props) {
  const canOpenActions = !message.archived && Boolean(onOpenMenu || onReport);
  const mediaUrl = message.media?.url;
  const mediaKind = String(message.media?.type ?? '');
  const mimeType = String(message.media?.mime_type ?? '');
  const isAudio = mediaUrl && (mediaKind === 'chat_audio' || mimeType.startsWith('audio/'));
  const isVideo = mediaUrl && !isAudio && (mediaKind === 'chat_video' || mimeType.startsWith('video/'));
  const isImage = mediaUrl && !isVideo && !isAudio && (
    mediaKind === 'chat_image' ||
    mimeType.startsWith('image/') ||
    mediaKind === 'chat'
  );

  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
      {!isMine && canOpenActions ? (
        <IconButton
          icon="dots-horizontal"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => onOpenMenu?.(message)}
          style={[styles.menuButton, { backgroundColor: theme.colors.surfaceVariant }]}
          accessibilityLabel="Message options"
        />
      ) : null}
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => {
          if (!isMine && canOpenActions) onReport?.(message);
        }}
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? theme.colors.primary : theme.colors.surface,
            borderColor: isMine ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        {isImage ? (
          <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="cover" />
        ) : isVideo ? (
          <VideoThumbnailPlayer uri={mediaUrl} width={210} height={130} onPress={() => onOpenVideo?.(mediaUrl)} />
        ) : isAudio ? (
          <AudioMessagePlayer uri={mediaUrl} label="Voice note" compact />
        ) : null}
        {message.body ? (
          <Text style={[styles.body, { color: isMine ? theme.colors.onPrimary : theme.colors.onSurface }]}>
            {message.body}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.colors.onSurfaceVariant }]}>
          {formatTime(message.created_at)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mineRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  menuButton: {
    width: 30,
    height: 30,
    margin: 0,
    marginRight: 6,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  image: {
    width: 210,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#E5E7EB',
  },
  time: {
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
