import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isAudioMedia, isVideoMedia } from '../specDetailsUtils';

type SpecRoundsListProps = {
    canOpenRoundDetails: boolean;
    isSpecClosed: boolean;
    onOpenRound: (roundId: string | number) => void;
    rounds?: any[] | null;
    theme: any;
};

export function SpecRoundsList({
    canOpenRoundDetails,
    isSpecClosed,
    onOpenRound,
    rounds,
    theme,
}: SpecRoundsListProps) {
    if (!rounds || rounds.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Rounds</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {rounds.length} round{rounds.length !== 1 ? 's' : ''}
                </Text>
            </View>
            <View style={styles.roundsFlatList}>
                {rounds.map((round: any) => {
                    const roundStatus = isSpecClosed ? 'COMPLETED' : round.status;
                    const answers = round.answers || [];
                    const eliminated = answers.filter((answer: any) => answer.is_eliminated).length;
                    const remaining = answers.length - eliminated;
                    const statusColor = roundStatus === 'ACTIVE' ? '#16a34a' : roundStatus === 'REVIEWING' ? '#ca8a04' : theme.colors.outline;
                    const hasAudioQuestion = isAudioMedia(round.media);
                    const hasVideoQuestion = isVideoMedia(round.media);

                    return (
                        <TouchableOpacity
                            key={round.id}
                            activeOpacity={canOpenRoundDetails ? 0.7 : 1}
                            disabled={!canOpenRoundDetails}
                            onPress={() => {
                                if (!canOpenRoundDetails) return;
                                onOpenRound(round.id);
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
                                <Text style={[styles.roundCardFlatNumText, { color: theme.colors.onSurface }]}>{round.round_number}</Text>
                            </View>
                            <View style={styles.roundCardFlatBody}>
                                <Text numberOfLines={2} style={[styles.roundCardFlatQuestion, { color: theme.colors.onSurface }]}>
                                    {round.question_text?.trim() || 'Voice question'}
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
                                        {eliminated} out - {remaining} left
                                    </Text>
                                    <View style={[styles.roundCardFlatPill, { backgroundColor: roundStatus === 'ACTIVE' ? 'rgba(22,163,74,0.12)' : roundStatus === 'REVIEWING' ? 'rgba(202,138,4,0.12)' : theme.colors.surfaceVariant }]}>
                                        <View style={[styles.roundCardFlatPillDot, { backgroundColor: statusColor }]} />
                                        <Text style={[styles.roundCardFlatPillText, { color: theme.colors.onSurface }]}>{roundStatus}</Text>
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
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    sectionSubtitle: { fontSize: 13 },
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
