import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../hooks/useUser';
import { MediaPickerSheet, UploadProgressModal, VideoViewerModal } from '../../components';
import { EditSpecModal } from './components/EditSpecModal';
import { LastManStandingModal, SpecActionsRow, SpecFooterActions, SpecHero, SpecParticipantsList, SpecRequirementsList, SpecRoundComposer, SpecRoundsList } from './components';
import { useSpecDetailsMutations } from './hooks/useSpecDetailsMutations';
import { useSpecDetailsQuery } from './hooks/useSpecDetailsQuery';
import { useSpecDetailsState } from './hooks/useSpecDetailsState';
import { useSpecReportSheet } from './hooks/useSpecReportSheet';
import { useSpecRoundComposerState } from './hooks/useSpecRoundComposerState';
import { useSpecRoundsFlow } from './hooks/useSpecRoundsFlow';
import { useSpecStartRoundFlow } from './hooks/useSpecStartRoundFlow';
import { useSpecUserActions } from './hooks/useSpecUserActions';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';


export default function SpecDetailsScreen({ route, navigation }: any) {
    // Normalize to string so query key is stable (avoids cache mismatch between number and string)
    const specId = route.params?.specId != null ? String(route.params.specId) : undefined;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { data: user } = useUser();
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [lastManStandingVisible, setLastManStandingVisible] = React.useState(false);
    const [lastManStandingWinnerName, setLastManStandingWinnerName] = React.useState('');
    const [lastManStandingSpecId, setLastManStandingSpecId] = React.useState<string | null>(null);
    const {
        closeReportSheet,
        openReportSheet,
        reportError,
        reportLoading,
        reportSheet,
        submitReport,
    } = useSpecReportSheet();

    const { data: spec, isLoading, isFetching, error, refetch: refetchSpec } = useSpecDetailsQuery({
        specId,
        fromNotification: route.params?.fromNotification,
        navigation,
    });

    const {
        acceptedParticipantCount,
        canOpenRoundDetails,
        headerLine,
        isFirstRound,
        isOwner,
        isSpecClosed,
        myApplication,
        ownerAvatar,
        ownerName,
        participants,
        requirements,
        specStatus,
        specTone,
    } = useSpecDetailsState({ spec, user });

    // --- OWNER ACTIONS ---
    const {
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
        setRoundQuestionMedia,
        setRoundQuestionMediaSheet,
        setUploadProgress,
        takeRoundQuestionPhoto,
        uploadProgress,
    } = useSpecRoundComposerState();
    const {
        likeMutation,
        eliminateMutation,
        createDateMutation,
        extendSearchMutation,
        joinMutation,
        nudgeUsersMutation,
        startRoundMutation,
    } = useSpecDetailsMutations({
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
    });

    const {
        getPendingParticipantIds,
        handleNudgeRound,
        hasOpenRound,
        nudgePendingRoundId,
        rounds,
    } = useSpecRoundsFlow({
        nudgeUsersMutation,
        participants,
        spec,
    });

    const {
        confirmEliminateParticipant,
        handleJoin,
        onShare,
        openCreatorProfile,
        openParticipantProfile,
    } = useSpecUserActions({
        eliminateMutation,
        joinMutation,
        navigation,
        spec,
        user,
    });

    const { handleStartRoundPress } = useSpecStartRoundFlow({
        acceptedParticipantCount,
        isFirstRound,
        newRoundQuestion,
        roundQuestionMedia,
        spec,
        startRoundMutation,
    });

    // Early return for missing specId - but all hooks must be called first
    if (!specId) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Invalid spec ID.</Text>
            </View>
        );
    }

    // Spinner until spec data is loaded (from notification we clear cache so this shows until fetch completes)
    if (!spec && !error) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Loading spec...</Text>
            </View>
        );
    }

    if (error || !spec) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.onSurface }}>Failed to load spec details.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Hero */}
                <SpecHero
                    canEdit={isOwner && specStatus === 'OPEN'}
                    headerLine={headerLine}
                    insetsTop={insets.top}
                    onBack={() => navigation.goBack()}
                    onEdit={() => setIsEditModalVisible(true)}
                    onOpenCreatorProfile={openCreatorProfile}
                    ownerAvatar={ownerAvatar}
                    ownerName={ownerName}
                    specStatus={specStatus}
                    specTitle={spec.title}
                    specTone={specTone}
                />

                {/* Host First/New Round Action */}
                <SpecRoundComposer
                    acceptedParticipantCount={acceptedParticipantCount}
                    canStartRound={isOwner && !isSpecClosed && !hasOpenRound}
                    durationMillis={questionAudioRecorder.durationMillis}
                    isRecording={questionAudioRecorder.isRecording}
                    isSubmitting={startRoundMutation.isPending}
                    media={roundQuestionMedia}
                    onChangeQuestion={setNewRoundQuestion}
                    onEmojiSelected={handleNewRoundQuestionEmoji}
                    onOpenCamera={() => setRoundQuestionMediaSheet('camera')}
                    onOpenFile={() => setRoundQuestionMediaSheet('file')}
                    onPreviewVideo={openQuestionVideo}
                    onRemoveMedia={() => setRoundQuestionMedia(null)}
                    onSelectionChange={setNewRoundQuestionSelection}
                    onStartRound={handleStartRoundPress}
                    onToggleVoice={questionAudioRecorder.isRecording ? questionAudioRecorder.stopRecording : questionAudioRecorder.startRecording}
                    question={newRoundQuestion}
                    selection={newRoundQuestionSelection}
                    theme={theme}
                />

                {/* Actions */}
                <SpecActionsRow
                    isOwner={isOwner}
                    onLike={() => likeMutation.mutate()}
                    onReport={() => openReportSheet('spec', Number(spec.id), 'spec')}
                    onShare={onShare}
                    spec={spec}
                    theme={theme}
                />

                {/* About */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>About this Spec</Text>
                    <Text style={[styles.sectionBody, { color: theme.colors.onSurface, opacity: 0.8 }]}>
                        {spec.description || 'No description provided.'}
                    </Text>
                </View>




                {/* Rounds */}
                <SpecRoundsList
                    canOpenRoundDetails={canOpenRoundDetails}
                    isOwner={isOwner}
                    isSpecClosed={isSpecClosed}
                    getPendingParticipantCount={(round) => getPendingParticipantIds(round).length}
                    nudgePendingRoundId={nudgePendingRoundId}
                    onOpenRound={(roundId) => navigation.navigate('RoundDetails', { specId: spec.id, roundId })}
                    onNudgeRound={handleNudgeRound}
                    rounds={rounds}
                    theme={theme}
                />
                {/* Requirements */}
                <SpecRequirementsList requirements={requirements} theme={theme} />

                {/* Participants */}
                <SpecParticipantsList
                    isOwner={isOwner}
                    onEliminateParticipant={confirmEliminateParticipant}
                    onOpenParticipantProfile={openParticipantProfile}
                    participants={participants}
                    theme={theme}
                />
            </ScrollView>

            {/* Footer CTA */}
            <SpecFooterActions
                bottomInset={insets.bottom}
                isOwner={isOwner}
                isSpecClosed={isSpecClosed}
                joinLoading={joinMutation.isPending}
                myApplication={myApplication}
                onJoin={handleJoin}
                spec={spec}
                specStatus={specStatus}
                theme={theme}
            />

            <EditSpecModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                spec={spec}
            />

            <LastManStandingModal
                visible={lastManStandingVisible}
                onDismiss={() => { setLastManStandingVisible(false); setLastManStandingSpecId(null); setLastManStandingWinnerName(''); }}
                winnerName={lastManStandingWinnerName}
                specId={lastManStandingSpecId ?? ''}
                onMatchAndDate={() => lastManStandingSpecId && createDateMutation.mutate(lastManStandingSpecId)}
                onExtendSearch={(comment, durationDays) => lastManStandingSpecId && extendSearchMutation.mutate({ specIdToUse: lastManStandingSpecId, comment, durationDays })}
                availableCredits={user?.balance?.credits ?? 0}
                matchLoading={createDateMutation.isPending}
                extendLoading={extendSearchMutation.isPending}
            />

            <VideoViewerModal
                visible={questionVideoViewerVisible}
                uri={questionVideoViewerUri}
                onClose={closeQuestionVideo}
            />

            <MediaPickerSheet
                visible={roundQuestionMediaSheet !== null}
                title={roundQuestionMediaSheet === 'camera' ? 'Use camera' : 'Share media'}
                onDismiss={() => setRoundQuestionMediaSheet(null)}
                options={
                    roundQuestionMediaSheet === 'camera'
                        ? [
                            { icon: 'camera-outline', label: 'Take photo', helper: 'Capture a new picture now', onPress: () => takeRoundQuestionPhoto('round_question') },
                            { icon: 'video-plus-outline', label: 'Record video', helper: 'Record a short live clip', onPress: () => recordRoundQuestionVideo('round_question') },
                        ]
                        : [
                            { icon: 'image-outline', label: 'Choose image', helper: 'Share a photo from your files', onPress: () => pickRoundQuestionMedia('round_question', 'image') },
                            { icon: 'file-video-outline', label: 'Choose video', helper: 'Share a saved video clip', onPress: () => pickRoundQuestionMedia('round_question', 'video') },
                        ]
                }
            />

            <ChatSafetySheet
                visible={!!reportSheet}
                mode={reportSheet?.mode ?? 'report'}
                title={reportSheet?.mode === 'report' ? `Report ${reportSheet.label}?` : reportSheet?.mode === 'success' ? reportSheet.title : ''}
                subtitle={
                    reportSheet?.mode === 'report'
                        ? 'Choose the reason. Our moderation team will review it.'
                        : reportSheet?.mode === 'success' ? reportSheet.subtitle : undefined
                }
                loading={reportLoading}
                error={reportError}
                onDismiss={closeReportSheet}
                onSubmitReport={submitReport}
            />
            <UploadProgressModal progress={uploadProgress} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    sectionBody: { fontSize: 14, lineHeight: 21 },

    // Glass round card – frosted, minimal, sophisticated
});
