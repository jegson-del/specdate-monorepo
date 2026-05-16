import React from 'react';
import { Alert } from 'react-native';

type UseSpecRoundsFlowParams = {
    nudgeUsersMutation: any;
    participants: any[];
    spec: any;
};

export function useSpecRoundsFlow({ nudgeUsersMutation, participants, spec }: UseSpecRoundsFlowParams) {
    const [nudgePendingRoundId, setNudgePendingRoundId] = React.useState<string | number | null>(null);

    const rounds = React.useMemo(() => {
        const rawRounds = spec?.rounds;
        if (Array.isArray(rawRounds)) return rawRounds;
        if (rawRounds && typeof rawRounds === 'object') return Object.values(rawRounds);
        return [];
    }, [spec]);

    const hasOpenRound = React.useMemo(
        () => rounds.some((round: any) => round.status === 'ACTIVE' || round.status === 'REVIEWING'),
        [rounds]
    );

    const acceptedParticipants = React.useMemo(
        () => participants.filter((participant: any) => participant.status === 'ACCEPTED'),
        [participants]
    );

    const getPendingParticipantIds = React.useCallback((round: any) => {
        if (!round || String(round.status).toUpperCase() !== 'ACTIVE') return [];
        const answeredIds = new Set((round.answers || []).map((answer: any) => String(answer.user_id)));
        return acceptedParticipants
            .filter((participant: any) => !answeredIds.has(String(participant.user_id)))
            .map((participant: any) => Number(participant.user_id))
            .filter((id: number) => Number.isFinite(id));
    }, [acceptedParticipants]);

    const handleNudgeRound = React.useCallback((round: any) => {
        const userIds = getPendingParticipantIds(round);
        if (userIds.length === 0) {
            Alert.alert('No pending participants', 'Everyone has answered this round.');
            return;
        }
        setNudgePendingRoundId(round.id);
        nudgeUsersMutation.mutate(
            { roundId: Number(round.id), userIds },
            { onSettled: () => setNudgePendingRoundId(null) }
        );
    }, [getPendingParticipantIds, nudgeUsersMutation]);

    return {
        getPendingParticipantIds,
        handleNudgeRound,
        hasOpenRound,
        nudgePendingRoundId,
        rounds,
    };
}
