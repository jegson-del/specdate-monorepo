import React from 'react';
import { Alert, FlatList } from 'react-native';
import { ChatMessage, ChatService } from '../../../services/chat';
import { MediaItem, MediaService, type MediaUploadType } from '../../../services/media';
import { useAppendChatMessage } from './useChatMessageCache';

const REVIEW_POLL_MS = 10000;

export type PendingChatMediaDraftStatus = 'reviewing' | 'approved';

export type PendingChatMediaDraft = {
  id: string;
  mediaId: number;
  threadId: string;
  uri: string;
  mimeType?: string | null;
  assetType: 'image' | 'video';
  uploadType: MediaUploadType;
  status: PendingChatMediaDraftStatus;
  moderationStatus?: string | null;
  createdAt: string;
};

type PendingDraftInput = {
  asset: {
    uri: string;
    mimeType?: string | null;
    assetType: 'image' | 'video';
  };
  media: MediaItem;
  uploadType: MediaUploadType;
  moderationStatus?: string | null;
};

type UsePendingChatMediaDraftsParams = {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
};

function draftStatusFromMedia(media: Pick<MediaItem, 'moderation_status'>): PendingChatMediaDraftStatus {
  return media.moderation_status === 'approved' ? 'approved' : 'reviewing';
}

export function usePendingChatMediaDrafts({
  listRef,
  shouldAutoScrollRef,
  threadId,
}: UsePendingChatMediaDraftsParams) {
  const [drafts, setDrafts] = React.useState<PendingChatMediaDraft[]>([]);
  const [sendingDraftId, setSendingDraftId] = React.useState<string | null>(null);
  const appendChatMessage = useAppendChatMessage({ listRef, shouldAutoScrollRef, threadId });
  const draftsRef = React.useRef(drafts);

  React.useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  const pendingDrafts = React.useMemo(
    () => drafts.filter((draft) => String(draft.threadId) === String(threadId)),
    [drafts, threadId],
  );

  const reviewingCount = React.useMemo(
    () => pendingDrafts.filter((draft) => draft.status === 'reviewing').length,
    [pendingDrafts],
  );

  const addPendingDraft = React.useCallback(
    ({ asset, media, uploadType, moderationStatus }: PendingDraftInput) => {
      if (!threadId) return;
      const id = `${threadId}:${media.id}`;
      const nextDraft: PendingChatMediaDraft = {
        id,
        mediaId: media.id,
        threadId: String(threadId),
        uri: asset.uri,
        mimeType: asset.mimeType ?? media.mime_type,
        assetType: asset.assetType,
        uploadType,
        status: draftStatusFromMedia(media),
        moderationStatus: moderationStatus ?? media.moderation_status ?? null,
        createdAt: new Date().toISOString(),
      };

      shouldAutoScrollRef.current = true;
      setDrafts((current) => {
        const existingIndex = current.findIndex((draft) => draft.id === id);
        if (existingIndex === -1) return [...current, nextDraft];

        return current.map((draft) =>
          draft.id === id
            ? { ...draft, ...nextDraft, createdAt: draft.createdAt }
            : draft,
        );
      });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    [listRef, shouldAutoScrollRef, threadId],
  );

  const discardPendingDraft = React.useCallback((draftId: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }, []);

  const sendPendingDraft = React.useCallback(
    async (draftId: string) => {
      const draft = draftsRef.current.find((item) => item.id === draftId);
      if (!draft || draft.status !== 'approved') return;

      try {
        setSendingDraftId(draftId);
        const res = await ChatService.sendMessage(draft.threadId, '', draft.mediaId);
        appendChatMessage(res.data);
        discardPendingDraft(draftId);
      } catch (e: any) {
        Alert.alert('Could not send media', e?.message || 'Please try again.');
      } finally {
        setSendingDraftId(null);
      }
    },
    [appendChatMessage, discardPendingDraft],
  );

  React.useEffect(() => {
    if (!threadId || reviewingCount === 0) return;
    let cancelled = false;

    const refreshReviewingDrafts = async () => {
      const activeDrafts = draftsRef.current.filter(
        (draft) => String(draft.threadId) === String(threadId) && draft.status === 'reviewing',
      );

      await Promise.all(
        activeDrafts.map(async (draft) => {
          try {
            const latest = await MediaService.fetchById(draft.mediaId);
            if (cancelled) return;

            setDrafts((current) =>
              current.map((item) =>
                item.id === draft.id
                  ? {
                      ...item,
                      status: draftStatusFromMedia(latest),
                      moderationStatus: latest.moderation_status ?? item.moderationStatus,
                    }
                  : item,
              ),
            );
          } catch {
            // Polling is best-effort; the draft remains visible for manual retry.
          }
        }),
      );
    };

    refreshReviewingDrafts();
    const intervalId = setInterval(refreshReviewingDrafts, REVIEW_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [reviewingCount, threadId]);

  return {
    addPendingDraft,
    discardPendingDraft,
    pendingDrafts,
    sendingDraftId,
    sendPendingDraft,
  };
}
