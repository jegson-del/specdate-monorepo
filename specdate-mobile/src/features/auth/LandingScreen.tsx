import React from 'react';
import { View, StyleSheet, Image as RNImage } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEART_EMOJI_RED = '#FF2D55';

function HeartLetter({
    letter,
    size,
    heartColor,
    letterColor,
}: {
    letter: string;
    size: number;
    heartColor: string;
    letterColor: string;
}) {
    const circle = Math.round(size * 0.56);
    const square = Math.round(size * 0.56);
    const inset = Math.round(size * 0.08);
    const top = Math.round(size * 0.18);
    const squareTop = Math.round(size * 0.32);

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            {/* Heart shape (two circles + rotated square) */}
            <View
                style={[
                    styles.heartCircle,
                    { width: circle, height: circle, borderRadius: circle / 2, left: inset, top, backgroundColor: heartColor },
                ]}
            />
            <View
                style={[
                    styles.heartCircle,
                    { width: circle, height: circle, borderRadius: circle / 2, right: inset, top, backgroundColor: heartColor },
                ]}
            />
            <View
                style={[
                    styles.heartSquare,
                    { width: square, height: square, top: squareTop, backgroundColor: heartColor },
                ]}
            />

            {/* Letter inside the heart */}
            <Text
                style={{
                    color: letterColor,
                    fontWeight: '900',
                    fontSize: Math.round(size * 0.52),
                    lineHeight: Math.round(size * 0.52),
                    letterSpacing: -0.5,
                }}
            >
                {letter}
            </Text>
        </View>
    );
}

export default function LandingScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Background Gradient - Subtle deep colors like Snapchat/Instagram stories */}
            <LinearGradient
                colors={[theme.colors.background, '#1a1a2e']}
                style={StyleSheet.absoluteFillObject}
            />

            <View
                style={[
                    styles.safeArea,
                    {
                        paddingTop: insets.top,
                        paddingRight: insets.right,
                        paddingBottom: insets.bottom,
                        paddingLeft: insets.left,
                    },
                ]}
            >
                <View style={styles.centerContent}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                        style={styles.logoContainer}
                    >
                        {/* Actual Logo Image */}
                        <RNImage
                            source={require('../../../assets/wellcome_logo.png')}
                            style={{ width: 300, height: 150, resizeMode: 'contain' }}
                        />
                        <Text style={[styles.appName, { color: theme.colors.primary, marginTop: 10 }]}>
                            DateUsher
                        </Text>
                        <Text style={[styles.tagline, { color: theme.colors.outline }]}>
                            Ushering you to dream dates
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
                        textColor={theme.colors.primary}
                    >
                        Login
                    </Button>
                </MotiView>
            </View>
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
    heartCircle: {
        position: 'absolute',
    },
    heartSquare: {
        position: 'absolute',
        transform: [{ rotate: '45deg' }],
        borderRadius: 8,
    },
    appNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    appNameHeart: {
        // visually align the heart with the text baseline
        marginTop: 6,
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
