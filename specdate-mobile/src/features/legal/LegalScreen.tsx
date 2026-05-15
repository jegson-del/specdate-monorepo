import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TERMS = [
  'You must be 18 or older to use DateUsher.',
  'You may not upload nudity, sexual exploitation, hate speech, harassment, threats, scams, illegal content, or content involving minors.',
  'You are responsible for the messages, images, videos, audio, profile content, and spec answers you upload.',
  'DateUsher may remove content, restrict features, suspend accounts, or terminate accounts when content or behavior violates our safety rules.',
  'Users can report profiles, messages, media, specs, and abusive behavior. Reports are reviewed by our moderation team.',
  'Users can block other users to prevent further contact and profile access.',
  'Credit top-ups and other digital features may be sold through Apple, Google, and RevenueCat. Review price, credit amount, refund rules, and platform settings before purchase.',
];

const PRIVACY = [
  'We collect account data such as name, username, email, phone number, date of birth, login details, and OTP verification data needed to operate DateUsher.',
  'We collect profile data including photos, videos, prompts, preferences, city, state, country, interests, and dating criteria you choose to provide.',
  'Uploaded media and chat content may be processed for safety, abuse review, support, and moderation.',
  'We use your date of birth to enforce age restrictions and protect minors from accessing the app.',
  'Purchases and credit grants may be validated through Apple, Google, and RevenueCat. We store product IDs, transaction IDs, entitlement or credit status, and related metadata needed for support, fraud prevention, and accounting.',
  'OTP delivery, email, and SMS may be handled by Twilio, email providers, mobile carriers, or similar communications vendors.',
  'Push notifications may be used for account, chat, match, Spec, booking, voucher, support, safety, and service updates when you allow notifications.',
  'We store authentication tokens securely on the device and use encrypted network connections for API communication.',
  'We may share limited information with service providers such as hosting, storage, RevenueCat, Apple, Google, Twilio, push notification providers, email/SMS providers, support tools, and moderation tools.',
  'You can pause or delete your account from Profile settings. Some limited records may be retained where needed for legal, safety, fraud-prevention, financial, dispute, or security reasons.',
  'Our Google Play Data Safety and Apple privacy disclosures are intended to match the full Privacy Policy at dateusher.com/privacy.',
];

export default function LegalScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const type = route.params?.type === 'privacy' ? 'privacy' : 'terms';
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Use';
  const items = type === 'privacy' ? PRIVACY : TERMS;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <Text style={[styles.updated, { color: theme.colors.onSurfaceVariant }]}>Effective May 15, 2026</Text>
        {items.map((item, index) => (
          <View key={item} style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <Text style={[styles.itemNum, { color: theme.colors.primary }]}>{index + 1}</Text>
            <Text style={[styles.itemText, { color: theme.colors.onSurface }]}>{item}</Text>
          </View>
        ))}
        <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          For the full policy, visit dateusher.com/privacy or dateusher.com/terms. For support or safety concerns, contact the DateUsher team through the app support channel.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  updated: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  item: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  itemNum: {
    fontSize: 14,
    fontWeight: '900',
    width: 20,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
});
