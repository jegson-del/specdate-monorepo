import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

export type AppVersionStatus = {
  platform: 'ios' | 'android';
  current_version: string;
  current_build?: string | null;
  latest_version: string;
  minimum_supported_version: string;
  latest_build?: string | null;
  update_available: boolean;
  force_update: boolean;
  store_url?: string | null;
  message?: string | null;
  release_notes?: string[];
};

function currentVersion() {
  return (
    (Constants as any).nativeAppVersion ||
    Constants.expoConfig?.version ||
    '0.0.0'
  );
}

function currentBuild() {
  return (
    (Constants as any).nativeBuildVersion ||
    (Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios as any)?.buildNumber
      : (Constants.expoConfig?.android as any)?.versionCode?.toString()) ||
    null
  );
}

export const AppVersionService = {
  async check(): Promise<AppVersionStatus | null> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

    const response = await api.get('/app-version', {
      params: {
        platform: Platform.OS,
        version: currentVersion(),
        build: currentBuild(),
      },
    });

    return ((response.data as any)?.data ?? response.data) as AppVersionStatus;
  },
};
