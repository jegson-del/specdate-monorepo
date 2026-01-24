import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import HomeScreen from './src/features/home/HomeScreen';
import ProvidersScreen from './src/features/providers/ProvidersScreen';

const Stack = createNativeStackNavigator();

function isProfileComplete(profile: any) {
  if (!profile) return false;
  const fullNameOk = typeof profile.full_name === 'string' && profile.full_name.trim().length >= 2;
  const dobOk = typeof profile.dob === 'string' && !Number.isNaN(Date.parse(profile.dob));
  const sexOk = typeof profile.sex === 'string' && profile.sex.trim().length > 0;
  const occupationOk = typeof profile.occupation === 'string' && profile.occupation.trim().length >= 2;
  const qualificationOk = typeof profile.qualification === 'string' && profile.qualification.trim().length >= 2;
  const cityOk = typeof profile.city === 'string' && profile.city.trim().length > 0;
  return fullNameOk && dobOk && sexOk && occupationOk && qualificationOk && cityOk;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Landing' | 'Home' | 'Profile'>('Landing');

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
            const profile = (user as any)?.profile;
            if (mounted) setInitialRoute(isProfileComplete(profile) ? 'Home' : 'Profile');
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

  if (booting) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Providers" component={ProvidersScreen} />
            {/* Stubs to be implemented next */}
            <Stack.Screen name="Notifications" component={HomeScreen} />
            <Stack.Screen name="Messages" component={HomeScreen} />
            <Stack.Screen name="SpecDetails" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
