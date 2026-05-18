import React from 'react';
import { Alert, FlatList } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { UploadProgressState } from '../../../components';
import { ChatMessage, ChatService } from '../../../services/chat';
import {
  MediaModerationError,
  MediaService,
  moderationFailureMessage,
  type MediaUploadType,
} from '../../../services/media';
import { confirmMediaShareWithAiScan } from '../../../utils/confirmMediaShareWithAiScan';
import { useRoundAudioRecorder, type RoundMediaAsset } from '../../specs/components';

type UseSendChatMessageParams = {
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  shouldAutoScrollRef: React.MutableRefObject<boolean>;
  threadId: number | string | undefined;
};

export function useSendChatMessage({
  listRef,
  shouldAutoScrollRef,
  threadId,
}: UseSendChatMessageParams) {
  const queryClient = useQueryClient();
  const [mediaSending, setMediaSending] = React.useState(false);
  const [mediaProgress, setMediaProgress] = React.useState<UploadProgressState>(null);

  const sendMutation = useMutation({
    mutationFn: ({ body, mediaId }: { body: string; mediaId?: number }) =>
      ChatService.sendMessage(threadId!, body, mediaId),
    onSuccess: (res) => {
      shouldAutoScrollRef.current = true;
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
        const exists = current.data.messages?.some(
          (message: ChatMessage) => Number(message.id) === Number(res.data.id),
        );
        if (exists) return current;
        return {
          ...current,
          data: {
            ...current.data,
            messages: [...(current.data.messages || []), res.data],
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
  });

  const sendMediaAsset = React.useCallback(
    async (asset: RoundMediaAsset) => {
      let keepProgressOpen = false;
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
        const uploaded = await MediaService.upload(asset.uri, uploadType, null, asset.mimeType);
        setMediaProgress({
          title: 'Reviewing media',
          message: `Checking your ${asset.assetType === 'video' ? 'video' : asset.assetType === 'audio' ? 'voice note' : 'image'} before it is sent.`,
        });
        const reviewed = await MediaService.waitForModeration(uploaded, {
          returnLatestOnTimeout: asset.assetType === 'video',
        });
        if (!MediaService.isAllowedToShare(reviewed)) {
          keepProgressOpen = true;
          setMediaProgress({
            title: 'Still reviewing',
            message: moderationFailureMessage('reviewing'),
            status: 'reviewing',
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
        if (e instanceof MediaModerationError || ['flagged', 'failed', 'timeout'].includes(String(e?.status ?? ''))) {
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
    [sendMutation],
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
