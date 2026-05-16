import React from 'react';
import type { UploadProgressState } from '../../../components';
import { insertEmojiAtSelection, type TextSelection } from '../../../utils/emojiText';
import { useRoundMediaPicker } from './useRoundMediaPicker';
import { useRoundAudioRecorder } from '../components';
import type { RoundMediaAsset } from '../components';

export function useSpecRoundComposerState() {
    const [newRoundQuestion, setNewRoundQuestion] = React.useState('');
    const [newRoundQuestionSelection, setNewRoundQuestionSelection] = React.useState<TextSelection>({ start: 0, end: 0 });
    const [roundQuestionMedia, setRoundQuestionMedia] = React.useState<RoundMediaAsset | null>(null);
    const [roundQuestionMediaSheet, setRoundQuestionMediaSheet] = React.useState<'file' | 'camera' | null>(null);
    const [questionVideoViewerVisible, setQuestionVideoViewerVisible] = React.useState(false);
    const [questionVideoViewerUri, setQuestionVideoViewerUri] = React.useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState<UploadProgressState>(null);

    const questionAudioRecorder = useRoundAudioRecorder(setRoundQuestionMedia);

    const setSelectedRoundQuestionMedia = React.useCallback((_target: string, asset: RoundMediaAsset) => {
        setRoundQuestionMedia(asset);
    }, []);

    const {
        pickFromLibrary: pickRoundQuestionMedia,
        recordVideo: recordRoundQuestionVideo,
        takePhoto: takeRoundQuestionPhoto,
    } = useRoundMediaPicker({ onMediaSelected: setSelectedRoundQuestionMedia });

    const handleNewRoundQuestionEmoji = React.useCallback((emoji: string) => {
        const next = insertEmojiAtSelection(newRoundQuestion, emoji, newRoundQuestionSelection);
        setNewRoundQuestion(next.value);
        setNewRoundQuestionSelection(next.selection);
    }, [newRoundQuestion, newRoundQuestionSelection]);

    const openQuestionVideo = React.useCallback((uri: string) => {
        setQuestionVideoViewerUri(uri);
        setQuestionVideoViewerVisible(true);
    }, []);

    const closeQuestionVideo = React.useCallback(() => {
        setQuestionVideoViewerVisible(false);
        setQuestionVideoViewerUri(null);
    }, []);

    return {
        closeQuestionVideo,
        handleNewRoundQuestionEmoji,
        newRoundQuestion,
        newRoundQuestionSelection,
        openQuestionVideo,
        pickRoundQuestionMedia,
        questionAudioRecorder,
        questionVideoViewerUri,
        questionVideoViewerVisible,
        recordRoundQuestionVideo,
        roundQuestionMedia,
        roundQuestionMediaSheet,
        setNewRoundQuestion,
        setNewRoundQuestionSelection,
        setQuestionVideoViewerUri,
        setQuestionVideoViewerVisible,
        setRoundQuestionMedia,
        setRoundQuestionMediaSheet,
        setUploadProgress,
        takeRoundQuestionPhoto,
        uploadProgress,
    };
}
