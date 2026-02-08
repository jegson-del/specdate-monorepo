import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ReviewItem = {
  id: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
};

export type SeeAllReviewsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  reviews: ReviewItem[];
};

export function SeeAllReviewsModal({ visible, onDismiss, reviews }: SeeAllReviewsModalProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.content, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>All reviews</Text>
          <IconButton icon="close" size={22} onPress={onDismiss} iconColor={theme.colors.onSurfaceVariant} />
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
          {reviews.map((r) => (
            <View
              key={r.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surfaceContainerHighest || theme.colors.surface,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.reviewerLabel, { color: theme.colors.onSurfaceVariant }]}>Reviewer</Text>
                  <Text style={[styles.userName, { color: theme.colors.onSurface }]}>{r.userName}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                  <Text style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}>
                    {r.rating.toFixed(0)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>{r.text}</Text>
              <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>{r.date}</Text>
            </View>
          ))}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { maxHeight: 400 },
  card: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  userName: { fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  date: { fontSize: 12 },
});
