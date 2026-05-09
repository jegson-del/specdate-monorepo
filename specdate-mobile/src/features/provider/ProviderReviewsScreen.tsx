import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReviewItem } from '../providers/components';

export default function ProviderReviewsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reviews = (route.params?.reviews || []) as ReviewItem[];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Reviews</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {reviews.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="star-outline" size={34} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No reviews yet</Text>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Customer reviews will appear here after daters visit your venue.
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={[styles.reviewerLabel, { color: theme.colors.onSurfaceVariant }]}>Reviewer</Text>
                  <Text style={[styles.reviewerName, { color: theme.colors.onSurface }]}>{review.userName}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={15} color="#F59E0B" />
                  <Text style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}>
                    {review.rating.toFixed(0)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>{review.text}</Text>
              <Text style={[styles.reviewDate, { color: theme.colors.onSurfaceVariant }]}>{review.date}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 16, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  reviewCard: { padding: 14, borderRadius: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reviewerName: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '800' },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 12 },
});
