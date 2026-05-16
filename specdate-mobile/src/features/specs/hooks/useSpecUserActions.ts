import React from 'react';
import { Alert } from 'react-native';

type UseSpecUserActionsParams = {
    eliminateMutation: any;
    joinMutation: any;
    navigation: any;
    spec: any;
    user: any;
};

export function useSpecUserActions({
    eliminateMutation,
    joinMutation,
    navigation,
    spec,
    user,
}: UseSpecUserActionsParams) {
    const handleJoin = React.useCallback(() => {
        if (!user?.profile_complete) {
            Alert.alert(
                'Complete your profile',
                'Please complete your profile to join specs. Fill in all required fields and save.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
                ]
            );
            return;
        }

        Alert.alert(
            'Join Spec?',
            'Join specs for free. Credits are only required to create a new spec.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join for free', onPress: () => joinMutation.mutate() },
            ]
        );
    }, [joinMutation, navigation, user?.profile_complete]);

    const openParticipantProfile = React.useCallback((participantUserId: string | number) => {
        if (String(participantUserId) === String(user?.id)) {
            navigation.navigate('Profile');
        } else {
            navigation.navigate('ProfileViewer', { userId: Number(participantUserId) });
        }
    }, [navigation, user?.id]);

    const confirmEliminateParticipant = React.useCallback((participantId: string | number, displayName: string) => {
        Alert.alert(
            'Eliminate participant?',
            `Remove ${displayName} from this spec?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Eliminate', style: 'destructive', onPress: () => eliminateMutation.mutate(String(participantId)) },
            ]
        );
    }, [eliminateMutation]);

    const openCreatorProfile = React.useCallback(() => {
        const uid = spec?.user_id;
        if (!uid) return;
        if (String(uid) === String(user?.id)) {
            navigation.navigate('Profile');
        } else {
            navigation.navigate('ProfileViewer', { userId: Number(uid) });
        }
    }, [navigation, spec?.user_id, user?.id]);

    const onShare = React.useCallback(() => {
        Alert.alert('Share', `Sharing spec: ${spec?.title}`);
    }, [spec?.title]);

    return {
        confirmEliminateParticipant,
        handleJoin,
        onShare,
        openCreatorProfile,
        openParticipantProfile,
    };
}
