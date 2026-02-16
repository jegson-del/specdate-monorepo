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
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 1000 }}
                    style={StyleSheet.absoluteFill}
                >
                    <Image
                        source={require('../../../assets/splash_logo.png')}
                        style={styles.logo}
                        resizeMode="cover"
                    />
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
        flex: 1,
        width: '100%',
        height: '100%',
    },
    logo: {
        width: '100%',
        height: '100%',
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
