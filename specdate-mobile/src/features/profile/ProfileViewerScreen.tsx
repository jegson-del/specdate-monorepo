import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Avatar, IconButton, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/users';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileImageGrid, ImageViewerModal } from './components';
import { toImageUri } from '../../utils/imageUrl';

function formatAge(dob?: string) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    return new Date().getFullYear() - d.getFullYear();
}

function cmToFeetInches(cm: number) {
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return `${feet}'${inches === 12 ? 0 : inches}"`;
}

const DUMMY_IMAGES = [
    'https://picsum.photos/seed/profile-a/600/800',
    'https://picsum.photos/seed/profile-b/600/800',
    'https://picsum.photos/seed/profile-c/600/800',
    'https://picsum.photos/seed/profile-d/600/800',
];

export default function ProfileViewerScreen({ route, navigation }: any) {
    const { userId } = route.params || {};
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => UserService.getPublicProfile(Number(userId)),
        enabled: !!userId,
        retry: false,
    });

    const profile = user?.profile;
    const displayName = profile?.full_name || user?.name || 'Unknown';
    const avatarUri =
        toImageUri(profile?.avatar) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=512&background=7C3AED&color=ffffff`;
    const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || '—';
    const age = formatAge(profile?.dob);

    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    const images = useMemo(() => {
        const raw = (user?.images ?? []) as string[];
        const valid = raw.map((u) => toImageUri(u) ?? null).filter(Boolean) as string[];
        const arr: (string | null)[] = valid.length > 0 ? [...valid] : [...DUMMY_IMAGES];
        while (arr.length < 6) arr.push(null);
        return arr.slice(0, 6);
    }, [user?.images]);

    const imagesFilled = useMemo(() => {
        const raw = (user?.images ?? []) as string[];
        const valid = raw.map((u) => toImageUri(u)).filter(Boolean) as string[];
        return valid.length > 0 ? valid : DUMMY_IMAGES;
    }, [user?.images]);

    const openViewer = useCallback((index: number) => {
        const filled = images.filter(Boolean) as string[];
        const idx = filled.indexOf(images[index] as string);
        setViewerInitialIndex(idx >= 0 ? idx : 0);
        setViewerVisible(true);
    }, [images]);

    const specsCreated = user?.specs_created_count ?? 0;
    const specsParticipated = user?.specs_participated_count ?? 0;
    const datesCount = user?.dates_count ?? 0;

    if (!userId) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Invalid user.</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Could not load profile.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={[theme.colors.elevation.level1, theme.colors.background]}
                    style={{ flex: 1 }}
                />
            </View>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
            >
                <View style={[styles.topNav, { paddingBottom: 8 }]}>
                    <IconButton
                        icon="arrow-left"
                        iconColor={theme.colors.onSurface}
                        size={24}
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                    />
                    <Text variant="titleLarge" style={[styles.screenTitle, { color: theme.colors.onSurface }]}>
                        Profile
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.header}>
                    <Avatar.Image
                        size={120}
                        source={{ uri: avatarUri }}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                    />
                    <Text variant="headlineMedium" style={[styles.nameText, { color: theme.colors.onSurface }]}>
                        {displayName}
                    </Text>
                    <View style={styles.headerMeta}>
                        {location !== '—' && (
                            <>
                                <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                    {location}
                                </Text>
                            </>
                        )}
                        {age != null && (
                            <>
                                {location !== '—' && <Text style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 8 }}>•</Text>}
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {age} y/o
                                </Text>
                            </>
                        )}
                        {location === '—' && age == null && (
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                No location or age set
                            </Text>
                        )}
                    </View>
                </View>

                {/* Stats */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Activity
                    </Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                                <MaterialCommunityIcons name="clipboard-edit-outline" size={22} color={theme.colors.primary} />
                            </View>
                            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                {specsCreated}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Specs created</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.secondaryContainer }]}>
                                <MaterialCommunityIcons name="account-group" size={22} color={theme.colors.secondary} />
                            </View>
                            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                {specsParticipated}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Participated</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.elevation.level2 }]}>
                                <MaterialCommunityIcons name="heart" size={22} color={theme.colors.primary} />
                            </View>
                            <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                {datesCount}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Dates</Text>
                        </View>
                    </View>
                </Surface>

                {/* Photos */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Photos
                    </Text>
                    {imagesFilled.length > 0 ? (
                        <>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                                {imagesFilled.length} photo{imagesFilled.length !== 1 ? 's' : ''}
                            </Text>
                            <ProfileImageGrid images={images} maxSlots={6} readOnly onImagePress={openViewer} />
                        </>
                    ) : (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            No photos yet
                        </Text>
                    )}
                </Surface>

                {(profile?.occupation || profile?.qualification || profile?.religion) && (
                    <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            About
                        </Text>
                        {profile?.occupation && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="briefcase" size={20} color={theme.colors.primary} />
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
                                    {profile.occupation}
                                </Text>
                            </View>
                        )}
                        {profile?.qualification && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="school" size={20} color={theme.colors.primary} />
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
                                    {profile.qualification}
                                </Text>
                            </View>
                        )}
                        {profile?.religion && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="book-open-variant" size={20} color={theme.colors.primary} />
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
                                    {profile.religion}
                                </Text>
                            </View>
                        )}
                    </Surface>
                )}

                {profile?.hobbies && (
                    <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            Bio / Hobbies
                        </Text>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                            {profile.hobbies}
                        </Text>
                    </Surface>
                )}

                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Lifestyle
                    </Text>
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="smoking" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                                Smoker
                            </Text>
                        </View>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                            {profile?.is_smoker ? 'Yes' : 'No'}
                        </Text>
                    </View>
                    <Divider style={styles.divider} />
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="glass-cocktail" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                                Drinking
                            </Text>
                        </View>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
                            {profile?.drinking || 'No'}
                        </Text>
                    </View>
                    <Divider style={styles.divider} />
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="pill" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                                Drug Use
                            </Text>
                        </View>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                            {profile?.is_drug_user ? 'Yes' : 'No'}
                        </Text>
                    </View>
                    {profile?.height != null && (
                        <>
                            <Divider style={styles.divider} />
                            <View style={styles.lifestyleRow}>
                                <View style={styles.lifestyleLabel}>
                                    <MaterialCommunityIcons name="human-male-height" size={20} color={theme.colors.onSurfaceVariant} />
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                                        Height
                                    </Text>
                                </View>
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {profile.height} cm ({cmToFeetInches(profile.height)})
                                </Text>
                            </View>
                        </>
                    )}
                </Surface>
            </ScrollView>

            {viewerVisible && (
                <ImageViewerModal
                    visible
                    images={imagesFilled}
                    initialIndex={viewerInitialIndex}
                    onClose={() => setViewerVisible(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {},
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    backBtn: { margin: 0 },
    screenTitle: {
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: -0.5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    nameText: { fontWeight: 'bold' },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    viewPhotosBtn: {
        marginTop: 16,
        alignSelf: 'stretch',
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '800',
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 1.2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    lifestyleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    lifestyleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    divider: {
        marginVertical: 4,
        opacity: 0.3,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontWeight: '900',
        marginBottom: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        opacity: 0.3,
    },
});
