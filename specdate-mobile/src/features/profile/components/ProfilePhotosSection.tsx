import React from 'react';
import { Text, Surface, useTheme } from 'react-native-paper';
import { ProfileImageGrid } from './ProfileImageGrid';
import { styles } from '../profileScreenStyles';

export type ProfilePhotosSectionProps = {
    images: (string | null)[];
    onImagePress: (index: number) => void;
    onEditSlot: (index: number) => void;
};

export function ProfilePhotosSection({ images, onImagePress, onEditSlot }: ProfilePhotosSectionProps) {
    const theme = useTheme();

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Public Photos
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                Add up to 6 photos to show off your best self.
            </Text>
            <ProfileImageGrid
                images={images}
                maxSlots={6}
                readOnly={false}
                onImagePress={onImagePress}
                onEditSlot={onEditSlot}
            />
        </Surface>
    );
}
