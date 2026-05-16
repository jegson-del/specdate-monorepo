import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { toImageUri } from '../../../utils/imageUrl';
import { flagEmoji } from '../../../utils/countryFlags';

export type UserItem = {
    id: string;
    name: string;
    age: number | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    country_code?: string | null;
    occupation?: string | null;
    job_title?: string | null;
    avatar: string | null;
    sex?: string | null;
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
    const location = [item.city, item.country].filter(Boolean).join(', ') || 'Location pending';
    const flag = flagEmoji(item.country_code);
    const meta = item.job_title?.trim() || item.occupation?.trim() || item.sex?.trim() || 'DateUsher member';
    const badge = item.sex?.trim();

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={styles.tile}
        >
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

            {badge ? (
                <View style={styles.badge}>
                    <MaterialCommunityIcons name={badge.toLowerCase() === 'male' ? 'gender-male' : badge.toLowerCase() === 'female' ? 'gender-female' : 'account'} size={12} color="#111827" />
                    <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
                </View>
            ) : null}

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.86)']}
                style={styles.scrim}
                pointerEvents="none"
            >
                <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                    {item.age != null ? `, ${item.age}` : ''}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                </Text>
                <View style={styles.cityRow}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={14}
                        color="#fff"
                        style={styles.cityIcon}
                    />
                    <Text style={styles.city} numberOfLines={1}>
                        {flag ? `${flag} ${location}` : location}
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
        minHeight: 158,
        borderRadius: 16,
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
        letterSpacing: 0,
    },
    badge: {
        position: 'absolute',
        top: 9,
        right: 9,
        maxWidth: '72%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: 0,
    },
    scrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 48,
        paddingHorizontal: 11,
        paddingBottom: 11,
    },
    name: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0,
    },
    meta: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.82)',
        letterSpacing: 0,
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
