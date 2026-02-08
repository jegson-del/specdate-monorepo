import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Avatar, Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { toImageUri } from '../../../utils/imageUrl';

export type UnresponsiveParticipant = {
    user_id: number;
    user?: { name?: string; profile?: { full_name?: string; avatar?: unknown } };
};

type UnresponsiveParticipantRowProps = {
    participant: UnresponsiveParticipant;
    borderColor: string;
};

function UnresponsiveParticipantRow({ participant, borderColor }: UnresponsiveParticipantRowProps) {
    const theme = useTheme();
    const name = participant.user?.profile?.full_name || participant.user?.name || 'Participant';
    const avatarUri = toImageUri(participant.user?.profile?.avatar) || undefined;

    return (
        <View style={[rowStyles.row, { borderBottomColor: borderColor }]}>
            <Avatar.Image size={36} source={{ uri: avatarUri }} />
            <Text style={[rowStyles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {name}
            </Text>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    name: { flex: 1, fontSize: 15, fontWeight: '600' },
});

export type CloseRoundModalProps = {
    visible: boolean;
    onDismiss: () => void;
    participants: UnresponsiveParticipant[];
    onNudge: () => void;
    onEliminateAndClose: () => void;
    onCloseAnyway: () => void;
    nudgeLoading?: boolean;
    eliminateOrCloseLoading?: boolean;
    closeLoading?: boolean;
};

export function CloseRoundModal({
    visible,
    onDismiss,
    participants,
    onNudge,
    onEliminateAndClose,
    onCloseAnyway,
    nudgeLoading = false,
    eliminateOrCloseLoading = false,
    closeLoading = false,
}: CloseRoundModalProps) {
    const theme = useTheme();
    const borderColor = theme.colors.outlineVariant || theme.colors.outline + '30';
    const count = participants.length;

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                    Participants who haven't answered
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {count} participant{count !== 1 ? 's' : ''} haven't responded yet. Nudge them or close the round.
                </Text>

                <ScrollView style={styles.list} nestedScrollEnabled>
                    {participants.map((p) => (
                        <UnresponsiveParticipantRow
                            key={p.user_id}
                            participant={p}
                            borderColor={borderColor}
                        />
                    ))}
                </ScrollView>

                <View style={styles.actions}>
                    <Button
                        mode="contained"
                        onPress={onNudge}
                        disabled={nudgeLoading}
                        loading={nudgeLoading}
                        style={styles.button}
                    >
                        Nudge them
                    </Button>
                    <Button
                        mode="contained-tonal"
                        onPress={onEliminateAndClose}
                        disabled={eliminateOrCloseLoading}
                        loading={eliminateOrCloseLoading}
                        style={styles.button}
                    >
                        Eliminate & close
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={onCloseAnyway}
                        disabled={closeLoading}
                        style={styles.button}
                    >
                        Close anyway
                    </Button>
                    <Button mode="text" onPress={onDismiss} style={styles.button}>
                        Cancel
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: 20,
        padding: 20,
        borderRadius: 16,
        maxHeight: '80%',
    },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
    list: { maxHeight: 200, marginBottom: 16 },
    actions: { gap: 10 },
    button: { borderRadius: 10 },
});
