import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SupportService, type SupportTicket } from '../../services/support';

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SupportTicketCard({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const theme = useTheme();
  const isUnread = Number(ticket.unread_count) > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isUnread ? theme.colors.primary : theme.colors.outlineVariant }]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="lifebuoy" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{ticket.subject}</Text>
          <Text style={[styles.cardMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {formatStatus(ticket.status)} • {ticket.category.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {isUnread ? <View style={[styles.badge, { backgroundColor: theme.colors.error }]} /> : null}
          <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>{formatDate(ticket.last_message_at || ticket.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SupportTicketsScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ticketsQuery = useInfiniteQuery({
    queryKey: ['support-tickets'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => SupportService.getTickets({ page: Number(pageParam), per_page: 30 }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.data.current_page ?? 1;
      const last = lastPage.data.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
  });
  const { isLoading, refetch } = ticketsQuery;

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const tickets = ticketsQuery.data?.pages.flatMap((page) => page.data.data) || [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Contact Support</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Message the DateUsher support team</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button
          mode="contained"
          icon="plus"
          style={styles.newButton}
          contentStyle={{ height: 46 }}
          onPress={() => navigation.navigate('CreateSupportTicket')}
        >
          New support request
        </Button>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        onRefresh={refetch}
        refreshing={isLoading}
        onEndReached={() => {
          if (ticketsQuery.hasNextPage && !ticketsQuery.isFetchingNextPage) ticketsQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        renderItem={({ item }) => (
          <SupportTicketCard
            ticket={item}
            onPress={() => navigation.navigate('SupportThread', { ticketId: item.id })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="lifebuoy" size={36} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No support requests yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Create a request for safety, account, credit, privacy, or technical help.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  newButton: {
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  date: {
    fontSize: 11,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
