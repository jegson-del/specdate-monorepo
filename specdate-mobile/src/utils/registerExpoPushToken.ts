import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../services/api';

/**
 * Request notification permission, get the Expo push token, and send it to the backend.
 * Call this when the user is logged in (e.g. on app launch with auth, or after login/register).
 * Backend stores it in users.expo_push_token and uses it for push via Expo Push API.
 */
export async function registerExpoPushToken(): Promise<void> {
  try {
    // Push is native-only. Some dev-client/device combos can report
    // Constants.isDevice incorrectly, so let Expo attempt token generation on iOS/Android.
    if (Platform.OS === 'web') {
      if (__DEV__) console.warn('[Expo Push] Skipped: web platform.');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      if (finalStatus !== 'granted') {
        if (__DEV__) console.warn('[Expo Push] Skipped: notification permission not granted.');
        return;
      }
    }

    // Android requires a channel for local/push notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // For EAS Build, support both common app.json shapes:
    // extra.eas.projectId and this app's current extra.eas.build.projectId.
    const easConfig = (Constants.expoConfig as any)?.extra?.eas;
    const projectId = easConfig?.projectId ?? easConfig?.build?.projectId;
    if (__DEV__) {
      console.log('[Expo Push] Using projectId:', projectId || '(none)');
    }
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult?.data;

    if (!token) {
      if (__DEV__) console.warn('[Expo Push] Skipped: Expo returned no push token.');
      return;
    }

    await api.post('/user/push-token', { token });
    if (__DEV__) {
      console.log('[Expo Push] Token saved:', token);
    }
  } catch (e) {
    // Non-blocking: e.g. Expo Go, or no network
    if (__DEV__) {
      console.warn('[Expo Push] registerExpoPushToken failed:', e);
    }
  }
}
