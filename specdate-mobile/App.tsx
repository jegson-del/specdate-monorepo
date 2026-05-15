import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoNotifications from 'expo-notifications';
import AnimatedSplashScreen from './src/features/splash/AnimatedSplashScreen';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from './src/theme';
import { api, bootstrapAuthToken, getAuthToken, setAuthToken } from './src/services/api';
import { registerExpoPushToken } from './src/utils/registerExpoPushToken';
import { clearMediaUploadLimitsCache, prefetchMediaUploadLimits } from './src/services/media';
import { configureRevenueCatForUser } from './src/services/revenueCat';
import LandingScreen from './src/features/auth/LandingScreen';
import RegisterScreen from './src/features/auth/RegisterScreen';
import OtpVerificationScreen from './src/features/auth/OtpVerificationScreen';
import LoginScreen from './src/features/auth/LoginScreen';
import ProfileScreen from './src/features/profile/ProfileScreen';
import ProfileViewerScreen from './src/features/profile/ProfileViewerScreen';
import SettingsScreen from './src/features/profile/SettingsScreen';
import TopUpCreditsScreen from './src/features/profile/TopUpCreditsScreen';
import HomeScreen from './src/features/home/HomeScreen';
import ProvidersScreen from './src/features/providers/ProvidersScreen';
import ProviderDetailScreen from './src/features/providers/ProviderDetailScreen';
import CreateDateVoucherScreen from './src/features/providers/CreateDateVoucherScreen';
import DateVoucherDetailScreen from './src/features/providers/DateVoucherDetailScreen';
import ProviderDashboardScreen from './src/features/provider/ProviderDashboardScreen';
import ProviderBookingsScreen from './src/features/provider/ProviderBookingsScreen';
import ProviderReviewsScreen from './src/features/provider/ProviderReviewsScreen';
import ProviderSettingsScreen from './src/features/provider/ProviderSettingsScreen';
import QRScannerScreen from './src/features/provider/QRScannerScreen';
import CreateSpecScreen from './src/features/specs/CreateSpecScreen';
import SpecDetailsScreen from './src/features/specs/SpecDetailsScreen';
import RoundDetailsScreen from './src/features/specs/RoundDetailsScreen';
import NotificationsScreen from './src/features/notifications/NotificationsScreen';
import ModerationStatusScreen from './src/features/moderation/ModerationStatusScreen';
import ChatListScreen from './src/features/chat/ChatListScreen';
import ChatThreadScreen from './src/features/chat/ChatThreadScreen';
import LegalScreen from './src/features/legal/LegalScreen';
import SafetyCenterScreen from './src/features/safety/SafetyCenterScreen';
import PostDateReviewScreen from './src/features/reviews/PostDateReviewScreen';
import SupportTicketsScreen from './src/features/support/SupportTicketsScreen';
import SupportThreadScreen from './src/features/support/SupportThreadScreen';
import CreateSupportTicketScreen from './src/features/support/CreateSupportTicketScreen';
import CreditsTransactionScreen from './src/features/profile/CreditsTransactionScreen';
import { routeNotification } from './src/features/notifications/notificationRouting';
import { AppDialogProvider } from './src/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Landing' | 'Home' | 'Profile' | 'ProviderDashboard'>('Landing');
  const handledPushResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await bootstrapAuthToken();
        const token = getAuthToken();
        if (token) {
          // Default to Home quickly (so refresh doesn't feel like a logout),
          // then refine to Profile if needed.
          if (mounted) setInitialRoute('Home');

          try {
            const me = await api.get('/user');
            const user = (me.data as any)?.data ?? me.data;
            // Use backend computed attribute
            const isComplete = user.profile_complete === true;
            const isProvider = user.role === 'provider';
            if (mounted) setInitialRoute(isProvider ? 'ProviderDashboard' : (isComplete ? 'Home' : 'Profile'));
            void configureRevenueCatForUser(user.id);
            void prefetchMediaUploadLimits();
          } catch (err: any) {
            const status = err?.response?.status;
            // If token is invalid/expired, clear it and fall back to Landing.
            if (status === 401) {
              await setAuthToken(null);
              clearMediaUploadLimitsCache();
              if (mounted) setInitialRoute('Landing');
            }
          }
        }
      } catch {
        // If anything fails (no backend, invalid token, etc.), fall back to Landing.
        if (mounted) setInitialRoute('Landing');
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // When user is logged in, register Expo push token so backend can send push via Expo
  useEffect(() => {
    if (booting || !splashAnimationDone) return;
    if (!getAuthToken()) return;
    registerExpoPushToken();
  }, [booting, splashAnimationDone]);

  useEffect(() => {
    if (booting || !splashAnimationDone) return;

    const routePushResponse = (response: ExpoNotifications.NotificationResponse | null) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (handledPushResponseIdRef.current === responseId) return;
      handledPushResponseIdRef.current = responseId;

      const data = response.notification.request.content.data ?? {};
      const item = { type: (data as any).type ?? (data as any).notification_type, data };
      const routeWhenReady = (attempt = 0) => {
        if (navigationRef.isReady()) {
          routeNotification(item, navigationRef, queryClient);
          return;
        }
        if (attempt < 20) {
          setTimeout(() => routeWhenReady(attempt + 1), 250);
        }
      };

      routeWhenReady();
    };

    ExpoNotifications.getLastNotificationResponseAsync().then(routePushResponse);
    const subscription = ExpoNotifications.addNotificationResponseReceivedListener(routePushResponse);

    return () => {
      subscription.remove();
    };
  }, [booting, splashAnimationDone]);

  // Show splash until both auth check (booting) AND animation are done.
  if (booting || !splashAnimationDone) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AnimatedSplashScreen onAnimationFinish={() => setSplashAnimationDone(true)} />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AppDialogProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="dark" />
              <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="ProfileViewer" component={ProfileViewerScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="TopUpCredits" component={TopUpCreditsScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Providers" component={ProvidersScreen} />
              <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
              <Stack.Screen name="CreateDateVoucher" component={CreateDateVoucherScreen} />
              <Stack.Screen name="DateVoucherDetail" component={DateVoucherDetailScreen} />

              <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
              <Stack.Screen name="ProviderBookings" component={ProviderBookingsScreen} />
              <Stack.Screen name="ProviderReviews" component={ProviderReviewsScreen} />
              <Stack.Screen name="ProviderSettings" component={ProviderSettingsScreen} />
              <Stack.Screen name="QRScanner" component={QRScannerScreen} />

              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="ModerationStatus" component={ModerationStatusScreen} />
              <Stack.Screen name="CreditsTransactions" component={CreditsTransactionScreen} />
              <Stack.Screen name="Messages" component={ChatListScreen} />
              <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
              <Stack.Screen name="Legal" component={LegalScreen} />
              <Stack.Screen name="SafetyCenter" component={SafetyCenterScreen} />
              <Stack.Screen name="PostDateReview" component={PostDateReviewScreen} />
              <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
              <Stack.Screen name="SupportThread" component={SupportThreadScreen} />
              <Stack.Screen name="CreateSupportTicket" component={CreateSupportTicketScreen} />
              <Stack.Screen name="SpecDetails" component={SpecDetailsScreen} />
              <Stack.Screen name="RoundDetails" component={RoundDetailsScreen} />
              <Stack.Screen
                name="CreateSpec"
                component={CreateSpecScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              </Stack.Navigator>
            </NavigationContainer>
          </AppDialogProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
