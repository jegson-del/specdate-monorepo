import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { toImageUri } from '../../../utils/imageUrl';
import { formatMatchedDate, withAlpha } from '../homeUtils';
import { HomeColors, SpecDateItem } from '../types';

type Props = {
  item: SpecDateItem;
  theme: any;
  homeColors: HomeColors;
  onOpenQuest: (specId: number) => void;
};

export default function DateMatchCard({ item, theme, homeColors, onOpenQuest }: Props) {
  const winnerAvatar = toImageUri(item.winner?.avatar);
  const otherName = item.other_user?.name || 'Your match';
  const winnerName = item.winner?.name || 'Winner';
  const specMeta = [item.spec?.title || 'Spec quest', item.spec?.location_city].filter(Boolean).join(' • ');

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(item.date_code);
    Alert.alert('Date code copied', 'Use this code when booking your date with a provider.');
  };

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          {winnerAvatar ? (
            <Avatar.Image size={52} source={{ uri: winnerAvatar }} />
          ) : (
            <Avatar.Text size={52} label={winnerName.slice(0, 2).toUpperCase()} />
          )}
          <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={11} color={theme.colors.onPrimary} />
          </View>
        </View>

        <View style={styles.main}>
          <Text style={[styles.matchedText, { color: theme.colors.primary }]}>
            {formatMatchedDate(item.matched_at)}
          </Text>
          <Text style={[styles.winnerName, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {winnerName}
          </Text>
          <Text style={[styles.subText, { color: homeColors.subtext }]} numberOfLines={1}>
            {item.is_owner ? 'Spec quest winner' : `Matched with ${otherName}`}
          </Text>
          <View style={styles.questInline}>
            <MaterialCommunityIcons name="target" size={14} color={homeColors.subtext} />
            <Text style={[styles.questInlineText, { color: homeColors.subtext }]} numberOfLines={1}>
              {specMeta}
            </Text>
          </View>
        </View>

        <View style={styles.sideActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Chat coming soon', 'This will open the private chat between both parties when chat is enabled.')}
          >
            <MaterialCommunityIcons name="chat-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onOpenQuest(item.spec_id)}
            style={[styles.iconButton, { backgroundColor: withAlpha(theme.colors.primary, 0.06) }]}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.codePanel, { backgroundColor: withAlpha(theme.colors.primary, 0.06) }]}>
        <View style={styles.codeCopyRow}>
          <View style={styles.codeTextWrap}>
            <Text style={[styles.codeLabel, { color: homeColors.subtext }]}>Date code</Text>
            <Text style={[styles.codeValue, { color: theme.colors.onSurface }]}>{item.date_code}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleCopyCode}
            style={[styles.copyButton, { borderColor: withAlpha(theme.colors.primary, 0.22) }]}
          >
            <MaterialCommunityIcons name="content-copy" size={18} color={theme.colors.primary} />
            <Text style={[styles.copyText, { color: theme.colors.primary }]}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.codeHint, { color: homeColors.subtext }]}>
          Copy this code to book your date with a provider.
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  matchedText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  winnerName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 3,
  },
  subText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  questInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  questInlineText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  sideActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePanel: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  codeCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  codeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },
  copyButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '900',
  },
  codeHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
