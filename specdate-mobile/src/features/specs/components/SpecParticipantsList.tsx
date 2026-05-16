import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';

type SpecParticipantsListProps = {
    isOwner: boolean;
    onEliminateParticipant: (participantId: string | number, displayName: string) => void;
    onOpenParticipantProfile: (participantUserId: string | number) => void;
    participants: any[];
    theme: any;
};

export function SpecParticipantsList({
    isOwner,
    onEliminateParticipant,
    onOpenParticipantProfile,
    participants,
    theme,
}: SpecParticipantsListProps) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Participants ({participants.length})
                </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsRow}>
                {participants.length === 0 ? (
                    <Text style={{ color: theme.colors.onSurface, opacity: 0.65 }}>No participants yet.</Text>
                ) : (
                    participants.map((participant: any) => {
                        const eliminated = participant.status === 'ELIMINATED';
                        const displayName = participant.user?.profile?.full_name || participant.user?.name || 'User';
                        const avatarUri =
                            toImageUri(participant.user?.profile?.avatar) ||
                            `https://picsum.photos/seed/specdate-user-${participant.user_id || participant.id}/200/200`;
                        const participantUserId = participant.user_id ?? participant.user?.id;

                        const handleOpenProfile = () => {
                            if (!participantUserId) return;
                            onOpenParticipantProfile(participantUserId);
                        };

                        const handleLongPress = () => {
                            if (isOwner && !eliminated) {
                                onEliminateParticipant(participant.id, displayName);
                            }
                        };

                        return (
                            <View key={participant.id} style={[styles.participantCard, eliminated && { opacity: 0.5 }]}>
                                <TouchableOpacity
                                    onPress={handleOpenProfile}
                                    onLongPress={handleLongPress}
                                    activeOpacity={0.8}
                                    hitSlop={8}
                                >
                                    <View style={[styles.avatarRing, { borderColor: eliminated ? '#EF4444' : theme.colors.primary }]}>
                                        <Avatar.Image size={56} source={{ uri: avatarUri }} />
                                        {eliminated ? (
                                            <View style={[styles.eliminatedDot, { backgroundColor: '#EF4444' }]}>
                                                <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                                            </View>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>

                                <Text style={[styles.participantName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                    {displayName.split(' ')[0]}
                                </Text>
                                {participant.status === 'ELIMINATED' ? (
                                    <View style={styles.eliminatedStatusRow}>
                                        <MaterialCommunityIcons name="account-off" size={18} color={theme.colors.onSurfaceVariant} />
                                        <Text style={[styles.participantStatus, { color: theme.colors.onSurfaceVariant, opacity: 1 }]}>Eliminated</Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.participantStatus, { color: theme.colors.onSurface, opacity: 0.65 }]} numberOfLines={1}>
                                        {participant.status}
                                    </Text>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    participantsRow: { paddingVertical: 8, paddingRight: 16, gap: 14, alignItems: 'flex-start' },
    participantCard: { width: 72, alignItems: 'center', gap: 6 },
    avatarRing: {
        borderWidth: 2,
        borderRadius: 999,
        padding: 2,
    },
    eliminatedDot: { position: 'absolute', right: -2, bottom: -2, borderRadius: 999, padding: 2 },
    eliminatedStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    participantName: { fontSize: 12, fontWeight: '900' },
    participantStatus: { fontSize: 10, fontWeight: '700' },
});
