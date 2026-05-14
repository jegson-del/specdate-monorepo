import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export type UploadProgressState = {
  title: string;
  message: string;
} | null;

type UploadProgressModalProps = {
  progress: UploadProgressState;
};

export function UploadProgressModal({ progress }: UploadProgressModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={Boolean(progress)} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{progress?.title}</Text>
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{progress?.message}</Text>
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
});
