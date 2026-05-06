import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, useAnimationState } from 'moti';

type RecordingMediaButtonProps = {
    isRecording: boolean;
    durationMillis: number;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
};

export function RecordingMediaButton({ isRecording, durationMillis, onPress, style }: RecordingMediaButtonProps) {
    const theme = useTheme();
    const pulse = useAnimationState({
        idle: {
            opacity: 0,
            scale: 0.94,
        },
        pulse: {
            opacity: [0.2, 0.85, 0.2],
            scale: [0.96, 1.12, 0.96],
        },
    });

    useEffect(() => {
        pulse.transitionTo(isRecording ? 'pulse' : 'idle');
    }, [isRecording, pulse]);

    const seconds = Math.floor(durationMillis / 1000);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.82}
            style={[
                styles.mediaBtn,
                style,
                isRecording && styles.recordingBtn,
            ]}
        >
            {isRecording ? (
                <MotiView
                    pointerEvents="none"
                    state={pulse}
                    transition={{ type: 'timing', duration: 900, loop: true }}
                    style={styles.recordingPulse}
                />
            ) : null}
            <View style={[styles.iconCircle, isRecording && styles.stopCircle]}>
                <MaterialCommunityIcons
                    name={isRecording ? 'stop' : 'microphone'}
                    size={22}
                    color={isRecording ? '#FFFFFF' : theme.colors.primary}
                />
            </View>
            <Text style={[styles.mediaBtnLabel, { color: isRecording ? '#B91C1C' : theme.colors.onSurface }]}>
                {isRecording ? `${seconds}s` : 'Voice'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    mediaBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 72,
        overflow: 'visible',
    },
    recordingBtn: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    recordingPulse: {
        position: 'absolute',
        top: -5,
        right: -5,
        bottom: -5,
        left: -5,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    iconCircle: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    stopCircle: {
        backgroundColor: '#EF4444',
    },
    mediaBtnLabel: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
});
