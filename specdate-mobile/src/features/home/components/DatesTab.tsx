import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { withAlpha } from '../homeUtils';
import { HomeColors, SpecDateItem } from '../types';
import DateMatchCard from './DateMatchCard';

type Props = {
  theme: any;
  homeColors: HomeColors;
  insets: { bottom: number };
  bottomNavHeight: number;
  navigation: any;
};

export default function DatesTab({ theme, homeColors, insets, bottomNavHeight, navigation }: Props) {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['dates'],
    queryFn: SpecService.getDates,
  });

  const dates = useMemo<SpecDateItem[]>(() => data?.data || [], [data]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Final matches</Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Your dates</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}>
          <MaterialCommunityIcons name="calendar-heart" size={16} color={theme.colors.primary} />
          <Text style={[styles.countText, { color: theme.colors.primary }]}>{dates.length}</Text>
        </View>
      </View>

      <FlatList
        key="dates"
        data={dates}
        keyExtractor={(item) => String(item.id)}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + bottomNavHeight + 24 }]}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: withAlpha(theme.colors.primary, 0.1) }]}>
                <MaterialCommunityIcons name="calendar-heart" size={34} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No dates yet</Text>
              <Text style={[styles.emptyText, { color: homeColors.subtext }]}>
                When a spec quest becomes a match, it will appear here with the date code.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DateMatchCard
            item={item}
            theme={theme}
            homeColors={homeColors}
            onOpenQuest={(specId) => navigation.navigate('SpecDetails', { specId: String(specId) })}
            onOpenChat={(threadId) => navigation.navigate('ChatThread', { threadId })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 2,
  },
  countPill: {
    minWidth: 58,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countText: {
    fontSize: 14,
    fontWeight: '900',
  },
  listContent: {
    paddingTop: 4,
    gap: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
