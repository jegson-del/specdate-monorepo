import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextInput } from 'react-native-paper';
import type { TextSelection } from '../../../utils/emojiText';
import { isRoundMediaReviewing } from '../roundMediaUpload';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { RoundMediaActions } from './RoundMediaActions';
import type { RoundMediaAsset } from './useRoundAudioRecorder';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';

type SpecRoundComposerProps = {
    acceptedParticipantCount: number;
    canStartRound: boolean;
    durationMillis: number;
    isRecording: boolean;
    isSubmitting: boolean;
    media: RoundMediaAsset | null;
    onChangeQuestion: (value: string) => void;
    onEmojiSelected: (emoji: string) => void;
    onOpenCamera: () => void;
    onOpenFile: () => void;
    onPreviewVideo: (uri: string) => void;
    onRemoveMedia: () => void;
    onSelectionChange: (selection: TextSelection) => void;
    onStartRound: () => void;
    onToggleVoice: () => void;
    question: string;
    selection: TextSelection;
    theme: any;
};

export function SpecRoundComposer({
    acceptedParticipantCount,
    canStartRound,
    durationMillis,
    isRecording,
    isSubmitting,
    media,
    onChangeQuestion,
    onEmojiSelected,
    onOpenCamera,
    onOpenFile,
    onPreviewVideo,
    onRemoveMedia,
    onSelectionChange,
    onStartRound,
    onToggleVoice,
    question,
    selection,
    theme,
}: SpecRoundComposerProps) {
    if (!canStartRound) return null;

    return (
        <View style={styles.section}>
            <Surface style={[styles.glassCard, { backgroundColor: theme.colors.elevation.level2, padding: 16 }]} elevation={2}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.primary }}>Start New Round</Text>
                <TextInput
                    mode="outlined"
                    placeholder="e.g. What's your hidden talent?"
                    value={question}
                    onChangeText={onChangeQuestion}
                    selection={selection}
                    onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                    multiline
                    numberOfLines={4}
                    style={{
                        backgroundColor: theme.colors.surface,
                        marginBottom: 12,
                        minHeight: 100,
                        textAlignVertical: 'top',
                    }}
                />
                {media ? (
                    <View style={[styles.questionMediaPreview, { borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' }]}>
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
                    disabled={isSubmitting}
                />
                <Button
                    mode="contained"
                    onPress={onStartRound}
                    loading={isSubmitting}
                    disabled={(!question.trim() && !media) || isSubmitting || acceptedParticipantCount < 1}
                >
                    Start Round {acceptedParticipantCount < 1 ? '(Need accepted users)' : ''}
                </Button>
            </Surface>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, paddingTop: 18 },
    glassCard: {
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 4,
    },
    questionMediaPreview: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        gap: 6,
    },
    questionMediaImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
});
