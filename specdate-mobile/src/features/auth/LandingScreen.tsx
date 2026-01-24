import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen({ navigation }: any) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            {/* Background Gradient - Subtle deep colors like Snapchat/Instagram stories */}
            <LinearGradient
                colors={[theme.colors.background, '#1a1a2e']}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* CENTER CONTENT: Logo / App Name */}
                <View style={styles.centerContent}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                        style={styles.logoContainer}
                    >
                        {/* Placeholder for actual Logo Image */}
                        <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ fontSize: 40 }}>⚡</Text>
                        </View>
                        <Text style={[styles.appName, { color: theme.colors.onBackground }]}>
                            SpecDate
                        </Text>
                        <Text style={[styles.tagline, { color: theme.colors.outline }]}>
                            Quest for Love. Pop the Balloon.
                        </Text>
                    </MotiView>
                </View>

                {/* BOTTOM CONTENT: Actions */}
                <MotiView
                    from={{ translateY: 100, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ type: 'timing', duration: 800, delay: 500 }}
                    style={styles.bottomActions}
                >
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('Register')}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        buttonColor={theme.colors.primary}
                    >
                        Create Account
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('Login')}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        textColor={theme.colors.onBackground}
                    >
                        Login
                    </Button>
                </MotiView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    centerContent: {
        flex: 1, // Takes up remaining space to push actions to bottom, but centers logo
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#7F5AF0',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    appName: {
        fontSize: 42,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: 'System', // Replace with custom font later
    },
    tagline: {
        fontSize: 16,
        marginTop: 8,
        letterSpacing: 0.5,
    },
    bottomActions: {
        paddingHorizontal: 30,
        paddingBottom: 40,
        gap: 15,
    },
    button: {
        borderRadius: 30, // Pill shape like Snapchat
    },
    buttonContent: {
        height: 56,
    }
});
