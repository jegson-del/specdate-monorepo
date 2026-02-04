import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image as RNImage } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { AuthService } from '../../services/auth';
import { api } from '../../services/api';

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert('Missing email', 'Please enter your email.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.login({ email: cleanEmail, password });

      const me = await api.get('/user');
      const user = me.data?.data ?? me.data;

      // Use backend computed attribute
      const isComplete = user.profile_complete === true;

      navigation.reset({
        index: 0,
        routes: [{ name: isComplete ? 'Home' : 'Profile' }],
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data: any = error.response?.data;

        // Laravel validation: { message, errors: { field: [msg] } }
        const errors = data?.errors;
        const firstFieldError =
          errors && typeof errors === 'object' ? (Object.values(errors)[0] as any)?.[0] : undefined;

        // Our ApiResponse sendError: { success:false, message, data:{ error } }
        const apiError = data?.data?.error;

        Alert.alert('Login failed', firstFieldError || apiError || data?.message || `Request failed (${status ?? 'no status'})`);
        console.error('Login error:', status, data);
        return;
      }

      Alert.alert('Login failed', 'Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View style={styles.topBar}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={theme.colors.onBackground}
          />
        </View>


        <RNImage
          source={require('../../../assets/logo_v2.png')}
          style={{ width: 300, height: 95, resizeMode: 'contain', marginBottom: 20, alignSelf: 'center', backgroundColor: 'transparent' }}
        />
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
          Login to continue.
        </Text>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" />}
            textColor={theme.colors.onBackground}
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            placeholderTextColor={theme.colors.outline}
          />
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            textColor={theme.colors.onBackground}
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            placeholderTextColor={theme.colors.outline}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
            contentStyle={{ height: 50 }}
          >
            Login
          </Button>

          <Button mode="text" onPress={() => navigation.navigate('Register')} style={{ marginTop: 8 }}>
            New here? Create account
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 8,
    top: 8,
    zIndex: 10,
  },
  form: {
    marginTop: 24,
    gap: 14,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
  },
});

