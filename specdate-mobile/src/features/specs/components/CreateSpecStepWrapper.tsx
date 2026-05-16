import React from 'react';
import { Platform, View } from 'react-native';
import { MotiView } from 'moti';

const STEP_FROM = { opacity: 0, translateX: 10 };
const STEP_ANIMATE = { opacity: 1, translateX: 0 };

export function CreateSpecStepWrapper({ children, style }: { children: React.ReactNode; style?: any }) {
    // Reanimated can throw `connectAnimatedNodes ... child ... does not exist` on Android
    // during TextInput re-renders. Keep it simple/stable on Android.
    if (Platform.OS === 'android') {
        return <View style={style}>{children}</View>;
    }
    return (
        <MotiView from={STEP_FROM} animate={STEP_ANIMATE} style={style}>
            {children}
        </MotiView>
    );
}
