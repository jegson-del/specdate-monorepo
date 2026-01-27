import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Avatar, Surface, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';

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
    const specId = route.params?.specId;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user } = useUser();

    const { data: spec, isLoading, error } = useQuery({
        queryKey: ['spec', specId],
        queryFn: async () => {
            if (!specId) throw new Error('Spec ID is required');
            const res = await SpecService.getOne(specId);
            // Our backend wraps responses: { success, message, data }
            return (res as any)?.data ?? res;
        },
        retry: false,
        enabled: !!specId, // Only run query if specId is available
    });

    const likeMutation = useMutation({
        mutationFn: () => SpecService.toggleLike(specId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spec', specId] }),
    });

    const eliminateMutation = useMutation({
        mutationFn: (appId: string) => SpecService.eliminateApplication(specId, appId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Success', 'Participant eliminated.');
        },
        onError: () => Alert.alert('Error', 'Failed to eliminate participant.'),
    });

    const joinMutation = useMutation({
        mutationFn: () => SpecService.joinSpec(specId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Applied', 'You have joined this spec!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to join.'),
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
                            colors={[ 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)' ]}
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
                                    p.user?.profile?.avatar ||
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
                {myApplication ? (
                    <Button mode="contained" disabled style={styles.footerBtn} buttonColor={theme.colors.primary}>
                        Status: {myApplication.status}
                    </Button>
                ) : (
                    <Button
                        mode="contained"
                        onPress={() => joinMutation.mutate()}
                        loading={joinMutation.isPending}
                        style={styles.footerBtn}
                        buttonColor={theme.colors.primary}
                    >
                        Join this Spec
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
});
