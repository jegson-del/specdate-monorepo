import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { MediaModerationError } from '../../../services/media';
import { resolveShareableRoundMedia } from '../roundMediaUpload';
import type { RoundMediaAsset } from '../components';
import type { UploadProgressState } from '../../../components';

type UseSpecDetailsMutationsParams = {
    specId?: string;
    spec: any;
    navigation: any;
    refetchSpec: () => Promise<any>;
    roundQuestionMedia: RoundMediaAsset | null;
    setNewRoundQuestion: (value: string) => void;
    setRoundQuestionMedia: (value: RoundMediaAsset | null) => void;
    setLastManStandingVisible: (value: boolean) => void;
    setLastManStandingWinnerName: (value: string) => void;
    setLastManStandingSpecId: (value: string | null) => void;
    setUploadProgress?: (progress: UploadProgressState) => void;
};

export function useSpecDetailsMutations({
    specId,
    spec,
    navigation,
    refetchSpec,
    roundQuestionMedia,
    setNewRoundQuestion,
    setRoundQuestionMedia,
    setLastManStandingVisible,
    setLastManStandingWinnerName,
    setLastManStandingSpecId,
    setUploadProgress,
}: UseSpecDetailsMutationsParams) {
    const queryClient = useQueryClient();

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

    const resetLastManStanding = () => {
        setLastManStandingVisible(false);
        setLastManStandingSpecId(null);
        setLastManStandingWinnerName('');
    };

    const isMediaReviewError = (err: unknown) => {
        const status = String((err as any)?.status ?? '');
        return err instanceof MediaModerationError || ['flagged', 'failed', 'timeout', 'reviewing'].includes(status);
    };

    const showMediaReviewResult = (err: any, title: string) => {
        setUploadProgress?.({
            title,
            message: err?.message || 'This file could not be used. Please choose another file.',
            status: err?.status === 'reviewing' ? 'reviewing' : 'error',
            dismissLabel: 'OK',
            onDismiss: () => setUploadProgress?.(null),
        });
    };

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
        onSuccess: async (apiResponse: any) => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            await refetchSpec();
            const payload = apiResponse?.data;
            if (payload?.last_man_standing && payload.winner && payload.spec_id != null) {
                setLastManStandingWinnerName(payload.winner.name || 'Winner');
                setLastManStandingSpecId(String(payload.spec_id));
                setLastManStandingVisible(true);
            } else {
                Alert.alert('Success', 'Participant eliminated.');
            }
        },
        onError: () => Alert.alert('Error', 'Failed to eliminate participant.'),
    });

    const createDateMutation = useMutation({
        mutationFn: (specIdToUse: string) => SpecService.createDate(specIdToUse),
        onSuccess: async (res: any) => {
            const data = res?.data ?? res;
            queryClient.setQueryData(['spec', specId], (current: any) => current ? ({
                ...current,
                status: 'COMPLETED',
                rounds: Array.isArray(current.rounds)
                    ? current.rounds.map((round: any) => (
                        round.status === 'ACTIVE' || round.status === 'REVIEWING'
                            ? { ...round, status: 'COMPLETED' }
                            : round
                    ))
                    : current.rounds,
            }) : current);
            queryClient.setQueryData(['spec', specId, 'round_details'], (current: any) => current ? ({
                ...current,
                status: 'COMPLETED',
                rounds: Array.isArray(current.rounds)
                    ? current.rounds.map((round: any) => (
                        round.status === 'ACTIVE' || round.status === 'REVIEWING'
                            ? { ...round, status: 'COMPLETED' }
                            : round
                    ))
                    : current.rounds,
            }) : current);
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            queryClient.invalidateQueries({ queryKey: ['spec', specId, 'round_details'] });
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
        mutationFn: ({ specIdToUse, comment, durationDays }: { specIdToUse: string; comment: string; durationDays: number }) =>
            SpecService.extendSearch(specIdToUse, comment, durationDays),
        onSuccess: async (res: any) => {
            updateCredits(res?.data?.balance?.credits);
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            await refetchSpec();
            resetLastManStanding();
            Alert.alert('Search extended', 'Your spec is open again for new applicants.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to extend search.'),
    });

    const joinMutation = useMutation({
        mutationFn: () => SpecService.joinSpec(String((spec as any)?.id ?? specId)),
        onSuccess: (result: any) => {
            updateCredits(result?.data?.balance?.credits);
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
            Alert.alert('Applied', 'You have joined this spec for free!');
        },
        onError: (err: any) => {
            const status = err?.response?.status;
            const data = err?.response?.data;
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
                        { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
                    ]
                );
            } else {
                Alert.alert('Error', message);
            }
        },
    });

    const startRoundMutation = useMutation({
        mutationFn: async (question: string) => {
            let mediaId: number | undefined;
            if (roundQuestionMedia) {
                const uploadType =
                    roundQuestionMedia.assetType === 'audio'
                        ? 'round_question_audio'
                        : roundQuestionMedia.assetType === 'video'
                            ? 'round_question_video'
                            : 'round_question_image';
                const reviewed = await resolveShareableRoundMedia({
                    asset: roundQuestionMedia,
                    uploadType,
                    onAssetChange: setRoundQuestionMedia,
                    onProgress: setUploadProgress,
                    label: 'round question media',
                });
                mediaId = reviewed.id;
            }

            setUploadProgress?.({
                title: 'Starting round',
                message: 'Adding the media to the round question.',
            });
            return SpecService.startRound(String(specId), question, mediaId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Success', 'Round started!');
            setNewRoundQuestion('');
            setRoundQuestionMedia(null);
        },
        onError: (err: any) => {
            if (isMediaReviewError(err)) {
                showMediaReviewResult(err, 'Round media not sent');
                return;
            }
            Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to start round.');
        },
        onSettled: (_data, err) => {
            if (!isMediaReviewError(err)) {
                setUploadProgress?.(null);
            }
        },
    });

    const eliminateUsersMutation = useMutation({
        mutationFn: ({ roundId, userIds }: { roundId: number; userIds: number[] }) =>
            SpecService.eliminateUsers(roundId, userIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', specId] });
            Alert.alert('Eliminated', 'Selected users have been eliminated.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate users.'),
    });

    return {
        likeMutation,
        eliminateMutation,
        createDateMutation,
        extendSearchMutation,
        joinMutation,
        startRoundMutation,
        eliminateUsersMutation,
    };
}
