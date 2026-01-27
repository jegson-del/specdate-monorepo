import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ProfileImageGridProps = {
    images: (string | null)[];
    maxSlots?: number;
    readOnly?: boolean;
    onImagePress?: (index: number) => void;
    onAddPress?: (index: number) => void;
};

const DEFAULT_SLOTS = 6;

export function ProfileImageGrid({
    images,
    maxSlots = DEFAULT_SLOTS,
    readOnly = false,
    onImagePress,
    onAddPress,
}: ProfileImageGridProps) {
    const theme = useTheme();
    const slots = Array.from({ length: maxSlots }, (_, i) => images[i] ?? null);

    const renderCell = (uri: string | null, index: number) => {
        const hasImage = !!uri;
        const canTap = hasImage && onImagePress;
        const canAdd = !readOnly && !hasImage && onAddPress;

        const content = hasImage ? (
            <Image
                source={{ uri }}
                style={styles.gridImage}
                resizeMode="cover"
                pointerEvents="none"
            />
        ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                {canAdd ? (
                    <MaterialCommunityIcons
                        name={index < 3 ? 'camera-plus' : 'plus'}
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                    />
                ) : null}
            </View>
        );

        const badge = hasImage ? (
            <View style={styles.badge} pointerEvents="none">
                <View style={[styles.badgeInner, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <MaterialCommunityIcons name="image" size={10} color="#fff" />
                </View>
            </View>
        ) : null;

        const cellInner = (
            <View
                style={[
                    styles.cell,
                    { backgroundColor: hasImage ? 'transparent' : theme.colors.surfaceVariant },
                ]}
            >
                {content}
                {badge}
            </View>
        );

        if (canTap) {
            return (
                <TouchableOpacity
                    key={index}
                    style={styles.cellTouch}
                    activeOpacity={0.75}
                    onPress={() => onImagePress?.(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="View photo"
                >
                    {cellInner}
                </TouchableOpacity>
            );
        }
        if (canAdd) {
            return (
                <TouchableOpacity
                    key={index}
                    style={styles.cellTouch}
                    activeOpacity={0.75}
                    onPress={() => onAddPress?.(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    collapsable={false}
                    accessibilityRole="button"
                    accessibilityLabel="Add photo"
                >
                    {cellInner}
                </TouchableOpacity>
            );
        }
        return <View key={index} style={styles.cellTouch}>{cellInner}</View>;
    };

    const row1 = slots.slice(0, 3).map((uri, i) => renderCell(uri, i));
    const row2 = slots.slice(3, 6).map((uri, i) => renderCell(uri, i + 3));

    return (
        <View style={styles.container} collapsable={false}>
            <View style={styles.row} collapsable={false}>{row1}</View>
            <View style={styles.row} collapsable={false}>{row2}</View>
        </View>
    );
}

const CELL_SIZE = 100;
const GAP = 10;

const styles = StyleSheet.create({
    container: { gap: GAP },
    row: {
        flexDirection: 'row',
        gap: GAP,
        height: CELL_SIZE,
    },
    cellTouch: {
        flex: 1,
        height: '100%',
    },
    cell: {
        flex: 1,
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        ...(Platform.OS === 'android' ? { elevation: 1 } : {}),
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    badgeInner: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
});
