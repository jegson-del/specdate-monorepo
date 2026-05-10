import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ReviewItem = {
  id: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
};

export type ProviderReviewCardProps = {
  review: ReviewItem;
  onReport?: (review: ReviewItem) => void;
};

export function ProviderReviewCard({ review, onReport }: ProviderReviewCardProps) {
  const theme = useTheme();
  const colors = theme.colors as any;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerHighest ?? theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.reviewerBlock}>
          <Text style={[styles.reviewerLabel, { color: theme.colors.onSurfaceVariant }]}>Reviewer</Text>
          <Text style={[styles.userName, { color: theme.colors.onSurface }]}>{review.userName}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
            <Text style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}>
              {review.rating.toFixed(0)}
            </Text>
          </View>
          {onReport ? (
            <TouchableOpacity
              accessibilityLabel="Report review"
              activeOpacity={0.8}
              onPress={() => onReport(review)}
              style={styles.reportButton}
            >
              <MaterialCommunityIcons name="flag" size={16} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>{review.text}</Text>
      <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>{review.date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  reviewerBlock: { flex: 1 },
  reviewerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  userName: { fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  reportButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  date: { fontSize: 12 },
});
