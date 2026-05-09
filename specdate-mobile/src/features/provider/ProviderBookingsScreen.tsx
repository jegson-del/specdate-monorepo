import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ProviderBooking = {
  id: number | string;
  owner_name: string;
  winner_name: string;
  date_code?: string;
  requested_at?: string;
  status?: string;
};

export default function ProviderBookingsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bookings = (route.params?.bookings || []) as ProviderBooking[];

  const handleBookingAction = (action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Approve booking' : 'Reject booking',
      'Booking approval will be connected when date vouchers and provider bookings are enabled.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Bookings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {bookings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="calendar-heart" size={34} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No booking requests yet</Text>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              When matched users request a date voucher, their names and date code will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={[styles.bookingCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.bookingHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>{booking.owner_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: '#0891B2' }]}>
                  <Text style={styles.avatarText}>{booking.winner_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.bookingCopy}>
                  <Text style={[styles.bookingTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {booking.owner_name} and {booking.winner_name}
                  </Text>
                  <Text style={[styles.bookingMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {booking.date_code ? `Date code ${booking.date_code}` : 'Date booking request'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => handleBookingAction('reject')} compact>
                  Reject
                </Button>
                <Button mode="contained" onPress={() => handleBookingAction('approve')} compact>
                  Approve
                </Button>
              </View>
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
});
