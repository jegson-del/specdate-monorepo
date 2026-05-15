import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
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

type FilterKey = 'all' | 'credit' | 'debit';

export default function CreditsTransactionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterKey>('all');

  const transactionsQuery = useInfiniteQuery({
    queryKey: ['credits-transactions'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/credits/transactions', { params: { page: Number(pageParam), per_page: 30 } });
      return res.data as { data: { data: TransactionRow[]; current_page?: number; last_page?: number } };
    },
    getNextPageParam: (lastPage) => {
      const current = lastPage.data.current_page ?? 1;
      const last = lastPage.data.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    staleTime: 60 * 1000,
  });
  const { isLoading, refetch, isRefetching } = transactionsQuery;

  const list = useMemo(() => transactionsQuery.data?.pages.flatMap((page) => page.data.data) || [], [transactionsQuery.data]);
  const filteredList = useMemo(() => {
    if (filter === 'credit') return list.filter((item) => item.type === 'CREDIT');
    if (filter === 'debit') return list.filter((item) => item.type === 'DEBIT');
    return list;
  }, [filter, list]);
  const summary = useMemo(() => {
    return list.reduce(
      (acc, item) => {
        if (item.type === 'CREDIT') acc.earned += Number(item.quantity || 0);
        if (item.type === 'DEBIT') acc.spent += Number(item.quantity || 0);
        return acc;
      },
      { earned: 0, spent: 0 },
    );
  }, [list]);

  const renderItem = ({ item }: { item: TransactionRow }) => {
    const isCredit = item.type === 'CREDIT';
    const qty = item.quantity;
    const amountText = item.amount != null && item.currency
      ? `${item.currency} ${Number(item.amount).toFixed(2)}`
      : null;
    const timeText = item.created_at
      ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
      : '';
    const tone = isCredit ? theme.colors.primary : theme.colors.error;
    const toneBg = isCredit ? theme.colors.primaryContainer : theme.colors.errorContainer;
    const icon = isCredit ? 'arrow-down-circle' : 'arrow-up-circle';

    return (
      <Surface
        style={[
          styles.itemCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant + '66' }
        ]}
        elevation={0}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: toneBg }
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={tone}
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
                { color: tone }
              ]}
            >
              {isCredit ? `+${qty}` : `-${qty}`} credit{qty !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.typePill, { backgroundColor: toneBg }]}>
              <Text style={[styles.typePillText, { color: tone }]}>{isCredit ? 'Added' : 'Used'}</Text>
            </View>
            {amountText && (
              <Text style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>{amountText}</Text>
            )}
            <Text style={[styles.timeText, { color: theme.colors.outline }]}>{timeText}</Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={24} />
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Credit activity</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>Wallet statement</Text>
        </View>
        <IconButton icon="refresh" onPress={() => refetch()} size={22} disabled={isRefetching} />
      </View>

      <View style={styles.summaryWrap}>
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primary }]} elevation={0}>
          <View>
            <Text style={styles.summaryLabel}>Credits added</Text>
            <Text style={styles.summaryValue}>+{summary.earned}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>Credits used</Text>
            <Text style={styles.summaryValue}>-{summary.spent}</Text>
          </View>
        </Surface>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'credit', label: 'Added' },
          { key: 'debit', label: 'Used' },
        ].map((item) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              onPress={() => setFilter(item.key as FilterKey)}
              style={[
                styles.filterPill,
                { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.colors.onSurfaceVariant }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        onEndReached={() => {
          if (transactionsQuery.hasNextPage && !transactionsQuery.isFetchingNextPage) transactionsQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator />
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>Loading activity...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="wallet-outline" size={34} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                No activity here yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                Purchases and credit usage will appear as soon as your wallet moves.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          transactionsQuery.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" />
              <Text style={[styles.footerLoadingText, { color: theme.colors.onSurfaceVariant }]}>
                Loading more activity
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
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  summaryWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
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
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  subtext: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoading: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
