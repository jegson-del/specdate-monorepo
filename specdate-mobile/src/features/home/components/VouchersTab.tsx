import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { VoucherService } from '../../../services/vouchers';
import { withAlpha } from '../homeUtils';
import { HomeColors } from '../types';
import DateVoucherCard from './DateVoucherCard';

type Props = {
  theme: any;
  homeColors: HomeColors;
  insets: { bottom: number };
  bottomNavHeight: number;
  navigation: any;
};

export default function VouchersTab({ theme, homeColors, insets, bottomNavHeight, navigation }: Props) {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['date-vouchers'],
    queryFn: VoucherService.getVouchers,
  });

  const vouchers = useMemo(() => data?.data || [], [data]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Provider dates</Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Date vouchers</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}>
          <MaterialCommunityIcons name="ticket-percent-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.countText, { color: theme.colors.primary }]}>{vouchers.length}</Text>
        </View>
      </View>

      <FlatList
        key="vouchers"
        data={vouchers}
        keyExtractor={(item) => String(item.id)}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + bottomNavHeight + 24 }]}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}>
                <MaterialCommunityIcons name="ticket-percent-outline" size={34} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No date vouchers yet</Text>
              <Text style={[styles.emptyText, { color: homeColors.subtext }]}>
                Choose a provider and enter your date code to claim a voucher for your matched date.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DateVoucherCard
            item={item}
            theme={theme}
            homeColors={homeColors}
            onPress={() => navigation.navigate('DateVoucherDetail', { voucherId: item.id, voucher: item })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 0, marginTop: 2 },
  countPill: {
    minWidth: 58,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countText: { fontSize: 14, fontWeight: '900' },
  listContent: { paddingTop: 4, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 28 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
