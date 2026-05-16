import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { confirmMediaShareWithAiScan } from '../../utils/confirmMediaShareWithAiScan';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { useUser } from '../../hooks/useUser';
import { insertEmojiAtSelection, type TextSelection } from '../../utils/emojiText';
import { MediaPickerSheet, UploadProgressModal, VideoViewerModal, type UploadProgressState } from '../../components';
import { EditSpecModal } from './components/EditSpecModal';
import { LastManStandingModal, SpecActionsRow, SpecFooterActions, SpecHero, SpecParticipantsList, SpecRequirementsList, SpecRoundComposer, SpecRoundsList, useRoundAudioRecorder } from './components';
import type { RoundMediaAsset } from './components';
import { useSpecDetailsMutations } from './hooks/useSpecDetailsMutations';
import { useSpecDetailsQuery } from './hooks/useSpecDetailsQuery';
import { useSpecDetailsState } from './hooks/useSpecDetailsState';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';

type ReportSheetState =
    | null
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'success'; title: string; subtitle: string };


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

    const {
        acceptedParticipantCount,
        canOpenRoundDetails,
        headerLine,
        isFirstRound,
        isOwner,
        isSpecClosed,
        myApplication,
        ownerAvatar,
        ownerName,
        participants,
        requirements,
        specStatus,
        specTone,
    } = useSpecDetailsState({ spec, user });

    // --- OWNER ACTIONS ---
    const [newRoundQuestion, setNewRoundQuestion] = React.useState('');
    const [newRoundQuestionSelection, setNewRoundQuestionSelection] = React.useState<TextSelection>({ start: 0, end: 0 });
    const [roundQuestionMedia, setRoundQuestionMedia] = React.useState<RoundMediaAsset | null>(null);
    const [roundQuestionMediaSheet, setRoundQuestionMediaSheet] = React.useState<'file' | 'camera' | null>(null);
    const [questionVideoViewerVisible, setQuestionVideoViewerVisible] = React.useState(false);
    const [questionVideoViewerUri, setQuestionVideoViewerUri] = React.useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState<UploadProgressState>(null);
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
        setUploadProgress,
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

    const openParticipantProfile = React.useCallback((participantUserId: string | number) => {
        if (String(participantUserId) === String(user?.id)) {
            navigation.navigate('Profile');
        } else {
            navigation.navigate('ProfileViewer', { userId: Number(participantUserId) });
        }
    }, [navigation, user?.id]);

    const confirmEliminateParticipant = React.useCallback((participantId: string | number, displayName: string) => {
        Alert.alert(
            'Eliminate participant?',
            `Remove ${displayName} from this spec?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Eliminate', style: 'destructive', onPress: () => eliminateMutation.mutate(String(participantId)) },
            ]
        );
    }, [eliminateMutation]);

    const openCreatorProfile = React.useCallback(() => {
        const uid = (spec as any)?.user_id;
        if (!uid) return;
        if (String(uid) === String(user?.id)) {
            navigation.navigate('Profile');
        } else {
            navigation.navigate('ProfileViewer', { userId: Number(uid) });
        }
    }, [navigation, spec, user?.id]);

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

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Hero */}
                <SpecHero
                    canEdit={isOwner && specStatus === 'OPEN'}
                    headerLine={headerLine}
                    insetsTop={insets.top}
                    onBack={() => navigation.goBack()}
                    onEdit={() => setIsEditModalVisible(true)}
                    onOpenCreatorProfile={openCreatorProfile}
                    ownerAvatar={ownerAvatar}
                    ownerName={ownerName}
                    specStatus={specStatus}
                    specTitle={spec.title}
                    specTone={specTone}
                />

                {/* Host First/New Round Action */}
                <SpecRoundComposer
                    acceptedParticipantCount={acceptedParticipantCount}
                    canStartRound={isOwner && !isSpecClosed && (!spec.rounds || !spec.rounds.some((r: any) => r.status === 'ACTIVE' || r.status === 'REVIEWING'))}
                    durationMillis={questionAudioRecorder.durationMillis}
                    isRecording={questionAudioRecorder.isRecording}
                    isSubmitting={startRoundMutation.isPending}
                    media={roundQuestionMedia}
                    onChangeQuestion={setNewRoundQuestion}
                    onEmojiSelected={handleNewRoundQuestionEmoji}
                    onOpenCamera={() => setRoundQuestionMediaSheet('camera')}
                    onOpenFile={() => setRoundQuestionMediaSheet('file')}
                    onPreviewVideo={(uri) => {
                        setQuestionVideoViewerUri(uri);
                        setQuestionVideoViewerVisible(true);
                    }}
                    onRemoveMedia={() => setRoundQuestionMedia(null)}
                    onSelectionChange={setNewRoundQuestionSelection}
                    onStartRound={handleStartRoundPress}
                    onToggleVoice={questionAudioRecorder.isRecording ? questionAudioRecorder.stopRecording : questionAudioRecorder.startRecording}
                    question={newRoundQuestion}
                    selection={newRoundQuestionSelection}
                    theme={theme}
                />

                {/* Actions */}
                <SpecActionsRow
                    isOwner={isOwner}
                    onLike={() => likeMutation.mutate()}
                    onReport={() => openReportSheet('spec', Number(spec.id), 'spec')}
                    onShare={onShare}
                    spec={spec}
                    theme={theme}
                />

                {/* About */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>About this Spec</Text>
                    <Text style={[styles.sectionBody, { color: theme.colors.onSurface, opacity: 0.8 }]}>
                        {spec.description || 'No description provided.'}
                    </Text>
                </View>




                {/* Rounds */}
                <SpecRoundsList
                    canOpenRoundDetails={canOpenRoundDetails}
                    isSpecClosed={isSpecClosed}
                    onOpenRound={(roundId) => navigation.navigate('RoundDetails', { specId: spec.id, roundId })}
                    rounds={spec.rounds}
                    theme={theme}
                />
                {/* Requirements */}
                <SpecRequirementsList requirements={requirements} theme={theme} />

                {/* Participants */}
                <SpecParticipantsList
                    isOwner={isOwner}
                    onEliminateParticipant={confirmEliminateParticipant}
                    onOpenParticipantProfile={openParticipantProfile}
                    participants={participants}
                    theme={theme}
                />
            </ScrollView>

            {/* Footer CTA */}
            <SpecFooterActions
                bottomInset={insets.bottom}
                isOwner={isOwner}
                isSpecClosed={isSpecClosed}
                joinLoading={joinMutation.isPending}
                myApplication={myApplication}
                onJoin={handleJoin}
                spec={spec}
                specStatus={specStatus}
                theme={theme}
            />

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
            <UploadProgressModal progress={uploadProgress} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    sectionBody: { fontSize: 14, lineHeight: 21 },

    // Glass round card – frosted, minimal, sophisticated
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
});
