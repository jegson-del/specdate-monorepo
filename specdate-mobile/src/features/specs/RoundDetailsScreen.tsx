import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { SpecService } from '../../services/specs';
import { MediaModerationError } from '../../services/media';
import { useUser } from '../../hooks/useUser';
import { insertEmojiAtSelection, type TextSelection } from '../../utils/emojiText';
import { MediaPickerSheet, UploadProgressModal, VideoViewerModal, type UploadProgressState } from '../../components';
import { AudioMessagePlayer, CloseRoundModal, LastManStandingModal, PrivateRoundState, RoundHeader, RoundMediaActions, RoundOwnerControls, RoundQuestionCard, RoundResponsesList, useRoundAudioRecorder, VideoThumbnailPlayer } from './components';
import type { RoundMediaAsset } from './components';
import * as ImagePicker from 'expo-image-picker';
import { confirmMediaShareWithAiScan } from '../../utils/confirmMediaShareWithAiScan';
import { ModerationService, type ReportTargetType } from '../../services/moderation';
import { isAudioMedia, isVideoMedia } from './specDetailsUtils';
import { isRoundMediaReviewing, resolveShareableRoundMedia } from './roundMediaUpload';
import { useRoundDetailsState } from './hooks/useRoundDetailsState';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';

type ReportSheetState =
    | null
    | { mode: 'message_actions'; answerId: number; mediaId?: number }
    | { mode: 'report'; targetType: ReportTargetType; targetId: number; label: string }
    | { mode: 'success'; title: string; subtitle: string };

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

    // --- Mutations ---

    const submitAnswerMutation = useMutation({
        mutationFn: async ({ rId, text }: { rId: number, text: string }) => {
            let mediaId: number | undefined;
            if (answerMedia) {
                const uploadType =
                    answerMedia.assetType === 'audio'
                        ? 'round_answer_audio'
                        : answerMedia.assetType === 'video'
                            ? 'round_answer_video'
                            : 'round_answer_image';
                const reviewed = await resolveShareableRoundMedia({
                    asset: answerMedia,
                    uploadType,
                    onAssetChange: setAnswerMedia,
                    onProgress: setUploadProgress,
                    label: 'answer media',
                });
                mediaId = reviewed.id;
            }
            setUploadProgress({
                title: 'Submitting answer',
                message: 'Adding your answer to the round.',
            });
            return SpecService.submitAnswer(rId, text, mediaId);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setAnswerText('');
            setAnswerSelection({ start: 0, end: 0 });
            setAnswerMedia(null);
            Alert.alert('Success', 'Answer submitted!');
        },
        onError: (err: any) => {
            if (isMediaReviewError(err)) {
                showMediaReviewResult(err, 'Answer media not sent');
                return;
            }
            const msg = err?.response?.data?.message ?? err?.message;
            const fileErrors = err?.response?.data?.errors?.file;
            const detail = Array.isArray(fileErrors) ? fileErrors[0] : (typeof fileErrors === 'string' ? fileErrors : null);
            Alert.alert('Error', detail || msg || 'Failed to submit answer.');
        },
        onSettled: (_data, err) => {
            if (!isMediaReviewError(err)) {
                setUploadProgress(null);
            }
        },
    });

    const closeRoundMutation = useMutation({
        mutationFn: (rId: number) => SpecService.closeRound(rId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to close round.'),
    });

    // No confetti on elimination – it was causing the view to re-render and data to disappear
    const eliminateUserMutation = useMutation({
        mutationFn: ({ rId, userId }: { rId: number, userId: number }) =>
            SpecService.eliminateUser(rId, userId),
        onSuccess: async (apiResponse: any) => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId), 'round_details'] });
            await refetchSpec();
            const payload = apiResponse?.data;
            if (payload?.last_man_standing && payload.winner && payload.spec_id != null) {
                setLastManStandingWinnerName(payload.winner.name || 'Winner');
                setLastManStandingSpecId(String(payload.spec_id));
                setLastManStandingVisible(true);
            } else {
                Alert.alert('Success', 'Participant eliminated.');
            }
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate user.'),
    });

    const createDateMutation = useMutation({
        mutationFn: (specIdToUse: string) => SpecService.createDate(specIdToUse),
        onSuccess: async (res: any) => {
            const data = res?.data ?? res;
            const completeSpec = (current: any) => current ? ({
                ...current,
                status: 'COMPLETED',
                rounds: Array.isArray(current.rounds)
                    ? current.rounds.map((round: any) => (
                        round.status === 'ACTIVE' || round.status === 'REVIEWING'
                            ? { ...round, status: 'COMPLETED' }
                            : round
                    ))
                    : current.rounds,
            }) : current;
            queryClient.setQueryData(['spec', String(specId)], completeSpec);
            queryClient.setQueryData(['spec', String(specId), 'round_details'], completeSpec);
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            queryClient.invalidateQueries({ queryKey: ['specs'] });
            queryClient.invalidateQueries({ queryKey: ['my-specs'] });
            queryClient.invalidateQueries({ queryKey: ['dates'] });
            await refetchSpec();
            setLastManStandingVisible(false);
            setLastManStandingSpecId(null);
            setLastManStandingWinnerName('');
            Alert.alert('Date created!', data?.date_code ? `Your date code: ${data.date_code}` : 'You are now matched. Go plan your date!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to create date.'),
    });

    const extendSearchMutation = useMutation({
        mutationFn: ({ specIdToUse, comment, durationDays }: { specIdToUse: string; comment: string; durationDays: number }) =>
            SpecService.extendSearch(specIdToUse, comment, durationDays),
        onSuccess: async (res: any) => {
            const credits = res?.data?.balance?.credits;
            if (typeof credits === 'number') {
                queryClient.setQueryData(['user'], (current: any) => {
                    if (!current) return current;
                    return {
                        ...current,
                        balance: {
                            ...(current.balance ?? {}),
                            credits,
                        },
                    };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setLastManStandingVisible(false);
            setLastManStandingSpecId(null);
            setLastManStandingWinnerName('');
            Alert.alert('Search extended', 'Your spec is open again for new applicants.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to extend search.'),
    });

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
    const [reportSheet, setReportSheet] = useState<ReportSheetState>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressState>(null);

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

    const setSelectedRoundMedia = useCallback((target: 'answer' | 'next_question', asset: RoundMediaAsset) => {
        if (target === 'answer') {
            setAnswerMedia(asset);
        } else {
            setNextRoundQuestionMedia(asset);
        }
    }, []);

    const pickFromLibrary = async (target: 'answer' | 'next_question', assetType: 'image' | 'video') => {
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
                const mimeType = asset.mimeType ?? (assetType === 'video' ? 'video/mp4' : 'image/jpeg');
                setSelectedRoundMedia(target, { uri: asset.uri, mimeType, assetType });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const takePhoto = async (target: 'answer' | 'next_question') => {
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
                setSelectedRoundMedia(target, {
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'image/jpeg',
                    assetType: 'image',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const recordVideo = async (target: 'answer' | 'next_question') => {
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
                setSelectedRoundMedia(target, {
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'video/mp4',
                    assetType: 'video',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const startRoundMutation = useMutation({
        mutationFn: async (question: string) => {
            let mediaId: number | undefined;
            if (nextRoundQuestionMedia) {
                const uploadType =
                    nextRoundQuestionMedia.assetType === 'audio'
                        ? 'round_question_audio'
                        : nextRoundQuestionMedia.assetType === 'video'
                            ? 'round_question_video'
                            : 'round_question_image';
                const reviewed = await resolveShareableRoundMedia({
                    asset: nextRoundQuestionMedia,
                    uploadType,
                    onAssetChange: setNextRoundQuestionMedia,
                    onProgress: setUploadProgress,
                    label: 'round question media',
                });
                mediaId = reviewed.id;
            }
            setUploadProgress({
                title: 'Starting round',
                message: 'Adding the media to the round question.',
            });
            return SpecService.startRound(String(specId), question, mediaId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            Alert.alert('Success', 'Next round started!');
            setNextRoundQuestion('');
            setNextRoundQuestionSelection({ start: 0, end: 0 });
            setNextRoundQuestionMedia(null);
            navigation.goBack(); // Go back to list? Or stay?
        },
        onError: (err: any) => {
            if (isMediaReviewError(err)) {
                showMediaReviewResult(err, 'Round media not sent');
                return;
            }
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to start round.');
        },
        onSettled: (_data, err) => {
            if (!isMediaReviewError(err)) {
                setUploadProgress(null);
            }
        },
    });

    const updateRoundMutation = useMutation({
        mutationFn: ({ rId, text }: { rId: number, text: string }) => SpecService.updateRound(rId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            setIsEditing(false);
            Alert.alert('Success', 'Question updated!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to update question.'),
    });

    const eliminateUsersMutation = useMutation({
        mutationFn: ({ rId, userIds }: { rId: number, userIds: number[] }) =>
            SpecService.eliminateUsers(rId, userIds),
        onSuccess: async (apiResponse: any) => {
            // After elimination, we might want to refetch
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId), 'round_details'] });
            await refetchSpec();
            const payload = apiResponse?.data;
            if (payload?.last_man_standing && payload.winner && payload.spec_id != null) {
                setLastManStandingWinnerName(payload.winner.name || 'Winner');
                setLastManStandingSpecId(String(payload.spec_id));
                setLastManStandingVisible(true);
            }
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate users.'),
    });

    const nudgeUsersMutation = useMutation({
        mutationFn: ({ rId, userIds }: { rId: number, userIds: number[] }) =>
            SpecService.nudgeUsers(rId, userIds),
        onSuccess: (data) => {
            setCloseRoundModalVisible(false);
            Alert.alert('Success', data.message || 'Participants nudged.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to nudge users.'),
    });

    function isMediaReviewError(err: unknown): boolean {
        const status = String((err as any)?.status ?? '');
        return err instanceof MediaModerationError || ['flagged', 'failed', 'timeout', 'reviewing'].includes(status);
    }

    function showMediaReviewResult(err: any, title: string): void {
        setUploadProgress({
            title,
            message: err?.message || 'This file could not be used. Please choose another file.',
            status: err?.status === 'reviewing' ? 'reviewing' : 'error',
            dismissLabel: 'OK',
            onDismiss: () => setUploadProgress(null),
        });
    }

    const handleCloseRoundPress = () => {
        if (unresponsiveParticipants.length > 0) {
            setCloseRoundModalVisible(true);
        } else {
            Alert.alert('Close Round?', 'Stop accepting answers?', [
                { text: 'Cancel' },
                { text: 'Close', onPress: () => closeRoundMutation.mutate(roundToShow.id) }
            ]);
        }
    };

    const handleEliminateAndClose = async () => {
        const ids = unresponsiveParticipants.map((p: any) => p.user_id);
        if (ids.length > 0) {
            try {
                const apiResponse: any = await eliminateUsersMutation.mutateAsync({ rId: roundToShow.id, userIds: ids });
                if (apiResponse?.data?.last_man_standing) {
                    setCloseRoundModalVisible(false);
                    return;
                }
            } catch (e) {
                return; // Stop if elimination fails
            }
        }
        closeRoundMutation.mutate(roundToShow.id);
        setCloseRoundModalVisible(false);
    };

    const handleNudge = () => {
        const ids = unresponsiveParticipants.map((p: any) => p.user_id);
        nudgeUsersMutation.mutate({ rId: roundToShow.id, userIds: ids });
    };

    const closeReportSheet = useCallback(() => {
        setReportSheet(null);
        setReportError(null);
    }, []);

    const openReportSheet = useCallback((targetType: ReportTargetType, targetId: number, label: string) => {
        setReportError(null);
        setReportSheet({ mode: 'report', targetType, targetId, label });
    }, []);

    const openAnswerReportMenu = useCallback((answer: any) => {
        const mediaId = answer.media?.id ? Number(answer.media.id) : undefined;
        setReportError(null);
        setReportSheet({ mode: 'message_actions', answerId: Number(answer.id), mediaId });
    }, []);

    const submitReport = useCallback(async (reason: string) => {
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
                    onChangeQuestion={setNextRoundQuestion}
                    onCloseRound={handleCloseRoundPress}
                    onEmojiSelected={handleNextRoundQuestionEmoji}
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
                    startPending={startRoundMutation.isPending}
                    theme={theme}
                />

                {/* PARTICIPANT – Your Answer (show when they have an answer in this round, or when ACCEPTED + ACTIVE for form) */}
                {!isOwner && (myAnswer || (myApplication?.status === 'ACCEPTED' && roundDisplayStatus === 'ACTIVE')) && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Your answer</Text>

                        {myAnswer ? (
                            <View style={[styles.answerSubmitted, { backgroundColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)', borderColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(22,163,74,0.3)' }]}>
                                {myAnswer.answer_text?.trim() ? (
                                    <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>"{myAnswer.answer_text}"</Text>
                                ) : (
                                    <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>Voice answer</Text>
                                )}
                                <View style={styles.answerSubmittedBadge}>
                                    {myAnswer.is_eliminated ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialCommunityIcons name="account-off" size={18} color="#EF4444" />
                                            <Text style={[styles.answerSubmittedBadgeText, { color: '#EF4444' }]}>Eliminated</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check-circle" color="#16a34a" size={18} />
                                            <Text style={styles.answerSubmittedBadgeText}>Submitted</Text>
                                        </>
                                    )}
                                </View>
                                {myAnswer.media && (
                                    <View style={{ marginTop: 12 }}>
                                        {isAudioMedia(myAnswer.media) ? (
                                            <AudioMessagePlayer uri={myAnswer.media.url} label="Audio answer" />
                                        ) : isVideoMedia(myAnswer.media) ? (
                                            <VideoThumbnailPlayer uri={myAnswer.media.url} width={200} height={120} onPress={() => { setVideoViewerUri(myAnswer.media.url); setVideoViewerVisible(true); }} />
                                        ) : (
                                            <Image source={{ uri: myAnswer.media?.url }} style={{ width: 120, height: 120, borderRadius: 8 }} />
                                        )}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={[styles.flatBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                                <TextInput
                                    placeholder="Type your answer here..."
                                    placeholderTextColor={theme.colors.outline}
                                    multiline
                                    numberOfLines={4}
                                    value={answerText}
                                    onChangeText={setAnswerText}
                                    selection={answerSelection}
                                    onSelectionChange={(event) => setAnswerSelection(event.nativeEvent.selection)}
                                    style={[styles.flatTextArea, { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' }]}
                                />
                                {answerMedia && (
                                    <View style={{ marginBottom: 12, position: 'relative', alignSelf: 'flex-start' }}>
                                        {isRoundMediaReviewing(answerMedia) ? (
                                            <Chip compact icon="clock-outline" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                                                Reviewing video
                                            </Chip>
                                        ) : null}
                                        {answerMedia.assetType === 'image' ? (
                                            <Image source={{ uri: answerMedia.uri }} style={{ width: 120, height: 120, borderRadius: 8 }} />
                                        ) : answerMedia.assetType === 'video' ? (
                                            <VideoThumbnailPlayer uri={answerMedia.uri} width={160} height={100} onPress={() => { setVideoViewerUri(answerMedia.uri); setVideoViewerVisible(true); }} />
                                        ) : (
                                            <AudioMessagePlayer uri={answerMedia.uri} label="Audio answer" compact />
                                        )}
                                        <TouchableOpacity
                                            style={{ position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.error, borderRadius: 12, padding: 4 }}
                                            onPress={() => setAnswerMedia(null)}
                                        >
                                            <MaterialCommunityIcons name="close" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <RoundMediaActions
                                    onOpenFile={() => setRoundMediaSheet({ target: 'answer', source: 'file' })}
                                    onOpenCamera={() => setRoundMediaSheet({ target: 'answer', source: 'camera' })}
                                    onEmojiSelected={handleAnswerEmoji}
                                    onToggleVoice={answerAudioRecorder.isRecording ? answerAudioRecorder.stopRecording : answerAudioRecorder.startRecording}
                                    isRecording={answerAudioRecorder.isRecording}
                                    durationMillis={answerAudioRecorder.durationMillis}
                                    disabled={submitAnswerMutation.isPending}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                                    onPress={async () => {
                                        if (answerMedia) {
                                            const ok = await confirmMediaShareWithAiScan();
                                            if (!ok) return;
                                        }
                                        submitAnswerMutation.mutate({ rId: roundToShow.id, text: answerText });
                                    }}
                                    disabled={(!answerText.trim() && !answerMedia) || submitAnswerMutation.isPending}
                                >
                                    {submitAnswerMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Submit answer</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    flatBlock: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    flatTextArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
    },
    primaryButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    answerSubmitted: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    answerSubmittedText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
    answerSubmittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    answerSubmittedBadgeText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
    mediaPreviewBox: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        gap: 6,
    },
    questionMediaImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
});
