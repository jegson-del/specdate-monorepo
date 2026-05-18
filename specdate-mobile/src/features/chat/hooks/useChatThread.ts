import React from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatArchive, ChatMessage, ChatService } from '../../../services/chat';

type UseChatThreadParams = {
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
};

export function useChatThread({ shouldAutoScrollRef, threadId }: UseChatThreadParams) {
  const queryClient = useQueryClient();
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [archives, setArchives] = React.useState<ChatArchive[] | null>(null);
  const [nextArchiveIndex, setNextArchiveIndex] = React.useState(0);
  const [archiveExhausted, setArchiveExhausted] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['chat-thread', String(threadId)],
    queryFn: () => ChatService.getThread(threadId!, { per_page: 25 }),
    enabled: threadId != null,
  });

  React.useEffect(() => {
    if (!threadId) return;
    setArchives(null);
    setNextArchiveIndex(0);
    setArchiveExhausted(false);
    ChatService.markRead(threadId).finally(() => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    });
  }, [threadId, queryClient]);

  const payload = data?.data;
  const thread = payload?.thread;
  const messages = payload?.messages || [];
  const pagination = payload?.pagination;
  const canLoadHotMessages = Boolean(pagination?.has_more && pagination.next_before_id);
  const canLoadOlder = Boolean(payload) && (canLoadHotMessages || !archiveExhausted);

  const loadOlderMessages = React.useCallback(async () => {
    if (!threadId || loadingOlder) return;

    try {
      setLoadingOlder(true);
      shouldAutoScrollRef.current = false;
      if (canLoadHotMessages) {
        const response = await ChatService.getThread(threadId, {
          before_id: pagination?.next_before_id ?? undefined,
          per_page: 25,
        });
        queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
          if (!current?.data) return response;
          const existing = new Set(
            (current.data.messages || []).map((message: ChatMessage) => Number(message.id)),
          );
          const older = (response.data.messages || []).filter(
            (message) => !existing.has(Number(message.id)),
          );
          return {
            ...current,
            data: {
              ...current.data,
              messages: [...older, ...(current.data.messages || [])],
              pagination: response.data.pagination,
            },
          };
        });
        return;
      }

      let archiveList = archives;
      if (archiveList === null) {
        const archiveResponse = await ChatService.getArchives(threadId);
        archiveList = archiveResponse.data || [];
        setArchives(archiveList);
      }

      const archive = archiveList[nextArchiveIndex];
      if (!archive) {
        setArchiveExhausted(true);
        return;
      }

      const archiveResponse = await ChatService.getArchive(threadId, archive.id);
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
        const existing = new Set(
          (current.data.messages || []).map((message: ChatMessage) => Number(message.id)),
        );
        const older = (archiveResponse.data.messages || []).filter(
          (message) => !existing.has(Number(message.id)),
        );
        return {
          ...current,
          data: {
            ...current.data,
            messages: [...older, ...(current.data.messages || [])],
          },
        };
      });

      const nextIndex = nextArchiveIndex + 1;
      setNextArchiveIndex(nextIndex);
      if (nextIndex >= archiveList.length) {
        setArchiveExhausted(true);
      }
    } catch (e: any) {
      Alert.alert('Could not load older messages', e?.response?.data?.message || 'Please try again.');
    } finally {
      setLoadingOlder(false);
    }
  }, [
    archiveExhausted,
    archives,
    canLoadHotMessages,
    loadingOlder,
    nextArchiveIndex,
    pagination?.next_before_id,
    queryClient,
    shouldAutoScrollRef,
    threadId,
  ]);

  return {
    canLoadHotMessages,
    canLoadOlder,
    isLoading,
    loadOlderMessages,
    loadingOlder,
    messages,
    payload,
    thread,
  };
}
