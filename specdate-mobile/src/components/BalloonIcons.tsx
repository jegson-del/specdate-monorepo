import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

interface Props {
    size?: number;
    color?: string;
    outlineColor?: string;
}

function BalloonIcon({ size = 24, color, outlineColor }: Props) {
    const theme = useTheme();
    const fillColor = color || theme.colors.primary;
    const strokeColor = outlineColor || theme.colors.outline;

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {/* String */}
            <Path
                d="M12 22C12 22 11 19 12 17"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Balloon Body */}
            <Path
                d="M12 2C8.13401 2 5 5.13401 5 9C5 12.866 8.13401 16 12 16C15.866 16 19 12.866 19 9C19 5.13401 15.866 2 12 2Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
            />
            {/* Reflection */}
            <Path
                d="M9 6C9 6 10 4 12 4"
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Knot */}
            <Path
                d="M10.5 16L13.5 16L12 17L10.5 16Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function PoppedBalloonIcon({ size = 24, color, outlineColor }: Props) {
    const theme = useTheme();
    const fillColor = color || theme.colors.surfaceVariant;
    const strokeColor = outlineColor || theme.colors.outline;

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {/* String - same as balloon */}
            <Path
                d="M12 22C12 22 11 19 12 17"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Deflated/Popped Body - limp, jagged shape hanging from knot */}
            <Path
                d="M12 16C14.5 16 16 14.5 15.5 13C15.2 12.1 14.5 12.5 14 12V10L12 12L10 10V12C9.5 12.5 8.8 12.1 8.5 13C8 14.5 9.5 16 12 16Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            {/* Knot - same as balloon */}
            <Path
                d="M10.5 16L13.5 16L12 17L10.5 16Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            {/* Small debris piece to emphasize 'pop' */}
            <Path
                d="M16 8L17 6"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <Path
                d="M7 8L6 6"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </Svg>
    );
}

export { BalloonIcon, PoppedBalloonIcon };
