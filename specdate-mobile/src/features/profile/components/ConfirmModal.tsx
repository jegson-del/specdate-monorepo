import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, useTheme } from 'react-native-paper';

export type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    /** When true, confirm button uses destructive (error) style. */
    destructive?: boolean;
    /** When true, confirm is in progress (disable buttons, show loading). */
    loading?: boolean;
};

/**
 * Reusable confirmation dialog. Use for pause, unpause, delete account, etc.
 */
export function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    destructive = false,
    loading = false,
}: ConfirmModalProps) {
    const theme = useTheme();
    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Content style={styles.content}>
                    <Text variant="bodySmall">{message}</Text>
                </Dialog.Content>
                <Dialog.Actions style={styles.actions}>
                    <Button onPress={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        onPress={onConfirm}
                        loading={loading}
                        disabled={loading}
                        mode="contained"
                        buttonColor={destructive ? theme.colors.error : undefined}
                        textColor={destructive ? theme.colors.onError : undefined}
                    >
                        {confirmLabel}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

const styles = StyleSheet.create({
    dialog: {
        // marginHorizontal: 20,
    },
    content: {
        paddingHorizontal: 28,
        paddingBottom: 8,
    },
    actions: {
        paddingVertical: 4,

    },
});
