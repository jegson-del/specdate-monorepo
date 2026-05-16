import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, Modal as PaperModal, Portal } from 'react-native-paper';
import { Dropdown } from 'react-native-paper-dropdown';
import { SpecService } from '../../../services/specs';

const EXPIRY_DURATION_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1} Day${i === 0 ? '' : 's'}`,
    value: String(i + 1),
}));

const MAX_PARTICIPANTS_OPTIONS = [
    { label: '10 People', value: '10' },
    { label: '20 People', value: '20' },
    { label: '30 People', value: '30' },
    { label: '50 People', value: '50' },
    { label: '100 People', value: '100' },
];

interface EditSpecModalProps {
    visible: boolean;
    onClose: () => void;
    spec: any;
}

export const EditSpecModal = ({ visible, onClose, spec }: EditSpecModalProps) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [maxParticipants, setMaxParticipants] = useState('');
    const [initialMaxParticipants, setInitialMaxParticipants] = useState('');
    const [expiryDays, setExpiryDays] = useState('');
    const [initialExpiryDays, setInitialExpiryDays] = useState('');
    const [status, setStatus] = useState<string>('OPEN');

    useEffect(() => {
        if (spec) {
            setTitle(spec.title);
            setDescription(spec.description || '');
            const currentMaxParticipants = spec.max_participants ? String(spec.max_participants) : '30';
            setMaxParticipants(currentMaxParticipants);
            setInitialMaxParticipants(currentMaxParticipants);

            const daysUntilExpiry = daysFromNow(spec.expires_at);
            setExpiryDays(daysUntilExpiry);
            setInitialExpiryDays(daysUntilExpiry);

            // Map status
            setStatus(spec.status);
        }
    }, [spec]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => SpecService.updateSpec(spec.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spec', String(spec.id)] });
            queryClient.invalidateQueries({ queryKey: ['specs'] });
            Alert.alert('Success', 'Spec updated successfully');
            onClose();
        },
        onError: (err: any) => {
            Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to update spec');
        }
    });

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        const data: any = {
            title,
            description,
        };
        if (maxParticipants.trim() && maxParticipants !== initialMaxParticipants) {
            data.max_participants = parseInt(maxParticipants, 10);
        }
        if (expiryDays && expiryDays !== initialExpiryDays) {
            data.duration = parseInt(expiryDays, 10);
        }

        // Handle Status
        if (status !== spec.status) {
            data.status = status;
        }

        const sensitiveChanges = [];
        if (data.max_participants !== undefined) {
            sensitiveChanges.push(`Max participants will change from ${initialMaxParticipants} to ${maxParticipants}.`);
        }
        if (data.duration !== undefined) {
            sensitiveChanges.push(`Expiry will change to ${expiryDays} day${expiryDays === '1' ? '' : 's'} from now.`);
        }

        if (sensitiveChanges.length > 0) {
            Alert.alert(
                'Confirm spec limits',
                `${sensitiveChanges.join('\n\n')}\n\nIf people have already applied, shortening expiry or lowering capacity may be blocked.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save changes', onPress: () => updateMutation.mutate(data) },
                ],
            );
            return;
        }

        updateMutation.mutate(data);
    };

    const styles = getStyles(theme);

    const STATUS_OPTIONS = [
        { label: 'Open (Accepting Apps)', value: 'OPEN' },
        { label: 'Closed (Final)', value: 'COMPLETED' },
    ];

    const handleStatusChange = (newStatus?: string) => {
        if (!newStatus) return;

        if (newStatus === 'COMPLETED') {
            Alert.alert(
                'Close Spec?',
                'Are you sure you want to close this spec? This action cannot be undone and will stop all activity.',
                [
                    {
                        text: 'Cancel', style: 'cancel', onPress: () => {
                            // Revert to previous status if cancelled
                            // We need to force update if the dropdown already showed the new value visually (depends on controlled flow)
                            // But since we control 'value={status}', not updating state keeps it at old value.
                        }
                    },
                    { text: 'Close Spec', style: 'destructive', onPress: () => setStatus('COMPLETED') }
                ]
            );
        } else {
            setStatus(newStatus);
        }
    };

    const isEditable = spec?.status === 'OPEN';

    return (
        <Portal>
            <PaperModal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={styles.modalContent}
                style={styles.modalContainer}
            >
                {/* ... Header ... */}
                <View style={styles.header}>
                    <Text style={styles.title}>Edit Spec</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={theme.colors.onSurface} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form}>
                    {/* ... Inputs ... */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Spec Title"
                            placeholderTextColor={theme.colors.onSurfaceDisabled}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Description"
                            placeholderTextColor={theme.colors.onSurfaceDisabled}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Max Participants</Text>
                            <Dropdown
                                label="Max Participants"
                                mode="outlined"
                                options={MAX_PARTICIPANTS_OPTIONS}
                                value={maxParticipants}
                                onSelect={(value) => setMaxParticipants(value || initialMaxParticipants || '30')}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Expires In</Text>
                            <Dropdown
                                label="Expires In"
                                mode="outlined"
                                options={EXPIRY_DURATION_OPTIONS}
                                value={expiryDays}
                                onSelect={(value) => setExpiryDays(value || initialExpiryDays || '3')}
                            />
                        </View>
                    </View>
                    <Text style={[styles.helperText, { marginTop: -16, marginBottom: 20 }]}>
                        Expiry is limited to 30 days from creation. Normal expiry extension can be used once.
                    </Text>

                    {/* Status Dropdown */}
                    {isEditable ? (
                        <View style={[styles.inputGroup, { marginBottom: 24 }]}>
                            <Text style={styles.label}>Status</Text>
                            <Dropdown
                                label="Status"
                                mode="outlined"
                                options={STATUS_OPTIONS}
                                value={status}
                                onSelect={handleStatusChange}
                            />
                            <Text style={styles.helperText}>
                                {status === 'COMPLETED'
                                    ? 'Warning: Closing is final.'
                                    : 'Spec is open for applications.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.infoBox}>
                            <Ionicons name="lock-closed" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.infoText}>This spec quest has already started or closed and cannot be edited.</Text>
                        </View>
                    )}

                    <Text style={styles.note}>Note: To edit complex requirements, please create a new spec.</Text>
                </ScrollView>

                <View style={styles.footer}>
                    {isEditable ? (
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.saveBtn, styles.disabledBtn]} disabled>
                            <Text style={styles.saveBtnText}>Closed</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </PaperModal>
        </Portal>
    );
};

function daysFromNow(value?: string | null) {
    if (!value) return '';

    const expiry = new Date(value).getTime();
    if (Number.isNaN(expiry)) return '';

    const diff = expiry - Date.now();
    if (diff <= 0) return '1';

    return String(Math.min(30, Math.max(1, Math.ceil(diff / 86_400_000))));
}

const getStyles = (theme: any) => StyleSheet.create({
    modalContainer: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 24,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
    },
    closeBtn: {
        padding: 4,
    },
    form: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        color: theme.colors.onSurfaceVariant,
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        color: theme.colors.onSurface,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 16,
    },
    helperText: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 12,
        marginTop: 4,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 8,
    },
    infoText: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 14,
    },
    note: {
        color: theme.colors.onSurfaceDisabled,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 24,
        textAlign: 'center',
    },
    footer: {
        marginTop: 24,
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: theme.colors.onSurfaceDisabled,
    },
    saveBtnText: {
        color: theme.colors.onPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
