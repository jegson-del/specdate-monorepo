import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';
import { ChatThread } from '../../../services/chat';

type Props = {
  thread: ChatThread;
  onPress: () => void;
};

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatThreadCard({ thread, onPress }: Props) {
  const theme = useTheme();
  const avatar = toImageUri(thread.other_user?.avatar);
  const name = thread.other_user?.name || 'Your match';
  const last = thread.last_message?.body || 'Start the conversation';
  const unread = Number(thread.unread_count || 0);

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      {avatar ? (
        <Avatar.Image size={52} source={{ uri: avatar }} />
      ) : (
        <Avatar.Text size={52} label={name.slice(0, 2).toUpperCase()} />
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
            {formatTime(thread.last_message_at || thread.created_at)}
          </Text>
        </View>

        <View style={styles.specRow}>
          <MaterialCommunityIcons name="target" size={14} color={theme.colors.primary} />
          <Text style={[styles.spec, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {thread.spec?.title || 'Spec date'}{thread.date_code ? ` • ${thread.date_code}` : ''}
          </Text>
        </View>

        <Text style={[styles.preview, { color: unread ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {last}
        </Text>
      </View>

      {unread > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.outline} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  spec: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
