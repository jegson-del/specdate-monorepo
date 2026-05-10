import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChatService } from '../../services/chat';
import ChatThreadCard from './components/ChatThreadCard';

export default function ChatListScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => ChatService.getThreads({ per_page: 50 }),
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const threads = data?.data?.data || [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Messages</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Chats from dates and providers</Text>
        </View>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="chat-outline" size={36} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No chats yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                When a spec quest becomes a date or you message a provider, your chat will appear here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ChatThreadCard
            thread={item}
            onPress={() => navigation.navigate('ChatThread', { threadId: item.id })}
          />
        )}
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
