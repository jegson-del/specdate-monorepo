import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

interface Props {
    onAnimationFinish: () => void;
}

export default function AnimatedSplashScreen({ onAnimationFinish }: Props) {
    const theme = useTheme();

    useEffect(() => {
        // Hold the splash screen for a bit after animation, then finish
        const timer = setTimeout(() => {
            onAnimationFinish();
        }, 2500); // 2.5 seconds total duration

        return () => clearTimeout(timer);
    }, [onAnimationFinish]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.centerContainer}>
                {/* Left Text: Spec */}
                <MotiView
                    from={{ opacity: 0, translateX: -100 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: 300 }}
                    style={styles.textContainer}
                >
                    <Text style={[styles.text, { color: theme.colors.onBackground }]}>Spec</Text>
                </MotiView>

                {/* Center Icon */}
                <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    style={styles.iconContainer}
                >
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </MotiView>

                {/* Right Text: Date */}
                <MotiView
                    from={{ opacity: 0, translateX: 100 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: 300 }}
                    style={styles.textContainer}
                >
                    <Text style={[styles.text, { color: theme.colors.onBackground }]}>Date</Text>
                </MotiView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginHorizontal: 10,
        zIndex: 10,
    },
    icon: {
        width: 80,
        height: 80,
    },
    textContainer: {
        justifyContent: 'center',
        zIndex: 5,
    },
    text: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
