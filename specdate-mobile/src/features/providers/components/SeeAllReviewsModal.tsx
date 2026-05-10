import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Modal, Portal } from 'react-native-paper';
import { ProviderReviewCard, type ReviewItem } from './ProviderReviewCard';

export type SeeAllReviewsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  reviews: ReviewItem[];
  onReportReview?: (review: ReviewItem) => void;
  canReportReview?: (review: ReviewItem) => boolean;
};

export function SeeAllReviewsModal({ visible, onDismiss, reviews, onReportReview, canReportReview }: SeeAllReviewsModalProps) {
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
        <ScrollView style={styles.scroll} contentContainerStyle={styles.cardList} showsVerticalScrollIndicator>
          {reviews.map((r) => (
            <ProviderReviewCard
              key={r.id}
              review={r}
              onReport={onReportReview && (!canReportReview || canReportReview(r)) ? onReportReview : undefined}
            />
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
  cardList: { gap: 12 },
});
