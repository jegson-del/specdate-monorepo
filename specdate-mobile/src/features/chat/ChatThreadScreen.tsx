import React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChatMessage, ChatService } from '../../services/chat';
import { MediaService, type MediaUploadType } from '../../services/media';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { VideoViewerModal } from '../../components';
import { useRoundAudioRecorder, type RoundMediaAsset } from '../specs/components';
import ChatMediaPickerSheet from './components/ChatMediaPickerSheet';
import MessageBubble from './components/MessageBubble';
import MessageComposer from './components/MessageComposer';

export default function ChatThreadScreen({ route, navigation }: any) {
  const threadId = route.params?.threadId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const [mediaSending, setMediaSending] = React.useState(false);
  const [mediaSheet, setMediaSheet] = React.useState<'file' | 'camera' | null>(null);
  const [videoViewerUri, setVideoViewerUri] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chat-thread', String(threadId)],
    queryFn: () => ChatService.getThread(threadId),
    enabled: threadId != null,
  });

  const sendMutation = useMutation({
    mutationFn: ({ body, mediaId }: { body: string; mediaId?: number }) => ChatService.sendMessage(threadId, body, mediaId),
    onSuccess: (res) => {
      queryClient.setQueryData(['chat-thread', String(threadId)], (current: any) => {
        if (!current?.data) return current;
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
    try {
      setMediaSending(true);
      const uploadType: MediaUploadType =
        asset.assetType === 'audio' ? 'chat_audio' : asset.assetType === 'video' ? 'chat_video' : 'chat_image';
      const uploaded = await MediaService.upload(asset.uri, uploadType, null, asset.mimeType);
      sendMutation.mutate({ body: '', mediaId: uploaded.id });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not send this media.');
    } finally {
      setMediaSending(false);
    }
  }, [sendMutation]);

  const audioRecorder = useRoundAudioRecorder(sendMediaAsset);

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
  const avatar = toImageUri(thread?.other_user?.avatar);
  const name = thread?.other_user?.name || 'Your match';

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
            {thread?.spec?.title || 'Spec date'}{thread?.date_code ? ` • ${thread.date_code}` : ''}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={Number(item.sender_id) === Number(user?.id)}
            theme={theme}
            onOpenVideo={setVideoViewerUri}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Say hello</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                This chat opens after a confirmed spec date.
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

      <VideoViewerModal
        visible={!!videoViewerUri}
        uri={videoViewerUri}
        onClose={() => setVideoViewerUri(null)}
      />
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
