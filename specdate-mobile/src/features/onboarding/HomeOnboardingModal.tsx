import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

type HomeOnboardingModalProps = {
  visible: boolean;
  onClose: () => void;
};

const STEPS = [
  {
    icon: 'clipboard-plus-outline',
    image: require('../../../assets/onboarding/create_spec.png'),
    title: 'Create a Spec',
    bullets: [
      'Costs 1 credit to publish.',
      'Choose duration and participant limit.',
      'Add requirements so the right people apply.',
    ],
    accent: ['#EC4899', '#8B5CF6'] as const,
  },
  {
    icon: 'account-check-outline',
    image: require('../../../assets/onboarding/join_free.png'),
    title: 'Join for free',
    bullets: [
      'Joining a Spec is free.',
      'Complete your profile before applying.',
      'The owner approves requests before rounds begin.',
    ],
    accent: ['#14B8A6', '#2563EB'] as const,
  },
  {
    icon: 'forum-outline',
    image: require('../../../assets/onboarding/round_decide.png'),
    title: 'Rounds decide the match',
    bullets: [
      'Rounds close new applications.',
      'Participants answer each question.',
      'Eliminations continue until a final match remains.',
    ],
    accent: ['#F97316', '#DB2777'] as const,
  },
  {
    icon: 'ticket-percent-outline',
    image: require('../../../assets/onboarding/restuarant_date.png'),
    title: 'Book date vouchers',
    bullets: [
      'Matched users can plan real dates.',
      'Browse provider-backed options where available.',
      'Use vouchers or date codes when a booking is created.',
    ],
    accent: ['#22C55E', '#0F766E'] as const,
  },
  {
    icon: 'shield-alert-outline',
    image: require('../../../assets/onboarding/safety_support.png'),
    title: 'Safety and support',
    bullets: [
      'Report unsafe users, media, or messages.',
      'Contact support for account, payment, or safety help.',
      'Use Safety Center when you need guidance.',
    ],
    accent: ['#6366F1', '#EC4899'] as const,
  },
] as const;

export function HomeOnboardingModal({ visible, onClose }: HomeOnboardingModalProps) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const close = () => {
    setIndex(0);
    onClose();
  };

  const next = () => {
    if (isLast) {
      close();
      return;
    }

    setIndex((current) => current + 1);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={close}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: theme.colors.primary }]}>How DateUsher works</Text>
          <IconButton icon="close" size={20} onPress={close} />
        </View>

        <View style={styles.visual}>
          <Image source={step.image} resizeMode="cover" style={styles.visualImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.54)']}
            locations={[0, 0.48, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.visualInner, { backgroundColor: step.accent[0] }]}>
            <MaterialCommunityIcons name={step.icon} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.visualChip}>
            <Text style={styles.visualChipText}>{index + 1} / {STEPS.length}</Text>
          </View>
          <View style={styles.visualCaption}>
            <Text style={styles.visualTitle}>{step.title}</Text>
            <Text style={styles.visualSubtext}>A quick guide to your next step</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{step.title}</Text>
        <View style={styles.bulletList}>
          {step.bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.bulletText, { color: theme.colors.onSurfaceVariant }]}>{bullet}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dots}>
          {STEPS.map((item, dotIndex) => (
            <View
              key={item.title}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? theme.colors.primary : theme.colors.outlineVariant,
                  width: dotIndex === index ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button mode="text" onPress={close}>
            Skip
          </Button>
          <Button mode="contained" onPress={next} style={styles.primaryButton}>
            {isLast ? 'Got it' : 'Next'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    margin: 18,
    borderRadius: 28,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  visual: {
    borderRadius: 24,
    height: 210,
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  visualImage: {
    height: 360,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  visualInner: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    left: 16,
    position: 'absolute',
    top: 16,
    width: 48,
  },
  visualCaption: {
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 82,
  },
  visualTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  visualSubtext: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  visualChip: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    right: 16,
  },
  visualChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  bulletList: {
    gap: 10,
    minHeight: 104,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  bulletDot: {
    borderRadius: 999,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    borderRadius: 999,
    height: 7,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  primaryButton: {
    borderRadius: 14,
    minWidth: 116,
  },
});
