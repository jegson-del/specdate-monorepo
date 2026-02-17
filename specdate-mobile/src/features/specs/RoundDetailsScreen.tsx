import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Avatar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { VideoViewerModal } from '../../components';
import { CloseRoundModal, LastManStandingModal, VideoThumbnailPlayer } from './components';
import * as ImagePicker from 'expo-image-picker';
import { MediaService } from '../../services/media';

type AnswerMedia = { uri: string; mimeType: string; assetType: 'image' | 'video' };


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


    const roundFromSpec = useMemo(() => {
        if (!spec?.rounds || roundId == null) return null;
        const found = spec.rounds.find((r: any) => String(r.id) === String(roundId));
        if (found) lastRoundRef.current = found;
        return found;
    }, [spec, roundId]);

    const isOwner = useMemo(() => {
        if (spec?.user_id == null || user?.id == null) return false;
        return String(spec.user_id) === String(user.id);
    }, [spec, user]);

    const myApplication = useMemo(() => {
        if (!spec?.applications || !user) return null;
        return spec.applications.find((a: any) => a.user_id === user.id);
    }, [spec, user]);

    // --- Mutations ---

    const submitAnswerMutation = useMutation({
        mutationFn: async ({ rId, text }: { rId: number, text: string }) => {
            let mediaId: number | undefined;
            if (answerMedia) {
                const uploadType = answerMedia.assetType === 'video' ? 'round_answer_video' : 'round_answer_image';
                const uploaded = await MediaService.upload(
                    answerMedia.uri,
                    uploadType,
                    undefined,
                    answerMedia.mimeType
                );
                mediaId = uploaded.id;
            }
            return SpecService.submitAnswer(rId, text, mediaId);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setAnswerText('');
            setAnswerMedia(null);
            Alert.alert('Success', 'Answer submitted!');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message ?? err?.message;
            const fileErrors = err?.response?.data?.errors?.file;
            const detail = Array.isArray(fileErrors) ? fileErrors[0] : (typeof fileErrors === 'string' ? fileErrors : null);
            Alert.alert('Error', detail || msg || 'Failed to submit answer.');
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
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setLastManStandingVisible(false);
            setLastManStandingSpecId(null);
            setLastManStandingWinnerName('');
            Alert.alert('Date created!', data?.date_code ? `Your date code: ${data.date_code}` : 'You are now matched. Go plan your date!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to create date.'),
    });

    const extendSearchMutation = useMutation({
        mutationFn: ({ specIdToUse, comment }: { specIdToUse: string; comment: string }) =>
            SpecService.extendSearch(specIdToUse, comment),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setLastManStandingVisible(false);
            setLastManStandingSpecId(null);
            setLastManStandingWinnerName('');
            Alert.alert('Search extended', 'Edit your spec and set the status to open to get more applicants.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to extend search.'),
    });

    // --- State ---
    const [answerText, setAnswerText] = useState('');
    const [answerMedia, setAnswerMedia] = useState<AnswerMedia | null>(null);
    const [nextRoundQuestion, setNextRoundQuestion] = useState('');
    const [closeModalVisible, setCloseRoundModalVisible] = useState(false);
    const [videoViewerVisible, setVideoViewerVisible] = useState(false);
    const [videoViewerUri, setVideoViewerUri] = useState<string | null>(null);
    const [lastManStandingVisible, setLastManStandingVisible] = useState(false);
    const [lastManStandingWinnerName, setLastManStandingWinnerName] = useState('');
    const [lastManStandingSpecId, setLastManStandingSpecId] = useState<string | null>(null);

    // Edit Question State
    const [isEditing, setIsEditing] = useState(false);
    const [editQuestionText, setEditQuestionText] = useState('');



    const pickFromLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Allow access to your photos and videos.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                const assetType = (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video';
                const mimeType = asset.mimeType ?? (assetType === 'video' ? 'video/mp4' : 'image/jpeg');
                setAnswerMedia({ uri: asset.uri, mimeType, assetType });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const takePhoto = async () => {
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
                setAnswerMedia({
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'image/jpeg',
                    assetType: 'image',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    };

    const recordVideo = async () => {
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
                setAnswerMedia({
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
        mutationFn: (question: string) => SpecService.startRound(String(specId), question),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            Alert.alert('Success', 'Next round started!');
            navigation.goBack(); // Go back to list? Or stay?
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to start round.'),
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
        onSuccess: () => {
            // After elimination, we might want to refetch
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
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

    // --- Computed ---
    const resolvedRound =
        roundFromSpec ??
        (lastRoundRef.current && String(lastRoundRef.current.id) === String(roundId) ? lastRoundRef.current : null);
    const roundToShow =
        resolvedRound &&
            roundFromSpec?.status === 'COMPLETED' &&
            lastRoundRef.current &&
            String(lastRoundRef.current.id) === String(roundId) &&
            lastRoundRef.current.status !== 'COMPLETED'
            ? lastRoundRef.current
            : resolvedRound;

    // Participants = accepted applicants only; exclude spec owner (role: owner, not participant).
    const activeParticipants = useMemo(() => {
        if (!spec?.applications) return [];
        const ownerId = spec.user_id != null ? String(spec.user_id) : null;
        return spec.applications.filter(
            (a: any) => a.status === 'ACCEPTED' && (!ownerId || String(a.user_id) !== ownerId)
        );
    }, [spec]);

    const unresponsiveParticipants = useMemo(() => {
        if (!roundToShow || roundToShow.status !== 'ACTIVE') return [];
        const answeredIds = new Set((roundToShow.answers || []).map((a: any) => a.user_id));
        return activeParticipants.filter((a: any) => !answeredIds.has(a.user_id));
    }, [roundToShow, activeParticipants]);

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
                await eliminateUsersMutation.mutateAsync({ rId: roundToShow.id, userIds: ids });
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

    // Resolve round: use refetch result, or last-known round to avoid "Round not found" flash during refetch / COMPLETED overwrite
    // but we were showing ACTIVE/REVIEWING (so Close button and balloons don't disappear after a few seconds)


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

    const myAnswer = roundToShow.answers?.find((a: any) => a.user_id === user?.id);

    // Filter participants who are ACTIVE in this round?
    // Actually, backend returns answers.
    // For owner view: we show all answers.
    const answers = roundToShow.answers || [];

    const statusColor = roundToShow.status === 'ACTIVE' ? '#16a34a' : roundToShow.status === 'REVIEWING' ? '#ca8a04' : theme.colors.outline;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header – flat, high contrast */}
            <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={24} iconColor={theme.colors.onSurface} />
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Round {roundToShow.round_number}</Text>
                    <View style={[styles.headerStatusPill, { backgroundColor: (theme.colors as any).surfaceVariant || theme.colors.elevation?.level2 }]}>
                        <View style={[styles.headerStatusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.headerStatusText, { color: theme.colors.onSurface }]}>{roundToShow.status}</Text>
                    </View>
                </View>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Question – flat card, high contrast */}
                <View style={[styles.questionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={[styles.questionLabel, { color: theme.colors.onSurfaceVariant }]}>QUESTION</Text>
                        {isOwner && roundToShow.status === 'ACTIVE' && !isEditing && (
                            <TouchableOpacity onPress={() => {
                                setEditQuestionText(roundToShow.question_text);
                                setIsEditing(true);
                            }}>
                                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditing ? (
                        <View style={{ gap: 10, marginBottom: 10 }}>
                            <TextInput
                                value={editQuestionText}
                                onChangeText={setEditQuestionText}
                                style={[styles.flatInput, { color: theme.colors.onSurface, borderColor: theme.colors.primary, borderWidth: 2 }]}
                                autoFocus
                                multiline
                            />
                            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                                <Button mode="text" onPress={() => setIsEditing(false)} compact>Cancel</Button>
                                <Button
                                    mode="contained"
                                    onPress={() => updateRoundMutation.mutate({ rId: roundToShow.id, text: editQuestionText })}
                                    loading={updateRoundMutation.isPending}
                                    disabled={!editQuestionText.trim() || updateRoundMutation.isPending}
                                    compact
                                >
                                    Save
                                </Button>
                            </View>
                        </View>
                    ) : (
                        <Text style={[styles.questionText, { color: theme.colors.onSurface }]}>{roundToShow.question_text}</Text>
                    )}

                    <View style={[styles.questionMeta, { borderTopColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]}>
                        <Text style={[styles.questionMetaText, { color: theme.colors.onSurfaceVariant }]}>{answers.length} response{answers.length !== 1 ? 's' : ''}</Text>
                    </View>
                </View>

                {/* OWNER ACTIONS – flat sections */}
                {isOwner && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Owner controls</Text>

                        {roundToShow.status === 'ACTIVE' && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.primaryButton, { backgroundColor: theme.colors.error }]}
                                onPress={handleCloseRoundPress}
                                disabled={closeRoundMutation.isPending}
                            >
                                {closeRoundMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Close round & review</Text>
                                )}
                            </TouchableOpacity>
                        )}

                        {roundToShow.status === 'REVIEWING' && (
                            <View style={[styles.flatBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                                <Text style={[styles.flatBlockHint, { color: theme.colors.onSurfaceVariant }]}>Tap Eliminate next to an answer to remove that participant.</Text>
                                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]} />
                                <Text style={[styles.flatBlockLabel, { color: theme.colors.onSurfaceVariant }]}>Next round question</Text>
                                <TextInput
                                    placeholder="e.g. What's your hidden talent?"
                                    placeholderTextColor={theme.colors.outline}
                                    value={nextRoundQuestion}
                                    onChangeText={setNextRoundQuestion}
                                    multiline
                                    numberOfLines={4}
                                    style={[styles.flatTextArea, { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' }]}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={() => startRoundMutation.mutate(nextRoundQuestion)}
                                    disabled={!nextRoundQuestion.trim() || startRoundMutation.isPending}
                                >
                                    {startRoundMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Start next round</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {roundToShow.status === 'COMPLETED' && (
                            <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>This round is completed.</Text>
                        )}
                    </View>
                )}

                {/* PARTICIPANT – Your Answer (show when they have an answer in this round, or when ACCEPTED + ACTIVE for form) */}
                {!isOwner && (myAnswer || (myApplication?.status === 'ACCEPTED' && roundToShow.status === 'ACTIVE')) && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Your answer</Text>

                        {myAnswer ? (
                            <View style={[styles.answerSubmitted, { backgroundColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)', borderColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(22,163,74,0.3)' }]}>
                                <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>"{myAnswer.answer_text}"</Text>
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
                                        {myAnswer.media.mime_type?.startsWith('video/') ? (
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
                                    style={[styles.flatTextArea, { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' }]}
                                />
                                {answerMedia && (
                                    <View style={{ marginBottom: 12, position: 'relative', alignSelf: 'flex-start' }}>
                                        {answerMedia.assetType === 'image' ? (
                                            <Image source={{ uri: answerMedia.uri }} style={{ width: 120, height: 120, borderRadius: 8 }} />
                                        ) : (
                                            <VideoThumbnailPlayer uri={answerMedia.uri} width={160} height={100} onPress={() => { setVideoViewerUri(answerMedia.uri); setVideoViewerVisible(true); }} />
                                        )}
                                        <TouchableOpacity
                                            style={{ position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.error, borderRadius: 12, padding: 4 }}
                                            onPress={() => setAnswerMedia(null)}
                                        >
                                            <MaterialCommunityIcons name="close" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        onPress={pickFromLibrary}
                                        style={[styles.mediaBtn, { borderColor: theme.colors.outlineVariant }]}
                                    >
                                        <MaterialCommunityIcons name="image-multiple" size={22} color={theme.colors.primary} />
                                        <Text style={[styles.mediaBtnLabel, { color: theme.colors.onSurface }]}>Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={takePhoto}
                                        style={[styles.mediaBtn, { borderColor: theme.colors.outlineVariant }]}
                                    >
                                        <MaterialCommunityIcons name="camera" size={22} color={theme.colors.primary} />
                                        <Text style={[styles.mediaBtnLabel, { color: theme.colors.onSurface }]}>Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={recordVideo}
                                        style={[styles.mediaBtn, { borderColor: theme.colors.outlineVariant }]}
                                    >
                                        <MaterialCommunityIcons name="video" size={22} color={theme.colors.primary} />
                                        <Text style={[styles.mediaBtnLabel, { color: theme.colors.onSurface }]}>Record</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                                    onPress={() => submitAnswerMutation.mutate({ rId: roundToShow.id, text: answerText })}
                                    disabled={!answerText.trim() || submitAnswerMutation.isPending}
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

                {/* Responses list – flat rows, high contrast */}
                {
                    isOwner && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Responses</Text>
                            <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>{answers.length} answer{answers.length !== 1 ? 's' : ''}</Text>

                            {answers.length === 0 && (
                                <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>No answers yet.</Text>
                            )}

                            <View style={styles.answersList}>
                                {answers.map((a: any) => {
                                    const displayName = a.user?.profile?.full_name || a.user?.name || 'User';
                                    const avatarUri = toImageUri(a.user?.profile?.avatar) || undefined;
                                    const isEliminated = a.is_eliminated;

                                    return (
                                        <View
                                            key={a.id}
                                            style={[
                                                styles.answerRow,
                                                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '30' },
                                                isEliminated && styles.answerRowEliminated
                                            ]}
                                        >
                                            <Avatar.Image size={44} source={{ uri: avatarUri }} style={styles.answerAvatar} />
                                            <View style={styles.answerBody}>
                                                <Text style={[styles.answerName, { color: theme.colors.onSurface }]} numberOfLines={1}>{displayName}</Text>
                                                <Text style={[styles.answerText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>{a.answer_text}</Text>
                                                {a.media && (
                                                    a.media.mime_type?.startsWith('video/') ? (
                                                        <View style={{ marginTop: 8 }}>
                                                            <VideoThumbnailPlayer uri={a.media.url} width={160} height={100} onPress={() => { setVideoViewerUri(a.media.url); setVideoViewerVisible(true); }} />
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity onPress={() => { }}>
                                                            <Image
                                                                source={{ uri: a.media.url }}
                                                                style={{ width: 120, height: 120, borderRadius: 8, marginTop: 8, backgroundColor: theme.colors.surfaceVariant }}
                                                            />
                                                        </TouchableOpacity>
                                                    )
                                                )}
                                            </View>
                                            {(isOwner && (String(roundToShow.status).toUpperCase() === 'REVIEWING' || String(roundToShow.status).toUpperCase() === 'ACTIVE') && !isEliminated) ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Alert.alert('Eliminate?', `Eliminate ${displayName}?`, [
                                                            { text: 'Cancel' },
                                                            { text: 'Eliminate', style: 'destructive', onPress: () => eliminateUserMutation.mutate({ rId: roundToShow.id, userId: a.user_id }) }
                                                        ]);
                                                    }}
                                                    style={styles.eliminateButton}
                                                    accessibilityLabel="Eliminate participant"
                                                >
                                                    <MaterialCommunityIcons name="account-remove" size={22} color={theme.colors.error} />
                                                    <Text style={[styles.eliminateButtonLabel, { color: theme.colors.error }]}>Eliminate</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                            {isEliminated && (
                                                <View style={styles.eliminatedChip}>
                                                    <MaterialCommunityIcons name="account-off" size={20} color={theme.colors.onSurfaceVariant} />
                                                    <Text style={[styles.eliminatedLabel, { color: theme.colors.onSurfaceVariant }]}>Eliminated</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )
                }

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

            <LastManStandingModal
                visible={lastManStandingVisible}
                onDismiss={() => { setLastManStandingVisible(false); setLastManStandingSpecId(null); setLastManStandingWinnerName(''); }}
                winnerName={lastManStandingWinnerName}
                specId={lastManStandingSpecId ?? ''}
                onMatchAndDate={() => lastManStandingSpecId && createDateMutation.mutate(lastManStandingSpecId)}
                onExtendSearch={(comment) => lastManStandingSpecId && extendSearchMutation.mutate({ specIdToUse: lastManStandingSpecId, comment })}
                matchLoading={createDateMutation.isPending}
                extendLoading={extendSearchMutation.isPending}
            />

        </View>

    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        backgroundColor: 'transparent',
    },
    headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    headerStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
    headerStatusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    questionCard: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    questionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
    questionText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
    questionMeta: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
    questionMetaText: { fontSize: 13 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, marginBottom: 12 },
    flatBlock: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    flatBlockHint: { fontSize: 13, lineHeight: 20 },
    flatBlockLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    divider: { height: 1 },
    flatInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
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
    hintText: { fontSize: 14 },
    answerSubmitted: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    answerSubmittedText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
    answerSubmittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    answerSubmittedBadgeText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
    answersList: { gap: 10 },
    answerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 14,
    },
    answerRowEliminated: { opacity: 0.55 },
    answerAvatar: {},
    answerBody: { flex: 1, minWidth: 0 },
    answerName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    answerText: { fontSize: 14, lineHeight: 20 },
    eliminateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    eliminateButtonLabel: { fontSize: 13, fontWeight: '700' },
    eliminatedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    eliminatedLabel: { fontSize: 13, fontWeight: '600' },
    mediaBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 72,
    },
    mediaBtnLabel: { fontSize: 12, fontWeight: '600' },
});
