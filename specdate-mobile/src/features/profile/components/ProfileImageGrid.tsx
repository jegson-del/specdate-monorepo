import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ProfileImageGridProps = {
    images: (string | null)[];
    maxSlots?: number;
    readOnly?: boolean;
    /** Tap image to view (e.g. open fullscreen viewer). */
    onImagePress?: (index: number) => void;
    /** Deprecated: use onEditSlot. Add photo to empty slot. */
    onAddPress?: (index: number) => void;
    /** Edit pen tap: open uploader for this slot. Pass slot index; parent sends media_id when slot has image. */
    onEditSlot?: (index: number) => void;
};

const DEFAULT_SLOTS = 6;

export function ProfileImageGrid({
    images,
    maxSlots = DEFAULT_SLOTS,
    readOnly = false,
    onImagePress,
    onAddPress,
    onEditSlot,
}: ProfileImageGridProps) {
    const theme = useTheme();
    const slots = Array.from({ length: maxSlots }, (_, i) => images[i] ?? null);
    const showEditIcon = !readOnly && onEditSlot != null;

    const renderCell = (uri: string | null, index: number) => {
        const hasImage = !!uri;
        const canView = hasImage && onImagePress;
        const canAdd = !readOnly && !hasImage && onAddPress;
        const canEdit = showEditIcon;

        const content = hasImage ? (
            <Image
                source={{ uri }}
                style={styles.gridImage}
                resizeMode="cover"
            />
        ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                {!hasImage && (canAdd || canEdit) ? (
                    <MaterialCommunityIcons
                        name="plus"
                        size={28}
                        color={theme.colors.onSurfaceVariant}
                    />
                ) : null}
            </View>
        );

        const editPen = canEdit ? (
            <TouchableOpacity
                style={[styles.editPen, { backgroundColor: theme.colors.primary }]}
                onPress={() => onEditSlot?.(index)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={hasImage ? 'Replace photo' : 'Add photo'}
            >
                <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
        ) : null;

        const contentWithTap = hasImage && canView
            ? <TouchableOpacity style={styles.cellContent} onPress={() => onImagePress?.(index)} activeOpacity={0.9}>{content}</TouchableOpacity>
            : canEdit && !hasImage
                ? <TouchableOpacity style={styles.cellContent} onPress={() => onEditSlot?.(index)} activeOpacity={0.9}>{content}</TouchableOpacity>
                : content;

        const cellInner = (
            <View
                style={[
                    styles.cell,
                    { backgroundColor: hasImage ? 'transparent' : theme.colors.surfaceVariant },
                ]}
            >
                {contentWithTap}
                {editPen}
            </View>
        );

        if (canEdit) {
            return (
                <View key={index} style={styles.cellTouch}>
                    {cellInner}
                </View>
            );
        }
        if (canView) {
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
        <View style={styles.container}>
            <View style={styles.row}>{row1}</View>
            <View style={styles.row}>{row2}</View>
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
    cellContent: {
        flex: 1,
        width: '100%',
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
    editPen: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
});
