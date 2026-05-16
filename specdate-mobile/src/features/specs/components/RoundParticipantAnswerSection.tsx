import React from 'react';
import { Image, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Chip, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TextSelection } from '../../../utils/emojiText';
import { isAudioMedia, isVideoMedia } from '../specDetailsUtils';
import { isRoundMediaReviewing } from '../roundMediaUpload';
import { styles } from '../roundDetailsStyles';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { RoundMediaActions } from './RoundMediaActions';
import type { RoundMediaAsset } from './useRoundAudioRecorder';
import { VideoThumbnailPlayer } from './VideoThumbnailPlayer';

type Props = {
    answerText: string;
    durationMillis: number;
    isRecording: boolean;
    media: RoundMediaAsset | null;
    myAnswer?: any;
    selection: TextSelection;
    submitPending: boolean;
    theme: any;
    onChangeAnswerText: (value: string) => void;
    onEmojiSelected: (emoji: string) => void;
    onOpenCamera: () => void;
    onOpenFile: () => void;
    onOpenVideo: (uri: string) => void;
    onRemoveMedia: () => void;
    onSelectionChange: (selection: TextSelection) => void;
    onSubmitAnswer: () => void | Promise<void>;
    onToggleVoice: () => void;
};

export function RoundParticipantAnswerSection({
    answerText,
    durationMillis,
    isRecording,
    media,
    myAnswer,
    selection,
    submitPending,
    theme,
    onChangeAnswerText,
    onEmojiSelected,
    onOpenCamera,
    onOpenFile,
    onOpenVideo,
    onRemoveMedia,
    onSelectionChange,
    onSubmitAnswer,
    onToggleVoice,
}: Props) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Your answer</Text>

            {myAnswer ? (
                <View style={[
                    styles.answerSubmitted,
                    {
                        backgroundColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
                        borderColor: myAnswer.is_eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(22,163,74,0.3)',
                    },
                ]}>
                    {myAnswer.answer_text?.trim() ? (
                        <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>
                            "{myAnswer.answer_text}"
                        </Text>
                    ) : (
                        <Text style={[styles.answerSubmittedText, { color: theme.colors.onSurface }]}>Voice answer</Text>
                    )}
                    <View style={styles.answerSubmittedBadge}>
                        {myAnswer.is_eliminated ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialCommunityIcons name="account-off" size={18} color="#EF4444" />
                                <Text style={[styles.answerSubmittedBadgeText, { color: '#EF4444' }]}>Eliminated</Text>
                            </View>
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle" color="#16a34a" size={18} />
                                <Text style={styles.answerSubmittedBadgeText}>Submitted</Text>
                            </>
                        )}
                    </View>
                    {myAnswer.media && (
                        <View style={{ marginTop: 12 }}>
                            {isAudioMedia(myAnswer.media) ? (
                                <AudioMessagePlayer uri={myAnswer.media.url} label="Audio answer" />
                            ) : isVideoMedia(myAnswer.media) ? (
                                <VideoThumbnailPlayer
                                    uri={myAnswer.media.url}
                                    width={200}
                                    height={120}
                                    onPress={() => onOpenVideo(myAnswer.media.url)}
                                />
                            ) : (
                                <Image source={{ uri: myAnswer.media?.url }} style={{ width: 120, height: 120, borderRadius: 8 }} />
                            )}
                        </View>
                    )}
                </View>
            ) : (
                <View style={[
                    styles.flatBlock,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' },
                ]}>
                    <TextInput
                        placeholder="Type your answer here..."
                        placeholderTextColor={theme.colors.outline}
                        multiline
                        numberOfLines={4}
                        value={answerText}
                        onChangeText={onChangeAnswerText}
                        selection={selection}
                        onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                        style={[
                            styles.flatTextArea,
                            { color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant || theme.colors.outline + '50' },
                        ]}
                    />
                    {media && (
                        <View style={{ marginBottom: 12, position: 'relative', alignSelf: 'flex-start' }}>
                            {isRoundMediaReviewing(media) ? (
                                <Chip compact icon="clock-outline" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                                    Reviewing video
                                </Chip>
                            ) : null}
                            {media.assetType === 'image' ? (
                                <Image source={{ uri: media.uri }} style={{ width: 120, height: 120, borderRadius: 8 }} />
                            ) : media.assetType === 'video' ? (
                                <VideoThumbnailPlayer
                                    uri={media.uri}
                                    width={160}
                                    height={100}
                                    onPress={() => onOpenVideo(media.uri)}
                                />
                            ) : (
                                <AudioMessagePlayer uri={media.uri} label="Audio answer" compact />
                            )}
                            <TouchableOpacity
                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.error, borderRadius: 12, padding: 4 }}
                                onPress={onRemoveMedia}
                            >
                                <MaterialCommunityIcons name="close" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <RoundMediaActions
                        onOpenFile={onOpenFile}
                        onOpenCamera={onOpenCamera}
                        onEmojiSelected={onEmojiSelected}
                        onToggleVoice={onToggleVoice}
                        isRecording={isRecording}
                        durationMillis={durationMillis}
                        disabled={submitPending}
                    />
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                        onPress={onSubmitAnswer}
                        disabled={(!answerText.trim() && !media) || submitPending}
                    >
                        {submitPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Submit answer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
