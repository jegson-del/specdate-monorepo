import React from 'react';
import { FlatList } from 'react-native';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { ChatMessage } from '../../../services/chat';

export function appendChatMessageToCache(
  queryClient: QueryClient,
  threadId: number | string | undefined,
  message: ChatMessage,
) {
  if (threadId == null) return;

  queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
    if (!current?.data) return current;
    const exists = current.data.messages?.some(
      (item: ChatMessage) => Number(item.id) === Number(message.id),
    );
    if (exists) return current;

    return {
      ...current,
      data: {
        ...current.data,
        messages: [...(current.data.messages || []), message],
      },
    };
  });
  queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
}

type UseAppendChatMessageParams = {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
};

export function useAppendChatMessage({
  listRef,
  shouldAutoScrollRef,
  threadId,
}: UseAppendChatMessageParams) {
  const queryClient = useQueryClient();

  return React.useCallback(
    (message: ChatMessage) => {
      shouldAutoScrollRef.current = true;
      appendChatMessageToCache(queryClient, threadId, message);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    [listRef, queryClient, shouldAutoScrollRef, threadId],
  );
}
