import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  theme: any;
  topInset: number;
  onBack: () => void;
};

export function PrivateRoundState({ theme, topInset, onBack }: Props) {
  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={onBack} />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Round unavailable</Text>
      </View>
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="lock-outline" size={38} color={theme.colors.primary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Round details are private</Text>
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          Only the host and accepted participants can open quest rounds.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
