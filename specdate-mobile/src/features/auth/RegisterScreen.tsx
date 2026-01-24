import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, RadioButton, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { AuthService } from '../../services/auth';

export default function RegisterScreen({ navigation }: any) {
    const theme = useTheme();

    const [step, setStep] = useState(1); // 1: Details, 2: OTP Channel
    const [loading, setLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        username: '',
        email: '',
        mobile: '',
        password: '',
        name: ''
    });

    const [otpChannel, setOtpChannel] = useState('email');

    const handleNext = async () => {
        if (step === 1) {
            // Basic validation
            if (!form.username || !form.email || !form.password || !form.mobile) {
                Alert.alert("Missing Fields", "Please fill all fields.");
                return;
            }
            setStep(2);
        } else {
            // Submit & Request OTP
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // In real flow: 1. Register (or Pre-register) -> 2. Send OTP
            // For now we mock the flow to move to OTP screen
            await AuthService.requestOtp(otpChannel as 'email' | 'mobile', otpChannel === 'email' ? form.email : form.mobile);

            // Navigate to OTP Screen, passing the form data to finalize there or just the next step
            navigation.navigate('OtpVerification', {
                formData: form,
                channel: otpChannel,
                target: otpChannel === 'email' ? form.email : form.mobile
            });
        } catch (error) {
            Alert.alert("Error", "Could not initiate registration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>

                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.header}
                >
                    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {step === 1 ? "Create Profile" : "Verify Identity"}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
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
                                label="Full Name"
                                value={form.name}
                                onChangeText={(t) => setForm({ ...form, name: t })}
                                style={styles.input}
                            />
                            <TextInput
                                mode="outlined"
                                label="Username"
                                value={form.username}
                                onChangeText={(t) => setForm({ ...form, username: t })}
                                style={styles.input}
                                left={<TextInput.Icon icon="account" />}
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
                            />
                            <TextInput
                                mode="outlined"
                                label="Mobile Number"
                                value={form.mobile}
                                onChangeText={(t) => setForm({ ...form, mobile: t })}
                                style={styles.input}
                                keyboardType="phone-pad"
                                left={<TextInput.Icon icon="phone" />}
                            />
                            <TextInput
                                mode="outlined"
                                label="Password"
                                value={form.password}
                                onChangeText={(t) => setForm({ ...form, password: t })}
                                secureTextEntry
                                style={styles.input}
                                left={<TextInput.Icon icon="lock" />}
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
                        </View>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleNext}
                        loading={loading}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
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
