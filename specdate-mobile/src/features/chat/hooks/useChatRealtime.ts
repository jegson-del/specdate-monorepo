import React from 'react';
import { FlatList } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessage, ChatService } from '../../../services/chat';

type UseChatRealtimeParams = {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
  userId?: number | string | null;
};

export function useChatRealtime({
  listRef,
  shouldAutoScrollRef,
  threadId,
  userId,
}: UseChatRealtimeParams) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!threadId) return;
    const { echo } = require('../../../utils/echo');
    const channel = echo.private(`chat.${threadId}`);

    channel.listen('.MessageSent', (event: any) => {
      const incoming = event?.message as ChatMessage | undefined;
      if (!incoming) return;
      shouldAutoScrollRef.current = true;
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
        const exists = current.data.messages?.some(
          (message: ChatMessage) => Number(message.id) === Number(incoming.id),
        );
        if (exists) return current;
        return {
          ...current,
          data: {
            ...current.data,
            messages: [...(current.data.messages || []), incoming],
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      if (Number(incoming.sender_id) !== Number(userId)) {
        ChatService.markRead(threadId).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          queryClient.invalidateQueries({ queryKey: ['user'] });
        });
      }
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });

    return () => {
      channel.stopListening('.MessageSent');
      echo.leave(`chat.${threadId}`);
    };
  }, [listRef, queryClient, shouldAutoScrollRef, threadId, userId]);
}
