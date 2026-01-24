import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth';

export default function OtpVerificationScreen({ navigation, route }: any) {
    const theme = useTheme();
    const { formData, channel, target } = route.params || {};
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (code.length < 4) {
            Alert.alert("Invalid Code", "Please enter the full code.");
            return;
        }

        setLoading(true);
        try {
            await AuthService.verifyOtp(code);

            // If OTP valid, now we call the ACTUAL Register API to create the user
            // Or if we pre-registered, we verify the user.
            // Assuming Logic: Verify OTP -> Then Register User

            const response = await AuthService.register(formData);

            if (response.data.success || response.status === 201) {
                Alert.alert("Success", "Account created! Welcome to SpecDate.", [
                    // Navigate to next step: Compulsory Profile
                    { text: "Let's Go", onPress: () => navigation.navigate("ProfileSetup") }
                ]);
            }
        } catch (error) {
            Alert.alert("Error", "Registration failed or invalid code.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary, marginBottom: 10 }}>
                    Enter Verification Code
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 30 }}>
                    Sent to {target} via {channel}
                </Text>

                <TextInput
                    mode="outlined"
                    label="Code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    style={styles.input}
                    maxLength={6}
                    textAlign="center"
                />

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
        </SafeAreaView>
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
    input: {
        backgroundColor: 'transparent',
        fontSize: 24,
        fontWeight: 'bold',
    },
    button: {
        marginTop: 30,
        borderRadius: 12,
    },
});
