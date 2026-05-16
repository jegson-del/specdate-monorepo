import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../profileScreenStyles';

export type ProfileHeaderProps = {
    avatarUri: string;
    fullName?: string;
    accountUsername?: string;
    locationLabel?: string;
    dob?: string;
    imgLoading: boolean;
    onEditAvatar: () => void;
};

function getAgeLabel(dob?: string) {
    if (!dob) return null;
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${new Date().getFullYear() - parsed.getFullYear()} y/o`;
}

export function ProfileHeader({
    avatarUri,
    fullName,
    accountUsername,
    locationLabel,
    dob,
    imgLoading,
    onEditAvatar,
}: ProfileHeaderProps) {
    const theme = useTheme();
    const ageLabel = getAgeLabel(dob);

    return (
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
                <Avatar.Image
                    size={120}
                    source={{ uri: avatarUri }}
                    style={{ backgroundColor: theme.colors.surfaceVariant }}
                />
                <TouchableOpacity
                    style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}
                    onPress={onEditAvatar}
                    activeOpacity={0.8}
                    disabled={imgLoading}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Edit avatar"
                >
                    {imgLoading ? (
                        <ActivityIndicator size={18} color={theme.colors.onPrimary} />
                    ) : (
                        <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.onPrimary} />
                    )}
                </TouchableOpacity>
            </View>
            <Text variant="headlineMedium" style={[styles.nameText, { color: theme.colors.onSurface }]}>
                {fullName || 'Add full name'}
            </Text>
            {!!accountUsername && (
                <Text variant="bodyMedium" style={[styles.usernameText, { color: theme.colors.onSurfaceVariant }]}>
                    {accountUsername}
                </Text>
            )}
            <View style={styles.headerMeta}>
                <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {locationLabel || 'Add location'}
                </Text>
                {!!ageLabel && (
                    <>
                        <Text style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 8 }}>-</Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {ageLabel}
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
}
