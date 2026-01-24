import { MD3LightTheme as DefaultTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// "Electric Night" Palette - High Contrast, Modern, Premium
const premiumColors = {
    primary: '#7F5AF0',   // Electric Indigo: Captivating, magical
    onPrimary: '#FFFFFF',
    secondary: '#2CB67D', // Neon Mint: For Success/Join
    onSecondary: '#000000',
    tertiary: '#FF0054',  // Radical Red: For Elimination/Passion
    onTertiary: '#FFFFFF',

    // Backgrounds - Deep Gunmetal
    background: '#16161A',
    onBackground: '#FFFFFE',
    surface: '#242629',    // Slightly lighter than bg
    onSurface: '#FFFFFE',

    error: '#FF4545',
    outline: '#94A1B2',
    elevation: {
        level0: 'transparent',
        level1: '#242629',
        level5: '#7F5AF0',
    }
};

export const theme = {
    ...MD3DarkTheme, // Default to Dark
    colors: {
        ...MD3DarkTheme.colors,
        ...premiumColors,
    },
    roundness: 16,
    animation: {
        scale: 1.0,
    },
};

export const lightTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
    }
};
