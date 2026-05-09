import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ProviderMarketplaceItem } from '../../services/providers';
import { DateVoucherPreview, VoucherService } from '../../services/vouchers';

export default function CreateDateVoucherScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const provider = route.params?.provider as ProviderMarketplaceItem | undefined;
  const [dateCode, setDateCode] = React.useState('');
  const [preview, setPreview] = React.useState<DateVoucherPreview | null>(null);

  const previewMutation = useMutation({
    mutationFn: () => VoucherService.preview(dateCode, provider!.id),
    onSuccess: (response) => setPreview(response.data),
    onError: (error: any) => Alert.alert('Could not preview voucher', error?.response?.data?.message || 'Please check the date code.'),
  });

  const createMutation = useMutation({
    mutationFn: () => VoucherService.create(dateCode, provider!.id),
    onSuccess: (response) => {
      navigation.replace('DateVoucherDetail', { voucherId: response.data.id, voucher: response.data });
    },
    onError: (error: any) => Alert.alert('Could not create voucher', error?.response?.data?.message || 'Please try again.'),
  });

  if (!provider) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.outline }}>Provider not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>Go back</Button>
      </View>
    );
  }

  const normalizedCode = dateCode.trim().toUpperCase();
  const canSubmit = normalizedCode.length >= 4;
  const terms = preview?.voucher_terms;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Claim voucher</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.providerCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.providerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="storefront-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.providerCopy}>
            <Text style={[styles.providerName, { color: theme.colors.onSurface }]}>{provider.name}</Text>
            <Text style={[styles.providerMeta, { color: theme.colors.onSurfaceVariant }]}>
              {(provider.discountPercentage ?? 10)}% off{provider.city ? ` · ${provider.city}` : ''}
            </Text>
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="Date code"
          value={dateCode}
          onChangeText={(value) => {
            setDateCode(value.toUpperCase());
            setPreview(null);
          }}
          autoCapitalize="characters"
          style={{ backgroundColor: theme.colors.surface }}
        />

        <Text style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
          Use the code from your match card. This confirms both matched users can use the provider offer.
        </Text>

        {terms ? (
          <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={styles.previewRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                {terms.discount_percentage}% off confirmed
              </Text>
            </View>
            <Text style={[styles.previewText, { color: theme.colors.onSurfaceVariant }]}>
              {terms.minimum_spend ? `Minimum spend ₦${Number(terms.minimum_spend).toLocaleString()}. ` : 'No minimum spend. '}
              {terms.booking_required ? 'Provider approval is required before the voucher becomes active.' : 'This voucher will become active immediately.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            disabled={!canSubmit || previewMutation.isPending}
            loading={previewMutation.isPending}
            onPress={() => previewMutation.mutate()}
            style={styles.actionButton}
          >
            Preview
          </Button>
          <Button
            mode="contained"
            disabled={!terms || createMutation.isPending}
            loading={createMutation.isPending}
            onPress={() => createMutation.mutate()}
            style={styles.actionButton}
          >
            Create voucher
          </Button>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Home', { initialTab: 'Matches' })} activeOpacity={0.8}>
          <Text style={[styles.findCode, { color: theme.colors.primary }]}>Find my date code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 14 },
  providerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  providerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  providerCopy: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '900' },
  providerMeta: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  helper: { fontSize: 13, lineHeight: 19 },
  previewCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewTitle: { fontSize: 16, fontWeight: '900' },
  previewText: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, borderRadius: 12 },
  findCode: { textAlign: 'center', fontSize: 13, fontWeight: '900', marginTop: 4 },
});
