import React from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import type { TextSelection } from '../../../utils/emojiText';
import { isRoundMediaReviewing } from '../roundMediaUpload';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { RoundMediaActions } from './RoundMediaActions';
import type { RoundMediaAsset } from './useRoundAudioRecorder';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';

type RoundOwnerControlsProps = {
    closePending: boolean;
    durationMillis: number;
    isOwner: boolean;
    isRecording: boolean;
    media: RoundMediaAsset | null;
    onChangeQuestion: (value: string) => void;
    onCloseRound: () => void;
    onEmojiSelected: (emoji: string) => void;
    onOpenCamera: () => void;
    onOpenFile: () => void;
    onPreviewVideo: (uri: string) => void;
    onRemoveMedia: () => void;
    onSelectionChange: (selection: TextSelection) => void;
    onStartNextRound: () => void;
    onToggleVoice: () => void;
    question: string;
    roundStatus: string;
    selection: TextSelection;
    startPending: boolean;
    theme: any;
};

export function RoundOwnerControls({
    closePending,
    durationMillis,
    isOwner,
    isRecording,
    media,
    onChangeQuestion,
    onCloseRound,
    onEmojiSelected,
    onOpenCamera,
    onOpenFile,
    onPreviewVideo,
    onRemoveMedia,
    onSelectionChange,
    onStartNextRound,
    onToggleVoice,
    question,
    roundStatus,
    selection,
    startPending,
    theme,
}: RoundOwnerControlsProps) {
    if (!isOwner) return null;

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Owner controls</Text>

            {roundStatus === 'ACTIVE' ? (
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.primaryButton, { backgroundColor: theme.colors.error }]}
                    onPress={onCloseRound}
                    disabled={closePending}
                >
                    {closePending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Close round & review</Text>
                    )}
                </TouchableOpacity>
            ) : null}

            {roundStatus === 'REVIEWING' ? (
                <View style={[styles.flatBlock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                    <Text style={[styles.flatBlockHint, { color: theme.colors.onSurfaceVariant }]}>Tap Eliminate next to an answer to remove that participant.</Text>
                    <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]} />
                    <Text style={[styles.flatBlockLabel, { color: theme.colors.onSurfaceVariant }]}>Next round question</Text>
                    <TextInput
                        placeholder="e.g. What's your hidden talent?"
                        placeholderTextColor={theme.colors.outline}
                        value={question}
                        onChangeText={onChangeQuestion}
                        selection={selection}
                        onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                        multiline
                        numberOfLines={4}
                        style={[styles.flatTextArea, { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' }]}
                    />
                    {media ? (
                        <View style={[styles.mediaPreviewBox, { borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
                            {isRoundMediaReviewing(media) ? (
                                <Chip compact icon="clock-outline" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                                    Reviewing video
                                </Chip>
                            ) : null}
                            {media.assetType === 'image' ? (
                                <Image source={{ uri: media.uri }} style={styles.questionMediaImage} />
                            ) : media.assetType === 'video' ? (
                                <VideoThumbnailPlayer
                                    uri={media.uri}
                                    width={160}
                                    height={100}
                                    onPress={() => onPreviewVideo(media.uri)}
                                />
                            ) : (
                                <AudioMessagePlayer uri={media.uri} label="Audio question" compact />
                            )}
                            <Button mode="text" compact onPress={onRemoveMedia}>
                                Remove
                            </Button>
                        </View>
                    ) : null}
                    <RoundMediaActions
                        onOpenFile={onOpenFile}
                        onOpenCamera={onOpenCamera}
                        onEmojiSelected={onEmojiSelected}
                        onToggleVoice={onToggleVoice}
                        isRecording={isRecording}
                        durationMillis={durationMillis}
                        disabled={startPending}
                    />
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={onStartNextRound}
                        disabled={(!question.trim() && !media) || startPending}
                    >
                        {startPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Start next round</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : null}

            {roundStatus === 'COMPLETED' ? (
                <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>This round is completed.</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    flatBlock: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    flatBlockHint: { fontSize: 13, lineHeight: 20 },
    flatBlockLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    divider: { height: 1, marginVertical: 2 },
    flatTextArea: {
        minHeight: 110,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        textAlignVertical: 'top',
    },
    primaryButton: {
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    hintText: { fontSize: 14 },
    mediaPreviewBox: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        gap: 6,
    },
    questionMediaImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
});
