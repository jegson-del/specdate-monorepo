import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Avatar, IconButton, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/users';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileImageGrid, ImageViewerModal } from './components';
import { toImageUri } from '../../utils/imageUrl';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';

type SafetySheetState =
    | null
    | { mode: 'actions'; userId: number; name: string }
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'block'; userId: number; name: string }
    | { mode: 'success'; title: string; subtitle: string; afterDismiss?: () => void };

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

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function getIdealDateIcon(label: string) {
    const key = label.toLowerCase();
    if (key.includes('dinner') || key.includes('brunch') || key.includes('dessert') || key.includes('cooking')) return 'silverware-fork-knife';
    if (key.includes('coffee')) return 'coffee-outline';
    if (key.includes('swimming') || key.includes('beach')) return 'swim';
    if (key.includes('cinema')) return 'movie-open-outline';
    if (key.includes('music') || key.includes('dancing') || key.includes('karaoke')) return 'music-note-outline';
    if (key.includes('hiking')) return 'hiking';
    if (key.includes('gallery') || key.includes('museum')) return 'palette-outline';
    if (key.includes('arcade') || key.includes('bowling')) return 'gamepad-variant-outline';
    if (key.includes('wine')) return 'glass-wine';
    if (key.includes('trip')) return 'car-outline';
    if (key.includes('book')) return 'book-open-page-variant-outline';
    if (key.includes('comedy')) return 'microphone-variant';
    if (key.includes('fitness') || key.includes('gym')) return 'dumbbell';
    if (key.includes('picnic')) return 'basket-outline';
    return 'heart-outline';
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
    const displayName = profile?.full_name || user?.username || user?.name || 'Unknown';
    const accountUsername = user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : null;
    const avatarUri =
        toImageUri(profile?.avatar) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=512&background=7C3AED&color=ffffff`;
    const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || '—';
    const age = formatAge(profile?.dob);
    const idealDates = useMemo(() => normalizeStringArray(profile?.ideal_dates), [profile?.ideal_dates]);

    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
    const [safetySheet, setSafetySheet] = useState<SafetySheetState>(null);
    const [safetyLoading, setSafetyLoading] = useState(false);
    const [safetyError, setSafetyError] = useState<string | null>(null);

    const images = useMemo(() => {
        const raw = (user?.images ?? []) as string[];
        const valid = raw.map((u) => toImageUri(u) ?? null).filter(Boolean) as string[];
        const arr: (string | null)[] = valid.length > 0 ? [...valid] : [...DUMMY_IMAGES];
        while (arr.length < 6) arr.push(null);
        return arr.slice(0, 6);
    }, [user?.images]);

    const imagesFilled = useMemo(() => {
        const mediaUrls = user?.profile_gallery_media?.map((m) => toImageUri(m.url)).filter(Boolean) as string[] | undefined;
        const raw = mediaUrls?.length ? mediaUrls : ((user?.images ?? []) as string[]).map((u) => toImageUri(u)).filter(Boolean) as string[];
        const valid = raw.filter(Boolean) as string[];
        return valid.length > 0 ? valid : DUMMY_IMAGES;
    }, [user?.images, user?.profile_gallery_media]);

    const galleryMediaByViewerIndex = useMemo(() => {
        const media = user?.profile_gallery_media ?? [];
        return media.filter((m) => toImageUri(m.url));
    }, [user?.profile_gallery_media]);

    const openViewer = useCallback((index: number) => {
        const filled = images.filter(Boolean) as string[];
        const idx = filled.indexOf(images[index] as string);
        setViewerInitialIndex(idx >= 0 ? idx : 0);
        setViewerVisible(true);
    }, [images]);

    const closeSafetySheet = useCallback(() => {
        const afterDismiss = safetySheet?.mode === 'success' ? safetySheet.afterDismiss : undefined;
        setSafetySheet(null);
        setSafetyError(null);
        afterDismiss?.();
    }, [safetySheet]);

    const openReportSheet = useCallback((targetType: ReportTargetType, targetId: number, label: string) => {
        setSafetyError(null);
        setSafetySheet({ mode: 'report', targetType, targetId, label });
    }, []);

    const submitReport = useCallback(async (reason: string) => {
        if (safetySheet?.mode !== 'report') return;
        setSafetyLoading(true);
        setSafetyError(null);
        try {
            await ModerationService.reportContent({
                target_type: safetySheet.targetType,
                target_id: safetySheet.targetId,
                reason,
            });
            setSafetySheet({
                mode: 'success',
                title: 'Report submitted',
                subtitle: 'Thanks. Our moderation team will review this profile and take action where needed.',
            });
        } catch (e: any) {
            setSafetyError(e?.response?.data?.message || e?.message || 'Could not submit report.');
        } finally {
            setSafetyLoading(false);
        }
    }, [safetySheet]);

    const confirmBlock = useCallback(async () => {
        if (safetySheet?.mode !== 'block') return;
        setSafetyLoading(true);
        setSafetyError(null);
        try {
            await ModerationService.blockUser(safetySheet.userId);
            setSafetySheet({
                mode: 'success',
                title: 'User blocked',
                subtitle: `${safetySheet.name} cannot message you or view your profile now.`,
                afterDismiss: () => navigation.goBack(),
            });
        } catch (e: any) {
            setSafetyError(e?.response?.data?.message || e?.message || 'Could not block this user.');
        } finally {
            setSafetyLoading(false);
        }
    }, [navigation, safetySheet]);

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
                    <IconButton
                        icon="dots-vertical"
                        iconColor={theme.colors.onSurface}
                        size={24}
                        onPress={() => {
                            setSafetyError(null);
                            setSafetySheet({ mode: 'actions', userId: Number(userId), name: displayName });
                        }}
                        style={styles.backBtn}
                    />
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
                    {accountUsername ? (
                        <Text variant="bodyMedium" style={[styles.usernameText, { color: theme.colors.onSurfaceVariant }]}>
                            {accountUsername}
                        </Text>
                    ) : null}
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

                {idealDates.length > 0 && (
                    <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            Ideal Dates
                        </Text>
                        <View style={styles.idealDateGrid}>
                            {idealDates.map((date) => (
                                <View
                                    key={date}
                                    style={[
                                        styles.idealDateChip,
                                        {
                                            backgroundColor: theme.colors.primaryContainer,
                                            borderColor: theme.colors.primary + '33',
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons name={getIdealDateIcon(date) as any} size={17} color={theme.colors.primary} />
                                    <Text style={[styles.idealDateText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                        {date}
                                    </Text>
                                </View>
                            ))}
                        </View>
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
                    onReport={(index) => {
                        const mediaId = galleryMediaByViewerIndex[index]?.id;
                        openReportSheet(mediaId ? 'media' : 'profile', mediaId ? Number(mediaId) : Number(userId), mediaId ? 'photo' : 'profile photo');
                    }}
                />
            )}
            <ChatSafetySheet
                visible={!!safetySheet}
                mode={safetySheet?.mode ?? 'actions'}
                title={
                    safetySheet?.mode === 'actions'
                        ? displayName
                        : safetySheet?.mode === 'report'
                            ? `Report ${safetySheet.label}?`
                            : safetySheet?.mode === 'block'
                                ? `Block ${safetySheet.name}?`
                                : safetySheet?.title ?? ''
                }
                subtitle={
                    safetySheet?.mode === 'actions'
                        ? 'Choose a safety action for this profile.'
                        : safetySheet?.mode === 'report'
                            ? 'Choose the reason. Our moderation team will review it.'
                            : safetySheet?.mode === 'block'
                                ? 'They will not be able to message you or view your profile. You will not see their profile either.'
                                : safetySheet?.subtitle
                }
                loading={safetyLoading}
                error={safetyError}
                onDismiss={closeSafetySheet}
                onOpenReport={() => openReportSheet('profile', Number(userId), 'profile')}
                onOpenBlock={() => setSafetySheet({ mode: 'block', userId: Number(userId), name: displayName })}
                onSubmitReport={submitReport}
                onConfirmBlock={confirmBlock}
            />
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
    usernameText: { marginTop: 2, fontWeight: '700' },
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
    idealDateGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    idealDateChip: {
        maxWidth: '48%',
        minHeight: 34,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    idealDateText: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '800',
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
