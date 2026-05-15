import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import { UserService } from '../../../services/user';
import { FEED_KEYS, mapSpecsResponse, tagColor, withAlpha } from '../homeUtils';
import { FeedKey, HomeColors, HomeTopTab, SpecCardItem } from '../types';
import PersonCard, { UserItem } from './PersonCard';
import PeopleLocationFilterModal from './PeopleLocationFilterModal';
import SearchModal from './SearchModal';
import SpecCard from './SpecCard';
import { flagForCountry } from '../../../utils/countryFlags';

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
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  const [sexFilter, setSexFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');

  const fetchSpecsForFeed = useCallback(async (f: FeedKey, page = 1) => {
    const res = await SpecService.getAll(f, page);
    return { res, items: await mapSpecsResponse(res, f) };
  }, []);

  const specsQuery = useInfiniteQuery({
    queryKey: ['specs', feed],
    initialPageParam: 1,
    retry: false,
    staleTime: 0,
    queryFn: ({ pageParam }) => fetchSpecsForFeed(feed, Number(pageParam)),
    getNextPageParam: (lastPage) => {
      const current = lastPage.res?.data?.current_page ?? 1;
      const last = lastPage.res?.data?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
  });
  const specs = useMemo(() => specsQuery.data?.pages.flatMap((page) => page.items) ?? [], [specsQuery.data]);
  const { isLoading, error, isError, refetch, isRefetching } = specsQuery;

  const usersQuery = useInfiniteQuery({
    queryKey: ['users', sexFilter, countryFilter, cityFilter, query],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => UserService.getAll({
      sex: sexFilter,
      country: countryFilter || undefined,
      city: cityFilter || undefined,
      query,
      page: Number(pageParam),
      per_page: 20,
    }),
    getNextPageParam: (lastPage) => {
      const data = lastPage?.data;
      const current = data?.current_page ?? 1;
      const last = data?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    enabled: tab === 'People',
  });
  const refetchUsers = usersQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      refetch();
      FEED_KEYS.forEach((f) => {
        if (f !== feed) {
          queryClient.prefetchInfiniteQuery({ queryKey: ['specs', f], queryFn: ({ pageParam }) => fetchSpecsForFeed(f, Number(pageParam ?? 1)), initialPageParam: 1 });
        }
      });
    }, [feed, fetchSpecsForFeed, queryClient, refetch])
  );

  const usersList = useMemo<UserItem[]>(
    () => usersQuery.data?.pages.flatMap((page) => page?.data?.data || []) ?? [],
    [usersQuery.data]
  );
  const peopleTotal = usersQuery.data?.pages?.[0]?.data?.total;
  const activePeopleFilterCount = [sexFilter !== 'All', countryFilter, cityFilter, query.trim()].filter(Boolean).length;
  const locationLabel = [cityFilter, countryFilter].filter(Boolean).join(', ') || 'Any location';
  const locationFlag = flagForCountry(countryFilter);

  const clearPeopleFilters = () => {
    setSexFilter('All');
    setCountryFilter('');
    setCityFilter('');
    setQuery('');
  };

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
      <PeopleLocationFilterModal
        visible={locationFilterOpen}
        theme={theme}
        selectedCountry={countryFilter}
        selectedCity={cityFilter}
        sex={sexFilter}
        query={query}
        onClose={() => setLocationFilterOpen(false)}
        onApply={({ country, city }) => {
          setCountryFilter(country);
          setCityFilter(city);
        }}
      />

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
          <View style={styles.peopleFiltersHeader}>
            <View>
              <Text style={[styles.peopleEyebrow, { color: theme.colors.primary }]}>People</Text>
              <Text style={[styles.peopleFilterTitle, { color: theme.colors.onSurface }]}>Find daters by location</Text>
            </View>
            {activePeopleFilterCount > 0 ? (
              <TouchableOpacity onPress={clearPeopleFilters} hitSlop={10} style={[styles.clearPeopleButton, { backgroundColor: theme.colors.primary + '14' }]}>
                <MaterialCommunityIcons name="filter-off-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.clearPeopleText, { color: theme.colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLocationFilterOpen(true)}
            style={[
              styles.locationSelectButton,
              {
                backgroundColor: countryFilter || cityFilter ? theme.colors.primary + '10' : theme.colors.elevation.level2,
                borderColor: countryFilter || cityFilter ? theme.colors.primary : theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.locationSelectIcon, { backgroundColor: theme.colors.primary + '16' }]}>
              {locationFlag ? (
                <Text style={styles.locationSelectFlag}>{locationFlag}</Text>
              ) : (
                <MaterialCommunityIcons name="map-search-outline" size={20} color={theme.colors.primary} />
              )}
            </View>
            <View style={styles.locationSelectCopy}>
              <Text style={[styles.locationSelectLabel, { color: theme.colors.primary }]}>Tap to filter by location</Text>
              <Text style={[styles.locationSelectValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
            <View style={[styles.locationSelectBadge, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.locationSelectBadgeText, { color: theme.colors.primary }]}>Filter</Text>
              <MaterialCommunityIcons name="chevron-up" size={16} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
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
            onEndReached={() => {
              if (specsQuery.hasNextPage && !specsQuery.isFetchingNextPage) specsQuery.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
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
          <View style={[styles.peopleListHeader, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
            <Text style={[styles.peopleListTitle, { color: theme.colors.onSurface }]}>
              {peopleTotal != null ? `${peopleTotal} people` : 'People'}
            </Text>
            <Text style={[styles.peopleListSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {activePeopleFilterCount > 0 ? 'Filtered by your current search' : 'Newest active profiles'}
            </Text>
          </View>
          <FlatList
            key="people"
            style={styles.peopleList}
            data={usersList}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.peopleGridRow}
            contentContainerStyle={[styles.peopleGridContent, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + bottomNavHeight + 24 }]}
            onRefresh={refetchUsers}
            refreshing={usersQuery.isLoading || usersQuery.isRefetching}
            onEndReached={() => {
              if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) usersQuery.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              usersQuery.isLoading ? (
                <View style={styles.peopleEmpty}>
                  <ActivityIndicator animating color={theme.colors.primary} />
                  <Text style={[styles.peopleEmptyText, { color: theme.colors.outline }]}>Loading people...</Text>
                </View>
              ) : (
                <View style={styles.peopleEmpty}>
                  <MaterialCommunityIcons name="account-search-outline" size={42} color={theme.colors.outline} />
                  <Text style={[styles.peopleEmptyText, { color: theme.colors.outline }]}>No people found for this search.</Text>
                </View>
              )
            }
            ListFooterComponent={
              usersQuery.isFetchingNextPage ? (
                <View style={styles.peopleFooterLoader}>
                  <ActivityIndicator animating color={theme.colors.primary} />
                </View>
              ) : null
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
    letterSpacing: 0,
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
  peopleFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  peopleEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  peopleFilterTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  clearPeopleButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  clearPeopleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
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
    letterSpacing: 0,
  },
  locationSelectButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
  },
  locationSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationSelectLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  locationSelectValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  locationSelectFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  locationSelectBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 9,
    paddingRight: 7,
    borderRadius: 999,
  },
  locationSelectBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  peopleListHeader: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  peopleListTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  peopleListSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  peopleList: {
    flex: 1,
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
  peopleFooterLoader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
});
