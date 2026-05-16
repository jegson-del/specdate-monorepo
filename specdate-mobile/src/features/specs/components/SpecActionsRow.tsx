import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type SpecActionsRowProps = {
    isOwner: boolean;
    onLike: () => void;
    onReport: () => void;
    onShare: () => void;
    spec: any;
    theme: any;
};

export function SpecActionsRow({ isOwner, onLike, onReport, onShare, spec, theme }: SpecActionsRowProps) {
    return (
        <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onLike} activeOpacity={0.9}>
                <Surface style={[styles.actionPill, { backgroundColor: theme.colors.elevation.level2 }]} elevation={0}>
                    <MaterialCommunityIcons
                        name={(spec as any).is_liked ? 'heart' : 'heart-outline'}
                        size={18}
                        color="#EF4444"
                    />
                    <Text style={[styles.actionPillText, { color: theme.colors.onSurface }]}>
                        {(spec as any).likes_count || 0}
                    </Text>
                </Surface>
            </TouchableOpacity>

            <TouchableOpacity onPress={onShare} activeOpacity={0.9}>
                <Surface style={[styles.actionPill, { backgroundColor: theme.colors.elevation.level2 }]} elevation={0}>
                    <MaterialCommunityIcons name="share-variant" size={18} color={theme.colors.onSurface} />
                    <Text style={[styles.actionPillText, { color: theme.colors.onSurface }]}>Share</Text>
                </Surface>
            </TouchableOpacity>

            {!isOwner ? (
                <TouchableOpacity onPress={onReport} activeOpacity={0.9}>
                    <Surface style={[styles.actionPill, { backgroundColor: theme.colors.elevation.level2 }]} elevation={0}>
                        <MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.error} />
                        <Text style={[styles.actionPillText, { color: theme.colors.error }]}>Report</Text>
                    </Surface>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
    },
    actionPillText: { fontWeight: '900' },
});
