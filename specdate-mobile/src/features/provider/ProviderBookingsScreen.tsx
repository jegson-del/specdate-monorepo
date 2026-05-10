import React from 'react';
import { Alert, Animated, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateVoucherItem, DateVoucherStatus, VoucherService } from '../../services/vouchers';

type BookingFilter = 'confirmed' | 'pending' | 'all';

const statusCopy: Record<DateVoucherStatus, { label: string; tone: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  pending_provider: { label: 'Pending confirmation', tone: '#F59E0B', icon: 'calendar-clock' },
  active: { label: 'Confirmed', tone: '#16A34A', icon: 'calendar-check' },
  rejected: { label: 'Rejected', tone: '#EF4444', icon: 'calendar-remove' },
  redeemed: { label: 'Redeemed', tone: '#0891B2', icon: 'check-decagram' },
  completed: { label: 'Completed', tone: '#16A34A', icon: 'check-circle-outline' },
  cancelled: { label: 'Cancelled', tone: '#64748B', icon: 'calendar-remove-outline' },
  expired: { label: 'Expired', tone: '#7C3AED', icon: 'timer-off-outline' },
};

function formatMoney(value?: number | null) {
  if (!value) return 'No minimum spend';
  return `₦${Number(value).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProviderBookingsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const initialFilter = (route.params?.initialFilter as BookingFilter | undefined) ?? 'confirmed';
  const [filter, setFilter] = React.useState<BookingFilter>(initialFilter);
  const [selectedBooking, setSelectedBooking] = React.useState<DateVoucherItem | null>(null);
  const detailAnim = React.useRef(new Animated.Value(0)).current;

  const bookingsQuery = useInfiniteQuery({
    queryKey: ['provider-bookings'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => VoucherService.getProviderBookings({ page: Number(pageParam), per_page: 20 }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.data.current_page ?? 1;
      const last = lastPage.data.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
  });
  const { isLoading, refetch } = bookingsQuery;

  const bookings = bookingsQuery.data?.pages.flatMap((page) => page.data.data) || [];
  const confirmedCount = bookings.filter((booking) => ['active', 'redeemed', 'completed'].includes(booking.status)).length;
  const pendingCount = bookings.filter((booking) => booking.status === 'pending_provider').length;
  const visibleBookings = bookings.filter((booking) => {
    if (filter === 'confirmed') return ['active', 'redeemed', 'completed'].includes(booking.status);
    if (filter === 'pending') return booking.status === 'pending_provider';
    return true;
  });

  React.useEffect(() => {
    Animated.spring(detailAnim, {
      toValue: selectedBooking ? 1 : 0,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, [detailAnim, selectedBooking]);

  const approveMutation = useMutation({
    mutationFn: VoucherService.approve,
    onSuccess: () => {
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (error: any) => Alert.alert('Could not approve', error?.response?.data?.message || 'Please try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: VoucherService.reject,
    onSuccess: () => {
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
    },
    onError: (error: any) => Alert.alert('Could not reject', error?.response?.data?.message || 'Please try again.'),
  });

  const handleBookingAction = (booking: DateVoucherItem, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Confirm booking' : 'Reject booking',
      action === 'approve'
        ? 'This will confirm the date booking and activate the voucher for the matched users.'
        : 'This will reject the booking request for the matched users.',
      [
        { text: 'Cancel' },
        {
          text: action === 'approve' ? 'Confirm' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => action === 'approve' ? approveMutation.mutate(booking.id) : rejectMutation.mutate(booking.id),
        },
      ]
    );
  };

  const emptyCopy = filter === 'confirmed'
    ? 'Confirmed and redeemed date bookings will appear here after you approve a request.'
    : filter === 'pending'
      ? 'Unconfirmed booking requests will appear here for review.'
      : 'When matched users request a date voucher, their booking details will appear here.';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Date bookings</Text>
        <IconButton icon="refresh" size={22} onPress={() => refetch()} iconColor={theme.colors.primary} />
      </View>

      <View style={styles.summaryRow}>
        <SummaryPill label="Confirmed" value={confirmedCount} color="#16A34A" icon="calendar-check" theme={theme} />
        <SummaryPill label="Pending" value={pendingCount} color="#F59E0B" icon="calendar-clock" theme={theme} />
      </View>

      <View style={[styles.filterBar, { backgroundColor: theme.colors.surface }]}>
        <FilterButton label="Confirmed" active={filter === 'confirmed'} onPress={() => setFilter('confirmed')} theme={theme} />
        <FilterButton label="Pending" active={filter === 'pending'} onPress={() => setFilter('pending')} theme={theme} />
        <FilterButton label="All" active={filter === 'all'} onPress={() => setFilter('all')} theme={theme} />
      </View>

      <FlatList
        data={visibleBookings}
        keyExtractor={(booking) => String(booking.id)}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        onEndReached={() => {
          if (bookingsQuery.hasNextPage && !bookingsQuery.isFetchingNextPage) bookingsQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name={isLoading ? 'progress-clock' : 'calendar-search'} size={36} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {isLoading ? 'Loading bookings' : 'No bookings here yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{emptyCopy}</Text>
          </View>
        }
        renderItem={({ item: booking }) => (
            <BookingCard
              booking={booking}
              theme={theme}
              onPress={() => setSelectedBooking(booking)}
              onApprove={() => handleBookingAction(booking, 'approve')}
              onReject={() => handleBookingAction(booking, 'reject')}
              loading={approveMutation.isPending || rejectMutation.isPending}
            />
        )}
      />

      <BookingDetailModal
        booking={selectedBooking}
        detailAnim={detailAnim}
        theme={theme}
        insets={insets}
        onClose={() => setSelectedBooking(null)}
        onApprove={(booking) => handleBookingAction(booking, 'approve')}
        onReject={(booking) => handleBookingAction(booking, 'reject')}
        loading={approveMutation.isPending || rejectMutation.isPending}
      />
    </View>
  );
}

function SummaryPill({ label, value, color, icon, theme }: { label: string; value: number; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; theme: any }) {
  return (
    <View style={[styles.summaryPill, { backgroundColor: `${color}14`, borderColor: `${color}38` }]}>
      <MaterialCommunityIcons name={icon} size={19} color={color} />
      <View>
        <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text>
        <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </View>
    </View>
  );
}

function FilterButton({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.filterButton, { backgroundColor: active ? theme.colors.primary : 'transparent' }]}
    >
      <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.colors.onSurfaceVariant }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BookingCard({
  booking,
  theme,
  onPress,
  onApprove,
  onReject,
  loading,
}: {
  booking: DateVoucherItem;
  theme: any;
  onPress: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const status = statusCopy[booking.status];
  const specTitle = booking.date?.spec?.title || 'Date booking';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.bookingCard, { backgroundColor: theme.colors.surface, borderColor: `${status.tone}24` }]}
    >
      <View style={styles.bookingTopLine}>
        <View style={[styles.statusIcon, { backgroundColor: `${status.tone}16` }]}>
          <MaterialCommunityIcons name={status.icon} size={22} color={status.tone} />
        </View>
        <View style={styles.bookingCopy}>
          <Text style={[styles.bookingTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {booking.owner?.name || 'Owner'} and {booking.winner?.name || 'Winner'}
          </Text>
          <Text style={[styles.bookingMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {specTitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </View>

      <View style={styles.bookingInfoRow}>
        <MiniInfo icon="ticket-percent-outline" text={`${booking.discount_percentage}% off`} color={theme.colors.primary} />
        <MiniInfo icon="qrcode" text={booking.voucher_code} color="#0891B2" />
      </View>

      <View style={styles.bookingFooter}>
        <View style={[styles.statusPill, { backgroundColor: `${status.tone}14` }]}>
          <Text style={[styles.statusText, { color: status.tone }]}>{status.label}</Text>
        </View>
        <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
          {booking.date?.date_code ? `Date ${booking.date.date_code}` : formatDate(booking.created_at)}
        </Text>
      </View>

      {booking.status === 'pending_provider' ? (
        <View style={styles.actions}>
          <Button mode="outlined" onPress={onReject} disabled={loading} compact style={styles.actionButton}>
            Reject
          </Button>
          <Button mode="contained" onPress={onApprove} disabled={loading} loading={loading} compact style={styles.actionButton}>
            Confirm
          </Button>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function MiniInfo({ icon, text, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string; color: string }) {
  return (
    <View style={styles.miniInfo}>
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text style={styles.miniInfoText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function BookingDetailModal({
  booking,
  detailAnim,
  theme,
  insets,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  booking: DateVoucherItem | null;
  detailAnim: Animated.Value;
  theme: any;
  insets: { bottom: number };
  onClose: () => void;
  onApprove: (booking: DateVoucherItem) => void;
  onReject: (booking: DateVoucherItem) => void;
  loading: boolean;
}) {
  if (!booking) return null;

  const status = statusCopy[booking.status];
  const scale = detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.detailSheet,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: insets.bottom + 16,
              opacity: detailAnim,
              transform: [{ translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale }],
            },
          ]}
        >
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: `${status.tone}16` }]}>
              <MaterialCommunityIcons name={status.icon} size={26} color={status.tone} />
            </View>
            <View style={styles.detailHeaderCopy}>
              <Text style={[styles.detailTitle, { color: theme.colors.onSurface }]}>Booking details</Text>
              <Text style={[styles.detailSubtitle, { color: theme.colors.onSurfaceVariant }]}>{status.label}</Text>
            </View>
            <IconButton icon="close" size={22} onPress={onClose} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
            <View style={[styles.heroDetail, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}28` }]}>
              <Text style={[styles.heroDetailTitle, { color: theme.colors.onSurface }]}>
                {booking.owner?.name || 'Owner'} and {booking.winner?.name || 'Winner'}
              </Text>
              <Text style={[styles.heroDetailText, { color: theme.colors.onSurfaceVariant }]}>
                {booking.date?.spec?.title || 'SpecDate booking'}{booking.date?.spec?.location_city ? ` · ${booking.date.spec.location_city}` : ''}
              </Text>
            </View>

            <DetailRow label="Voucher code" value={booking.voucher_code} icon="qrcode" theme={theme} />
            <DetailRow label="Date code" value={booking.date?.date_code || '-'} icon="calendar-heart" theme={theme} />
            <DetailRow label="Discount" value={`${booking.discount_percentage}% off`} icon="ticket-percent-outline" theme={theme} />
            <DetailRow label="Minimum spend" value={formatMoney(booking.minimum_spend)} icon="cash-multiple" theme={theme} />
            <DetailRow label="Booking terms" value={booking.booking_required ? 'Provider confirmation required' : 'Walk-ins allowed'} icon="calendar-check-outline" theme={theme} />
            <DetailRow label="ID check" value={booking.provider?.idRequired ? 'Valid ID required at venue' : 'No ID requirement'} icon="card-account-details-outline" theme={theme} />
            <DetailRow label="Requested" value={formatDate(booking.created_at)} icon="clock-outline" theme={theme} />
            {booking.redeemed_at ? (
              <DetailRow label="Redeemed" value={formatDate(booking.redeemed_at)} icon="check-decagram" theme={theme} />
            ) : null}
            <DetailRow label="Expires" value={formatDate(booking.expires_at)} icon="timer-outline" theme={theme} />

            <View style={styles.peopleGrid}>
              <PersonBlock title="Date owner" user={booking.owner} color={theme.colors.primary} theme={theme} />
              <PersonBlock title="Date match" user={booking.winner} color="#0891B2" theme={theme} />
            </View>
          </ScrollView>

          {booking.status === 'pending_provider' ? (
            <View style={styles.detailActions}>
              <Button mode="outlined" onPress={() => onReject(booking)} disabled={loading} style={styles.detailButton}>
                Reject
              </Button>
              <Button mode="contained" onPress={() => onApprove(booking)} disabled={loading} loading={loading} style={styles.detailButton}>
                Confirm booking
              </Button>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, icon, theme }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; theme: any }) {
  return (
    <View style={[styles.detailRow, { borderColor: theme.colors.outlineVariant || theme.colors.outline }]}>
      <View style={[styles.detailRowIcon, { backgroundColor: `${theme.colors.primary}12` }]}>
        <MaterialCommunityIcons name={icon} size={19} color={theme.colors.primary} />
      </View>
      <View style={styles.detailRowCopy}>
        <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

function PersonBlock({ title, user, color, theme }: { title: string; user?: DateVoucherItem['owner']; color: string; theme: any }) {
  const name = user?.name || 'User';
  return (
    <View style={[styles.personBlock, { backgroundColor: theme.colors.background, borderColor: `${color}28` }]}>
      <View style={[styles.personAvatar, { backgroundColor: color }]}>
        <Text style={styles.personAvatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[styles.personTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
      <Text style={[styles.personName, { color: theme.colors.onSurface }]} numberOfLines={1}>{name}</Text>
      {user?.username ? <Text style={[styles.personUsername, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>@{user.username}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  summaryPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  filterBar: { flexDirection: 'row', gap: 6, marginHorizontal: 16, padding: 4, borderRadius: 16, marginBottom: 8 },
  filterButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 12 },
  filterText: { fontSize: 13, fontWeight: '900' },
  content: { padding: 16, gap: 12 },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 18, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bookingCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  bookingTopLine: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bookingCopy: { flex: 1, marginLeft: 10 },
  bookingTitle: { fontSize: 15, fontWeight: '900' },
  bookingMeta: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  bookingInfoRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  miniInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  miniInfoText: { flex: 1, fontSize: 12, fontWeight: '800', color: '#334155' },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '900' },
  dateText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  actionButton: { borderRadius: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
  detailSheet: { maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10 },
  detailHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', marginBottom: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  detailIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailHeaderCopy: { flex: 1, marginLeft: 12 },
  detailTitle: { fontSize: 19, fontWeight: '900' },
  detailSubtitle: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  detailContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  heroDetail: { padding: 16, borderRadius: 18, borderWidth: 1 },
  heroDetailTitle: { fontSize: 17, fontWeight: '900' },
  heroDetailText: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  detailRowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailRowCopy: { flex: 1, marginLeft: 10 },
  detailLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  peopleGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  personBlock: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  personAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  personAvatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  personTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 8 },
  personName: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  personUsername: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  detailActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  detailButton: { flex: 1, borderRadius: 12 },
});
