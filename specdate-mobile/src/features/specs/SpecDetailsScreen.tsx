import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, useTheme, IconButton, Button, Avatar, Surface, ActivityIndicator, Chip, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { confirmMediaShareWithAiScan } from '../../utils/confirmMediaShareWithAiScan';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { insertEmojiAtSelection, type TextSelection } from '../../utils/emojiText';
import { MediaPickerSheet, VideoViewerModal } from '../../components';
import { EditSpecModal } from './components/EditSpecModal';
import { AudioMessagePlayer, LastManStandingModal, RoundMediaActions, useRoundAudioRecorder, VideoThumbnailPlayer } from './components';
import type { RoundMediaAsset } from './components';
import { cmToFeetInches, isAudioMedia, isVideoMedia, requirementIcon, safeParseMaybeJson, toNumber } from './specDetailsUtils';
import { useSpecDetailsMutations } from './hooks/useSpecDetailsMutations';
import { useSpecDetailsQuery } from './hooks/useSpecDetailsQuery';
import { isRoundMediaReviewing } from './roundMediaUpload';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';

type ReportSheetState =
    | null
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'success'; title: string; subtitle: string };

function formatExpires(expiresAt?: string) {
    if (!expiresAt) return '—';
    const end = new Date(expiresAt);
    if (Number.isNaN(end.getTime())) return '—';
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Ending soon';
    return `Ends in ${diffDays}d`;
}

function titleCase(s: string) {
    return s
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SpecDetailsScreen({ route, navigation }: any) {
    // Normalize to string so query key is stable (avoids cache mismatch between number and string)
    const specId = route.params?.specId != null ? String(route.params.specId) : undefined;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { data: user } = useUser();
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [lastManStandingVisible, setLastManStandingVisible] = React.useState(false);
    const [lastManStandingWinnerName, setLastManStandingWinnerName] = React.useState('');
    const [lastManStandingSpecId, setLastManStandingSpecId] = React.useState<string | null>(null);
    const [reportSheet, setReportSheet] = React.useState<ReportSheetState>(null);
    const [reportLoading, setReportLoading] = React.useState(false);
    const [reportError, setReportError] = React.useState<string | null>(null);

    const { data: spec, isLoading, isFetching, error, refetch: refetchSpec } = useSpecDetailsQuery({
        specId,
        fromNotification: route.params?.fromNotification,
        navigation,
    });

    const isOwner = useMemo(() => {
        if (!spec || !user) return false;
        // Loose comparison in case of string/number mismatch
        return String((spec as any).user_id) === String(user.id);
    }, [spec, user]);


    const participants = useMemo(() => {
        if (!spec?.applications) return [];
        return spec.applications.filter((a: any) => a.user_role === 'participant');
    }, [spec]);

    const acceptedParticipantCount = useMemo(
        () => participants.filter((p: any) => p.status === 'ACCEPTED').length,
        [participants]
    );

    const isFirstRound = useMemo(() => !spec?.rounds || spec.rounds.length === 0, [spec?.rounds]);

    const myApplication = useMemo(() => {
        if (!spec?.applications || !user) return null;
        return spec.applications.find((a: any) => a.user_id === user.id);
    }, [spec, user]);

    const canOpenRoundDetails = useMemo(() => {
        const status = String(myApplication?.status ?? '').toUpperCase();
        return isOwner || status === 'ACCEPTED' || status === 'ELIMINATED';
    }, [isOwner, myApplication?.status]);

    // --- OWNER ACTIONS ---
    const [newRoundQuestion, setNewRoundQuestion] = React.useState('');
    const [newRoundQuestionSelection, setNewRoundQuestionSelection] = React.useState<TextSelection>({ start: 0, end: 0 });
    const [roundQuestionMedia, setRoundQuestionMedia] = React.useState<RoundMediaAsset | null>(null);
    const [roundQuestionMediaSheet, setRoundQuestionMediaSheet] = React.useState<'file' | 'camera' | null>(null);
    const [questionVideoViewerVisible, setQuestionVideoViewerVisible] = React.useState(false);
    const [questionVideoViewerUri, setQuestionVideoViewerUri] = React.useState<string | null>(null);
    const questionAudioRecorder = useRoundAudioRecorder(setRoundQuestionMedia);
    const handleNewRoundQuestionEmoji = React.useCallback((emoji: string) => {
        const next = insertEmojiAtSelection(newRoundQuestion, emoji, newRoundQuestionSelection);
        setNewRoundQuestion(next.value);
        setNewRoundQuestionSelection(next.selection);
    }, [newRoundQuestion, newRoundQuestionSelection]);

    const {
        likeMutation,
        eliminateMutation,
        createDateMutation,
        extendSearchMutation,
        joinMutation,
        startRoundMutation,
    } = useSpecDetailsMutations({
        specId,
        spec,
        navigation,
        refetchSpec,
        roundQuestionMedia,
        setNewRoundQuestion,
        setRoundQuestionMedia,
        setLastManStandingVisible,
        setLastManStandingWinnerName,
        setLastManStandingSpecId,
    });

    const handleStartRoundPress = async () => {
        if (roundQuestionMedia) {
            const ok = await confirmMediaShareWithAiScan();
            if (!ok) {
                return;
            }
        }
        const maxParticipants = Number((spec as any)?.max_participants ?? 0);
        const startsBelowCapacity =
            isFirstRound &&
            maxParticipants > 0 &&
            acceptedParticipantCount > 0 &&
            acceptedParticipantCount < maxParticipants;

        if (startsBelowCapacity) {
            Alert.alert(
                'Start quest now?',
                'Your spec has not reached the max number of participants you required. If you begin the quest, new participants cannot join this spec. Do you wish to start or cancel?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Start quest',
                        onPress: () => {
                            startRoundMutation.mutate(newRoundQuestion);
                        },
                    },
                ],
            );
            return;
        }

        startRoundMutation.mutate(newRoundQuestion);
    };

    const pickRoundQuestionMedia = async (assetType: 'image' | 'video') => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Allow photo library access to share media.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: assetType === 'image' ? ['images'] : ['videos'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                videoMaxDuration: 60,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                setRoundQuestionMedia({
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? (assetType === 'video' ? 'video/mp4' : 'image/jpeg'),
                    assetType,
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const takeRoundQuestionPhoto = async () => {
        try {
            const cam = await ImagePicker.requestCameraPermissionsAsync();
            if (!cam.granted) {
                Alert.alert('Permission Required', 'Allow camera access to take a photo.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                setRoundQuestionMedia({
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'image/jpeg',
                    assetType: 'image',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const recordRoundQuestionVideo = async () => {
        try {
            const cam = await ImagePicker.requestCameraPermissionsAsync();
            if (!cam.granted) {
                Alert.alert('Permission Required', 'Allow camera access to record video.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                videoMaxDuration: 60,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                setRoundQuestionMedia({
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'video/mp4',
                    assetType: 'video',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const handleJoin = () => {
        // 1. Frontend check: profile must be complete to join (matches backend gate)
        if (!user?.profile_complete) {
            Alert.alert(
                'Complete your profile',
                'Please complete your profile to join specs. Fill in all required fields and save.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
                ]
            );
            return;
        }

        // 2. Confirm then call API
        Alert.alert(
            'Join Spec?',
            'Join specs for free. Credits are only required to create a new spec.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join for free', onPress: () => joinMutation.mutate() }
            ]
        );
    };

    const requirements = useMemo(() => {
        if (!spec?.requirements) return [];
        const raw = (spec.requirements ?? []).map((r: any) => {
            const field = String(r.field ?? '');
            const operator = String(r.operator ?? '');
            const rawValue = safeParseMaybeJson(r.value);
            const valueParts = Array.isArray(rawValue)
                ? rawValue.map((v) => String(v)).filter((v) => v.trim().length > 0)
                : [String(rawValue ?? '')].filter((v) => v.trim().length > 0);

            const valueText = valueParts.length > 1 ? valueParts.join(', ') : (valueParts[0] || '—');

            return {
                _id: r.id ?? `${field}-${operator}-${valueText}`,
                field,
                operator,
                valueParts,
                valueText,
                isCompulsory: r.is_compulsory === true,
            };
        });

        const out: any[] = [];

        // --- Age: combine >= and <= into one friendly range card
        const ageReqs = raw.filter((r: any) => r.field === 'age');
        if (ageReqs.length) {
            const min = ageReqs.find((r: any) => r.operator === '>=');
            const max = ageReqs.find((r: any) => r.operator === '<=');
            const minN = toNumber(min?.valueParts?.[0]);
            const maxN = toNumber(max?.valueParts?.[0]);

            let ageText = '—';
            if (minN !== null && maxN !== null) ageText = `${minN} - ${maxN}`;
            else if (minN !== null) ageText = `${minN}+`;
            else if (maxN !== null) ageText = `Up to ${maxN}`;

            out.push({
                id: `age-range-${minN ?? 'x'}-${maxN ?? 'y'}`,
                field: 'age',
                fieldLabel: 'Age',
                kind: 'text',
                valueText: ageText,
                isLong: false,
                isCompulsory: ageReqs.some((r: any) => r.isCompulsory),
            });
        }

        // --- Height: show cm + feet/inches, no operators
        const heightReq = raw.find((r: any) => r.field === 'height' && (r.operator === '>=' || r.operator === '<=' || r.operator === '='));
        if (heightReq) {
            const cm = toNumber(heightReq.valueParts?.[0]);
            let heightText = heightReq.valueText || '—';
            if (cm !== null) {
                const { feetAdjusted, inches } = cmToFeetInches(cm);
                if (heightReq.operator === '>=') heightText = `${cm} cm (${feetAdjusted}'${inches}\")+`;
                else if (heightReq.operator === '<=') heightText = `Up to ${cm} cm (${feetAdjusted}'${inches}\")`;
                else heightText = `${cm} cm (${feetAdjusted}'${inches}\")`;
            }
            out.push({
                id: `height-${heightReq.operator}-${heightReq.valueText}`,
                field: 'height',
                fieldLabel: 'Height',
                kind: 'text',
                valueText: heightText,
                isLong: false,
                isCompulsory: heightReq.isCompulsory,
            });
        }

        // --- Everything else (skip the raw age/height rows we just merged)
        raw.forEach((r: any) => {
            if (r.field === 'age') return;
            if (r.field === 'height') return;

            // Friendlier smoker display
            if (r.field === 'is_smoker' && r.operator === '=') {
                const v = String(r.valueParts?.[0] ?? r.valueText);
                const label = v === '1' ? 'Smoker' : v === '0' ? 'Non-smoker' : r.valueText;
                out.push({
                    id: r._id,
                    field: r.field,
                    fieldLabel: 'Smoker',
                    kind: 'text',
                    valueText: label,
                    isLong: false,
                    isCompulsory: r.isCompulsory,
                });
                return;
            }

            const isLong =
                r.operator === 'in' ||
                r.valueParts.length > 2 ||
                r.valueText.length > 22 ||
                r.field === 'occupation' ||
                r.field === 'qualification';

            if (r.operator === 'in' && r.valueParts.length > 1) {
                out.push({
                    id: r._id,
                    field: r.field,
                    fieldLabel: titleCase(r.field || 'Requirement'),
                    kind: 'chips',
                    valueParts: r.valueParts,
                    valueText: r.valueText,
                    isLong: true,
                    isCompulsory: r.isCompulsory,
                });
                return;
            }

            // Human-friendly operators for single values
            const opText =
                r.operator === '>=' ? 'At least' :
                    r.operator === '<=' ? 'Up to' :
                        r.operator === '=' ? 'Is' :
                            r.operator;

            out.push({
                id: r._id,
                field: r.field,
                fieldLabel: titleCase(r.field || 'Requirement'),
                kind: 'text',
                valueText: `${opText} ${r.valueText}`,
                isLong,
                isCompulsory: r.isCompulsory,
            });
        });

        return out;
    }, [spec?.requirements]);

    const onShare = () => {
        Alert.alert('Share', `Sharing spec: ${spec?.title}`);
    };

    const closeReportSheet = React.useCallback(() => {
        setReportSheet(null);
        setReportError(null);
    }, []);

    const openReportSheet = React.useCallback((targetType: ReportTargetType, targetId: number, label: string) => {
        setReportError(null);
        setReportSheet({ mode: 'report', targetType, targetId, label });
    }, []);

    const submitReport = React.useCallback(async (reason: string) => {
        if (reportSheet?.mode !== 'report') return;
        setReportLoading(true);
        setReportError(null);
        try {
            await ModerationService.reportContent({
                target_type: reportSheet.targetType,
                target_id: reportSheet.targetId,
                reason,
            });
            setReportSheet({
                mode: 'success',
                title: 'Report submitted',
                subtitle: 'Thanks. Our moderation team will review this and take action where needed.',
            });
        } catch (e: any) {
            setReportError(e?.response?.data?.message || e?.message || 'Could not submit report.');
        } finally {
            setReportLoading(false);
        }
    }, [reportSheet]);

    // Early return for missing specId - but all hooks must be called first
    if (!specId) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Invalid spec ID.</Text>
            </View>
        );
    }

    // Spinner until spec data is loaded (from notification we clear cache so this shows until fetch completes)
    if (!spec && !error) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Loading spec...</Text>
            </View>
        );
    }

    if (error || !spec) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Failed to load spec details.</Text>
            </View>
        );
    }

    const expiresText = formatExpires(spec.expires_at);
    const headerLine = [
        spec.location_city ? titleCase(spec.location_city) : null,
        expiresText !== '—' ? expiresText : null,
    ]
        .filter(Boolean)
        .join(' • ');

    const ownerName = spec.owner?.profile?.full_name || spec.owner?.name || 'Unknown';
    const ownerAvatar =
        spec.owner?.profile?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&size=512&background=111827&color=ffffff`;

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Hero */}
                <View style={styles.heroWrap}>
                    <ImageBackground
                        // Use owner avatar as the hero image for now
                        source={{ uri: ownerAvatar }}
                        style={styles.hero}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
                            locations={[0, 0.5, 1]}
                            style={StyleSheet.absoluteFillObject}
                        />

                        <IconButton
                            icon="arrow-left"
                            iconColor="#FFFFFF"
                            style={[styles.backButton, { top: insets.top + 12 }]}
                            onPress={() => navigation.goBack()}
                        />

                        {/* Edit Button for Owner */}
                        {isOwner && spec?.status === 'OPEN' && (
                            <IconButton
                                icon="pencil"
                                iconColor="#FFFFFF"
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: insets.top + 12,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    borderRadius: 20,
                                    margin: 0
                                }}
                                onPress={() => setIsEditModalVisible(true)}
                            />
                        )}

                        <View style={[styles.heroContent, { paddingBottom: 24 }]}>
                            {/* Owner info - user image + created-by row; both open profile */}
                            {(() => {
                                const openCreatorProfile = () => {
                                    const uid = (spec as any).user_id;
                                    if (uid === user?.id) {
                                        navigation.navigate('Profile');
                                    } else {
                                        navigation.navigate('ProfileViewer', { userId: Number(uid) });
                                    }
                                };
                                return (
                                    <View style={styles.ownerInfoMinimal}>
                                        <TouchableOpacity
                                            onPress={openCreatorProfile}
                                            style={styles.ownerAvatarWrap}
                                            activeOpacity={0.7}
                                            hitSlop={12}
                                        >
                                            <Avatar.Image size={40} source={{ uri: ownerAvatar }} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={openCreatorProfile}
                                            style={styles.ownerTextWrap}
                                            activeOpacity={0.7}
                                            hitSlop={8}
                                        >
                                            <View style={styles.ownerInfoText}>
                                                <Text style={styles.ownerLabel}>Created by</Text>
                                                <Text style={styles.ownerNameMinimal} numberOfLines={1}>
                                                    {ownerName}
                                                </Text>
                                            </View>
                                            <MaterialCommunityIcons
                                                name="chevron-right"
                                                size={20}
                                                color="rgba(255,255,255,0.7)"
                                                style={styles.ownerChevron}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })()}

                            {/* Title - prominent */}
                            <Text style={styles.heroTitle}>{spec.title}</Text>

                            {/* Status Badges */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                {spec?.status === 'CLOSED' && (
                                    <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>CLOSED</Text>
                                    </View>
                                )}
                                {spec?.status === 'REVIEWING' && (
                                    <View style={{ backgroundColor: '#EAB308', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold' }}>REVIEWING</Text>
                                    </View>
                                )}
                            </View>

                            {/* Meta info - clean and minimal */}
                            {headerLine ? (
                                <View style={styles.heroMetaRow}>
                                    <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.85)" />
                                    <Text style={styles.heroMetaText} numberOfLines={1}>
                                        {headerLine}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </ImageBackground>
                </View>

                {/* Host First/New Round Action */}
                {isOwner && (!spec.rounds || !spec.rounds.some((r: any) => r.status === 'ACTIVE' || r.status === 'REVIEWING')) && (
                    <View style={styles.section}>
                        <Surface style={[styles.glassCard, { backgroundColor: theme.colors.elevation.level2, padding: 16 }]} elevation={2}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.primary }}>Start New Round</Text>
                            <TextInput
                                mode="outlined"
                                placeholder="e.g. What's your hidden talent?"
                                value={newRoundQuestion}
                                onChangeText={setNewRoundQuestion}
                                selection={newRoundQuestionSelection}
                                onSelectionChange={(event) => setNewRoundQuestionSelection(event.nativeEvent.selection)}
                                multiline
                                numberOfLines={4}
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    marginBottom: 12,
                                    minHeight: 100, // Make it look like a textarea
                                    textAlignVertical: 'top', // Ensure text starts at top
                                }}
                            />
                            {roundQuestionMedia && (
                                <View style={[styles.questionMediaPreview, { borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                                    {isRoundMediaReviewing(roundQuestionMedia) ? (
                                        <Chip compact icon="clock-outline" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                                            Reviewing video
                                        </Chip>
                                    ) : null}
                                    {roundQuestionMedia.assetType === 'image' ? (
                                        <Image source={{ uri: roundQuestionMedia.uri }} style={styles.questionMediaImage} />
                                    ) : roundQuestionMedia.assetType === 'video' ? (
                                        <VideoThumbnailPlayer
                                            uri={roundQuestionMedia.uri}
                                            width={160}
                                            height={100}
                                            onPress={() => {
                                                setQuestionVideoViewerUri(roundQuestionMedia.uri);
                                                setQuestionVideoViewerVisible(true);
                                            }}
                                        />
                                    ) : (
                                        <AudioMessagePlayer uri={roundQuestionMedia.uri} label="Audio question" compact />
                                    )}
                                    <Button mode="text" compact onPress={() => setRoundQuestionMedia(null)}>
                                        Remove
                                    </Button>
                                </View>
                            )}
                            <RoundMediaActions
                                onOpenFile={() => setRoundQuestionMediaSheet('file')}
                                onOpenCamera={() => setRoundQuestionMediaSheet('camera')}
                                onEmojiSelected={handleNewRoundQuestionEmoji}
                                onToggleVoice={questionAudioRecorder.isRecording ? questionAudioRecorder.stopRecording : questionAudioRecorder.startRecording}
                                isRecording={questionAudioRecorder.isRecording}
                                durationMillis={questionAudioRecorder.durationMillis}
                                disabled={startRoundMutation.isPending}
                            />
                            <Button
                                mode="contained"
                                onPress={handleStartRoundPress}
                                loading={startRoundMutation.isPending}
                                disabled={(!newRoundQuestion.trim() && !roundQuestionMedia) || startRoundMutation.isPending || acceptedParticipantCount < 1}
                            >
                                Start Round {acceptedParticipantCount < 1 ? '(Need accepted users)' : ''}
                            </Button>
                        </Surface>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => likeMutation.mutate()} activeOpacity={0.9}>
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
                        <TouchableOpacity onPress={() => openReportSheet('spec', Number(spec.id), 'spec')} activeOpacity={0.9}>
                            <Surface style={[styles.actionPill, { backgroundColor: theme.colors.elevation.level2 }]} elevation={0}>
                                <MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.error} />
                                <Text style={[styles.actionPillText, { color: theme.colors.error }]}>Report</Text>
                            </Surface>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>About this Spec</Text>
                    <Text style={[styles.sectionBody, { color: theme.colors.onSurface, opacity: 0.8 }]}>
                        {spec.description || 'No description provided.'}
                    </Text>
                </View>




                {/* ROUNDS LIST – flat vertical list, minimal cards */}
                {spec.rounds && spec.rounds.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Rounds</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>{spec.rounds.length} round{spec.rounds.length !== 1 ? 's' : ''}</Text>
                        </View>
                        <View style={styles.roundsFlatList}>
                            {spec.rounds.map((r: any) => {
                                const answers = r.answers || [];
                                const eliminated = answers.filter((a: any) => a.is_eliminated).length;
                                const remaining = answers.length - eliminated;
                                const statusColor = r.status === 'ACTIVE' ? '#16a34a' : r.status === 'REVIEWING' ? '#ca8a04' : theme.colors.outline;
                                const hasAudioQuestion = isAudioMedia(r.media);
                                const hasVideoQuestion = isVideoMedia(r.media);
                                return (
                                    <TouchableOpacity
                                        key={r.id}
                                        activeOpacity={canOpenRoundDetails ? 0.7 : 1}
                                        disabled={!canOpenRoundDetails}
                                        onPress={() => {
                                            if (!canOpenRoundDetails) return;
                                            navigation.navigate('RoundDetails', { specId: spec.id, roundId: r.id });
                                        }}
                                        style={[
                                            styles.roundCardFlat,
                                            {
                                                backgroundColor: theme.colors.surface,
                                                borderColor: theme.colors.outlineVariant || theme.colors.outline + '40',
                                                opacity: canOpenRoundDetails ? 1 : 0.78,
                                            },
                                        ]}
                                    >
                                        <View style={[styles.roundCardFlatNum, { backgroundColor: theme.colors.surfaceVariant }]}>
                                            <Text style={[styles.roundCardFlatNumText, { color: theme.colors.onSurface }]}>{r.round_number}</Text>
                                        </View>
                                        <View style={styles.roundCardFlatBody}>
                                            <Text numberOfLines={2} style={[styles.roundCardFlatQuestion, { color: theme.colors.onSurface }]}>
                                                {r.question_text?.trim() || 'Voice question'}
                                            </Text>
                                            {(hasAudioQuestion || hasVideoQuestion) && (
                                                <View
                                                    style={[
                                                        styles.roundCardMediaType,
                                                        {
                                                            backgroundColor: hasAudioQuestion ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                                                        },
                                                    ]}
                                                >
                                                    <MaterialCommunityIcons
                                                        name={hasAudioQuestion ? 'waveform' : 'video-outline'}
                                                        size={15}
                                                        color={hasAudioQuestion ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.roundCardMediaTypeText,
                                                            { color: hasAudioQuestion ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant },
                                                        ]}
                                                    >
                                                        {hasAudioQuestion ? 'Audio question' : 'Video question'}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.roundCardFlatMeta}>
                                                <Text style={[styles.roundCardFlatStat, { color: theme.colors.onSurfaceVariant }]}>
                                                    {eliminated} out · {remaining} left
                                                </Text>
                                                <View style={[styles.roundCardFlatPill, { backgroundColor: r.status === 'ACTIVE' ? 'rgba(22,163,74,0.12)' : r.status === 'REVIEWING' ? 'rgba(202,138,4,0.12)' : theme.colors.surfaceVariant }]}>
                                                    <View style={[styles.roundCardFlatPillDot, { backgroundColor: statusColor }]} />
                                                    <Text style={[styles.roundCardFlatPillText, { color: theme.colors.onSurface }]}>{r.status}</Text>
                                                </View>
                                                {!canOpenRoundDetails ? (
                                                    <Text style={[styles.roundCardFlatStat, { color: theme.colors.onSurfaceVariant }]}>
                                                        Host/participant only
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        <MaterialCommunityIcons
                                            name={canOpenRoundDetails ? 'chevron-right' : 'lock-outline'}
                                            size={22}
                                            color={theme.colors.onSurfaceVariant}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}



                {/* Requirements */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Requirements</Text>
                        <Chip compact style={{ backgroundColor: theme.colors.elevation.level2 }}>
                            {requirements.length} set
                        </Chip>
                    </View>

                    {requirements.length === 0 ? (
                        <Text style={{ color: theme.colors.onSurface, opacity: 0.65 }}>No requirements set.</Text>
                    ) : (
                        <View style={styles.reqGrid}>
                            {requirements.map((r: any) => (
                                <Surface
                                    key={r.id}
                                    style={[
                                        styles.reqCard,
                                        {
                                            width: r.isLong ? '100%' : '48%',
                                            borderColor: r.isCompulsory ? theme.colors.primary : theme.colors.outline,
                                            backgroundColor: theme.colors.surface,
                                        },
                                    ]}
                                    elevation={0}
                                >
                                    <View style={styles.reqCardTop}>
                                        <View style={[styles.reqIconCircle, { backgroundColor: theme.colors.elevation.level2 }]}>
                                            <MaterialCommunityIcons
                                                name={requirementIcon(r.field) as any}
                                                size={18}
                                                color={r.isCompulsory ? theme.colors.primary : theme.colors.onSurface}
                                            />
                                        </View>
                                        <Chip
                                            compact
                                            style={{
                                                backgroundColor: r.isCompulsory
                                                    ? theme.colors.primary
                                                    : theme.colors.elevation.level2,
                                            }}
                                            textStyle={{
                                                color: r.isCompulsory ? theme.colors.onPrimary : theme.colors.onSurface,
                                                fontWeight: '900',
                                                fontSize: 11,
                                            }}
                                        >
                                            {r.isCompulsory ? 'Strict' : 'Flexible'}
                                        </Chip>
                                    </View>

                                    <Text style={[styles.reqField, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                        {r.fieldLabel}
                                    </Text>
                                    {(r.kind === 'chips' && Array.isArray(r.valueParts) && r.valueParts.length > 0) ? (
                                        <View style={styles.reqValueStack}>
                                            <Text style={[styles.reqOp, { color: theme.colors.onSurface, opacity: 0.72 }]}>
                                                One of
                                            </Text>
                                            <View style={styles.reqPillsRow}>
                                                {r.valueParts.map((v: string) => (
                                                    <Chip
                                                        key={v}
                                                        compact
                                                        style={{ backgroundColor: theme.colors.elevation.level2 }}
                                                        textStyle={{ fontSize: 11, fontWeight: '800', color: theme.colors.onSurface }}
                                                    >
                                                        {v}
                                                    </Chip>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={[styles.reqValue, { color: theme.colors.onSurface, opacity: 0.82 }]}>
                                            {r.valueText}
                                        </Text>
                                    )}
                                </Surface>
                            ))}
                        </View>
                    )}
                </View>

                {/* Participants */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                            Participants ({participants.length})
                        </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsRow}>
                        {participants.length === 0 ? (
                            <Text style={{ color: theme.colors.onSurface, opacity: 0.65 }}>No participants yet.</Text>
                        ) : (
                            participants.map((p: any) => {
                                const eliminated = p.status === 'ELIMINATED';
                                const displayName = p.user?.profile?.full_name || p.user?.name || 'User';
                                const avatarUri =
                                    toImageUri(p.user?.profile?.avatar) ||
                                    `https://picsum.photos/seed/specdate-user-${p.user_id || p.id}/200/200`;

                                const participantUserId = p.user_id ?? p.user?.id;
                                const openParticipantProfile = () => {
                                    if (!participantUserId) return;
                                    if (participantUserId === user?.id) {
                                        navigation.navigate('Profile');
                                    } else {
                                        navigation.navigate('ProfileViewer', { userId: Number(participantUserId) });
                                    }
                                };
                                const handleLongPress = () => {
                                    if (isOwner && !eliminated) {
                                        Alert.alert(
                                            'Eliminate participant?',
                                            `Remove ${displayName} from this spec?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Eliminate', style: 'destructive', onPress: () => eliminateMutation.mutate(p.id) },
                                            ]
                                        );
                                    }
                                };

                                return (
                                    <View key={p.id} style={[styles.participantCard, eliminated && { opacity: 0.5 }]}>
                                        <TouchableOpacity
                                            onPress={openParticipantProfile}
                                            onLongPress={handleLongPress}
                                            activeOpacity={0.8}
                                            hitSlop={8}
                                        >
                                            <View style={[styles.avatarRing, { borderColor: eliminated ? '#EF4444' : theme.colors.primary }]}>
                                                <Avatar.Image size={56} source={{ uri: avatarUri }} />
                                                {eliminated ? (
                                                    <View style={[styles.eliminatedDot, { backgroundColor: '#EF4444' }]}>
                                                        <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                                                    </View>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>

                                        <Text style={[styles.participantName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                            {displayName.split(' ')[0]}
                                        </Text>
                                        {p.status === 'ELIMINATED' ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                <MaterialCommunityIcons name="account-off" size={18} color={theme.colors.onSurfaceVariant} />
                                                <Text style={[styles.participantStatus, { color: theme.colors.onSurfaceVariant, opacity: 1 }]}>Eliminated</Text>
                                            </View>
                                        ) : (
                                            <Text style={[styles.participantStatus, { color: theme.colors.onSurface, opacity: 0.65 }]} numberOfLines={1}>
                                                {p.status}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* Footer CTA */}
            <Surface style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: theme.colors.surface }]} elevation={3}>
                {isOwner ? (
                    <Button
                        mode="contained"
                        disabled
                        style={[styles.footerBtn, { backgroundColor: theme.colors.elevation.level2 }]}
                        textColor={theme.colors.onSurface}
                        labelStyle={{ fontSize: 16, fontWeight: '800' }}
                        icon="crown"
                    >
                        You are the Host
                    </Button>
                ) : myApplication ? (
                    <Button
                        mode="outlined"
                        disabled
                        style={[styles.footerBtn, { borderColor: theme.colors.outlineVariant }]}
                        textColor={theme.colors.onSurfaceVariant}
                        labelStyle={{ fontSize: 16, fontWeight: '600' }}
                        icon="check-circle"
                    >
                        {myApplication.status === 'ACCEPTED' ? 'Joined' : 'Applied'}
                    </Button>
                ) : (spec.expires_at && new Date(spec.expires_at) <= new Date()) ? (
                    <Button
                        mode="contained"
                        disabled
                        style={[styles.footerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                        textColor={theme.colors.onSurfaceVariant}
                        labelStyle={{ fontSize: 16, fontWeight: '800' }}
                    >
                        Applications Closed
                    </Button>
                ) : spec.status !== 'OPEN' ? (
                    <Button
                        mode="contained"
                        disabled
                        style={[styles.footerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                        textColor={theme.colors.onSurfaceVariant}
                        labelStyle={{ fontSize: 16, fontWeight: '800' }}
                    >
                        Quest Started
                    </Button>
                ) : (
                    <Button
                        mode="contained"
                        onPress={handleJoin}
                        loading={joinMutation.isPending}
                        style={styles.footerBtn}
                        buttonColor={theme.colors.primary}
                        labelStyle={{ fontSize: 16, fontWeight: '800' }}
                    >
                        Join Spec for Free
                    </Button>
                )}
            </Surface>

            <EditSpecModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                spec={spec}
            />

            <LastManStandingModal
                visible={lastManStandingVisible}
                onDismiss={() => { setLastManStandingVisible(false); setLastManStandingSpecId(null); setLastManStandingWinnerName(''); }}
                winnerName={lastManStandingWinnerName}
                specId={lastManStandingSpecId ?? ''}
                onMatchAndDate={() => lastManStandingSpecId && createDateMutation.mutate(lastManStandingSpecId)}
                onExtendSearch={(comment) => lastManStandingSpecId && extendSearchMutation.mutate({ specIdToUse: lastManStandingSpecId, comment })}
                availableCredits={user?.balance?.credits ?? 0}
                matchLoading={createDateMutation.isPending}
                extendLoading={extendSearchMutation.isPending}
            />

            <VideoViewerModal
                visible={questionVideoViewerVisible}
                uri={questionVideoViewerUri}
                onClose={() => { setQuestionVideoViewerVisible(false); setQuestionVideoViewerUri(null); }}
            />

            <MediaPickerSheet
                visible={roundQuestionMediaSheet !== null}
                title={roundQuestionMediaSheet === 'camera' ? 'Use camera' : 'Share media'}
                onDismiss={() => setRoundQuestionMediaSheet(null)}
                options={
                    roundQuestionMediaSheet === 'camera'
                        ? [
                            { icon: 'camera-outline', label: 'Take photo', helper: 'Capture a new picture now', onPress: takeRoundQuestionPhoto },
                            { icon: 'video-plus-outline', label: 'Record video', helper: 'Record a short live clip', onPress: recordRoundQuestionVideo },
                        ]
                        : [
                            { icon: 'image-outline', label: 'Choose image', helper: 'Share a photo from your files', onPress: () => pickRoundQuestionMedia('image') },
                            { icon: 'file-video-outline', label: 'Choose video', helper: 'Share a saved video clip', onPress: () => pickRoundQuestionMedia('video') },
                        ]
                }
            />

            <ChatSafetySheet
                visible={!!reportSheet}
                mode={reportSheet?.mode ?? 'report'}
                title={reportSheet?.mode === 'report' ? `Report ${reportSheet.label}?` : reportSheet?.title ?? ''}
                subtitle={
                    reportSheet?.mode === 'report'
                        ? 'Choose the reason. Our moderation team will review it.'
                        : reportSheet?.subtitle
                }
                loading={reportLoading}
                error={reportError}
                onDismiss={closeReportSheet}
                onSubmitReport={submitReport}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    heroWrap: { height: 380 },
    hero: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    backButton: {
        position: 'absolute',
        left: 16,
        top: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        marginTop: 0,
    },
    heroContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 16,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        marginTop: 4,
    },
    heroMetaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },

    ownerInfoMinimal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingRight: 4,
    },
    ownerAvatarWrap: {
        padding: 4,
    },
    ownerTextWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
    },
    ownerInfoText: {
        gap: 2,
        flex: 1,
        minWidth: 0,
    },
    ownerLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ownerNameMinimal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        maxWidth: 200,
    },
    ownerChevron: {
        marginLeft: 'auto',
        opacity: 0.7,
    },

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

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    sectionSubtitle: { fontSize: 13 },
    sectionBody: { fontSize: 14, lineHeight: 21 },

    reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    reqCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        gap: 6,
    },
    reqCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reqIconCircle: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    reqField: { fontSize: 12, fontWeight: '900' },
    reqValue: { fontSize: 11, fontWeight: '700' },
    reqValueStack: { gap: 8 },
    reqOp: { fontSize: 11, fontWeight: '800' },
    reqPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

    participantsRow: { paddingVertical: 8, paddingRight: 16, gap: 14, alignItems: 'flex-start' },
    participantCard: { width: 72, alignItems: 'center', gap: 6 },
    avatarRing: {
        borderWidth: 2,
        borderRadius: 999,
        padding: 2,
    },
    eliminatedDot: { position: 'absolute', right: -2, bottom: -2, borderRadius: 999, padding: 2 },
    participantName: { fontSize: 12, fontWeight: '900' },
    participantStatus: { fontSize: 10, fontWeight: '700' },

    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
    },
    footerBtn: { borderRadius: 999, paddingVertical: 6 },

    // Glass round card – frosted, minimal, sophisticated
    glassCard: {
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 4,
    },
    glassCardInner: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 14,
    },
    glassHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    glassHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    glassLabel: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    glassSubtext: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.88,
        paddingHorizontal: 12,
    },
    glassQuestion: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 24,
        paddingHorizontal: 12,
    },
    glassDivider: {
        height: 1,
        opacity: 0.4,
        marginHorizontal: 12,
    },
    glassChipText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPillAnswered: {
        backgroundColor: 'rgba(5,150,105,0.12)',
    },
    statusPillAction: {
        backgroundColor: 'rgba(217,119,6,0.1)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusDotAnswered: {
        backgroundColor: '#059669',
    },
    statusDotAction: {
        backgroundColor: '#D97706',
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.35,
    },
    glassInput: {
        marginBottom: 4,
    },
    glassTextArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    glassBtn: {
        borderRadius: 14,
    },
    glassForm: {
        gap: 12,
        marginTop: 4,
    },
    questionMediaPreview: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        gap: 6,
    },
    questionMediaImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
    glassAnswerBox: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        marginTop: 6,
        backgroundColor: 'rgba(5,150,105,0.14)',
    },
    glassAnswerText: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 26,
    },
    ownerAnswersList: {
        gap: 10,
    },
    ownerAnswersTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginBottom: 4,
        paddingHorizontal: 12,
    },
    ownerAnswerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    ownerAnswerAvatar: {},
    ownerAnswerBody: { flex: 1, minWidth: 0 },
    ownerAnswerName: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    ownerAnswerText: {
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.9,
    },
    roundsFlatList: { gap: 10 },
    roundCardFlat: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 14,
    },
    roundCardFlatNum: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roundCardFlatNumText: { fontSize: 15, fontWeight: '800' },
    roundCardFlatBody: { flex: 1, minWidth: 0 },
    roundCardFlatQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
    roundCardMediaType: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    roundCardMediaTypeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    roundCardFlatMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 },
    roundCardFlatStat: { fontSize: 12 },
    roundCardFlatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    roundCardFlatPillDot: { width: 6, height: 6, borderRadius: 3 },
    roundCardFlatPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
