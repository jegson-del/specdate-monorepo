import { Alert, Linking } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';

type NavigationLike = {
  navigate: (...args: any[]) => void;
};

function parseNotificationData(data: unknown) {
  if (typeof data !== 'string') return data && typeof data === 'object' ? data as Record<string, any> : {};

  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

export function routeNotification(item: any, navigation: NavigationLike, queryClient?: QueryClient): boolean {
  const navData = parseNotificationData(item?.data ?? item);
  const type = item?.type ?? navData?.type ?? navData?.notification_type;
  const specId = navData?.spec_id != null ? String(navData.spec_id) : null;
  const roundId = navData?.round_id != null ? navData.round_id : null;
  const ticketId = navData?.ticket_id != null ? navData.ticket_id : null;
  const voucherId = navData?.voucher_id != null ? navData.voucher_id : null;
  const threadId = navData?.thread_id != null ? navData.thread_id : null;
  const adminUrl = typeof navData?.admin_url === 'string' ? navData.admin_url : null;

  if (type === 'join_request') {
    navigation.navigate('Home', { initialTab: 'Requests' });
    return true;
  }

  if (type === 'chat_message' && threadId != null) {
    navigation.navigate('ChatThread', { threadId });
    return true;
  }

  if (type === 'match_created') {
    queryClient?.invalidateQueries({ queryKey: ['dates'] });
    queryClient?.invalidateQueries({ queryKey: ['chats'] });
    navigation.navigate('Home', { initialTab: 'Matches' });
    return true;
  }

  if ((type === 'support_reply' || type === 'support_ticket') && ticketId != null) {
    navigation.navigate('SupportThread', { ticketId });
    return true;
  }

  if (type === 'voucher_redeemed' && voucherId != null) {
    navigation.navigate('PostDateReview', { voucherId });
    return true;
  }

  if ((type === 'voucher_created' || type === 'voucher_approved' || type === 'voucher_rejected') && voucherId != null) {
    navigation.navigate('DateVoucherDetail', { voucherId });
    return true;
  }

  if (type === 'admin_media_moderation') {
    if (adminUrl) {
      Linking.openURL(adminUrl).catch(() => {
        Alert.alert('Admin dashboard unavailable', 'Open the admin dashboard to review this upload.');
      });
    } else {
      Alert.alert('Admin review needed', 'Open the admin dashboard to review this upload.');
    }
    return true;
  }

  if (
    type === 'moderation_appeal_granted' ||
    type === 'moderation_appeal_denied' ||
    type === 'moderation_warning' ||
    type === 'moderation_strike' ||
    type === 'moderation_suspension' ||
    type === 'moderation_ban'
  ) {
    queryClient?.invalidateQueries({ queryKey: ['moderation-status'] });
    navigation.navigate('ModerationStatus');
    return true;
  }

  if (specId) {
    const navigatesToSpec =
      type === 'round_started' ||
      type === 'round_nudge' ||
      type === 'eliminated' ||
      type === 'application_accepted' ||
      type === 'round_answer' ||
      type === 'spec_starts_today' ||
      type === 'spec_starts_tomorrow' ||
      type === 'spec_full';

    if (navigatesToSpec) {
      queryClient?.removeQueries({ queryKey: ['spec', specId] });
      queryClient?.removeQueries({ queryKey: ['spec', specId, 'round_details'] });
      if ((type === 'round_nudge' || type === 'round_started' || type === 'eliminated') && roundId != null) {
        navigation.navigate('RoundDetails', { specId, roundId });
      } else {
        navigation.navigate('SpecDetails', { specId, fromNotification: true });
      }
      return true;
    }
  }

  if (__DEV__) {
    console.warn('[Notifications] No route for notification', { type, data: navData });
  }
  Alert.alert('Notification', 'This notification is informational.');
  return false;
}
