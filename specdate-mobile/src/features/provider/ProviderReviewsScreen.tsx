import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ProviderReviewCard, type ReviewItem } from '../providers/components';
import ChatSafetySheet from '../chat/components/ChatSafetySheet';
import { ModerationService } from '../../services/moderation';
import { ProviderService } from '../../services/providers';

type ReportSheetState =
  | { mode: 'report'; reviewId: number }
  | { mode: 'success'; title: string; subtitle: string }
  | null;

export default function ProviderReviewsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const providerId = route.params?.providerId as number | string | undefined;
  const initialReviews = (route.params?.reviews || []) as ReviewItem[];
  const canReport = Boolean(route.params?.canReport);
  const [reportSheet, setReportSheet] = React.useState<ReportSheetState>(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);

  const reportableReviewId = (review: ReviewItem) => {
    const id = String(review.id);
    return /^\d+$/.test(id) ? Number(id) : null;
  };

  const openReviewReport = (review: ReviewItem) => {
    const reviewId = reportableReviewId(review);
    if (!reviewId) {
      Alert.alert('Review cannot be reported', 'Only published DateUsher reviews can be sent to moderation.');
      return;
    }
    setReportError(null);
    setReportSheet({ mode: 'report', reviewId });
  };

  const closeReportSheet = () => {
    setReportSheet(null);
    setReportError(null);
  };

  const submitReport = async (reason: string) => {
    if (reportSheet?.mode !== 'report') return;
    setReportLoading(true);
    setReportError(null);
    try {
      await ModerationService.reportContent({
        target_type: 'provider_review',
        target_id: reportSheet.reviewId,
        reason,
      });
      setReportSheet({
        mode: 'success',
        title: 'Report submitted',
        subtitle: 'Thanks. Our moderation team will review this.',
      });
    } catch (error: any) {
      setReportError(error?.response?.data?.message || error?.message || 'Could not submit report.');
    } finally {
      setReportLoading(false);
    }
  };

  const reviewsQuery = useInfiniteQuery({
    queryKey: ['provider-reviews', String(providerId)],
    enabled: providerId != null,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => ProviderService.getProviderReviews(providerId as number | string, { page: Number(pageParam), per_page: 20 }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.data.current_page ?? 1;
      const last = lastPage.data.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
  });
  const pagedReviews = React.useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.data.data) ?? [],
    [reviewsQuery.data]
  );
  const reviews = providerId != null ? pagedReviews : initialReviews;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Reviews</Text>
        <View style={{ width: 48 }} />
      </View>

      {reviews.length === 0 ? (
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="star-outline" size={34} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No reviews yet</Text>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Customer reviews will appear here after daters visit your venue.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProviderReviewCard review={item} onReport={canReport ? openReviewReport : undefined} />
          )}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (reviewsQuery.hasNextPage && !reviewsQuery.isFetchingNextPage) {
              reviewsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          onRefresh={() => reviewsQuery.refetch()}
          refreshing={reviewsQuery.isRefetching}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}
      <ChatSafetySheet
        visible={!!reportSheet}
        mode={reportSheet?.mode ?? 'report'}
        title={reportSheet?.mode === 'report' ? 'Report review?' : reportSheet?.title ?? ''}
        subtitle={reportSheet?.mode === 'report' ? 'Tell us what is wrong. This will be sent to moderation.' : reportSheet?.subtitle}
        loading={reportLoading}
        error={reportError}
        onDismiss={closeReportSheet}
        onSubmitReport={submitReport}
      />
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
});
