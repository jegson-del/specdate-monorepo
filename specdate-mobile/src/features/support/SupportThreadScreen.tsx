import React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupportMessage, SupportService } from '../../services/support';

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function SupportBubble({ message }: { message: SupportMessage }) {
  const theme = useTheme();
  const isMine = message.sender_role === 'user';

  return (
    <View style={[styles.messageRow, isMine ? styles.mineRow : styles.theirRow]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? theme.colors.primary : theme.colors.surface,
            borderColor: isMine ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.sender, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.colors.primary }]}>
          {isMine ? 'You' : 'DateUsher Support'}
        </Text>
        <Text style={[styles.body, { color: isMine ? theme.colors.onPrimary : theme.colors.onSurface }]}>
          {message.body}
        </Text>
        <Text style={[styles.time, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.colors.onSurfaceVariant }]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function SupportThreadScreen({ route, navigation }: any) {
  const ticketId = route.params?.ticketId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const listRef = React.useRef<FlatList<SupportMessage>>(null);
  const [body, setBody] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support-ticket', String(ticketId)],
    queryFn: () => SupportService.getTicket(ticketId),
    enabled: ticketId != null,
  });

  const sendMutation = useMutation({
    mutationFn: () => SupportService.sendMessage(ticketId, body),
    onSuccess: (res) => {
      setBody('');
      queryClient.setQueryData(['support-ticket', String(ticketId)], (current: any) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: {
            ...current.data,
            messages: [...(current.data.messages || []), res.data],
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    onError: (e: any) => {
      Alert.alert('Message failed', e?.response?.data?.message || e?.message || 'Please try again.');
    },
  });

  React.useEffect(() => {
    if (!ticketId) return;
    SupportService.markRead(ticketId).finally(() => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    });
  }, [ticketId, queryClient]);

  const ticket = data?.data?.ticket;
  const messages = data?.data?.messages || [];
  const canSend = body.trim().length > 0 && !sendMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {ticket?.subject || 'Support'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {ticket?.status ? ticket.status.replace(/_/g, ' ') : 'Loading'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        refreshing={isLoading}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <SupportBubble message={item} />}
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
        <TextInput
          mode="outlined"
          value={body}
          onChangeText={setBody}
          placeholder="Message support..."
          multiline
          maxLength={4000}
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />
        <Button
          mode="contained"
          onPress={() => sendMutation.mutate()}
          disabled={!canSend}
          loading={sendMutation.isPending}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  mineRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sender: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  time: {
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 12,
  },
  sendButton: {
    borderRadius: 12,
    marginBottom: 2,
  },
});
