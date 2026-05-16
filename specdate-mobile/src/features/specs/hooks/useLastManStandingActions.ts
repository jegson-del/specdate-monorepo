import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';

type UseLastManStandingActionsParams = {
    specId?: string;
    refetchSpec: () => Promise<any>;
    setLastManStandingVisible: (value: boolean) => void;
    setLastManStandingWinnerName: (value: string) => void;
    setLastManStandingSpecId: (value: string | null) => void;
};

type ExtendSearchPayload = {
    specIdToUse: string;
    comment: string;
    durationDays: number;
};

function completeSpec(current: any) {
    if (!current) return current;
    return {
        ...current,
        status: 'COMPLETED',
        rounds: Array.isArray(current.rounds)
            ? current.rounds.map((round: any) => (
                round.status === 'ACTIVE' || round.status === 'REVIEWING'
                    ? { ...round, status: 'COMPLETED' }
                    : round
            ))
            : current.rounds,
    };
}

export function useLastManStandingActions({
    specId,
    refetchSpec,
    setLastManStandingVisible,
    setLastManStandingWinnerName,
    setLastManStandingSpecId,
}: UseLastManStandingActionsParams) {
    const queryClient = useQueryClient();

    const resetLastManStanding = () => {
        setLastManStandingVisible(false);
        setLastManStandingSpecId(null);
        setLastManStandingWinnerName('');
    };

    const openLastManStandingFromPayload = (payload: any) => {
        if (!payload?.last_man_standing || !payload.winner || payload.spec_id == null) return false;
        setLastManStandingWinnerName(payload.winner.name || 'Winner');
        setLastManStandingSpecId(String(payload.spec_id));
        setLastManStandingVisible(true);
        return true;
    };

    const updateCredits = (credits: unknown) => {
        if (typeof credits !== 'number') return;
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
    };

    const createDateMutation = useMutation({
        mutationFn: (specIdToUse: string) => SpecService.createDate(specIdToUse),
        onSuccess: async (res: any, specIdToUse) => {
            const data = res?.data ?? res;
            const cacheSpecId = String(specId ?? specIdToUse);
            queryClient.setQueryData(['spec', cacheSpecId], completeSpec);
            queryClient.setQueryData(['spec', cacheSpecId, 'round_details'], completeSpec);
            queryClient.invalidateQueries({ queryKey: ['spec', cacheSpecId] });
            queryClient.invalidateQueries({ queryKey: ['spec', cacheSpecId, 'round_details'] });
            queryClient.invalidateQueries({ queryKey: ['specs'] });
            queryClient.invalidateQueries({ queryKey: ['my-specs'] });
            queryClient.invalidateQueries({ queryKey: ['dates'] });
            await refetchSpec();
            resetLastManStanding();
            Alert.alert('Date created!', data?.date_code ? `Your date code: ${data.date_code}` : 'You are now matched. Go plan your date!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to create date.'),
    });

    const extendSearchMutation = useMutation({
        mutationFn: ({ specIdToUse, comment, durationDays }: ExtendSearchPayload) =>
            SpecService.extendSearch(specIdToUse, comment, durationDays),
        onSuccess: async (res: any) => {
            updateCredits(res?.data?.balance?.credits);
            if (specId) {
                queryClient.invalidateQueries({ queryKey: ['spec', specId] });
                queryClient.invalidateQueries({ queryKey: ['spec', specId, 'round_details'] });
            }
            await refetchSpec();
            resetLastManStanding();
            Alert.alert('Search extended', 'Your spec is open again for new applicants.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to extend search.'),
    });

    return {
        createDateMutation,
        extendSearchMutation,
        openLastManStandingFromPayload,
        resetLastManStanding,
    };
}
