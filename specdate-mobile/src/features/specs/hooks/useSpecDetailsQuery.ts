import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';

type UseSpecDetailsQueryParams = {
    specId?: string;
    fromNotification?: boolean;
    navigation: any;
};

export function useSpecDetailsQuery({ specId, fromNotification, navigation }: UseSpecDetailsQueryParams) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['spec', specId],
        queryFn: async () => {
            if (!specId) throw new Error('Spec ID is required');
            return SpecService.getOne(specId);
        },
        retry: 1,
        enabled: !!specId,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        placeholderData: undefined,
    });

    useFocusEffect(
        useCallback(() => {
            if (specId && fromNotification) {
                queryClient.removeQueries({ queryKey: ['spec', specId] });
                navigation.setParams({ fromNotification: undefined });
            }
        }, [specId, fromNotification, queryClient, navigation])
    );

    useFocusEffect(
        useCallback(() => {
            if (specId) {
                queryClient.refetchQueries({ queryKey: ['spec', specId] });
            }
        }, [specId, queryClient])
    );

    useEffect(() => {
        if (!specId) return;
        const { echo } = require('../../../utils/echo');
        const channelName = `spec.${specId}`;
        const channel = echo.channel(channelName);

        channel.listen('.RoundStarted', query.refetch);
        channel.listen('.RoundAnswered', query.refetch);

        return () => {
            channel.stopListening('.RoundStarted');
            channel.stopListening('.RoundAnswered');
            echo.leave(channelName);
        };
    }, [specId, query.refetch]);

    return query;
}
