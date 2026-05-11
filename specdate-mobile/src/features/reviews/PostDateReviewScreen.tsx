import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReviewContext, ReviewService } from '../../services/reviews';
import RatingStars from './components/RatingStars';
import ReviewTextInput from './components/ReviewTextInput';
import { formatMoney as formatCurrency } from '../../utils/currency';

function formatMoney(value?: number | null, currency?: string | null) {
  if (!value) return null;
  return formatCurrency(value, currency);
}

export default function PostDateReviewScreen({ route, navigation }: any) {
  const voucherId = route.params?.voucherId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [providerRating, setProviderRating] = React.useState(0);
  const [providerComment, setProviderComment] = React.useState('');
  const [partnerRating, setPartnerRating] = React.useState(0);
  const [chemistryRating, setChemistryRating] = React.useState(0);
  const [safetyRating, setSafetyRating] = React.useState(0);
  const [wouldMeetAgain, setWouldMeetAgain] = React.useState<boolean | null>(null);
  const [partnerComment, setPartnerComment] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['review-context', String(voucherId)],
    queryFn: () => ReviewService.getContext(voucherId),
    enabled: voucherId != null,
  });
  const context = data?.data as ReviewContext | undefined;

  React.useEffect(() => {
    if (!context) return;
    if (context.reviews.provider) setProviderRating(context.reviews.provider.rating);
    if (context.reviews.partner) setPartnerRating(context.reviews.partner.rating);
  }, [context]);

  const providerMutation = useMutation({
    mutationFn: () => ReviewService.submitProviderReview(voucherId, { rating: providerRating, comment: providerComment }),
  });
  const partnerMutation = useMutation({
    mutationFn: () => ReviewService.submitPartnerReview(voucherId, {
      rating: partnerRating,
      chemistry_rating: chemistryRating || null,
      safety_rating: safetyRating || null,
      would_meet_again: wouldMeetAgain,
      comment: partnerComment,
    }),
  });
  const dismissMutation = useMutation({
    mutationFn: () => ReviewService.dismissPrompt(voucherId),
    onSuccess: () => navigation.goBack(),
  });

  const submitting = providerMutation.isPending || partnerMutation.isPending;
  const providerDone = Boolean(context?.reviews.provider);
  const partnerDone = Boolean(context?.reviews.partner);

  const submitReviews = async () => {
    if (!providerDone && providerRating < 1) {
      Alert.alert('Rate provider', 'Please rate the provider before submitting.');
      return;
    }
    if (!partnerDone && partnerRating < 1) {
      Alert.alert('Rate your date', 'Please rate your date experience before submitting.');
      return;
    }

    try {
      if (!providerDone) await providerMutation.mutateAsync();
      if (!partnerDone) await partnerMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['review-prompts'] });
      Alert.alert('Thanks for reviewing', 'Your feedback helps keep DateUsher useful and safer.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not save review', error?.response?.data?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Review your date</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={34} color="#FFFFFF" />
          <Text style={styles.heroTitle}>{isLoading ? 'Loading date' : context?.provider.name || 'Date completed'}</Text>
          <Text style={styles.heroText}>
            {context?.voucher.spec?.title || 'Voucher redeemed'}{context?.voucher.date_code ? ` · ${context.voucher.date_code}` : ''}
          </Text>
          {formatMoney(context?.voucher.total_spent, context?.voucher.currency) ? (
            <Text style={styles.heroSpend}>Spent {formatMoney(context?.voucher.total_spent, context?.voucher.currency)}</Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Provider experience</Text>
            {providerDone ? <StatusPill label="Submitted" color="#16A34A" /> : null}
          </View>
          <RatingStars
            label={`Rate ${context?.provider.name || 'provider'}`}
            helper="Food, service, safety, ambience, and how smooth the voucher experience felt."
            value={providerRating}
            onChange={setProviderRating}
          />
          {!providerDone ? (
            <ReviewTextInput
              label="Provider review"
              value={providerComment}
              onChangeText={setProviderComment}
              placeholder="What should other daters know about this provider?"
            />
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Date experience</Text>
            {partnerDone ? <StatusPill label="Submitted" color="#16A34A" /> : null}
          </View>
          <RatingStars
            label={`Rate your date with ${context?.partner?.name || 'your match'}`}
            helper="This is about the date experience, not just attraction."
            value={partnerRating}
            onChange={setPartnerRating}
            color="#EC4899"
          />
          {!partnerDone ? (
            <>
              <RatingStars label="Chemistry" value={chemistryRating} onChange={setChemistryRating} color="#8B5CF6" />
              <RatingStars label="Safety and respect" value={safetyRating} onChange={setSafetyRating} color="#16A34A" />
              <View style={styles.meetAgainRow}>
                <Text style={[styles.meetAgainLabel, { color: theme.colors.onSurface }]}>Would meet again?</Text>
                <ToggleChoice label="Yes" active={wouldMeetAgain === true} onPress={() => setWouldMeetAgain(true)} color="#16A34A" />
                <ToggleChoice label="No" active={wouldMeetAgain === false} onPress={() => setWouldMeetAgain(false)} color="#EF4444" />
              </View>
              <ReviewTextInput
                label="Private date note"
                value={partnerComment}
                onChangeText={setPartnerComment}
                placeholder="Anything helpful about the date experience?"
              />
            </>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => dismissMutation.mutate()} loading={dismissMutation.isPending} style={styles.actionButton}>
            Dismiss
          </Button>
          <Button mode="contained" onPress={submitReviews} loading={submitting} style={styles.actionButton}>
            Submit reviews
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}16` }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function ToggleChoice({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.toggleChoice, { backgroundColor: active ? color : '#F1F5F9' }]}>
      <Text style={[styles.toggleText, { color: active ? '#FFFFFF' : '#334155' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900' },
  content: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', padding: 22, borderRadius: 18 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  heroText: { color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  heroSpend: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 10 },
  card: { gap: 14, padding: 16, borderRadius: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '900' },
  meetAgainRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetAgainLabel: { flex: 1, fontSize: 14, fontWeight: '900' },
  toggleChoice: { minWidth: 54, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  toggleText: { fontSize: 12, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, borderRadius: 12 },
});
