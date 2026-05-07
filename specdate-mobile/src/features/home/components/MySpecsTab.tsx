import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { HomeColors } from '../types';
import { tagColor, withAlpha } from '../homeUtils';
import SpecCard from './SpecCard';

type Props = {
  theme: any;
  homeColors: HomeColors;
  insets: { left: number; right: number; bottom: number };
  bottomNavHeight: number;
  navigation: any;
};

export default function MySpecsTab({ theme, homeColors, insets, bottomNavHeight, navigation }: Props) {
  const queryClient = useQueryClient();
  const [specTab, setSpecTab] = useState<'Owned' | 'Joined'>('Owned');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['my-specs', specTab],
    queryFn: () => SpecService.getMySpecs(specTab.toLowerCase() as 'owned' | 'joined'),
  });

  const mySpecs = useMemo(() => {
    const rawData = data?.data;
    return Array.isArray(rawData) ? rawData : (rawData?.data || []);
  }, [data]);

  return (
    <View style={styles.screen}>
      <View style={styles.segmentedWrap}>
        <SegmentedButtons
          value={specTab}
          onValueChange={(v) => setSpecTab(v as 'Owned' | 'Joined')}
          buttons={[
            {
              value: 'Owned',
              label: 'My Specs',
              checkedColor: theme.colors.primary,
              uncheckedColor: homeColors.subtext,
              style: { borderColor: theme.colors.primary },
            },
            {
              value: 'Joined',
              label: 'My Quest',
              checkedColor: theme.colors.primary,
              uncheckedColor: homeColors.subtext,
              style: { borderColor: theme.colors.primary },
            },
          ]}
          theme={{ colors: { secondaryContainer: 'rgba(124, 58, 237, 0.12)' } }}
        />
      </View>

      <View style={[styles.gridContainer, { backgroundColor: theme.colors.surface }]}>
        <FlatList
          key="my-specs"
          data={mySpecs}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
              paddingBottom: insets.bottom + bottomNavHeight + 24,
            },
          ]}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator animating color={theme.colors.primary} />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={{ color: theme.colors.outline }}>
                  {specTab === 'Owned' ? "You haven't created any specs yet." : "You haven't joined any specs yet."}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <SpecCard
              item={{
                id: String(item.id),
                title: item.title,
                owner: item.owner?.profile?.full_name || item.owner?.name || 'Unknown',
                expiresIn: new Date(item.expires_at) > new Date() ? 'Active' : 'Ended',
                joinCount: item.applications_count || 0,
                maxParticipants: item.max_participants,
                eliminatedCount: 0,
                firstDateProvider: '—',
                likesCount: 0,
                tag: item.status === 'OPEN' ? 'LIVE' : 'ONGOING',
                ownerAvatar: item.owner?.profile?.avatar,
              }}
              theme={theme}
              homeColors={homeColors}
              tagColor={tagColor}
              withAlpha={withAlpha}
              onPress={() => {
                queryClient.prefetchQuery({ queryKey: ['spec', String(item.id)], queryFn: () => SpecService.getOne(String(item.id)) });
                navigation.navigate('SpecDetails', { specId: String(item.id) });
              }}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 10,
  },
  segmentedWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  gridContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  empty: {
    paddingTop: 30,
    alignItems: 'center',
  },
});
