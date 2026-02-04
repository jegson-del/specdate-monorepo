import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ImageBackground, TouchableOpacity, TextInput } from 'react-native';
import { Text, useTheme, Button, ActivityIndicator, Avatar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { BalloonIcon, PoppedBalloonIcon } from '../../components/BalloonIcons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';

export default function RoundDetailsScreen({ route, navigation }: any) {
    const specId = route.params?.specId != null ? String(route.params.specId) : undefined;
    const roundId = route.params?.roundId != null ? route.params.roundId : undefined;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const confettiRef = useRef<any>(null);
    const lastRoundRef = useRef<any>(null);

    // Fetch Spec (which includes rounds). Keep cache so returning to Spec Details has data; keep previous data during refetch.
    const { data: spec, isLoading, isFetching, error, refetch: refetchSpec } = useQuery({
        queryKey: ['spec', specId],
        queryFn: () => SpecService.getOne(specId!),
        enabled: !!specId,
        staleTime: 0,
        gcTime: 60 * 1000,
        refetchOnMount: 'always',
        placeholderData: (previousData) => previousData,
    });

    // Refetch when screen gains focus so round/answers are fresh
    useFocusEffect(
        useCallback(() => {
            if (specId) refetchSpec();
        }, [specId, refetchSpec])
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
        mutationFn: ({ rId, text }: { rId: number, text: string }) => SpecService.submitAnswer(rId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            Alert.alert('Success', 'Answer submitted!');
            setAnswerText('');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to submit answer.'),
    });

    const closeRoundMutation = useMutation({
        mutationFn: (rId: number) => SpecService.closeRound(rId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to close round.'),
    });

    const eliminateUserMutation = useMutation({
        mutationFn: ({ rId, userId }: { rId: number, userId: number }) =>
            SpecService.eliminateUser(rId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            confettiRef.current?.start();
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate user.'),
    });

    // --- State ---
    const [answerText, setAnswerText] = useState('');
    const [nextRoundQuestion, setNextRoundQuestion] = useState('');

    const startRoundMutation = useMutation({
        mutationFn: (question: string) => SpecService.startRound(String(specId), question),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            Alert.alert('Success', 'Next round started!');
            navigation.goBack(); // Go back to list? Or stay?
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to start round.'),
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

    if (!spec) {
        lastRoundRef.current = null;
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 20, color: theme.colors.outline }}>Loading round details...</Text>
            </View>
        );
    }

    // Use last-known round when refetch returns spec without this round, or when refetch returns COMPLETED
    // but we were showing ACTIVE/REVIEWING (so Close button and balloons don't disappear after a few seconds)
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
                    <Text style={[styles.questionLabel, { color: theme.colors.onSurfaceVariant }]}>QUESTION</Text>
                    <Text style={[styles.questionText, { color: theme.colors.onSurface }]}>{roundToShow.question_text}</Text>
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
                                onPress={() => Alert.alert('Close Round?', 'Stop accepting answers?', [
                                    { text: 'Cancel' },
                                    { text: 'Close', onPress: () => closeRoundMutation.mutate(roundToShow.id) }
                                ])}
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
                                <Text style={[styles.flatBlockHint, { color: theme.colors.onSurfaceVariant }]}>Tap the balloon next to an answer to eliminate that participant.</Text>
                                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]} />
                                <Text style={[styles.flatBlockLabel, { color: theme.colors.onSurfaceVariant }]}>Next round question</Text>
                                <TextInput
                                    placeholder="e.g. What's your hidden talent?"
                                    placeholderTextColor={theme.colors.outline}
                                    value={nextRoundQuestion}
                                    onChangeText={setNextRoundQuestion}
                                    style={[styles.flatInput, { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' }]}
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

                {/* PARTICIPANT – Your Answer */}
                {!isOwner && myApplication && myApplication.status === 'ACCEPTED' && roundToShow.status === 'ACTIVE' && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Your answer</Text>

                        {myAnswer ? (
                            <View style={[styles.answerSubmitted, { backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.3)' }]}>
                                <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>"{myAnswer.answer_text}"</Text>
                                <View style={styles.answerSubmittedBadge}>
                                    <MaterialCommunityIcons name="check-circle" color="#16a34a" size={18} />
                                    <Text style={styles.answerSubmittedBadgeText}>Submitted</Text>
                                </View>
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
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
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
                                    </View>
                                    {(isOwner && (String(roundToShow.status).toUpperCase() === 'REVIEWING' || String(roundToShow.status).toUpperCase() === 'ACTIVE') && !isEliminated) ? (
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert('Eliminate?', `Eliminate ${displayName}?`, [
                                                    { text: 'Cancel' },
                                                    { text: 'Eliminate', style: 'destructive', onPress: () => eliminateUserMutation.mutate({ rId: roundToShow.id, userId: a.user_id }) }
                                                ]);
                                            }}
                                            style={styles.balloonTouch}
                                            accessibilityLabel="Eliminate participant"
                                        >
                                            <BalloonIcon size={28} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    ) : null}
                                    {isEliminated && (
                                        <View style={styles.balloonTouch}>
                                            <PoppedBalloonIcon size={28} color="#ca8a04" />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

            </ScrollView>

            {/* Confetti Overlay */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', zIndex: 1000 }]} pointerEvents="none">
                <ConfettiCannon
                    ref={confettiRef}
                    count={70}
                    origin={{ x: -10, y: 0 }}
                    autoStart={false}
                    fadeOut={true}
                />
            </View>
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
    balloonTouch: { padding: 8 },
});
