import { useCallback } from 'react';
import { Alert } from 'react-native';

type UseRoundOwnerFlowParams = {
    closeRoundMutation: any;
    eliminateUsersMutation: any;
    nudgeUsersMutation: any;
    roundToShow: any;
    setCloseRoundModalVisible: (value: boolean) => void;
    unresponsiveParticipants: any[];
};

export function useRoundOwnerFlow({
    closeRoundMutation,
    eliminateUsersMutation,
    nudgeUsersMutation,
    roundToShow,
    setCloseRoundModalVisible,
    unresponsiveParticipants,
}: UseRoundOwnerFlowParams) {
    const pendingUserIds = useCallback(
        () => unresponsiveParticipants.map((participant: any) => participant.user_id),
        [unresponsiveParticipants]
    );

    const handleCloseRoundPress = useCallback(() => {
        if (!roundToShow) return;
        if (unresponsiveParticipants.length > 0) {
            setCloseRoundModalVisible(true);
            return;
        }

        Alert.alert('Close Round?', 'Stop accepting answers?', [
            { text: 'Cancel' },
            { text: 'Close', onPress: () => closeRoundMutation.mutate(roundToShow.id) },
        ]);
    }, [closeRoundMutation, roundToShow, setCloseRoundModalVisible, unresponsiveParticipants.length]);

    const handleEliminateAndClose = useCallback(async () => {
        if (!roundToShow) return;
        const ids = pendingUserIds();
        if (ids.length > 0) {
            try {
                const apiResponse: any = await eliminateUsersMutation.mutateAsync({ rId: roundToShow.id, userIds: ids });
                if (apiResponse?.data?.last_man_standing) {
                    setCloseRoundModalVisible(false);
                    return;
                }
            } catch (e) {
                return;
            }
        }
        closeRoundMutation.mutate(roundToShow.id);
        setCloseRoundModalVisible(false);
    }, [closeRoundMutation, eliminateUsersMutation, pendingUserIds, roundToShow, setCloseRoundModalVisible]);

    const handleNudge = useCallback(() => {
        if (!roundToShow) return;
        const ids = pendingUserIds();
        nudgeUsersMutation.mutate(
            { rId: roundToShow.id, userIds: ids },
            { onSuccess: () => setCloseRoundModalVisible(false) }
        );
    }, [nudgeUsersMutation, pendingUserIds, roundToShow, setCloseRoundModalVisible]);

    return {
        handleCloseRoundPress,
        handleEliminateAndClose,
        handleNudge,
    };
}
