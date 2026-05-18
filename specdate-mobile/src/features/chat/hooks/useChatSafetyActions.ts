import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessage } from '../../../services/chat';
import { ModerationService, type ReportTargetType } from '../../../services/moderation';

export type ChatSafetySheetState =
  | null
  | { mode: 'actions'; userId: number; name: string }
  | { mode: 'message_actions'; messageId: number; mediaId?: number }
  | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string; userId?: number; name?: string }
  | { mode: 'block'; userId: number; name: string }
  | { mode: 'success'; title: string; subtitle: string; afterDismiss?: () => void };

type UseChatSafetyActionsParams = {
  onBlockedDismiss: () => void;
};

export function useChatSafetyActions({ onBlockedDismiss }: UseChatSafetyActionsParams) {
  const queryClient = useQueryClient();
  const [safetySheet, setSafetySheet] = React.useState<ChatSafetySheetState>(null);
  const [safetyLoading, setSafetyLoading] = React.useState(false);
  const [safetyError, setSafetyError] = React.useState<string | null>(null);

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
        afterDismiss: onBlockedDismiss,
      });
    } catch (e: any) {
      setSafetyError(e?.response?.data?.message || e?.message || 'Could not block this user.');
    } finally {
      setSafetyLoading(false);
    }
  }, [onBlockedDismiss, queryClient, safetySheet]);

  return {
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
  };
}
