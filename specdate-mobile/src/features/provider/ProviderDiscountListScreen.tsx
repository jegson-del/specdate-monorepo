import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

type Discount = {
  id: number;
  code: string;
  percentage: number;
  status: 'active' | 'used';
  user_name?: string;
  used_at?: string;
  created_at: string;
};

export default function ProviderDiscountListScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const type = (route.params?.type as 'generated' | 'redeemed') || 'generated';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const fetchList = useCallback(async () => {
    try {
      const res = await api.get('/provider/dashboard');
      const data = res.data as any;
      const all = data.discounts || [];
      const filtered =
        type === 'redeemed' ? all.filter((d: Discount) => d.status === 'used') : all;
      setDiscounts(filtered);
    } catch {
      setDiscounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchList();
    }, [fetchList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchList();
  };

  const title = type === 'redeemed' ? 'Redeemed codes' : 'Generated codes';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {discounts.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name={type === 'redeemed' ? 'ticket-confirmation-outline' : 'ticket-percent-outline'}
                size={56}
                color={theme.colors.outline}
              />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {type === 'redeemed' ? 'No redeemed codes yet.' : 'No generated codes yet.'}
              </Text>
            </View>
          ) : (
            discounts.map((d) => (
              <Surface key={d.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.cardRow}>
                  <MaterialCommunityIcons
                    name={d.status === 'used' ? 'ticket-confirmation' : 'ticket-outline'}
                    size={26}
                    color={d.status === 'used' ? theme.colors.outline : theme.colors.primary}
                  />
                  <View style={styles.cardBody}>
                    <Text style={[styles.code, { color: theme.colors.onSurface }]}>{d.code}</Text>
                    <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                      {d.user_name || '—'} · {d.percentage}% off
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: d.status === 'used' ? theme.colors.surfaceVariant : theme.colors.primaryContainer + '80' }]}>
                    <Text style={[styles.badgeText, { color: d.status === 'used' ? theme.colors.onSurfaceVariant : theme.colors.primary }]}>
                      {d.status === 'used' ? 'Redeemed' : 'Active'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.date, { color: theme.colors.outline }]}>
                  {d.status === 'used' && d.used_at
                    ? `Redeemed ${new Date(d.used_at).toLocaleString()}`
                    : `Created ${new Date(d.created_at).toLocaleString()}`}
                </Text>
              </Surface>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardBody: { flex: 1 },
  code: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 10 },
});
