import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { insertEmojiAtSelection, type TextSelection } from '../../utils/emojiText';
import { MediaPickerSheet, UploadProgressModal, VideoViewerModal, type UploadProgressState } from '../../components';
import { CloseRoundModal, LastManStandingModal, PrivateRoundState, RoundHeader, RoundOwnerControls, RoundParticipantAnswerSection, RoundQuestionCard, RoundResponsesList, useRoundAudioRecorder } from './components';
import type { RoundMediaAsset } from './components';
import { confirmMediaShareWithAiScan } from '../../utils/confirmMediaShareWithAiScan';
import { useRoundDetailsState } from './hooks/useRoundDetailsState';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';
import { styles } from './roundDetailsStyles';
import { useRoundMediaPicker } from './hooks/useRoundMediaPicker';
import { useLastManStandingActions } from './hooks/useLastManStandingActions';
import { useRoundDetailsMutations } from './hooks/useRoundDetailsMutations';
import { useRoundOwnerFlow } from './hooks/useRoundOwnerFlow';
import { useSpecReportSheet } from './hooks/useSpecReportSheet';

type RoundMediaSheetState = null | {
    target: 'answer' | 'next_question';
    source: 'file' | 'camera';
};

export default function RoundDetailsScreen({ route, navigation }: any) {
    const specId = route.params?.specId != null ? String(route.params.specId) : undefined;
    const roundId = route.params?.roundId != null ? route.params.roundId : undefined;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const lastRoundRef = useRef<any>(null);

    // Fetch Spec (which includes rounds). Keep previous data during refetch so UI doesn't disappear (e.g. after elimination).
    const { data: spec, isLoading, isFetching, error, refetch: refetchSpec } = useQuery({
        queryKey: ['spec', specId, 'round_details'],
        queryFn: () => SpecService.getOne(specId!),
        enabled: !!specId,
        staleTime: 0,
        gcTime: 60 * 1000,
        refetchOnMount: 'always',
        placeholderData: (previousData) => previousData,
    });

    // Refetch when screen gains focus (no reset – reset was clearing cache and making data disappear after elimination alert)
    useFocusEffect(
        useCallback(() => {
            if (specId) {
                queryClient.refetchQueries({ queryKey: ['spec', String(specId), 'round_details'] });
            }
        }, [specId, queryClient])
    );

    // Real-time: RoundAnswered and RoundStarted (e.g. owner starts next round)
    React.useEffect(() => {
        if (!specId) return;
        const { echo } = require('../../utils/echo');
        const channel = echo.channel(`spec.${specId}`);

        channel.listen('.RoundAnswered', () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
        });
        channel.listen('.RoundStarted', () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
        });

        return () => {
            channel.stopListening('.RoundAnswered');
            channel.stopListening('.RoundStarted');
            echo.leave(`spec.${specId}`);
        };
    }, [specId, queryClient]);


    const {
        answers,
        canViewRoundDetails,
        isOwner,
        myAnswer,
        myApplication,
        roundDisplayStatus,
        roundToShow,
        unresponsiveParticipants,
    } = useRoundDetailsState({ lastRoundRef, roundId, spec, user });

    // --- State ---
    const [answerText, setAnswerText] = useState('');
    const [answerSelection, setAnswerSelection] = useState<TextSelection>({ start: 0, end: 0 });
    const [answerMedia, setAnswerMedia] = useState<RoundMediaAsset | null>(null);
    const [nextRoundQuestion, setNextRoundQuestion] = useState('');
    const [nextRoundQuestionSelection, setNextRoundQuestionSelection] = useState<TextSelection>({ start: 0, end: 0 });
    const [nextRoundQuestionMedia, setNextRoundQuestionMedia] = useState<RoundMediaAsset | null>(null);
    const [roundMediaSheet, setRoundMediaSheet] = useState<RoundMediaSheetState>(null);
    const [closeModalVisible, setCloseRoundModalVisible] = useState(false);
    const [videoViewerVisible, setVideoViewerVisible] = useState(false);
    const [videoViewerUri, setVideoViewerUri] = useState<string | null>(null);
    const [lastManStandingVisible, setLastManStandingVisible] = useState(false);
    const [lastManStandingWinnerName, setLastManStandingWinnerName] = useState('');
    const [lastManStandingSpecId, setLastManStandingSpecId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressState>(null);
    const {
        closeReportSheet,
        openAnswerReportMenu,
        openReportSheet,
        reportError,
        reportLoading,
        reportSheet,
        submitReport,
    } = useSpecReportSheet();

    // Edit Question State
    const [isEditing, setIsEditing] = useState(false);
    const [editQuestionText, setEditQuestionText] = useState('');

    const answerAudioRecorder = useRoundAudioRecorder(setAnswerMedia);
    const nextRoundAudioRecorder = useRoundAudioRecorder(setNextRoundQuestionMedia);

    const handleAnswerEmoji = useCallback((emoji: string) => {
        const next = insertEmojiAtSelection(answerText, emoji, answerSelection);
        setAnswerText(next.value);
        setAnswerSelection(next.selection);
    }, [answerText, answerSelection]);

    const handleNextRoundQuestionEmoji = useCallback((emoji: string) => {
        const next = insertEmojiAtSelection(nextRoundQuestion, emoji, nextRoundQuestionSelection);
        setNextRoundQuestion(next.value);
        setNextRoundQuestionSelection(next.selection);
    }, [nextRoundQuestion, nextRoundQuestionSelection]);

    const setSelectedRoundMedia = useCallback((target: string, asset: RoundMediaAsset) => {
        if (target === 'answer') {
            setAnswerMedia(asset);
        } else {
            setNextRoundQuestionMedia(asset);
        }
    }, []);
    const { pickFromLibrary, takePhoto, recordVideo } = useRoundMediaPicker({
        onMediaSelected: setSelectedRoundMedia,
    });

    const {
        createDateMutation,
        extendSearchMutation,
        openLastManStandingFromPayload,
    } = useLastManStandingActions({
        specId,
        refetchSpec,
        setLastManStandingVisible,
        setLastManStandingWinnerName,
        setLastManStandingSpecId,
    });

    const {
        closeRoundMutation,
        eliminateUserMutation,
        eliminateUsersMutation,
        nudgeUsersMutation,
        startRoundMutation,
        submitAnswerMutation,
        updateRoundMutation,
    } = useRoundDetailsMutations({
        answerMedia,
        navigation,
        nextRoundQuestionMedia,
        openLastManStandingFromPayload,
        refetchSpec,
        setAnswerMedia,
        setAnswerSelection,
        setAnswerText,
        setIsEditing,
        setNextRoundQuestion,
        setNextRoundQuestionMedia,
        setNextRoundQuestionSelection,
        setUploadProgress,
        specId,
    });

    const {
        handleCloseRoundPress,
        handleEliminateAndClose,
        handleNudge,
    } = useRoundOwnerFlow({
        closeRoundMutation,
        eliminateUsersMutation,
        nudgeUsersMutation,
        roundToShow,
        setCloseRoundModalVisible,
        unresponsiveParticipants,
    });

    // --- Render Helpers ---

    if (!specId || roundId == null) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ color: theme.colors.error, marginBottom: 16 }}>Invalid navigation: missing spec or round.</Text>
                <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ color: theme.colors.error, marginBottom: 16 }}>Failed to load round details.</Text>
                <Button mode="contained" onPress={() => refetchSpec()}>Retry</Button>
            </View>
        );
    }

    // Spinner until spec is loaded (e.g. from notification or Spec Details)
    if (!spec) {
        lastRoundRef.current = null;
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 20, color: theme.colors.outline }}>Loading round details...</Text>
            </View>
        );
    }

    // Resolve round from fresh data first, falling back only while a refetch is between states.


    if (roundToShow && !canViewRoundDetails) {
        return (
            <PrivateRoundState
                theme={theme}
                topInset={insets.top}
                onBack={() => navigation.goBack()}
            />
        );
    }

    if (!roundToShow) {
        if (isFetching) {
            return (
                <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 20, color: theme.colors.outline }}>Updating...</Text>
                </View>
            );
        }
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Round not found.</Text>
                <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
            </View>
        );
    }

    const statusColor = roundDisplayStatus === 'ACTIVE' ? '#16a34a' : roundDisplayStatus === 'REVIEWING' ? '#ca8a04' : theme.colors.outline;
    const hasEliminatedAnswer = answers.some((answer: any) => answer.is_eliminated);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header – flat, high contrast */}
            <RoundHeader
                onBack={() => navigation.goBack()}
                roundNumber={roundToShow.round_number}
                status={roundDisplayStatus}
                statusColor={statusColor}
                theme={theme}
                topInset={insets.top}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <RoundQuestionCard
                    round={roundToShow}
                    answersCount={answers.length}
                    theme={theme}
                    isOwner={isOwner}
                    isEditing={isEditing}
                    editQuestionText={editQuestionText}
                    updatePending={updateRoundMutation.isPending}
                    onStartEditing={() => {
                        setEditQuestionText(roundToShow.question_text);
                        setIsEditing(true);
                    }}
                    onCancelEditing={() => setIsEditing(false)}
                    onChangeEditQuestionText={setEditQuestionText}
                    onSaveEdit={() => updateRoundMutation.mutate({ rId: roundToShow.id, text: editQuestionText })}
                    onOpenVideo={(uri) => {
                        setVideoViewerUri(uri);
                        setVideoViewerVisible(true);
                    }}
                />

                <RoundOwnerControls
                    closePending={closeRoundMutation.isPending}
                    durationMillis={nextRoundAudioRecorder.durationMillis}
                    isOwner={isOwner}
                    isRecording={nextRoundAudioRecorder.isRecording}
                    media={nextRoundQuestionMedia}
                    canStartNextRound={roundDisplayStatus !== 'REVIEWING' || hasEliminatedAnswer}
                    onChangeQuestion={setNextRoundQuestion}
                    onCloseRound={handleCloseRoundPress}
                    onEmojiSelected={handleNextRoundQuestionEmoji}
                    onNudgePending={handleNudge}
                    onOpenCamera={() => setRoundMediaSheet({ target: 'next_question', source: 'camera' })}
                    onOpenFile={() => setRoundMediaSheet({ target: 'next_question', source: 'file' })}
                    onPreviewVideo={(uri) => {
                        setVideoViewerUri(uri);
                        setVideoViewerVisible(true);
                    }}
                    onRemoveMedia={() => setNextRoundQuestionMedia(null)}
                    onSelectionChange={setNextRoundQuestionSelection}
                    onStartNextRound={async () => {
                        if (nextRoundQuestionMedia) {
                            const ok = await confirmMediaShareWithAiScan();
                            if (!ok) return;
                        }
                        startRoundMutation.mutate(nextRoundQuestion);
                    }}
                    onToggleVoice={nextRoundAudioRecorder.isRecording ? nextRoundAudioRecorder.stopRecording : nextRoundAudioRecorder.startRecording}
                    question={nextRoundQuestion}
                    roundStatus={roundDisplayStatus}
                    selection={nextRoundQuestionSelection}
                    startNextRoundHint="Eliminate at least one participant before starting the next round."
                    pendingParticipantCount={unresponsiveParticipants.length}
                    nudgePending={nudgeUsersMutation.isPending}
                    startPending={startRoundMutation.isPending}
                    theme={theme}
                />

                {/* PARTICIPANT – Your Answer (show when they have an answer in this round, or when ACCEPTED + ACTIVE for form) */}
                {!isOwner && (myAnswer || (myApplication?.status === 'ACCEPTED' && roundDisplayStatus === 'ACTIVE')) && (
                    <RoundParticipantAnswerSection
                        answerText={answerText}
                        durationMillis={answerAudioRecorder.durationMillis}
                        isRecording={answerAudioRecorder.isRecording}
                        media={answerMedia}
                        myAnswer={myAnswer}
                        selection={answerSelection}
                        submitPending={submitAnswerMutation.isPending}
                        theme={theme}
                        onChangeAnswerText={setAnswerText}
                        onEmojiSelected={handleAnswerEmoji}
                        onOpenCamera={() => setRoundMediaSheet({ target: 'answer', source: 'camera' })}
                        onOpenFile={() => setRoundMediaSheet({ target: 'answer', source: 'file' })}
                        onOpenVideo={(uri) => {
                            setVideoViewerUri(uri);
                            setVideoViewerVisible(true);
                        }}
                        onRemoveMedia={() => setAnswerMedia(null)}
                        onSelectionChange={setAnswerSelection}
                        onSubmitAnswer={async () => {
                            if (answerMedia) {
                                const ok = await confirmMediaShareWithAiScan();
                                if (!ok) return;
                            }
                            submitAnswerMutation.mutate({ rId: roundToShow.id, text: answerText });
                        }}
                        onToggleVoice={answerAudioRecorder.isRecording ? answerAudioRecorder.stopRecording : answerAudioRecorder.startRecording}
                    />
                )}

                {isOwner && (
                    <RoundResponsesList
                        answers={answers}
                        roundStatus={roundDisplayStatus}
                        theme={theme}
                        onEliminate={(userId) => eliminateUserMutation.mutate({ rId: roundToShow.id, userId })}
                        onOpenVideo={(uri) => {
                            setVideoViewerUri(uri);
                            setVideoViewerVisible(true);
                        }}
                        onOpenReportMenu={openAnswerReportMenu}
                    />
                )}

            </ScrollView>

            <CloseRoundModal
                visible={closeModalVisible}
                onDismiss={() => setCloseRoundModalVisible(false)}
                participants={unresponsiveParticipants}
                onNudge={handleNudge}
                onEliminateAndClose={handleEliminateAndClose}
                onCloseAnyway={() => {
                    setCloseRoundModalVisible(false);
                    closeRoundMutation.mutate(roundToShow.id);
                }}
                nudgeLoading={nudgeUsersMutation.isPending}
                eliminateOrCloseLoading={eliminateUsersMutation.isPending || closeRoundMutation.isPending}
                closeLoading={closeRoundMutation.isPending}
            />

            <VideoViewerModal
                visible={videoViewerVisible}
                uri={videoViewerUri}
                onClose={() => { setVideoViewerVisible(false); setVideoViewerUri(null); }}
            />

            <ChatSafetySheet
                visible={!!reportSheet}
                mode={reportSheet?.mode ?? 'report'}
                title={
                    reportSheet?.mode === 'message_actions'
                        ? 'Answer options'
                        : reportSheet?.mode === 'report'
                            ? `Report ${reportSheet.label}?`
                            : reportSheet?.title ?? ''
                }
                subtitle={
                    reportSheet?.mode === 'message_actions'
                        ? reportSheet.mediaId ? 'Choose whether to report this answer or its attached media.' : 'Choose an action for this answer.'
                        : reportSheet?.mode === 'report'
                        ? 'Choose the reason. Our moderation team will review it.'
                        : reportSheet?.subtitle
                }
                loading={reportLoading}
                error={reportError}
                onDismiss={closeReportSheet}
                hasMedia={reportSheet?.mode === 'message_actions' ? Boolean(reportSheet.mediaId) : false}
                primaryReportLabel="Report answer"
                primaryReportHelper="Send this round answer and context for review"
                mediaReportLabel="Report media"
                mediaReportHelper="Send the attached image, video, or voice note for review"
                onReportMessage={() => {
                    if (reportSheet?.mode !== 'message_actions') return;
                    openReportSheet('round_answer', reportSheet.answerId, 'answer');
                }}
                onReportMedia={() => {
                    if (reportSheet?.mode !== 'message_actions' || !reportSheet.mediaId) return;
                    openReportSheet('media', reportSheet.mediaId, 'answer media');
                }}
                onSubmitReport={submitReport}
            />

            <MediaPickerSheet
                visible={roundMediaSheet !== null}
                title={roundMediaSheet?.source === 'camera' ? 'Use camera' : 'Share media'}
                onDismiss={() => setRoundMediaSheet(null)}
                options={
                    roundMediaSheet?.source === 'camera'
                        ? [
                            {
                                icon: 'camera-outline',
                                label: 'Take photo',
                                helper: 'Capture a new picture now',
                                onPress: () => roundMediaSheet && takePhoto(roundMediaSheet.target),
                            },
                            {
                                icon: 'video-plus-outline',
                                label: 'Record video',
                                helper: 'Record a short live clip',
                                onPress: () => roundMediaSheet && recordVideo(roundMediaSheet.target),
                            },
                        ]
                        : [
                            {
                                icon: 'image-outline',
                                label: 'Choose image',
                                helper: 'Share a photo from your files',
                                onPress: () => roundMediaSheet && pickFromLibrary(roundMediaSheet.target, 'image'),
                            },
                            {
                                icon: 'file-video-outline',
                                label: 'Choose video',
                                helper: 'Share a saved video clip',
                                onPress: () => roundMediaSheet && pickFromLibrary(roundMediaSheet.target, 'video'),
                            },
                        ]
                }
            />

            <LastManStandingModal
                visible={lastManStandingVisible}
                onDismiss={() => { setLastManStandingVisible(false); setLastManStandingSpecId(null); setLastManStandingWinnerName(''); }}
                winnerName={lastManStandingWinnerName}
                specId={lastManStandingSpecId ?? ''}
                onMatchAndDate={() => lastManStandingSpecId && createDateMutation.mutate(lastManStandingSpecId)}
                onExtendSearch={(comment, durationDays) => lastManStandingSpecId && extendSearchMutation.mutate({ specIdToUse: lastManStandingSpecId, comment, durationDays })}
                availableCredits={user?.balance?.credits ?? 0}
                matchLoading={createDateMutation.isPending}
                extendLoading={extendSearchMutation.isPending}
            />
            <UploadProgressModal progress={uploadProgress} />

        </View>

    );
}

