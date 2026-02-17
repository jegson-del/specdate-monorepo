import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface Props {
    size?: number;
    color?: string; // Kept for backward compat but unused logic-wise
    outlineColor?: string;
    variant?: 'blue' | 'red';
    /** Match card/host background so no white shows (e.g. theme.colors.primaryContainer). */
    backgroundColor?: string;
}

const RED_BALLOON = require('../../assets/red_heart_balloon.png');
const BLUE_BALLOON = require('../../assets/blue_balloon.png');

function BalloonIcon({ size = 48, variant = 'blue', backgroundColor = 'transparent' }: Props) {
    const source = variant === 'red' ? RED_BALLOON : BLUE_BALLOON;

    return (
        <View
            style={[
                styles.wrap,
                {
                    width: size,
                    height: size,
                    backgroundColor,
                },
            ]}
        >
            <Image
                source={source}
                style={[styles.image, { width: size, height: size }]}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        backgroundColor: 'transparent',
    },
});

export { BalloonIcon };
