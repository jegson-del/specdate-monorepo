import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';

export type UploadProgressState = {
  title: string;
  message: string;
  dismissLabel?: string;
  onDismiss?: () => void;
  status?: 'loading' | 'reviewing' | 'error' | 'success';
} | null;

type UploadProgressModalProps = {
  progress: UploadProgressState;
};

export function UploadProgressModal({ progress }: UploadProgressModalProps) {
  const theme = useTheme();
  const status = progress?.status ?? 'loading';
  const canDismiss = Boolean(progress?.onDismiss);
  const iconColor = status === 'error'
    ? theme.colors.error
    : status === 'success'
      ? '#16A34A'
      : theme.colors.primary;
  const iconName = status === 'error'
    ? 'alert-circle-outline'
    : status === 'success'
      ? 'check-circle-outline'
      : 'clock-outline';

  return (
    <Modal visible={Boolean(progress)} transparent animationType="fade" onRequestClose={progress?.onDismiss ?? (() => undefined)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {status === 'loading' ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <MaterialCommunityIcons name={iconName} size={42} color={iconColor} />
          )}
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{progress?.title}</Text>
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{progress?.message}</Text>
          {canDismiss ? (
            <Button mode="contained" onPress={progress?.onDismiss} style={styles.dismissButton}>
              {progress?.dismissLabel ?? 'OK'}
            </Button>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  card: {
    width: '84%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
  },
  title: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dismissButton: {
    marginTop: 16,
    minWidth: 120,
  },
});
