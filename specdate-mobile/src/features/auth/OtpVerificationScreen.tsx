import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { AuthService } from '../../services/auth';

export default function OtpVerificationScreen({ navigation, route }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { formData, channel, target } = route.params || {};
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<RNTextInput>(null);

    const digits = useMemo(() => {
        const clean = (code || '').replace(/\D/g, '').slice(0, 6);
        const arr = clean.split('');
        return Array.from({ length: 6 }, (_, i) => arr[i] ?? '');
    }, [code]);

    const handleVerify = async () => {
        // TEMP BYPASS:
        // Until OTP is implemented, accept any code and just register.
        if (!formData) {
            Alert.alert("Error", "Missing registration data. Please restart registration.");
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.register(formData);

            if (response.data.success || response.status === 201) {
                Alert.alert("Success", "Account created! Welcome to SpecDate.", [
                    { text: "Continue", onPress: () => navigation.navigate("Profile") }
                ]);
            }
        } catch (error) {
            // Show Laravel validation errors (422) clearly
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data: any = error.response?.data;
                const errors = data?.errors;

                const firstFieldError =
                    errors && typeof errors === 'object'
                        ? (Object.values(errors)[0] as any)?.[0]
                        : undefined;

                Alert.alert(
                    "Registration failed",
                    firstFieldError || data?.message || `Request failed (${status ?? "no status"})`
                );
                console.error('Register error:', status, data);
                return;
            }

            Alert.alert("Error", "Registration failed.");
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
            <View style={styles.content}>
                <View style={styles.topBar}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => navigation.goBack()}
                        iconColor={theme.colors.onBackground}
                    />
                </View>

                <Text variant="headlineSmall" style={{ color: theme.colors.primary, marginBottom: 10 }}>
                    Enter Verification Code
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 30 }}>
                    Sent to {target} via {channel}
                </Text>

                <View style={styles.otpWrap}>
                    <View style={styles.otpRow}>
                        {digits.map((d, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.otpCell,
                                    {
                                        borderColor: d ? theme.colors.primary : theme.colors.outline,
                                        backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
                                    },
                                ]}
                            >
                                <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontWeight: '700' }}>
                                    {d || ' '}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Hidden input that actually captures the digits */}
                    <RNTextInput
                        ref={inputRef}
                        value={code}
                        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoFocus
                        style={styles.hiddenOtpInput}
                    />

                    <Button
                        mode="text"
                        onPress={() => inputRef.current?.focus()}
                        textColor={theme.colors.outline}
                        style={{ alignSelf: 'center', marginTop: 10 }}
                    >
                        Tap to enter code
                    </Button>
                </View>

                <Button
                    mode="contained"
                    onPress={handleVerify}
                    loading={loading}
                    style={styles.button}
                    contentStyle={{ height: 50 }}
                >
                    Verify & Create Account
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        justifyContent: 'center',
        flex: 1,
    },
    topBar: {
        position: 'absolute',
        left: 8,
        top: 8,
        zIndex: 10,
    },
    otpWrap: {
        marginTop: 6,
        marginBottom: 10,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    otpCell: {
        flex: 1,
        height: 54,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hiddenOtpInput: {
        position: 'absolute',
        opacity: 0,
        height: 0,
        width: 0,
    },
    button: {
        marginTop: 30,
        borderRadius: 12,
    },
});
