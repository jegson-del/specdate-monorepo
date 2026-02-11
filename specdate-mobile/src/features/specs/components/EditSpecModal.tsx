import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, Modal as PaperModal, Portal } from 'react-native-paper';
import { Dropdown } from 'react-native-paper-dropdown';
import { SpecService } from '../../../services/specs';

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
    const [expiresAtText, setExpiresAtText] = useState('');
    const [status, setStatus] = useState<string>('OPEN');

    useEffect(() => {
        if (spec) {
            setTitle(spec.title);
            setDescription(spec.description || '');
            setMaxParticipants(spec.max_participants ? String(spec.max_participants) : '');

            if (spec.expires_at) {
                const d = new Date(spec.expires_at);
                setExpiresAtText(d.toISOString().split('T')[0]);
            } else {
                setExpiresAtText('');
            }

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
            Alert.alert('Error', err.message || 'Failed to update spec');
        }
    });

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        // Validate date
        let expires_at = null;
        if (expiresAtText.trim()) {
            const d = new Date(expiresAtText);
            if (isNaN(d.getTime())) {
                Alert.alert('Error', 'Invalid date format. Use YYYY-MM-DD');
                return;
            }
            expires_at = d.toISOString();
        }

        const data: any = {
            title,
            description,
            max_participants: maxParticipants ? parseInt(maxParticipants) : null,
            expires_at,
        };

        // Handle Status
        if (status !== spec.status) {
            data.status = status;
        }

        updateMutation.mutate(data);
    };

    const styles = getStyles(theme);

    const STATUS_OPTIONS = [
        { label: 'Open (Accepting Apps)', value: 'OPEN' },
        { label: 'Active (In Progress)', value: 'ACTIVE' },
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

    // Status can manage its own disabled state or we rely on logic
    const isEditable = !['COMPLETED', 'EXPIRED'].includes(spec?.status);

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
                            <TextInput
                                style={styles.input}
                                value={maxParticipants}
                                onChangeText={setMaxParticipants}
                                placeholder="Unlimited"
                                placeholderTextColor={theme.colors.onSurfaceDisabled}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Expiry Date</Text>
                            <TextInput
                                style={styles.input}
                                value={expiresAtText}
                                onChangeText={setExpiresAtText}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={theme.colors.onSurfaceDisabled}
                            />
                        </View>
                    </View>

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
                                    : status === 'ACTIVE'
                                        ? 'Spec is in progress (no new joins).'
                                        : 'Spec is open for applications.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.infoBox}>
                            <Ionicons name="lock-closed" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.infoText}>This spec is {spec?.status?.toLowerCase()} and cannot be edited.</Text>
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
