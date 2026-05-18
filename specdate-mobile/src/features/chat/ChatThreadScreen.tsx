import React from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMessage } from '../../services/chat';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { UploadProgressModal, VideoViewerModal } from '../../components';
import ChatHeader from './components/ChatHeader';
import ChatMediaPickerSheet from './components/ChatMediaPickerSheet';
import ChatSafetySheet from './components/ChatSafetySheet';
import MessageBubble from './components/MessageBubble';
import MessageComposer from './components/MessageComposer';
import PendingMediaDraftCard from './components/PendingMediaDraftCard';
import { useChatRealtime } from './hooks/useChatRealtime';
import { useChatSafetyActions } from './hooks/useChatSafetyActions';
import { useChatThread } from './hooks/useChatThread';
import { usePendingChatMediaDrafts } from './hooks/usePendingChatMediaDrafts';
import { useSendChatMessage } from './hooks/useSendChatMessage';

export default function ChatThreadScreen({ route, navigation }: any) {
  const threadId = route.params?.threadId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const shouldAutoScrollRef = React.useRef(true);
  const [mediaSheet, setMediaSheet] = React.useState<'file' | 'camera' | null>(null);
  const [videoViewerUri, setVideoViewerUri] = React.useState<string | null>(null);

  const {
    canLoadHotMessages,
    canLoadOlder,
    isLoading,
    loadOlderMessages,
    loadingOlder,
    messages,
    thread,
  } = useChatThread({ shouldAutoScrollRef, threadId });

  const {
    addPendingDraft,
    discardPendingDraft,
    pendingDrafts,
    sendingDraftId,
    sendPendingDraft,
  } = usePendingChatMediaDrafts({ listRef, shouldAutoScrollRef, threadId });

  const {
    audioRecorder,
    mediaProgress,
    mediaSending,
    pickChatMedia,
    recordChatVideo,
    sendMutation,
    takeChatPhoto,
  } = useSendChatMessage({
    listRef,
    onNeedsReviewDraft: addPendingDraft,
    shouldAutoScrollRef,
    threadId,
  });

  useChatRealtime({
    listRef,
    shouldAutoScrollRef,
    threadId,
    userId: user?.id,
  });

  const {
    closeSafetySheet,
    confirmBlock,
    openBlockSheet,
    openMessageActions,
    openReportSheet,
    openUserActions,
    safetyError,
    safetyLoading,
    safetySheet,
    submitReport,
  } = useChatSafetyActions({ onBlockedDismiss: () => navigation.goBack() });

  const avatar = toImageUri(thread?.other_user?.avatar);
  const isProviderChat = thread?.type === 'provider';
  const currentUserIsProvider = isProviderChat && Number(thread?.provider_id) === Number(user?.id);
  const otherPartyLabel = isProviderChat ? (currentUserIsProvider ? 'customer' : 'provider') : 'user';
  const otherPartyTitle = otherPartyLabel.charAt(0).toUpperCase() + otherPartyLabel.slice(1);
  const name = thread?.other_user?.name || (isProviderChat ? otherPartyTitle : 'Your match');
  const subtitle = `${isProviderChat ? 'Provider chat' : (thread?.spec?.title || 'Spec date')}${thread?.date_code ? ` - ${thread.date_code}` : ''}`;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ChatHeader
        avatar={avatar}
        borderColor={theme.colors.outlineVariant}
        name={name}
        onBack={() => navigation.goBack()}
        onOpenActions={() => {
          const otherUserId = thread?.other_user?.id;
          if (!otherUserId) return;
          openUserActions(Number(otherUserId), name);
        }}
        subtitle={subtitle}
        surfaceColor={theme.colors.surface}
        textColor={theme.colors.onSurface}
        topInset={insets.top}
        variantTextColor={theme.colors.onSurfaceVariant}
      />

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
          !isLoading && pendingDrafts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Say hello</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {isProviderChat ? 'Start the conversation about your venue or booking.' : 'This chat opens after a confirmed spec date.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          pendingDrafts.length > 0 ? (
            <View style={styles.pendingDrafts}>
              {pendingDrafts.map((draft) => (
                <PendingMediaDraftCard
                  key={draft.id}
                  draft={draft}
                  isSending={sendingDraftId === draft.id}
                  onDiscard={discardPendingDraft}
                  onOpenVideo={setVideoViewerUri}
                  onSend={sendPendingDraft}
                  theme={theme}
                />
              ))}
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
  pendingDrafts: {
    marginTop: 4,
  },
});
