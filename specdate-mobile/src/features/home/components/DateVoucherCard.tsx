import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateVoucherItem } from '../../../services/vouchers';
import { toImageUri } from '../../../utils/imageUrl';
import { withAlpha } from '../homeUtils';
import { HomeColors } from '../types';

type Props = {
  item: DateVoucherItem;
  theme: any;
  homeColors: HomeColors;
  onPress: () => void;
};

const statusLabels: Record<string, string> = {
  pending_provider: 'Pending',
  active: 'Active',
  rejected: 'Rejected',
  redeemed: 'Redeemed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  expired: 'Expired',
};

function initials(name?: string | null) {
  const parts = (name || 'Dater').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'D';
}

function DaterAvatar({ user, color, borderColor }: { user?: DateVoucherItem['owner']; color: string; borderColor: string }) {
  const avatarUri = toImageUri(user?.avatar);

  if (avatarUri) {
    return <Avatar.Image size={34} source={{ uri: avatarUri }} style={[styles.daterAvatar, { borderColor }]} />;
  }

  return (
    <Avatar.Text
      size={34}
      label={initials(user?.name)}
      style={[styles.daterAvatar, { backgroundColor: color, borderColor }]}
      labelStyle={styles.avatarLabel}
    />
  );
}

export default function DateVoucherCard({ item, theme, homeColors, onPress }: Props) {
  const statusColor =
    item.status === 'active' ? '#16A34A'
      : item.status === 'pending_provider' ? '#F59E0B'
        : item.status === 'redeemed' ? theme.colors.primary
          : '#64748B';

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity activeOpacity={0.86} onPress={onPress}>
        <View style={styles.topRow}>
          <View style={styles.avatarStack}>
            <DaterAvatar user={item.owner} color={theme.colors.primary} borderColor={theme.colors.surface} />
            <View style={styles.avatarOverlap}>
              <DaterAvatar user={item.winner} color="#0F766E" borderColor={theme.colors.surface} />
            </View>
          </View>
          <View style={styles.main}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.provider?.name || 'Date venue'}
            </Text>
            <Text style={[styles.meta, { color: homeColors.subtext }]} numberOfLines={1}>
              {item.date?.spec?.title || 'Matched date'}{item.provider?.city ? ` · ${item.provider.city}` : ''}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabels[item.status] ?? item.status}</Text>
          </View>
        </View>

        <View style={[styles.offerPanel, { backgroundColor: withAlpha(theme.colors.primary, 0.06) }]}>
          <View>
            <Text style={[styles.label, { color: homeColors.subtext }]}>Discount</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.discount_percentage}% off</Text>
          </View>
          <View>
            <Text style={[styles.label, { color: homeColors.subtext }]}>Date code</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.date?.date_code || '-'}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
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
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarStack: { width: 54, height: 40, justifyContent: 'center' },
  avatarOverlap: { position: 'absolute', left: 20 },
  daterAvatar: { borderWidth: 2 },
  avatarLabel: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  main: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '900' },
  meta: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '900' },
  offerPanel: {
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  value: { fontSize: 15, fontWeight: '900', marginTop: 2 },
});
