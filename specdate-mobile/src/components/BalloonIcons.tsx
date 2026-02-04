import React from 'react';
import { Image } from 'react-native';

interface Props {
    size?: number;
    color?: string; // Kept for backward compat but unused logic-wise
    outlineColor?: string;
    variant?: 'blue' | 'red';
}

function BalloonIcon({ size = 24, variant = 'blue' }: Props) {
    const source = variant === 'red'
        ? require('../../assets/red_heart_balloon.png')
        : require('../../assets/blue_balloon.png');

    return (
        <Image
            source={source}
            style={{ width: size, height: size, resizeMode: 'contain' }}
        />
    );
}

export { BalloonIcon };
