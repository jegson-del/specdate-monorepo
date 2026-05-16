import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

type RoundHeaderProps = {
    onBack: () => void;
    roundNumber: string | number;
    status: string;
    statusColor: string;
    theme: any;
    topInset: number;
};

export function RoundHeader({ onBack, roundNumber, status, statusColor, theme, topInset }: RoundHeaderProps) {
    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: topInset + 8,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.outlineVariant || theme.colors.outline + '30',
                },
            ]}
        >
            <IconButton icon="arrow-left" onPress={onBack} size={24} iconColor={theme.colors.onSurface} />
            <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Round {roundNumber}</Text>
                <View style={[styles.headerStatusPill, { backgroundColor: (theme.colors as any).surfaceVariant || theme.colors.elevation?.level2 }]}>
                    <View style={[styles.headerStatusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.headerStatusText, { color: theme.colors.onSurface }]}>{status}</Text>
                </View>
            </View>
            <View style={{ width: 48 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        backgroundColor: 'transparent',
    },
    headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    headerStatusPill: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
    headerStatusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
