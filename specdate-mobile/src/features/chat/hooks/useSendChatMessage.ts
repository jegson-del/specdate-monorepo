import React from 'react';
import { Alert, FlatList } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { UploadProgressState } from '../../../components';
import { ChatMessage, ChatService } from '../../../services/chat';
import {
  MediaItem,
  MediaModerationError,
  MediaService,
  moderationFailureMessage,
  type MediaUploadType,
} from '../../../services/media';
import { confirmMediaShareWithAiScan } from '../../../utils/confirmMediaShareWithAiScan';
import { useRoundAudioRecorder, type RoundMediaAsset } from '../../specs/components';
import { useAppendChatMessage } from './useChatMessageCache';

type ReviewableChatAsset = RoundMediaAsset & { assetType: 'image' | 'video' };

type NeedsReviewDraftInput = {
  asset: ReviewableChatAsset;
  media: MediaItem;
  uploadType: MediaUploadType;
  moderationStatus?: string | null;
};

type UseSendChatMessageParams = {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  onNeedsReviewDraft?: (draft: NeedsReviewDraftInput) => void;
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
};

function isReviewableChatAsset(asset: RoundMediaAsset): asset is ReviewableChatAsset {
  return asset.assetType === 'image' || asset.assetType === 'video';
}

function canSendReviewedChatMedia(asset: RoundMediaAsset, media: Pick<MediaItem, 'moderation_status'>) {
  return (
    media.moderation_status === 'approved' ||
    (asset.assetType === 'audio' && media.moderation_status === 'manual_pending')
  );
}

export function useSendChatMessage({
  listRef,
  onNeedsReviewDraft,
  shouldAutoScrollRef,
  threadId,
}: UseSendChatMessageParams) {
  const appendChatMessage = useAppendChatMessage({ listRef, shouldAutoScrollRef, threadId });
  const [mediaSending, setMediaSending] = React.useState(false);
  const [mediaProgress, setMediaProgress] = React.useState<UploadProgressState>(null);

  const sendMutation = useMutation({
    mutationFn: ({ body, mediaId }: { body: string; mediaId?: number }) =>
      ChatService.sendMessage(threadId!, body, mediaId),
    onSuccess: (res) => {
      appendChatMessage(res.data);
    },
  });

  const sendMediaAsset = React.useCallback(
    async (asset: RoundMediaAsset) => {
      let keepProgressOpen = false;
      let uploaded: MediaItem | null = null;
      try {
        const confirmed = await confirmMediaShareWithAiScan();
        if (!confirmed) {
          return;
        }
        setMediaSending(true);
        const uploadType: MediaUploadType =
          asset.assetType === 'audio'
            ? 'chat_audio'
            : asset.assetType === 'video'
              ? 'chat_video'
              : 'chat_image';
        setMediaProgress({
          title: 'Uploading media',
          message: `Uploading your ${asset.assetType === 'video' ? 'video' : asset.assetType === 'audio' ? 'voice note' : 'image'}.`,
        });
        uploaded = await MediaService.upload(asset.uri, uploadType, null, asset.mimeType);
        setMediaProgress({
          title: 'Reviewing media',
          message: `Checking your ${asset.assetType === 'video' ? 'video' : asset.assetType === 'audio' ? 'voice note' : 'image'} before it is sent.`,
        });
        const reviewed = await MediaService.waitForModeration(uploaded, {
          returnLatestOnTimeout: asset.assetType === 'video',
        });
        if (!canSendReviewedChatMedia(asset, reviewed)) {
          if (isReviewableChatAsset(asset)) {
            onNeedsReviewDraft?.({
              asset,
              media: reviewed,
              uploadType,
              moderationStatus: reviewed.moderation_status ?? 'reviewing',
            });
            Alert.alert(
              'Waiting for approval',
              'This media is under review. If an admin approves it, Send now will appear in this chat.',
            );
            return;
          }

          keepProgressOpen = true;
          setMediaProgress({
            title: 'Media not sent',
            message: moderationFailureMessage(String(reviewed.moderation_status ?? 'failed')),
            status: 'error',
            dismissLabel: 'OK',
            onDismiss: () => setMediaProgress(null),
          });
          return;
        }
        setMediaProgress({
          title: 'Sending media',
          message: 'Adding it to the chat.',
        });
        await sendMutation.mutateAsync({ body: '', mediaId: reviewed.id });
      } catch (e: any) {
        const moderationStatus = String(e?.status ?? '');
        const isModerationIssue =
          e instanceof MediaModerationError || ['flagged', 'failed', 'timeout'].includes(moderationStatus);

        if (isModerationIssue && uploaded && isReviewableChatAsset(asset)) {
          const uploadedMedia = uploaded;
          const latest = await MediaService.fetchById(uploadedMedia.id).catch(() => uploadedMedia);
          onNeedsReviewDraft?.({
            asset,
            media: latest,
            uploadType: uploadedMedia.type ?? (asset.assetType === 'video' ? 'chat_video' : 'chat_image'),
            moderationStatus: latest.moderation_status ?? moderationStatus,
          });
          Alert.alert(
            'Waiting for approval',
            'This media is under review. If an admin approves it, Send now will appear in this chat.',
          );
        } else if (isModerationIssue) {
          keepProgressOpen = true;
          setMediaProgress({
            title: 'Media not sent',
            message: e?.message || 'This file could not be sent. Please choose another file.',
            status: 'error',
            dismissLabel: 'OK',
            onDismiss: () => setMediaProgress(null),
          });
        } else {
          Alert.alert('Upload failed', e?.message || 'Could not send this media.');
        }
      } finally {
        if (!keepProgressOpen) {
          setMediaProgress(null);
        }
        setMediaSending(false);
      }
    },
    [onNeedsReviewDraft, sendMutation],
  );

  const pickChatMedia = React.useCallback(
    async (assetType: 'image' | 'video') => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Allow photo library access to share media.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: assetType === 'image' ? ['images'] : ['videos'],
          quality: 0.85,
          videoMaxDuration: 60,
        });
        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        await sendMediaAsset({
          uri: asset.uri,
          mimeType: asset.mimeType || (assetType === 'image' ? 'image/jpeg' : 'video/mp4'),
          assetType,
        });
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not share media.');
      }
    },
    [sendMediaAsset],
  );

  const takeChatPhoto = React.useCallback(async () => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Permission Required', 'Allow camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await sendMediaAsset({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        assetType: 'image',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not take a photo.');
    }
  }, [sendMediaAsset]);

  const recordChatVideo = React.useCallback(async () => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Permission Required', 'Allow camera access to record video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await sendMediaAsset({
        uri: asset.uri,
        mimeType: asset.mimeType || 'video/mp4',
        assetType: 'video',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not record a video.');
    }
  }, [sendMediaAsset]);

  const audioRecorder = useRoundAudioRecorder(sendMediaAsset);

  return {
    audioRecorder,
    mediaProgress,
    mediaSending,
    pickChatMedia,
    recordChatVideo,
    sendMutation,
    takeChatPhoto,
  };
}
