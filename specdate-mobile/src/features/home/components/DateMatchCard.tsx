import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          {winnerAvatar ? (
            <Avatar.Image size={64} source={{ uri: winnerAvatar }} />
          ) : (
            <Avatar.Text size={64} label={winnerName.slice(0, 2).toUpperCase()} />
          )}
          <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={13} color={theme.colors.onPrimary} />
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
        </View>

        <TouchableOpacity
          style={[styles.chatButton, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}
          activeOpacity={0.75}
          onPress={() => Alert.alert('Chat coming soon', 'This will open the private chat between both parties when chat is enabled.')}
        >
          <MaterialCommunityIcons name="chat-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoPanel, { backgroundColor: withAlpha(theme.colors.primary, 0.06) }]}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="target" size={18} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {item.spec?.title || 'Spec quest'}
          </Text>
        </View>
        {item.spec?.location_city ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={homeColors.subtext} />
            <Text style={[styles.metaText, { color: homeColors.subtext }]} numberOfLines={1}>
              {item.spec.location_city}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.codeRow}>
        <View>
          <Text style={[styles.codeLabel, { color: homeColors.subtext }]}>Date code</Text>
          <Text style={[styles.codeValue, { color: theme.colors.onSurface }]}>{item.date_code}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onOpenQuest(item.spec_id)}
          style={[styles.questButton, { borderColor: withAlpha(theme.colors.primary, 0.22) }]}
        >
          <Text style={[styles.questButtonText, { color: theme.colors.primary }]}>Quest</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  winnerName: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 3,
  },
  subText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanel: {
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },
  questButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  questButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
