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
    // Only run on physical device; push doesn't work on simulator
    if (!Constants.isDevice) {
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      if (finalStatus !== 'granted') {
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

    // For EAS Build, set extra.eas.projectId in app.json/app.config.js
    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult?.data;

    if (!token) {
      return;
    }

    await api.post('/user/push-token', { token });
  } catch (e) {
    // Non-blocking: e.g. Expo Go, or no network
    if (__DEV__) {
      console.warn('[Expo Push] registerExpoPushToken failed:', e);
    }
  }
}
