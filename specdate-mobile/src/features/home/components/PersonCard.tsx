import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { toImageUri } from '../../../utils/imageUrl';

export type UserItem = {
    id: string;
    name: string;
    age: number | null;
    city: string;
    occupation: string;
    avatar: string | null;
    sex?: string;
};

type Props = {
    item: UserItem;
    theme: any;
    onPress?: () => void;
};

const PersonCard = memo(({ item, theme, onPress }: Props) => {
    const avatarUri = toImageUri(item.avatar);
    const displayName = (item.name || '?').trim() || 'Unknown';
    const initial = displayName.slice(0, 1).toUpperCase();
    const location = [item.city].filter(Boolean).join(', ') || '—';

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={styles.tile}
        >
            {/* Image or gradient background */}
            {avatarUri ? (
                <Image
                    source={{ uri: avatarUri }}
                    style={styles.tileImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.tilePlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.placeholderInitial, { color: theme.colors.onPrimaryContainer }]}>
                        {initial}
                    </Text>
                </View>
            )}

            {/* Bottom gradient scrim + text */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.82)']}
                style={styles.scrim}
                pointerEvents="none"
            >
                <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                    {item.age != null ? `, ${item.age}` : ''}
                </Text>
                <View style={styles.cityRow}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={14}
                        color="#fff"
                        style={styles.cityIcon}
                    />
                    <Text style={styles.city} numberOfLines={1}>
                        {location}
                    </Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
});

export default PersonCard;

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        aspectRatio: 0.85,
        minHeight: 140,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 6,
        backgroundColor: '#1a1a1a',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.22,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    tileImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    tilePlaceholder: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderInitial: {
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: -1,
    },
    scrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 32,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
    cityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    cityIcon: {
        opacity: 0.95,
    },
    city: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
});
