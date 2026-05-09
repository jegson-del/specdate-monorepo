import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { DateVoucherItem, VoucherService } from '../../services/vouchers';

const statusLabels: Record<string, string> = {
  pending_provider: 'Pending provider approval',
  active: 'Active',
  rejected: 'Rejected',
  redeemed: 'Redeemed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default function DateVoucherDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const routeVoucher = route.params?.voucher as DateVoucherItem | undefined;
  const voucherId = route.params?.voucherId ?? routeVoucher?.id;
  const { data } = useQuery({
    queryKey: ['date-voucher', String(voucherId)],
    queryFn: () => VoucherService.getVoucher(voucherId),
    enabled: voucherId != null,
  });
  const voucher = data?.data ?? routeVoucher;

  if (!voucher) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.outline }}>Voucher not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>Go back</Button>
      </View>
    );
  }

  const copyCode = async () => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(voucher.voucher_code);
      Alert.alert('Voucher code copied', 'Share this code with the provider if they need to confirm it manually.');
    } catch {
      Alert.alert('Copy unavailable', 'Rebuild the app to enable code copying on this device.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Voucher</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="ticket-percent-outline" size={34} color="#fff" />
          <Text style={styles.heroTitle}>{voucher.discount_percentage}% off</Text>
          <Text style={styles.heroText}>{voucher.provider?.name || 'Date provider'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <InfoRow label="Status" value={statusLabels[voucher.status] ?? voucher.status} icon="progress-check" theme={theme} />
          <InfoRow label="Date code" value={voucher.date?.date_code || '-'} icon="calendar-heart" theme={theme} />
          <InfoRow label="Voucher code" value={voucher.voucher_code} icon="qrcode" theme={theme} />
          <InfoRow
            label="Booking"
            value={voucher.booking_required ? 'Provider approval required' : 'Walk-ins allowed'}
            icon={voucher.booking_required ? 'calendar-check-outline' : 'calendar-remove-outline'}
            theme={theme}
          />
          <InfoRow
            label="Minimum spend"
            value={voucher.minimum_spend ? `₦${Number(voucher.minimum_spend).toLocaleString()}` : 'No minimum spend'}
            icon="cash-multiple"
            theme={theme}
          />
        </View>

        <View style={[styles.codeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <MaterialCommunityIcons name="qrcode-scan" size={34} color={theme.colors.primary} />
          <View style={styles.codeCopy}>
            <Text style={[styles.codeTitle, { color: theme.colors.onSurface }]}>Provider scan code</Text>
            <Text style={[styles.codeText, { color: theme.colors.onSurfaceVariant }]}>
              Ask the provider to scan this voucher or confirm the code before applying your discount.
            </Text>
          </View>
          <Text style={[styles.bigCode, { color: theme.colors.primary }]}>{voucher.voucher_code}</Text>
        </View>

        <Button mode="outlined" icon="content-copy" onPress={copyCode} style={styles.button}>
          Copy voucher code
        </Button>
        <Button mode="contained" icon="phone" onPress={() => Alert.alert('Book with provider', 'Call or message the provider to arrange your visit time.')} style={styles.button}>
          Book with provider
        </Button>
      </View>
    </View>
  );
}

function InfoRow({ label, value, icon, theme }: { label: string; value: string; icon: any; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  hero: { alignItems: 'center', padding: 22, borderRadius: 16 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  heroText: { color: 'rgba(255,255,255,0.86)', fontSize: 15, fontWeight: '700', marginTop: 2 },
  card: { padding: 14, borderRadius: 14, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoCopy: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  codeCard: { alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1 },
  codeCopy: { alignItems: 'center', marginTop: 8 },
  codeTitle: { fontSize: 16, fontWeight: '900' },
  codeText: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  bigCode: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5, marginTop: 12 },
  button: { borderRadius: 12 },
});
