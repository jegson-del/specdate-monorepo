import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateVoucherItem, VoucherService } from '../../services/vouchers';

export default function ProviderBookingsScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: VoucherService.getProviderBookings,
  });

  const bookings = data?.data || [];

  const approveMutation = useMutation({
    mutationFn: VoucherService.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (error: any) => Alert.alert('Could not approve', error?.response?.data?.message || 'Please try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: VoucherService.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (error: any) => Alert.alert('Could not reject', error?.response?.data?.message || 'Please try again.'),
  });

  const handleBookingAction = (booking: DateVoucherItem, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Approve voucher' : 'Reject voucher',
      action === 'approve'
        ? 'This will activate the voucher for the matched users.'
        : 'This will reject the voucher request for the matched users.',
      [
        { text: 'Cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          onPress: () => action === 'approve' ? approveMutation.mutate(booking.id) : rejectMutation.mutate(booking.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Bookings</Text>
        <IconButton icon="refresh" size={22} onPress={() => refetch()} iconColor={theme.colors.primary} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {bookings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name={isLoading ? 'progress-clock' : 'calendar-heart'} size={34} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {isLoading ? 'Loading bookings' : 'No booking requests yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              When matched users request a date voucher, their names and date code will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={[styles.bookingCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.bookingHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>{(booking.owner?.name || 'O').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: '#0891B2' }]}>
                  <Text style={styles.avatarText}>{(booking.winner?.name || 'W').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.bookingCopy}>
                  <Text style={[styles.bookingTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {booking.owner?.name || 'Owner'} and {booking.winner?.name || 'Winner'}
                  </Text>
                  <Text style={[styles.bookingMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {booking.date?.date_code ? `Date code ${booking.date.date_code}` : 'Date booking request'} · {booking.discount_percentage}% off
                  </Text>
                </View>
              </View>
              <View style={[styles.statusPill, { backgroundColor: theme.colors.primary + '12' }]}>
                <Text style={[styles.statusText, { color: theme.colors.primary }]}>{booking.status.replace('_', ' ')}</Text>
              </View>
              {booking.status === 'pending_provider' ? (
                <View style={styles.actions}>
                  <Button mode="outlined" onPress={() => handleBookingAction(booking, 'reject')} compact>
                    Reject
                  </Button>
                  <Button mode="contained" onPress={() => handleBookingAction(booking, 'approve')} compact>
                    Approve
                  </Button>
                </View>
              ) : null}
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
  bookingCard: { padding: 14, borderRadius: 16 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarOverlap: { marginLeft: -12 },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  bookingCopy: { flex: 1, marginLeft: 10 },
  bookingTitle: { fontSize: 15, fontWeight: '800' },
  bookingMeta: { fontSize: 13, marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 12 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
});
