import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image as RNImage } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme, RadioButton, SegmentedButtons, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { z } from 'zod';
import { AuthService } from '../../services/auth';
import { getApiBaseUrl } from '../../services/api';
import { registerSchema } from '../../utils/validation';
import * as Location from 'expo-location';

// Avoid re-prompting every time the user returns to this screen (per app run).
let didTryAutoLocationPrefill = false;

const CALLING_CODE_BY_ISO: Record<string, string> = {
    NG: '234',
    US: '1',
    CA: '1',
    GB: '44',
    IE: '353',
    ZA: '27',
    GH: '233',
    KE: '254',
    UG: '256',
    IN: '91',
    PK: '92',
    BD: '880',
    FR: '33',
    DE: '49',
    IT: '39',
    ES: '34',
    NL: '31',
    BE: '32',
    PT: '351',
    SE: '46',
    NO: '47',
    DK: '45',
    AU: '61',
    NZ: '64',
};

export default function RegisterScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState(1); // 1: Details, 2: OTP Channel
    const [loading, setLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Form State
    const [form, setForm] = useState({
        username: '',
        email: '',
        mobile: '',
        password: '',
        // Optional location fields (sent to backend; stored in user_profiles)
        latitude: undefined as undefined | number,
        longitude: undefined as undefined | number,
        city: '',
        state: '',
        country: '',
        continent: '',
    });

    const [otpChannel, setOtpChannel] = useState('email');
    const [locLoading, setLocLoading] = useState(false);
    const [locHint, setLocHint] = useState<string | null>(null);

    const prefillFromLocation = async () => {
        setLocLoading(true);
        setLocHint(null);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                // Don't block registration; just skip prefilling.
                setLocHint('Location permission not granted (fill manually).');
                return;
            }

            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setLocHint('Location services are off (fill manually).');
                return;
            }

            // Try last known first (avoids "current location unavailable" on emulators)
            let pos = await Location.getLastKnownPositionAsync();
            if (!pos) {
                pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            }
            if (!pos) {
                setLocHint('Could not detect location (fill manually).');
                return;
            }

            const { latitude, longitude } = pos.coords;
            const places = await Location.reverseGeocodeAsync({ latitude, longitude });
            const place = places?.[0];

            const iso = (place?.isoCountryCode || '').toUpperCase();
            const calling = iso ? CALLING_CODE_BY_ISO[iso] : undefined;

            setForm((prev) => {
                const nextMobile =
                    calling && prev.mobile.trim().length === 0
                        ? `+${calling} `
                        : calling && !prev.mobile.trim().startsWith('+')
                            ? `+${calling} ${prev.mobile.trim()}`.trimEnd()
                            : prev.mobile;

                return {
                    ...prev,
                    latitude,
                    longitude,
                    city: place?.city ?? prev.city,
                    state: place?.region ?? prev.state,
                    country: place?.country ?? prev.country,
                    // expo-location doesn't reliably provide continent; leave as-is.
                    continent: prev.continent,
                    mobile: nextMobile,
                };
            });
        } catch (e) {
            // Don't console.error here (it can trigger a red screen). Best-effort only.
            setLocHint('Could not detect location (fill manually).');
        } finally {
            setLocLoading(false);
        }
    };

    useEffect(() => {
        // Auto-prefill once, and only if we don't already have a location/country.
        if (didTryAutoLocationPrefill) return;
        didTryAutoLocationPrefill = true;
        if (form.country || form.city || form.state) return;
        void prefillFromLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNext = async () => {
        if (step === 1) {
            try {
                // Validate form using Zod
                registerSchema.parse(form);
                setStep(2);
            } catch (error: any) {
                if (error instanceof z.ZodError) {
                    // Show first error message
                    Alert.alert("Validation Error", error.issues?.[0]?.message ?? "Invalid form data.");
                }
            }
        } else {
            // Send OTP then navigate to OTP verification screen
            await handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const target = otpChannel === 'email' ? form.email : form.mobile;
            await AuthService.sendOtp(otpChannel as 'email' | 'mobile', target);
            navigation.navigate('OtpVerification', {
                formData: { ...form, name: form.username, terms_accepted: true },
                channel: otpChannel,
                target,
            });
        } catch (error: any) {
            const msg = error?.response?.data?.message ?? error?.message ?? 'Could not send code. Check backend and try again.';
            const errs = error?.response?.data?.data?.errors;
            const firstErr = errs && typeof errs === 'object' ? (Object.values(errs)[0] as string[])?.[0] : null;
            const isNetworkError = !error?.response;
            const apiUrl = isNetworkError ? getApiBaseUrl() : '';
            const fullMsg = firstErr ?? (isNetworkError && apiUrl
                ? `Cannot reach backend at ${apiUrl}. On a physical device, set EXPO_PUBLIC_API_URL in .env to your PC IP (e.g. http://192.168.1.5:8000/api), same Wi‑Fi, then restart Expo.`
                : msg);
            Alert.alert('Error', fullMsg);
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
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.topBar}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
                        iconColor={theme.colors.onBackground}
                    />
                </View>

                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.header}
                >
                    <RNImage
                        source={require('../../../assets/logo_v2.png')}
                        style={{ width: 300, height: 95, resizeMode: 'contain', marginBottom: 20, alignSelf: 'center', backgroundColor: 'transparent' }}
                    />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, textAlign: 'center', marginBottom: 10 }}>
                        {step === 1 ? "Join the quest for your perfect spec." : "Where should we send your code?"}
                    </Text>
                </MotiView>

                <MotiView
                    animate={{ opacity: 1 }} // simple state for now
                    style={styles.form}
                >
                    {step === 1 && (
                        <>
                            <TextInput
                                mode="outlined"
                                label="Username"
                                value={form.username}
                                onChangeText={(t) => setForm({ ...form, username: t })}
                                style={styles.input}
                                left={<TextInput.Icon icon="account" />}
                                textColor={theme.colors.onBackground}
                                cursorColor={theme.colors.primary}
                                selectionColor={theme.colors.primary}
                                outlineColor={theme.colors.outline}
                                activeOutlineColor={theme.colors.primary}
                                placeholderTextColor={theme.colors.outline}
                            />
                            <TextInput
                                mode="outlined"
                                label="Email"
                                value={form.email}
                                onChangeText={(t) => setForm({ ...form, email: t })}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
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
                                label="Mobile Number"
                                value={form.mobile}
                                onChangeText={(t) => setForm({ ...form, mobile: t })}
                                style={styles.input}
                                keyboardType="phone-pad"
                                left={<TextInput.Icon icon="phone" />}
                                textColor={theme.colors.onBackground}
                                cursorColor={theme.colors.primary}
                                selectionColor={theme.colors.primary}
                                outlineColor={theme.colors.outline}
                                activeOutlineColor={theme.colors.primary}
                                placeholderTextColor={theme.colors.outline}
                            />
                            {locLoading ? (
                                <Text style={{ color: theme.colors.outline, marginTop: -6 }}>
                                    Detecting your location…
                                </Text>
                            ) : locHint ? (
                                <Text style={{ color: theme.colors.outline, marginTop: -6 }}>
                                    {locHint}
                                </Text>
                            ) : (form.city || form.country) ? (
                                <Text style={{ color: theme.colors.onSurface, marginTop: -6, marginBottom: 10 }}>
                                    Detected location: {[form.city, form.state, form.country].filter(Boolean).join(', ')}
                                </Text>
                            ) : null}

                            <TextInput
                                mode="outlined"
                                label="Password"
                                value={form.password}
                                onChangeText={(t) => setForm({ ...form, password: t })}
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
                        </>
                    )}

                    {step === 2 && (
                        <View style={styles.channelSelect}>
                            <SegmentedButtons
                                value={otpChannel}
                                onValueChange={setOtpChannel}
                                buttons={[
                                    {
                                        value: 'email',
                                        label: 'Email',
                                        icon: 'email',
                                    },
                                    {
                                        value: 'mobile',
                                        label: 'SMS',
                                        icon: 'message-processing',
                                    },
                                ]}
                            />
                            <Text style={{ marginTop: 20, textAlign: 'center', color: theme.colors.onSurface }}>
                                We will send a 6-digit code to: {otpChannel === 'email' ? form.email : form.mobile}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 4 }}>
                                <Checkbox.Android
                                    status={termsAccepted ? 'checked' : 'unchecked'}
                                    onPress={() => setTermsAccepted(!termsAccepted)}
                                    color={theme.colors.primary}
                                />
                                <Text style={{ flex: 1, marginLeft: 8, color: theme.colors.onSurface }} onPress={() => setTermsAccepted(!termsAccepted)}>
                                    I accept the Terms and Conditions and confirm I am over 18 years of age.
                                </Text>
                            </View>
                        </View>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleNext}
                        loading={loading}
                        disabled={loading || (step === 2 && !termsAccepted)}
                        style={styles.button}
                        contentStyle={{ height: 50 }}
                    >
                        {step === 1 ? "Next" : "Send Code"}
                    </Button>

                    {step === 1 && (
                        <Button
                            mode="text"
                            onPress={() => navigation.goBack()}
                            style={{ marginTop: 10 }}
                        >
                            Already have an account? Login
                        </Button>
                    )}
                    {step === 2 && (
                        <Button
                            mode="text"
                            onPress={() => setStep(1)}
                            style={{ marginTop: 10 }}
                        >
                            Back to Details
                        </Button>
                    )}
                </MotiView>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        // Leave room for the absolute-positioned back arrow.
        paddingTop: 60,
    },
    topBar: {
        position: 'absolute',
        left: 8,
        top: 8,
        zIndex: 10,
    },
    header: {
        marginBottom: 30,
        marginTop: 10,
    },
    form: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 20,
        borderRadius: 12,
    },
    channelSelect: {
        paddingVertical: 20,
    }
});
