import { MD3LightTheme } from 'react-native-paper';

// "SpecDate Pop" (Electric Violet): premium + unique (keep everything else neutral)
const snapPopColors = {
    // Brand
    primary: '#7C3AED', // electric violet
    onPrimary: '#FFFFFF',

    // Accent (optional)
    secondary: '#A78BFA', // light violet
    onSecondary: '#FFFFFF',

    // Base surfaces (light + lively)
    background: '#F7F2FF',
    onBackground: '#0B0B0B',
    surface: '#FFFFFF',
    onSurface: '#0B0B0B',

    // System
    error: '#E11D48',
    outline: '#E7DDFB',

    // IMPORTANT:
    // react-native-paper animates Surface backgroundColor by interpolating
    // theme.colors.elevation.level0..level5. If any are missing/invalid, RN
    // can throw: "outputRange must contain color or value with numeric component".
    // Keep this map COMPLETE and use parseable RGB(A) strings.
    elevation: {
        level0: 'rgba(0,0,0,0)',
        // Neutral "light shadow" grays (blend better than pink tints)
        level1: 'rgb(250, 250, 250)',
        level2: 'rgb(245, 245, 245)',
        level3: 'rgb(240, 240, 240)',
        level4: 'rgb(235, 235, 235)',
        level5: 'rgb(230, 230, 230)',
    },
};

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...snapPopColors,
        elevation: {
            ...MD3LightTheme.colors.elevation,
            ...snapPopColors.elevation,
        },
    },
    roundness: 16,
    animation: {
        scale: 1.0,
    },
};

export const lightTheme = theme;
