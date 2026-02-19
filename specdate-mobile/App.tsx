import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AnimatedSplashScreen from './src/features/splash/AnimatedSplashScreen';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from './src/theme';
import { api, bootstrapAuthToken, getAuthToken, setAuthToken } from './src/services/api';
import LandingScreen from './src/features/auth/LandingScreen';
import RegisterScreen from './src/features/auth/RegisterScreen';
import OtpVerificationScreen from './src/features/auth/OtpVerificationScreen';
import LoginScreen from './src/features/auth/LoginScreen';
import ProfileScreen from './src/features/profile/ProfileScreen';
import ProfileViewerScreen from './src/features/profile/ProfileViewerScreen';
import HomeScreen from './src/features/home/HomeScreen';
import ProvidersScreen from './src/features/providers/ProvidersScreen';
import ProviderDetailScreen from './src/features/providers/ProviderDetailScreen';
import ProviderDashboardScreen from './src/features/provider/ProviderDashboardScreen';
import ProviderDiscountListScreen from './src/features/provider/ProviderDiscountListScreen';
import QRScannerScreen from './src/features/provider/QRScannerScreen';
import CreateSpecScreen from './src/features/specs/CreateSpecScreen';
import SpecDetailsScreen from './src/features/specs/SpecDetailsScreen';
import RoundDetailsScreen from './src/features/specs/RoundDetailsScreen';
import NotificationsScreen from './src/features/notifications/NotificationsScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import Constants from 'expo-constants';

// Initialize OneSignal
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!;

// Only initialize if we're not in Expo Go (or handle gracefully)
// OneSignal native code might not work in standard Expo Go client 
// so we wrap in try-catch or check constants
try {
  OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  OneSignal.initialize(ONESIGNAL_APP_ID);

  // Request permission
  OneSignal.Notifications.requestPermission(true);
} catch (e) {
  console.log('OneSignal init failed (likely running in Expo Go client without native code):', e);
}

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Landing' | 'Home' | 'Profile' | 'ProviderDashboard'>('Landing');

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
          } catch (err: any) {
            const status = err?.response?.status;
            // If token is invalid/expired, clear it and fall back to Landing.
            if (status === 401) {
              await setAuthToken(null);
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
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="ProfileViewer" component={ProfileViewerScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Providers" component={ProvidersScreen} />
              <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />

              <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
              <Stack.Screen name="ProviderDiscountList" component={ProviderDiscountListScreen} />
              <Stack.Screen name="QRScanner" component={QRScannerScreen} />

              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Messages" component={HomeScreen} />
              <Stack.Screen name="SpecDetails" component={SpecDetailsScreen} />
              <Stack.Screen name="RoundDetails" component={RoundDetailsScreen} />
              <Stack.Screen
                name="CreateSpec"
                component={CreateSpecScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
