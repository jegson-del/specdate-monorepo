import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';

type SettingItem = {
  title: string;
  body: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

const SETTINGS: SettingItem[] = [
  {
    title: 'Terms and conditions',
    icon: 'file-document-outline',
    color: '#7C3AED',
    body: 'Honor every confirmed voucher, keep published prices honest, and only redeem a voucher when the matched users are physically present. DateUsher may review reports, suspend unsafe providers, or remove offers that mislead customers.',
  },
  {
    title: 'How to report a customer',
    icon: 'flag-outline',
    color: '#DC2626',
    body: 'If a customer is abusive, unsafe, fraudulent, or refuses to follow venue rules, collect the date code or voucher code and contact support. When provider reporting is enabled, reports will attach to the customer, booking, and voucher for admin review.',
  },
  {
    title: 'How to scan discount QR',
    icon: 'qrcode-scan',
    color: '#0891B2',
    body: 'Ask the customer to open their date voucher. Tap Scan on your dashboard, scan the QR code, confirm the names and date code, then redeem only when the customers are ready to use the discount.',
  },
  {
    title: 'Provider rules',
    icon: 'shield-check-outline',
    color: '#16A34A',
    body: 'Keep venue details, minimum spend, booking requirement, opening information, and discount percentage accurate. Do not ask customers to pay extra to receive a discount that was already promised.',
  },
  {
    title: 'Safety and disputes',
    icon: 'lifebuoy',
    color: '#F59E0B',
    body: 'For safety concerns, voucher mismatch, no-shows, payment disputes, or abusive behavior, pause the redemption and contact support. Do not manually override failed voucher scans without admin guidance.',
  },
];

export default function ProviderSettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Provider settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="store-cog-outline" size={30} color="#fff" />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Provider guide</Text>
            <Text style={styles.heroText}>Rules, reporting, voucher scanning, and support guidance.</Text>
          </View>
        </View>

        {SETTINGS.map((item) => (
          <View key={item.title} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}18` }]}>
              <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
              <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>{item.body}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => navigation.navigate('SupportTickets')}
          style={[styles.supportCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '40' }]}
        >
          <MaterialCommunityIcons name="headset" size={22} color={theme.colors.primary} />
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Contact admin support</Text>
            <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
              Ask for help with voucher scans, disputes, customer behavior, or account questions.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
        </TouchableOpacity>

        <Button mode="outlined" icon="logout" textColor={theme.colors.error} onPress={handleLogout} style={styles.logoutButton}>
          Logout
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
  heroCopy: { flex: 1 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, marginTop: 2 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutButton: { marginTop: 6, borderRadius: 12 },
});
