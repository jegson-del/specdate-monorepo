import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { MediaModerationError } from '../../../services/media';
import { resolveShareableRoundMedia } from '../roundMediaUpload';
import type { RoundMediaAsset } from '../components';
import type { UploadProgressState } from '../../../components';
import type { TextSelection } from '../../../utils/emojiText';

type UseRoundDetailsMutationsParams = {
    answerMedia: RoundMediaAsset | null;
    navigation: any;
    nextRoundQuestionMedia: RoundMediaAsset | null;
    openLastManStandingFromPayload: (payload: any) => boolean;
    refetchSpec: () => Promise<any>;
    setAnswerMedia: (value: RoundMediaAsset | null) => void;
    setAnswerSelection: (selection: TextSelection) => void;
    setAnswerText: (value: string) => void;
    setIsEditing: (value: boolean) => void;
    setNextRoundQuestion: (value: string) => void;
    setNextRoundQuestionMedia: (value: RoundMediaAsset | null) => void;
    setNextRoundQuestionSelection: (selection: TextSelection) => void;
    setUploadProgress: (progress: UploadProgressState) => void;
    specId?: string;
};

function isMediaReviewError(err: unknown): boolean {
    const status = String((err as any)?.status ?? '');
    return err instanceof MediaModerationError || ['flagged', 'failed', 'timeout', 'reviewing'].includes(status);
}

export function useRoundDetailsMutations({
    answerMedia,
    navigation,
    nextRoundQuestionMedia,
    openLastManStandingFromPayload,
    refetchSpec,
    setAnswerMedia,
    setAnswerSelection,
    setAnswerText,
    setIsEditing,
    setNextRoundQuestion,
    setNextRoundQuestionMedia,
    setNextRoundQuestionSelection,
    setUploadProgress,
    specId,
}: UseRoundDetailsMutationsParams) {
    const queryClient = useQueryClient();

    const showMediaReviewResult = (err: any, title: string): void => {
        setUploadProgress({
            title,
            message: err?.message || 'This file could not be used. Please choose another file.',
            status: err?.status === 'reviewing' ? 'reviewing' : 'error',
            dismissLabel: 'OK',
            onDismiss: () => setUploadProgress(null),
        });
    };

    const invalidateRoundSpec = () => {
        queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
        queryClient.invalidateQueries({ queryKey: ['spec', String(specId), 'round_details'] });
    };

    const submitAnswerMutation = useMutation({
        mutationFn: async ({ rId, text }: { rId: number; text: string }) => {
            let mediaId: number | undefined;
            if (answerMedia) {
                const uploadType =
                    answerMedia.assetType === 'audio'
                        ? 'round_answer_audio'
                        : answerMedia.assetType === 'video'
                            ? 'round_answer_video'
                            : 'round_answer_image';
                const reviewed = await resolveShareableRoundMedia({
                    asset: answerMedia,
                    uploadType,
                    onAssetChange: setAnswerMedia,
                    onProgress: setUploadProgress,
                    label: 'answer media',
                });
                mediaId = reviewed.id;
            }
            setUploadProgress({
                title: 'Submitting answer',
                message: 'Adding your answer to the round.',
            });
            return SpecService.submitAnswer(rId, text, mediaId);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            await refetchSpec();
            setAnswerText('');
            setAnswerSelection({ start: 0, end: 0 });
            setAnswerMedia(null);
            Alert.alert('Success', 'Answer submitted!');
        },
        onError: (err: any) => {
            if (isMediaReviewError(err)) {
                showMediaReviewResult(err, 'Answer media not sent');
                return;
            }
            const msg = err?.response?.data?.message ?? err?.message;
            const fileErrors = err?.response?.data?.errors?.file;
            const detail = Array.isArray(fileErrors) ? fileErrors[0] : (typeof fileErrors === 'string' ? fileErrors : null);
            Alert.alert('Error', detail || msg || 'Failed to submit answer.');
        },
        onSettled: (_data, err) => {
            if (!isMediaReviewError(err)) {
                setUploadProgress(null);
            }
        },
    });

    const closeRoundMutation = useMutation({
        mutationFn: (rId: number) => SpecService.closeRound(rId),
        onSuccess: invalidateRoundSpec,
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to close round.'),
    });

    const eliminateUserMutation = useMutation({
        mutationFn: ({ rId, userId }: { rId: number; userId: number }) =>
            SpecService.eliminateUser(rId, userId),
        onSuccess: async (apiResponse: any) => {
            invalidateRoundSpec();
            await refetchSpec();
            const payload = apiResponse?.data;
            if (!openLastManStandingFromPayload(payload)) {
                Alert.alert('Success', 'Participant eliminated.');
            }
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate user.'),
    });

    const startRoundMutation = useMutation({
        mutationFn: async (question: string) => {
            let mediaId: number | undefined;
            if (nextRoundQuestionMedia) {
                const uploadType =
                    nextRoundQuestionMedia.assetType === 'audio'
                        ? 'round_question_audio'
                        : nextRoundQuestionMedia.assetType === 'video'
                            ? 'round_question_video'
                            : 'round_question_image';
                const reviewed = await resolveShareableRoundMedia({
                    asset: nextRoundQuestionMedia,
                    uploadType,
                    onAssetChange: setNextRoundQuestionMedia,
                    onProgress: setUploadProgress,
                    label: 'round question media',
                });
                mediaId = reviewed.id;
            }
            setUploadProgress({
                title: 'Starting round',
                message: 'Adding the media to the round question.',
            });
            return SpecService.startRound(String(specId), question, mediaId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            Alert.alert('Success', 'Next round started!');
            setNextRoundQuestion('');
            setNextRoundQuestionSelection({ start: 0, end: 0 });
            setNextRoundQuestionMedia(null);
            navigation.goBack();
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
                setUploadProgress(null);
            }
        },
    });

    const updateRoundMutation = useMutation({
        mutationFn: ({ rId, text }: { rId: number; text: string }) => SpecService.updateRound(rId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(specId)] });
            setIsEditing(false);
            Alert.alert('Success', 'Question updated!');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to update question.'),
    });

    const eliminateUsersMutation = useMutation({
        mutationFn: ({ rId, userIds }: { rId: number; userIds: number[] }) =>
            SpecService.eliminateUsers(rId, userIds),
        onSuccess: async (apiResponse: any) => {
            invalidateRoundSpec();
            await refetchSpec();
            openLastManStandingFromPayload(apiResponse?.data);
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to eliminate users.'),
    });

    const nudgeUsersMutation = useMutation({
        mutationFn: ({ rId, userIds }: { rId: number; userIds: number[] }) =>
            SpecService.nudgeUsers(rId, userIds),
        onSuccess: (data: any) => {
            Alert.alert('Success', data?.message || data?.data?.message || 'Participants nudged.');
        },
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message || 'Failed to nudge users.'),
    });

    return {
        closeRoundMutation,
        eliminateUserMutation,
        eliminateUsersMutation,
        nudgeUsersMutation,
        startRoundMutation,
        submitAnswerMutation,
        updateRoundMutation,
    };
}
