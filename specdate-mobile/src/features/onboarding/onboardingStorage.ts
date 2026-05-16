import * as SecureStore from 'expo-secure-store';

const HOME_ONBOARDING_VERSION = 'v1';

export function homeOnboardingKey(userId: number | string) {
  return `dateusher_home_onboarding_${HOME_ONBOARDING_VERSION}_${userId}`;
}

export async function hasSeenHomeOnboarding(userId: number | string) {
  return SecureStore.getItemAsync(homeOnboardingKey(userId)).then((value) => value === 'seen');
}

export async function markHomeOnboardingSeen(userId: number | string) {
  await SecureStore.setItemAsync(homeOnboardingKey(userId), 'seen');
}
