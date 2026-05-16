import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, useTheme, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/users';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    ImageViewerModal,
    ProfileAboutSection,
    ProfileActivitySection,
    ProfileBioSection,
    ProfileIdealDatesSection,
    ProfileLifestyleSection,
    PublicProfilePhotosSection,
} from './components';
import { toImageUri } from '../../utils/imageUrl';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';
import { DUMMY_IMAGES, formatAge, normalizeStringArray } from './profileViewerUtils';
import { styles } from './profileViewerStyles';

type SafetySheetState =
    | null
    | { mode: 'actions'; userId: number; name: string }
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'block'; userId: number; name: string }
    | { mode: 'success'; title: string; subtitle: string; afterDismiss?: () => void };

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

                <ProfileActivitySection
                    specsCreated={specsCreated}
                    specsParticipated={specsParticipated}
                    datesCount={datesCount}
                />

                <PublicProfilePhotosSection
                    images={images}
                    imagesFilled={imagesFilled}
                    onImagePress={openViewer}
                />

                <ProfileAboutSection profile={profile} />

                <ProfileBioSection hobbies={profile?.hobbies} />

                <ProfileIdealDatesSection idealDates={idealDates} />

                <ProfileLifestyleSection profile={profile} />
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
