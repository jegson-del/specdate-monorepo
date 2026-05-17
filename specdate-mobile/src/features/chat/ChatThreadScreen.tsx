import React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChatArchive, ChatMessage, ChatService } from '../../services/chat';
import { MediaModerationError, MediaService, moderationFailureMessage, type MediaUploadType } from '../../services/media';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { UploadProgressModal, VideoViewerModal, type UploadProgressState } from '../../components';
import { confirmMediaShareWithAiScan } from '../../utils/confirmMediaShareWithAiScan';
import { useRoundAudioRecorder, type RoundMediaAsset } from '../specs/components';
import ChatMediaPickerSheet from './components/ChatMediaPickerSheet';
import ChatSafetySheet from './components/ChatSafetySheet';
import MessageBubble from './components/MessageBubble';
import MessageComposer from './components/MessageComposer';

type SafetySheetState =
  | null
  | { mode: 'actions'; userId: number; name: string }
  | { mode: 'message_actions'; messageId: number; mediaId?: number }
  | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string; userId?: number; name?: string }
  | { mode: 'block'; userId: number; name: string }
  | { mode: 'success'; title: string; subtitle: string; afterDismiss?: () => void };

export default function ChatThreadScreen({ route, navigation }: any) {
  const threadId = route.params?.threadId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const shouldAutoScrollRef = React.useRef(true);
  const [mediaSending, setMediaSending] = React.useState(false);
  const [mediaSheet, setMediaSheet] = React.useState<'file' | 'camera' | null>(null);
  const [videoViewerUri, setVideoViewerUri] = React.useState<string | null>(null);
  const [safetySheet, setSafetySheet] = React.useState<SafetySheetState>(null);
  const [safetyLoading, setSafetyLoading] = React.useState(false);
  const [safetyError, setSafetyError] = React.useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [archives, setArchives] = React.useState<ChatArchive[] | null>(null);
  const [nextArchiveIndex, setNextArchiveIndex] = React.useState(0);
  const [archiveExhausted, setArchiveExhausted] = React.useState(false);
  const [mediaProgress, setMediaProgress] = React.useState<UploadProgressState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chat-thread', String(threadId)],
    queryFn: () => ChatService.getThread(threadId, { per_page: 25 }),
    enabled: threadId != null,
  });

  const sendMutation = useMutation({
    mutationFn: ({ body, mediaId }: { body: string; mediaId?: number }) => ChatService.sendMessage(threadId, body, mediaId),
    onSuccess: (res) => {
      shouldAutoScrollRef.current = true;
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
        const exists = current.data.messages?.some((message: ChatMessage) => Number(message.id) === Number(res.data.id));
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

  const sendMediaAsset = React.useCallback(async (asset: RoundMediaAsset) => {
    let keepProgressOpen = false;
    try {
      const confirmed = await confirmMediaShareWithAiScan();
      if (!confirmed) {
        return;
      }
      setMediaSending(true);
      const uploadType: MediaUploadType =
        asset.assetType === 'audio' ? 'chat_audio' : asset.assetType === 'video' ? 'chat_video' : 'chat_image';
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
  }, [sendMutation]);

  const audioRecorder = useRoundAudioRecorder(sendMediaAsset);

  const closeSafetySheet = React.useCallback(() => {
    const afterDismiss = safetySheet?.mode === 'success' ? safetySheet.afterDismiss : undefined;
    setSafetySheet(null);
    setSafetyError(null);
    afterDismiss?.();
  }, [safetySheet]);

  const openUserActions = React.useCallback((userId: number, displayName: string) => {
    setSafetyError(null);
    setSafetySheet({ mode: 'actions', userId, name: displayName });
  }, []);

  const openReportSheet = React.useCallback((input: {
    targetType: ReportTargetType;
    targetId: number;
    label: string;
    userId?: number;
    name?: string;
  }) => {
    setSafetyError(null);
    setSafetySheet({ mode: 'report', ...input });
  }, []);

  const openBlockSheet = React.useCallback((userId: number, displayName: string) => {
    setSafetyError(null);
    setSafetySheet({ mode: 'block', userId, name: displayName });
  }, []);

  const openMessageActions = React.useCallback((message: ChatMessage) => {
    if (message.archived) return;
    const mediaId = message.media?.id ? Number(message.media.id) : undefined;
    setSafetyError(null);
    setSafetySheet({ mode: 'message_actions', messageId: Number(message.id), mediaId });
  }, []);

  const submitReport = React.useCallback(async (reason: string) => {
    if (safetySheet?.mode !== 'report') return;
    setSafetyLoading(true);
    setSafetyError(null);
    try {
      await ModerationService.reportContent({
        target_type: safetySheet.targetType,
        target_id: safetySheet.targetId,
        reason,
      });
      setSafetySheet({
        mode: 'success',
        title: 'Report submitted',
        subtitle: 'Thanks. Our moderation team will review this and take action where needed.',
      });
    } catch (e: any) {
      setSafetyError(e?.response?.data?.message || e?.message || 'Could not submit report.');
    } finally {
      setSafetyLoading(false);
    }
  }, [safetySheet]);

  const confirmBlock = React.useCallback(async () => {
    if (safetySheet?.mode !== 'block') return;
    setSafetyLoading(true);
    setSafetyError(null);
    try {
      await ModerationService.blockUser(safetySheet.userId);
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setSafetySheet({
        mode: 'success',
        title: 'Blocked',
        subtitle: `${safetySheet.name} cannot message you or view your profile now.`,
        afterDismiss: () => navigation.goBack(),
      });
    } catch (e: any) {
      setSafetyError(e?.response?.data?.message || e?.message || 'Could not block this user.');
    } finally {
      setSafetyLoading(false);
    }
  }, [navigation, queryClient, safetySheet]);

  const pickChatMedia = React.useCallback(async (assetType: 'image' | 'video') => {
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
  }, [sendMediaAsset]);

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

  React.useEffect(() => {
    if (!threadId) return;
    const { echo } = require('../../utils/echo');
    const channel = echo.private(`chat.${threadId}`);

    channel.listen('.MessageSent', (event: any) => {
      const incoming = event?.message as ChatMessage | undefined;
      if (!incoming) return;
      shouldAutoScrollRef.current = true;
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
        const exists = current.data.messages?.some((m: ChatMessage) => Number(m.id) === Number(incoming.id));
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
      if (Number(incoming.sender_id) !== Number(user?.id)) {
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
  }, [threadId, queryClient, user?.id]);

  const payload = data?.data;
  const thread = payload?.thread;
  const messages = payload?.messages || [];
  const pagination = payload?.pagination;
  const avatar = toImageUri(thread?.other_user?.avatar);
  const isProviderChat = thread?.type === 'provider';
  const currentUserIsProvider = isProviderChat && Number(thread?.provider_id) === Number(user?.id);
  const otherPartyLabel = isProviderChat ? (currentUserIsProvider ? 'customer' : 'provider') : 'user';
  const otherPartyTitle = otherPartyLabel.charAt(0).toUpperCase() + otherPartyLabel.slice(1);
  const name = thread?.other_user?.name || (isProviderChat ? otherPartyTitle : 'Your match');
  const canLoadHotMessages = Boolean(pagination?.has_more && pagination.next_before_id);
  const canLoadOlder = Boolean(payload) && (canLoadHotMessages || !archiveExhausted);
  const loadOlderMessages = React.useCallback(async () => {
    if (!threadId || loadingOlder) return;

    try {
      setLoadingOlder(true);
      shouldAutoScrollRef.current = false;
      if (canLoadHotMessages) {
        const response = await ChatService.getThread(threadId, { before_id: pagination?.next_before_id ?? undefined, per_page: 25 });
        queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
          if (!current?.data) return response;
          const existing = new Set((current.data.messages || []).map((message: ChatMessage) => Number(message.id)));
          const older = (response.data.messages || []).filter((message) => !existing.has(Number(message.id)));
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
        const existing = new Set((current.data.messages || []).map((message: ChatMessage) => Number(message.id)));
        const older = (archiveResponse.data.messages || []).filter((message) => !existing.has(Number(message.id)));
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
  }, [archiveExhausted, archives, canLoadHotMessages, loadingOlder, nextArchiveIndex, pagination?.next_before_id, queryClient, threadId]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        {avatar ? (
          <Avatar.Image size={42} source={{ uri: avatar }} />
        ) : (
          <Avatar.Text size={42} label={name.slice(0, 2).toUpperCase()} />
        )}
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.spec, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {isProviderChat ? 'Provider chat' : (thread?.spec?.title || 'Spec date')}{thread?.date_code ? ` • ${thread.date_code}` : ''}
          </Text>
        </View>
        <IconButton
          icon="dots-vertical"
          size={22}
          onPress={() => {
            const otherUserId = thread?.other_user?.id;
            if (!otherUserId) return;
            openUserActions(Number(otherUserId), name);
          }}
        />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (!shouldAutoScrollRef.current) {
            shouldAutoScrollRef.current = true;
            return;
          }
          listRef.current?.scrollToEnd({ animated: true });
        }}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={Number(item.sender_id) === Number(user?.id)}
            theme={theme}
            onOpenVideo={setVideoViewerUri}
            onReport={item.archived ? undefined : openMessageActions}
            onOpenMenu={item.archived ? undefined : openMessageActions}
          />
        )}
        ListHeaderComponent={
          canLoadOlder ? (
            <View style={styles.loadOlderWrap}>
              <Text
                onPress={loadOlderMessages}
                style={[styles.loadOlderText, { color: theme.colors.primary }]}
              >
                {loadingOlder ? 'Loading older messages...' : canLoadHotMessages ? 'Load older messages' : 'Load archived messages'}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Say hello</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {isProviderChat ? 'Start the conversation about your venue or booking.' : 'This chat opens after a confirmed spec date.'}
              </Text>
            </View>
          ) : null
        }
      />

      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <MessageComposer
          onSend={(body) => sendMutation.mutate({ body })}
          onOpenFile={() => setMediaSheet('file')}
          onOpenCamera={() => setMediaSheet('camera')}
          onToggleVoice={audioRecorder.isRecording ? audioRecorder.stopRecording : audioRecorder.startRecording}
          isRecording={audioRecorder.isRecording}
          durationMillis={audioRecorder.durationMillis}
          disabled={sendMutation.isPending || mediaSending}
        />
      </View>

      <ChatMediaPickerSheet
        visible={mediaSheet !== null}
        title={mediaSheet === 'camera' ? 'Use camera' : 'Share media'}
        onDismiss={() => setMediaSheet(null)}
        options={
          mediaSheet === 'camera'
            ? [
                { icon: 'camera-outline', label: 'Take photo', helper: 'Capture a new picture now', onPress: takeChatPhoto },
                { icon: 'video-plus-outline', label: 'Record video', helper: 'Record a short live clip', onPress: recordChatVideo },
              ]
            : [
                { icon: 'image-outline', label: 'Choose image', helper: 'Share a photo from your files', onPress: () => pickChatMedia('image') },
                { icon: 'file-video-outline', label: 'Choose video', helper: 'Share a saved video clip', onPress: () => pickChatMedia('video') },
              ]
        }
      />

      <ChatSafetySheet
        visible={!!safetySheet}
        mode={safetySheet?.mode ?? 'actions'}
        title={
          safetySheet?.mode === 'actions'
            ? safetySheet.name
            : safetySheet?.mode === 'message_actions'
              ? 'Message options'
            : safetySheet?.mode === 'report'
              ? `Report ${safetySheet.label}?`
              : safetySheet?.mode === 'block'
                ? `Block ${otherPartyLabel}?`
                : safetySheet?.title ?? ''
        }
        subtitle={
          safetySheet?.mode === 'actions'
            ? 'Choose a safety action for this chat.'
            : safetySheet?.mode === 'message_actions'
              ? safetySheet.mediaId ? 'Choose whether to report the message or the attached media.' : 'Choose an action for this message.'
            : safetySheet?.mode === 'report'
              ? 'Choose the reason. Our moderation team will review it.'
              : safetySheet?.mode === 'block'
                ? `This ${otherPartyLabel} will not be able to message you or view your profile. You will not see their profile either.`
                : safetySheet?.subtitle
        }
        loading={safetyLoading}
        error={safetyError}
        onDismiss={closeSafetySheet}
        onOpenReport={() => {
          if (safetySheet?.mode !== 'actions') return;
          openReportSheet({
            targetType: 'user',
            targetId: safetySheet.userId,
            label: otherPartyLabel,
            userId: safetySheet.userId,
            name: safetySheet.name,
          });
        }}
        onOpenBlock={() => {
          if (safetySheet?.mode !== 'actions') return;
          openBlockSheet(safetySheet.userId, safetySheet.name);
        }}
        hasMedia={safetySheet?.mode === 'message_actions' ? Boolean(safetySheet.mediaId) : false}
        userReportLabel={`Report ${otherPartyLabel}`}
        userReportHelper={`Send this ${otherPartyLabel} profile to moderation for review`}
        userBlockLabel={`Block ${otherPartyLabel}`}
        userBlockHelper="Stop messages and hide each other from discovery"
        blockConfirmLabel={`Block ${otherPartyLabel}`}
        onReportMessage={() => {
          if (safetySheet?.mode !== 'message_actions') return;
          openReportSheet({
            targetType: 'message',
            targetId: safetySheet.messageId,
            label: 'message',
          });
        }}
        onReportMedia={() => {
          if (safetySheet?.mode !== 'message_actions' || !safetySheet.mediaId) return;
          openReportSheet({
            targetType: 'media',
            targetId: safetySheet.mediaId,
            label: 'media',
          });
        }}
        onSubmitReport={submitReport}
        onConfirmBlock={confirmBlock}
      />

      <VideoViewerModal
        visible={!!videoViewerUri}
        uri={videoViewerUri}
        onClose={() => setVideoViewerUri(null)}
      />

      <UploadProgressModal progress={mediaProgress} />
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
    marginLeft: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '900',
  },
  spec: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  loadOlderWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  loadOlderText: {
    fontSize: 13,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
