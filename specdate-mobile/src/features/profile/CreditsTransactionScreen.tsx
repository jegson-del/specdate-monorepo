import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

type TransactionRow = {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  item_type: string;
  quantity: number;
  amount: number | null;
  currency: string | null;
  purpose: string;
  revenue_cat_transaction_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export default function CreditsTransactionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['credits-transactions'],
    queryFn: async () => {
      const res = await api.get('/credits/transactions');
      return res.data as { data: TransactionRow[] };
    },
    staleTime: 60 * 1000,
  });

  const list = useMemo(() => Array.isArray(data?.data) ? data.data : [], [data]);

  const renderItem = ({ item }: { item: TransactionRow }) => {
    const isCredit = item.type === 'CREDIT';
    const qty = item.quantity;
    const amountText = item.amount != null && item.currency
      ? `${item.currency} ${Number(item.amount).toFixed(2)}`
      : null;
    const timeText = item.created_at
      ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
      : '';

    return (
      <View
        style={[
          styles.item,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant + '40' }
        ]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: isCredit ? theme.colors.primaryContainer : theme.colors.errorContainer }
          ]}
        >
          <MaterialCommunityIcons
            name={isCredit ? 'plus' : 'minus'}
            size={24}
            color={isCredit ? theme.colors.primary : theme.colors.error}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {item.purpose}
            </Text>
            <Text
              style={[
                styles.amount,
                { color: isCredit ? theme.colors.primary : theme.colors.error, fontWeight: '700' }
              ]}
            >
              {isCredit ? `+${qty}` : `-${qty}`} credit{qty !== 1 ? 's' : ''}
            </Text>
          </View>
          {amountText && (
            <Text style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>{amountText}</Text>
          )}
          <Text style={[styles.timeText, { color: theme.colors.outline }]}>{timeText}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={24} />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Transaction history</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="history" size={48} color={theme.colors.outline} />
              <Text style={[styles.emptyText, { color: theme.colors.outline }]}>
                No transactions yet.
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                Purchases and credit usage will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
  },
  subtext: {
    fontSize: 13,
  },
  timeText: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
