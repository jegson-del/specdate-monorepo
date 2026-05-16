import React from 'react';
import { Alert } from 'react-native';
import { confirmMediaShareWithAiScan } from '../../../utils/confirmMediaShareWithAiScan';
import type { RoundMediaAsset } from '../components';

type UseSpecStartRoundFlowParams = {
    acceptedParticipantCount: number;
    isFirstRound: boolean;
    newRoundQuestion: string;
    roundQuestionMedia: RoundMediaAsset | null;
    spec: any;
    startRoundMutation: any;
};

export function useSpecStartRoundFlow({
    acceptedParticipantCount,
    isFirstRound,
    newRoundQuestion,
    roundQuestionMedia,
    spec,
    startRoundMutation,
}: UseSpecStartRoundFlowParams) {
    const handleStartRoundPress = React.useCallback(async () => {
        if (roundQuestionMedia) {
            const ok = await confirmMediaShareWithAiScan();
            if (!ok) return;
        }

        const maxParticipants = Number(spec?.max_participants ?? 0);
        const startsBelowCapacity =
            isFirstRound &&
            maxParticipants > 0 &&
            acceptedParticipantCount > 0 &&
            acceptedParticipantCount < maxParticipants;

        if (startsBelowCapacity) {
            Alert.alert(
                'Start quest now?',
                `Your spec has ${acceptedParticipantCount} accepted participant${acceptedParticipantCount === 1 ? '' : 's'} out of ${maxParticipants}. If you begin now, applications will close immediately, expiry will be set to today, and max participants will be locked to ${acceptedParticipantCount}.`,
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
    }, [
        acceptedParticipantCount,
        isFirstRound,
        newRoundQuestion,
        roundQuestionMedia,
        spec?.max_participants,
        startRoundMutation,
    ]);

    return {
        handleStartRoundPress,
    };
}
