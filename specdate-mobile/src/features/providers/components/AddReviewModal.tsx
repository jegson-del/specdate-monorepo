import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STAR_SIZE = 28;

export type AddReviewModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (rating: number, text: string) => void;
  submitting?: boolean;
};

export function AddReviewModal({
  visible,
  onDismiss,
  onSubmit,
  submitting = false,
}: AddReviewModalProps) {
  const theme = useTheme();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setText('');
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(rating, text.trim());
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.content, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Write a review</Text>
          <IconButton icon="close" size={22} onPress={onDismiss} iconColor={theme.colors.onSurfaceVariant} />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          How would you rate your experience?
        </Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              hitSlop={8}
              style={styles.starTouch}
            >
              <MaterialCommunityIcons
                name={rating >= star ? 'star' : 'star-outline'}
                size={STAR_SIZE}
                color="#F59E0B"
              />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          placeholder="Share your experience… What did you like or dislike?"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          style={[
            styles.input,
            {
              color: theme.colors.onSurface,
              borderColor: theme.colors.outlineVariant || theme.colors.outline + '40',
            },
          ]}
        />
        <View style={styles.actions}>
          <Button mode="outlined" onPress={onDismiss} style={styles.btn}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={submitting || !text.trim() || rating < 1}
            style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          >
            {submitting ? 'Posting…' : 'Submit review'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 14, marginBottom: 12 },
  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  starTouch: { padding: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btn: { borderRadius: 10, minWidth: 100 },
});
