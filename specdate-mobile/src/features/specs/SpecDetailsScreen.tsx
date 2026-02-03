import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Avatar, Surface, ActivityIndicator, Chip, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';

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

function safeParseMaybeJson(v: any): any {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return v;
    const trimmed = v.trim();
    if (!trimmed) return v;
    if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return v;
    try {
        return JSON.parse(trimmed);
    } catch {
        return v;
    }
}

function requirementIcon(field: string) {
    switch (field) {
        case 'age':
            return 'calendar-account';
        case 'height':
            return 'human-male-height';
        case 'genotype':
            return 'dna';
        case 'sex':
            return 'gender-male-female';
        case 'is_smoker':
            return 'smoking';
        case 'occupation':
            return 'briefcase';
        case 'qualification':
            return 'school';
        case 'city':
        case 'country':
            return 'map-marker';
        default:
            return 'checkbox-marked-circle-outline';
    }
}

function toNumber(v: any): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function cmToFeetInches(cm: number) {
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return { feet, inches: inches === 12 ? 0 : inches, feetAdjusted: inches === 12 ? feet + 1 : feet };
}

export default function SpecDetailsScreen({ route, navigation }: any) {
    // Normalize to string so query key is stable (avoids cache mismatch between number and string)
    const specId = route.params?.specId != null ? String(route.params.specId) : undefined;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user } = useUser();

    const { data: spec, isLoading, error, refetch: refetchSpec } = useQuery({
        queryKey: ['spec', specId],
        queryFn: async () => {
            if (!specId) throw new Error('Spec ID is required');
            return SpecService.getOne(specId);
        },
        retry: false,
        enabled: !!specId,
        staleTime: 0, // Refetch on focus so we always have fresh data when landing on page
    });

    // When Spec Details gains focus, refetch so we have fresh data; placeholderData keeps current data visible during refetch
    useFocusEffect(
        useCallback(() => {
            if (specId) refetchSpec();
        }, [specId, refetchSpec])
    );

    // --- Real-time Updates (Pusher/Echo WebSockets) ---
    React.useEffect(() => {
        if (!specId) return;
        const { echo } = require('../../utils/echo'); // Lazy require to avoid cycle if any

        // Public channel spec.{id} – backend broadcasts RoundStarted & RoundAnswered here
        const channelName = `spec.${specId}`;
        const channel = echo.channel(channelName);

        channel.listen('.RoundStarted', () => {
            refetchSpec();
        });

        channel.listen('.RoundAnswered', () => {
            refetchSpec();
        });

        return () => {
            channel.stopListening('.RoundStarted');
            channel.stopListening('.RoundAnswered');
            echo.leave(channelName);
        };
    }, [specId, refetchSpec]);

    const likeMutation = useMutation({
        mutationFn: () => {
            if (!specId) throw new Error('Spec ID is required');
            return SpecService.toggleLike(specId);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spec', specId] }),
    });

    const eliminateMutation = useMutation({
        mutationFn: (appId: string) => {
            if (!specId) throw new Error('Spec ID is required');
            return SpecService.eliminateApplication(specId, appId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Success', 'Participant eliminated.');
        },
        onError: () => Alert.alert('Error', 'Failed to eliminate participant.'),
    });

    const joinMutation = useMutation({
        mutationFn: () => SpecService.joinSpec(String((spec as any)?.id ?? specId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            queryClient.invalidateQueries({ queryKey: ['user'] }); // refresh balance
            Alert.alert('Applied', 'You have joined this spec!');
        },
        onError: (err: any) => {
            const status = err?.response?.status;
            const data = err?.response?.data;
            // Backend sendError returns { success, message }; axios may wrap differently
            const message =
                (data && typeof data === 'object' && (data.message ?? data.error)) ||
                (typeof data === 'string' ? data : null) ||
                err?.message ||
                'Failed to join.';
            const code = data?.code;
            const isProfileIncomplete =
                status === 403 &&
                (code === 'PROFILE_INCOMPLETE' || /profile.*complete|complete.*profile/i.test(String(message)));

            if (isProfileIncomplete) {
                Alert.alert(
                    'Complete your profile',
                    'Please complete your profile to join specs. Fill in all required fields and save.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
                    ]
                );
            } else {
                Alert.alert('Error', message);
            }
        },
    });

    const isOwner = useMemo(() => {
        if (!spec || !user) return false;
        return (spec as any).user_id === user.id;
    }, [spec, user]);

    const participants = useMemo(() => {
        if (!spec?.applications) return [];
        return spec.applications.filter((a: any) => a.user_role === 'participant');
    }, [spec]);

    const myApplication = useMemo(() => {
        if (!spec?.applications || !user) return null;
        return spec.applications.find((a: any) => a.user_id === user.id);
    }, [spec, user]);

    const [answerText, setAnswerText] = React.useState('');

    const submitAnswerMutation = useMutation({
        mutationFn: ({ roundId, text }: { roundId: number, text: string }) => SpecService.submitAnswer(roundId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Success', 'Answer submitted!');
            setAnswerText(''); // Clear input
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to submit answer.'),
    });

    // --- OWNER ACTIONS ---
    const [newRoundQuestion, setNewRoundQuestion] = React.useState('');
    const startRoundMutation = useMutation({
        mutationFn: (question: string) => SpecService.startRound(String(specId), question),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Success', 'Round started!');
            setNewRoundQuestion('');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to start round.'),
    });

    const eliminateUsersMutation = useMutation({
        mutationFn: ({ roundId, userIds }: { roundId: number, userIds: number[] }) =>
            SpecService.eliminateUsers(roundId, userIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Eliminated', 'Selected users have been eliminated.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate users.'),
    });

    const closeRoundMutation = useMutation({
        mutationFn: (roundId: number) => SpecService.closeRound(roundId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            // Alert.alert('Review', 'Round closed. You can now review answers and eliminate users.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to close round.'),
    });

    const eliminateUserMutation = useMutation({
        mutationFn: ({ roundId, userId }: { roundId: number, userId: number }) =>
            SpecService.eliminateUser(roundId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            // Alert.alert('Eliminated', 'User eliminated.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate user.'),
    });


    const activeRound = useMemo(() => {
        if (!spec?.rounds || spec.rounds.length === 0) return null;
        // The backend returns rounds filtered by ACTIVE, or we find the active one.
        // Also assuming backend appends 'answers' (filtered by user) to the round.
        return spec.rounds.find((r: any) => r.status === 'ACTIVE' || r.status === 'REVIEWING');
    }, [spec]);

    const myAnswer = useMemo(() => {
        if (!activeRound?.answers || activeRound.answers.length === 0) return null;
        return activeRound.answers[0]; // User's answer
    }, [activeRound]);

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

        // 2. Check Blue Sparks
        const blueSparks = user?.balance?.blue_sparks || 0;
        if (blueSparks < 1) {
            Alert.alert(
                'Insufficient Blue Sparks',
                'You need at least 1 Blue Spark to join a spec.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Get Sparks', onPress: () => navigation.navigate('Profile') }
                ]
            );
            return;
        }

        // 3. Confirm then call API
        Alert.alert(
            'Join Spec?',
            'This will cost 1 Blue Spark.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join (-1 Spark)', onPress: () => joinMutation.mutate() }
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

    // Early return for missing specId - but all hooks must be called first
    if (!specId) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Invalid spec ID.</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
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
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>About this Spec</Text>
                    <Text style={[styles.sectionBody, { color: theme.colors.onSurface, opacity: 0.8 }]}>
                        {spec.description || 'No description provided.'}
                    </Text>
                </View>



                {/* Owner Controls (Start Round / Review) — glass card */}
                {isOwner && (
                    <>
                        {/* Start New Round Card (Only if no active round) */}
                        {!activeRound && (
                            <View style={styles.section}>
                                <View style={[styles.glassCard, { borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)', shadowColor: theme.colors.primary }]}>
                                    <BlurView intensity={64} tint={theme.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                                    <View style={styles.glassCardInner}>
                                        <View style={styles.glassHeader}>
                                            <MaterialCommunityIcons name="gavel" size={18} color={theme.colors.primary} />
                                            <Text style={[styles.glassLabel, { color: theme.colors.primary }]}>Host Round</Text>
                                        </View>
                                        <Text style={[styles.glassSubtext, { color: theme.colors.onSurfaceVariant }]}>
                                            Ask a question to eliminate 10% of participants.
                                        </Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="e.g. What's your controversial food opinion?"
                                            value={newRoundQuestion}
                                            onChangeText={setNewRoundQuestion}
                                            style={{ backgroundColor: theme.colors.surface, marginBottom: 12 }}
                                        />
                                        <Button
                                            mode="contained"
                                            onPress={() => startRoundMutation.mutate(newRoundQuestion)}
                                            loading={startRoundMutation.isPending}
                                            disabled={!newRoundQuestion.trim() || startRoundMutation.isPending || participants.filter((p: any) => p.status === 'ACCEPTED').length < 1}
                                        >
                                            Start Round {participants.filter((p: any) => p.status === 'ACCEPTED').length < 1 ? '(Need accepted users)' : ''}
                                        </Button>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Active Round Controls */}
                        {activeRound && activeRound.status === 'ACTIVE' && (
                            <View style={[styles.section, { marginBottom: 10 }]}>
                                <Surface style={{ padding: 16, borderRadius: 12, backgroundColor: theme.colors.elevation.level2 }} elevation={2}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>Round #{activeRound.round_number} Active</Text>
                                            <Text variant="bodySmall" style={{ opacity: 0.7 }}>Waiting for answers...</Text>
                                        </View>
                                        <Button
                                            mode="outlined"
                                            compact
                                            textColor={theme.colors.error}
                                            style={{ borderColor: theme.colors.error }}
                                            onPress={() => Alert.alert('Close Round?', 'Stop accepting answers and start reviewing?', [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Close & Review', onPress: () => closeRoundMutation.mutate(activeRound.id) }
                                            ])}
                                            loading={closeRoundMutation.isPending}
                                        >
                                            Close Round
                                        </Button>
                                    </View>
                                </Surface>
                            </View>
                        )}

                        {/* Reviewing Mode Controls */}
                        {activeRound && activeRound.status === 'REVIEWING' && (
                            <View style={styles.section}>
                                <View style={[styles.glassCard, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
                                    <BlurView intensity={40} tint={theme.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                                    <View style={styles.glassCardInner}>
                                        <View style={styles.glassHeader}>
                                            <MaterialCommunityIcons name="eye-check" size={20} color={theme.colors.primary} />
                                            <Text style={[styles.glassLabel, { color: theme.colors.primary, fontSize: 16 }]}>Reviewing Answers</Text>
                                        </View>
                                        <Text style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                                            Eliminate participants below. When done, start the next round.
                                        </Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Next Question (e.g. Best travel story?)"
                                            value={newRoundQuestion}
                                            onChangeText={setNewRoundQuestion}
                                            style={{ backgroundColor: theme.colors.surface, marginBottom: 12 }}
                                        />
                                        <Button
                                            mode="contained"
                                            icon="fast-forward"
                                            onPress={() => startRoundMutation.mutate(newRoundQuestion)}
                                            loading={startRoundMutation.isPending}
                                            disabled={!newRoundQuestion.trim() || startRoundMutation.isPending}
                                        >
                                            Start Next Round
                                        </Button>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Owner Monitor (Active/Reviewing Answers List) */}
                        {activeRound && (
                            <View style={styles.section}>
                                <View style={[styles.glassCard, { borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)', shadowColor: theme.colors.primary }]}>
                                    <BlurView intensity={64} tint={theme.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                                    <View style={styles.glassCardInner}>
                                        <View style={styles.glassHeaderRow}>
                                            <View style={styles.glassHeader}>
                                                <MaterialCommunityIcons name="broadcast" size={18} color={theme.colors.primary} />
                                                <Text style={[styles.glassLabel, { color: theme.colors.primary }]}>
                                                    Round {activeRound.round_number} · {activeRound.status === 'REVIEWING' ? 'Reviewing' : 'Live'}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusPill, { backgroundColor: theme.colors.primary + '18' }]}>
                                                <View style={[styles.statusDot, { backgroundColor: theme.colors.primary }]} />
                                                <Text style={[styles.statusPillText, { color: theme.colors.primary }]}>
                                                    {activeRound.status === 'REVIEWING' ? 'Action' : 'Waiting'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.glassQuestion, { color: theme.colors.onSurface }]}>
                                            {activeRound.question_text}
                                        </Text>
                                        <View style={[styles.glassDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                                        {activeRound.answers && activeRound.answers.length > 0 ? (
                                            <View style={styles.ownerAnswersList}>
                                                <Text style={[styles.ownerAnswersTitle, { color: theme.colors.onSurfaceVariant }]}>
                                                    Answers ({activeRound.answers.length})
                                                </Text>
                                                {activeRound.answers.map((a: any) => {
                                                    const displayName = a.user?.profile?.full_name || a.user?.name || 'Participant';
                                                    const avatarUri = toImageUri(a.user?.profile?.avatar) || (a.user?.profile?.full_name || a.user?.name
                                                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=128&background=6750A4&color=ffffff`
                                                        : undefined);
                                                    const isEliminated = a.is_eliminated; // backend should return this

                                                    return (
                                                        <View key={a.id} style={[styles.ownerAnswerRow, { borderColor: theme.colors.outlineVariant, opacity: isEliminated ? 0.5 : 1 }]}>
                                                            <Avatar.Image size={36} source={{ uri: avatarUri }} style={styles.ownerAnswerAvatar} />
                                                            <View style={styles.ownerAnswerBody}>
                                                                <Text style={[styles.ownerAnswerName, { color: theme.colors.onSurface, textDecorationLine: isEliminated ? 'line-through' : 'none' }]} numberOfLines={1}>
                                                                    {displayName}
                                                                </Text>
                                                                <Text style={[styles.ownerAnswerText, { color: theme.colors.onSurface }]}>
                                                                    {a.answer_text}
                                                                </Text>
                                                            </View>
                                                            {/* Eliminate Button (Only in REVIEWING and not eliminated) */}
                                                            {activeRound.status === 'REVIEWING' && !isEliminated && (
                                                                <IconButton
                                                                    icon="close-circle-outline"
                                                                    iconColor={theme.colors.error}
                                                                    size={24}
                                                                    onPress={() => eliminateUserMutation.mutate({ roundId: activeRound.id, userId: a.user?.id })}
                                                                    disabled={eliminateUserMutation.isPending}
                                                                />
                                                            )}
                                                            {isEliminated && (
                                                                <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: 'bold' }}>ELIMINATED</Text>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <Text style={[styles.glassSubtext, { color: theme.colors.onSurfaceVariant }]}>
                                                Answers will appear here once everyone has submitted.
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* Active Round (Participant View) — glass card */}
                {activeRound && myApplication && myApplication.status === 'ACCEPTED' && !isOwner ? (
                    <View style={styles.section}>
                        <View style={[styles.glassCard, { borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)', shadowColor: theme.colors.primary }]}>
                            <BlurView intensity={64} tint={theme.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                            <View style={styles.glassCardInner}>
                                <View style={styles.glassHeaderRow}>
                                    <View style={styles.glassHeader}>
                                        <MaterialCommunityIcons
                                            name={myAnswer ? 'check-circle' : 'clock-fast'}
                                            size={18}
                                            color={theme.colors.primary}
                                        />
                                        <Text style={[styles.glassLabel, { color: theme.colors.primary }]}>
                                            Round {activeRound.round_number}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusPill, myAnswer ? styles.statusPillAnswered : styles.statusPillAction]}>
                                        <View style={[styles.statusDot, myAnswer ? styles.statusDotAnswered : styles.statusDotAction]} />
                                        <Text style={[styles.statusPillText, { color: myAnswer ? '#059669' : '#B45309' }]}>
                                            {myAnswer ? 'Answered' : 'Action required'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.glassQuestion, { color: theme.colors.onSurface }]}>
                                    {activeRound.question_text}
                                </Text>

                                {myAnswer ? (
                                    <View style={[styles.glassAnswerBox, { borderColor: 'rgba(5,150,105,0.5)' }]}>
                                        <Text style={[styles.glassAnswerText, { color: theme.colors.onSurface }]}>"{myAnswer.answer_text}"</Text>
                                    </View>
                                ) : (
                                    <View style={styles.glassForm}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Type your answer..."
                                            value={answerText}
                                            onChangeText={setAnswerText}
                                            multiline
                                            numberOfLines={5}
                                            style={[styles.glassInput, styles.glassTextArea, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' }]}
                                            outlineColor={theme.colors.outline}
                                            activeOutlineColor={theme.colors.primary}
                                        />
                                        <Button
                                            mode="contained"
                                            onPress={() => submitAnswerMutation.mutate({ roundId: activeRound.id, text: answerText })}
                                            loading={submitAnswerMutation.isPending}
                                            disabled={!answerText.trim() || submitAnswerMutation.isPending}
                                            buttonColor={theme.colors.primary}
                                            style={styles.glassBtn}
                                        >
                                            Submit Answer
                                        </Button>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ) : null}

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
                                        <Text style={[styles.participantStatus, { color: theme.colors.onSurface, opacity: 0.65 }]} numberOfLines={1}>
                                            {p.status}
                                        </Text>
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
                ) : (
                    <Button
                        mode="contained"
                        onPress={handleJoin}
                        loading={joinMutation.isPending}
                        style={styles.footerBtn}
                        buttonColor={theme.colors.primary}
                        labelStyle={{ fontSize: 16, fontWeight: '800' }}
                    >
                        Join Spec (1 Blue Spark)
                    </Button>
                )}
            </Surface>
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
