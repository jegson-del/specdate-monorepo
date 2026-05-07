import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type SafetySection = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  items: string[];
};

const SAFETY_SECTIONS: SafetySection[] = [
  {
    title: 'Online Safety',
    icon: 'shield-check-outline',
    items: [
      'Keep early conversations inside DateUsher so report and block tools remain available.',
      'Never send money, gift cards, bank details, passwords, or verification codes to another user.',
      'Be cautious with people who rush intimacy, avoid basic questions, or pressure you to move off the app quickly.',
      'Report requests for money, scams, harassment, threats, fake profiles, spam, or underage users.',
    ],
  },
  {
    title: 'Chat & Media Rules',
    icon: 'message-alert-outline',
    items: [
      'Do not send nudity, sexual exploitation, hate speech, threats, harassment, violent content, or content involving minors.',
      'Only share images, videos, audio, and messages you have the right to share.',
      'Use the chat menu to report a user, and use the message menu to report a message or attached media.',
      'Blocking someone stops further chat access and hides profile access between both users.',
    ],
  },
  {
    title: 'Meeting In Person',
    icon: 'map-marker-outline',
    items: [
      'Take your time before meeting and ask questions that help you spot red flags.',
      'Meet in a public, populated place for the first dates. Avoid private homes or isolated locations.',
      'Tell a trusted friend where you are going, who you are meeting, and when you expect to return.',
      'Keep your phone charged and control your own transport so you can leave whenever you need to.',
    ],
  },
  {
    title: 'Consent & Boundaries',
    icon: 'heart-outline',
    items: [
      'Respect boundaries in chat and in person. Pressure, coercion, threats, or repeated unwanted messages are not allowed.',
      'Consent must be clear, freely given, and ongoing. It can be withdrawn at any time.',
      'Do not continue if someone seems uncomfortable, unsure, intoxicated, or unable to consent.',
      'If something feels wrong, end the chat or date and use report/block when needed.',
    ],
  },
  {
    title: 'Emergency Help',
    icon: 'alert-circle-outline',
    items: [
      'If you are in immediate danger, contact local emergency services right away.',
      'If a date makes you feel unsafe, leave the situation and ask venue staff, security, or a trusted person for help.',
      'Reports help DateUsher review behavior inside the app, but they are not a replacement for emergency services.',
    ],
  },
];

export default function SafetyCenterScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor={theme.colors.onSurface} onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Safety Center</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="shield-account-outline" size={28} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>Date with more control</Text>
            <Text style={[styles.heroBody, { color: theme.colors.onPrimaryContainer }]}>
              Use report and block whenever something feels unsafe, suspicious, or disrespectful.
            </Text>
          </View>
        </Surface>

        {SAFETY_SECTIONS.map((section) => (
          <Surface key={section.title} style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name={section.icon} size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{section.title}</Text>
            </View>
            <View style={styles.items}>
              {section.items.map((item) => (
                <View key={item} style={styles.itemRow}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.itemText, { color: theme.colors.onSurfaceVariant }]}>{item}</Text>
                </View>
              ))}
            </View>
          </Surface>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  hero: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  heroBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  items: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
