import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { UserService } from '../../../services/user';
import { FEED_KEYS, mapSpecsResponse, tagColor, withAlpha } from '../homeUtils';
import { FeedKey, HomeColors, HomeTopTab, SpecCardItem } from '../types';
import PersonCard, { UserItem } from './PersonCard';
import SearchModal from './SearchModal';
import SpecCard from './SpecCard';

type Props = {
  theme: any;
  homeColors: HomeColors;
  insets: { left: number; right: number; bottom: number };
  bottomNavHeight: number;
  navigation: any;
};

export default function HomeFeedTab({ theme, homeColors, insets, bottomNavHeight, navigation }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<HomeTopTab>('Specs');
  const [feed, setFeed] = useState<FeedKey>('LIVE');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sexFilter, setSexFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [cityQuery, setCityQuery] = useState<string>('');

  React.useEffect(() => {
    const t = setTimeout(() => setCityQuery(cityFilter.trim()), 400);
    return () => clearTimeout(t);
  }, [cityFilter]);

  const fetchSpecsForFeed = useCallback(async (f: FeedKey): Promise<SpecCardItem[]> => {
    const res = await SpecService.getAll(f);
    return mapSpecsResponse(res, f);
  }, []);

  const { data: specs = [], isLoading, error, isError, refetch, isRefetching } = useQuery({
    queryKey: ['specs', feed],
    retry: false,
    staleTime: 0,
    queryFn: () => fetchSpecsForFeed(feed),
  });

  const { data: usersData, refetch: refetchUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', sexFilter, cityQuery, query],
    queryFn: () => UserService.getAll({
      sex: sexFilter,
      city: cityQuery || undefined,
      query,
      page: 1,
    }),
    enabled: tab === 'People',
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      FEED_KEYS.forEach((f) => {
        if (f !== feed) {
          queryClient.prefetchQuery({ queryKey: ['specs', f], queryFn: () => fetchSpecsForFeed(f) });
        }
      });
    }, [feed, fetchSpecsForFeed, queryClient, refetch])
  );

  const usersList = useMemo(() => {
    const raw = usersData?.data;
    const list = Array.isArray(raw) ? raw : (raw?.data || []);
    return list as UserItem[];
  }, [usersData]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return specs;
    return specs.filter((s) => (s.title + ' ' + s.owner).toLowerCase().includes(q));
  }, [query, specs]);

  const specsErrorText = useMemo(() => {
    if (!isError) return '';
    const anyErr: any = error;
    const status = anyErr?.response?.status;
    const msg = anyErr?.response?.data?.message || anyErr?.message || 'Failed to load specs.';
    const hint =
      status === 401
        ? 'You are not authenticated. Please log in again.'
        : status
          ? `HTTP ${status}. If you are running on a physical device, update API_URL in src/services/api.ts to your PC IP.`
          : 'If you are running on a physical device, update API_URL in src/services/api.ts to your PC IP.';

    return `${msg}\n${hint}`;
  }, [error, isError]);

  return (
    <>
      <View style={[styles.controlsWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <View style={[styles.controlsBar, { backgroundColor: theme.colors.elevation.level2 }]}>
          <TouchableOpacity onPress={() => setSearchOpen(true)} style={styles.controlsIconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="magnify" size={28} color={theme.colors.primary} style={{ textShadowColor: theme.colors.primary, textShadowRadius: 10 }} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <SegmentedButtons
              value={tab}
              onValueChange={(v) => setTab(v as HomeTopTab)}
              buttons={[
                { value: 'Specs', label: 'Specs', icon: 'view-grid' },
                { value: 'People', label: 'People', icon: 'account-multiple' },
              ]}
              density="small"
              style={styles.segmentedTabs}
            />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Providers', { source: 'home' })} style={styles.controlsIconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={theme.colors.primary} style={{ textShadowColor: theme.colors.primary, textShadowRadius: 10 }} />
          </TouchableOpacity>
        </View>
      </View>

      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} tab={tab} query={query} setQuery={setQuery} />

      {tab === 'Specs' ? (
        <View style={[styles.feedWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
            {FEED_KEYS.map((k) => {
              const active = feed === k;
              return (
                <TouchableOpacity
                  key={k}
                  onPress={() => {
                    setFeed(k);
                    queryClient.refetchQueries({ queryKey: ['specs', k] });
                  }}
                  style={[
                    styles.feedPill,
                    {
                      backgroundColor: active ? tagColor(k) : theme.colors.elevation.level2,
                      borderColor: active ? tagColor(k) : theme.colors.outline,
                    },
                  ]}
                  activeOpacity={0.9}
                >
                  <View style={[styles.feedDot, { backgroundColor: active ? 'rgba(255,255,255,0.95)' : tagColor(k) }]} />
                  <Text style={[styles.feedPillText, { color: active ? '#FFFFFF' : theme.colors.onSurface }]}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.peopleFiltersWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleFiltersRow}>
            {['All', 'Male', 'Female'].map((s) => {
              const active = sexFilter === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSexFilter(s)}
                  style={[styles.peoplePill, { backgroundColor: active ? theme.colors.primary : theme.colors.elevation.level2 }]}
                >
                  <Text style={[styles.peoplePillText, { color: active ? theme.colors.onPrimary : theme.colors.onSurface }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={[styles.cityFilterWrap, { backgroundColor: theme.colors.elevation.level2 }]}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.colors.primary} />
            <TextInput
              value={cityFilter}
              onChangeText={setCityFilter}
              placeholder="Filter by city"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={styles.cityInput}
              dense
            />
          </View>
        </View>
      )}

      {tab === 'Specs' ? (
        <View style={[styles.specGridContainer, { backgroundColor: theme.colors.surface }]}>
          <FlatList
            key="specs"
            data={filteredItems}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.listContent, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + bottomNavHeight + 24 }]}
            onRefresh={refetch}
            refreshing={isRefetching}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.empty}>
                  <ActivityIndicator animating color={theme.colors.primary} />
                </View>
              ) : isError ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.colors.error }]}>{specsErrorText}</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.colors.outline }]}>No specs found.</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <SpecCard
                item={item}
                theme={theme}
                homeColors={homeColors}
                tagColor={tagColor}
                withAlpha={withAlpha}
                onPress={() => {
                  queryClient.prefetchQuery({ queryKey: ['spec', String(item.id)], queryFn: () => SpecService.getOne(String(item.id)) });
                  navigation.navigate('SpecDetails', { specId: item.id });
                }}
              />
            )}
          />
        </View>
      ) : (
        <View style={[styles.specGridContainer, { backgroundColor: theme.colors.surface }]}>
          <FlatList
            key="people"
            data={usersList}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.peopleGridRow}
            contentContainerStyle={[styles.peopleGridContent, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + bottomNavHeight + 24 }]}
            onRefresh={refetchUsers}
            refreshing={isLoadingUsers}
            ListEmptyComponent={
              <View style={styles.peopleEmpty}>
                <MaterialCommunityIcons name="account-search-outline" size={42} color={theme.colors.outline} />
                <Text style={[styles.peopleEmptyText, { color: theme.colors.outline }]}>No people found for this search.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <PersonCard item={item} theme={theme} onPress={() => navigation.navigate('ProfileViewer', { userId: Number(item.id) })} />
            )}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  controlsWrap: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  controlsIconBtn: {
    padding: 4,
  },
  segmentedTabs: {
    flex: 1,
  },
  feedWrap: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  feedScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  feedPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  feedPillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  specGridContainer: {
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
  peopleFiltersWrap: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  peopleFiltersRow: {
    gap: 8,
    paddingRight: 12,
  },
  peoplePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  peoplePillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cityFilterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 12,
    paddingVertical: 4,
    gap: 8,
  },
  cityInput: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 40,
  },
  peopleGridRow: {
    gap: 6,
    marginBottom: 6,
  },
  peopleGridContent: {
    paddingTop: 8,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  peopleEmpty: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  peopleEmptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
