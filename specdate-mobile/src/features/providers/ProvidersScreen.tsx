import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { ActivityIndicator, IconButton, Searchbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProviderService, type ProviderMarketplaceItem } from '../../services/providers';
import { toImageUri } from '../../utils/imageUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 160;
const CARD_MARGIN = 12;
const GRID_GAP = 12;
const GRID_PADDING = 20;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type ProviderCategory = string;
type ProviderItem = ProviderMarketplaceItem;
type FilterKey = 'country' | 'city' | 'service';

function normalizeFilterValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const uniqueByNormalized = new Map<string, string>();

  values.forEach((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return;

    const normalized = normalizeFilterValue(trimmed);
    if (!uniqueByNormalized.has(normalized)) {
      uniqueByNormalized.set(normalized, trimmed);
    }
  });

  return Array.from(uniqueByNormalized.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

function FilterGroup({
  label,
  value,
  options,
  onSelect,
  theme,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  theme: any;
}) {
  if (!options.length) return null;

  return (
    <View style={styles.filterGroup}>
      <Text style={[styles.filterLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
        <FilterChip label="All" selected={!value} onPress={() => onSelect('')} theme={theme} />
        {options.map((option) => (
          <FilterChip
            key={`${label}-${option}`}
            label={option}
            selected={value === option}
            onPress={() => onSelect(value === option ? '' : option)}
            theme={theme}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: selected ? '#FFFFFF' : theme.colors.onSurface }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProviderCard({
  item,
  variant,
  onSelect,
  theme,
}: {
  item: ProviderItem;
  variant: 'strip' | 'grid';
  onSelect: () => void;
  theme: any;
}) {
  const isGrid = variant === 'grid';
  const imageUri = toImageUri(item.imageUrl);
  const imageHeight = isGrid ? 120 : 108;
  const ratingLabel = item.rating != null ? item.rating.toFixed(1) : item.isVerified ? 'Verified' : 'New';
  const ratingIcon = item.rating != null ? 'star' : item.isVerified ? 'check-decagram' : 'store-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onSelect}
      style={[
        styles.providerCard,
        styles.cardShadow,
        {
          width: isGrid ? GRID_CARD_WIDTH : CARD_WIDTH,
          marginRight: isGrid ? 0 : CARD_MARGIN,
          marginBottom: isGrid ? GRID_GAP : 0,
          backgroundColor: theme.colors.surface,
          borderColor: (theme.colors as any).outlineVariant ?? `${theme.colors.outline}18`,
        },
      ]}
    >
      <View style={styles.cardImageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={[styles.cardImage, { height: imageHeight }]} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder, { height: imageHeight }]}>
            <MaterialCommunityIcons name="storefront-outline" size={30} color="#64748B" />
          </View>
        )}
        <View style={[styles.pricePill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <Text style={styles.pricePillText}>{item.discountPercentage ?? 10}% off</Text>
        </View>
        <View style={styles.ratingBadge}>
          <MaterialCommunityIcons name={ratingIcon} size={12} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>{ratingLabel}</Text>
        </View>
      </View>

      <View style={[styles.cardContent, { padding: isGrid ? 8 : 10 }]}>
        <Text style={[styles.cardName, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cardMetaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {item.city || item.country || item.category}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProvidersScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState((route.params?.query as string | undefined) ?? '');
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    country: (route.params?.country as string | undefined) ?? '',
    city: (route.params?.city as string | undefined) ?? '',
    service: (route.params?.service as string | undefined) ?? '',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const seeAllCategory = (route.params?.seeAllCategory as ProviderCategory | undefined) ?? null;

  const providerQuery = useInfiniteQuery({
    queryKey: ['providers', query.trim(), filters.country, filters.city, filters.service],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => ProviderService.getProviders({
      q: query.trim() || undefined,
      country: filters.country || undefined,
      city: filters.city || undefined,
      service: filters.service || undefined,
      page: Number(pageParam),
      per_page: 30,
    }),
    getNextPageParam: (lastPage) => {
      const current = lastPage.data.current_page ?? 1;
      const last = lastPage.data.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
  });
  const { isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = providerQuery;

  const allProviders = providerQuery.data?.pages.flatMap((page) => page.data.data) ?? [];
  const filterOptions = useMemo(() => {
    const providersForCity = filters.country
      ? allProviders.filter((provider) => provider.country === filters.country)
      : allProviders;

    return {
      country: uniqueSorted(allProviders.map((provider) => provider.country)),
      city: uniqueSorted(providersForCity.map((provider) => provider.city)),
      service: uniqueSorted(
        allProviders.flatMap((provider) =>
          provider.categories?.length ? provider.categories.map((category) => category.name) : [provider.category]
        )
      ),
    };
  }, [allProviders, filters.country]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const providers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allProviders.filter((provider) => !q ||
      [provider.name, provider.city, provider.country, provider.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [allProviders, query]);

  const maybeLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const categories = useMemo(() => {
    const names = providers.map((provider) => provider.category).filter(Boolean);
    return Array.from(new Set(names));
  }, [providers]);

  const byCategory = useMemo(() => {
    const map: Record<ProviderCategory, ProviderItem[]> = {};
    categories.forEach((category) => {
      map[category] = [];
    });
    providers.forEach((provider) => {
      if (map[provider.category]) map[provider.category].push(provider);
    });
    return map;
  }, [categories, providers]);

  const openProvider = (provider: ProviderItem) => {
    navigation.push('ProviderDetail', { providerId: provider.id, provider });
  };

  const setFilter = (key: FilterKey, value: string) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'country') {
        next.city = '';
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ country: '', city: '', service: '' });
  };

  if (seeAllCategory) {
    const list = byCategory[seeAllCategory] ?? [];
    const rows: ProviderItem[][] = [];
    for (let i = 0; i < list.length; i += 2) {
      rows.push(list.slice(i, i + 2));
    }

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4, paddingHorizontal: 8 }]}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
          <Text style={[styles.screenTitle, { color: theme.colors.onSurface }]}>{seeAllCategory}</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator
          onScroll={({ nativeEvent }) => {
            const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
            if (distanceFromBottom < 320) maybeLoadMore();
          }}
          scrollEventThrottle={200}
          contentContainerStyle={[
            styles.seeAllScrollContent,
            { paddingHorizontal: GRID_PADDING, paddingBottom: insets.bottom + 24, paddingTop: 12 },
          ]}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item) => (
                <ProviderCard
                  key={String(item.id)}
                  item={item}
                  variant="grid"
                  theme={theme}
                  onSelect={() => openProvider(item)}
                />
              ))}
              {row.length === 1 && <View style={{ width: GRID_CARD_WIDTH }} />}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6, paddingLeft: insets.left + 4, paddingRight: insets.right + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.screenTitle, { color: theme.colors.onSurface }]}>Marketplace</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
          if (distanceFromBottom < 360) maybeLoadMore();
        }}
        scrollEventThrottle={200}
      >
        <View style={[styles.searchWrap, { paddingHorizontal: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <Searchbar
            placeholder="Search providers..."
            value={query}
            onChangeText={setQuery}
            style={[styles.searchBar, { backgroundColor: (theme.colors as any).surfaceContainerHighest ?? theme.colors.elevation?.level2 }]}
            iconColor={theme.colors.primary}
            inputStyle={{ color: theme.colors.onSurface }}
          />
        </View>

        <View style={[styles.filtersPanel, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <View style={styles.filtersHeader}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setFiltersOpen((open) => !open)}
              style={styles.filtersTitleRow}
            >
              <MaterialCommunityIcons name="filter-variant" size={18} color={theme.colors.primary} />
              <Text style={[styles.filtersTitle, { color: theme.colors.onSurface }]}>Filters</Text>
              {activeFilterCount > 0 ? (
                <Text style={[styles.filtersCount, { color: theme.colors.primary }]}>{activeFilterCount}</Text>
              ) : null}
              <MaterialCommunityIcons
                name={filtersOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            <View style={styles.filtersHeaderActions}>
              {activeFilterCount > 0 ? (
                <TouchableOpacity onPress={clearFilters} hitSlop={10}>
                  <Text style={[styles.clearFiltersText, { color: theme.colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setFiltersOpen((open) => !open)}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name={filtersOpen ? 'filter-off-outline' : 'filter-outline'}
                  size={22}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          {filtersOpen ? (
            <>
              <FilterGroup
                label="Country"
                value={filters.country}
                options={filterOptions.country}
                onSelect={(value) => setFilter('country', value)}
                theme={theme}
              />
              <FilterGroup
                label="City"
                value={filters.city}
                options={filterOptions.city}
                onSelect={(value) => setFilter('city', value)}
                theme={theme}
              />
              <FilterGroup
                label="Service"
                value={filters.service}
                options={filterOptions.service}
                onSelect={(value) => setFilter('service', value)}
                theme={theme}
              />
            </>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant, marginTop: 10 }]}>Loading providers...</Text>
          </View>
        ) : null}

        {!isLoading && categories.map((category) => {
          const items = byCategory[category];
          if (!items?.length) return null;

          return (
            <View key={category} style={[styles.section, styles.sectionCard, { backgroundColor: (theme.colors as any).surfaceContainerLow ?? theme.colors.surface }]}>
              <View style={[styles.sectionHeader, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{category}</Text>
                <TouchableOpacity
                  onPress={() => navigation.push('Providers', { seeAllCategory: category, query, ...filters })}
                  hitSlop={12}
                  style={[styles.seeAllBtn, styles.seeAllPill, { backgroundColor: theme.colors.primary + '18' }]}
                >
                  <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See all</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                onRefresh={refetch}
                refreshing={isRefetching}
                contentContainerStyle={[
                  styles.horizontalList,
                  { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 },
                ]}
                renderItem={({ item }) => (
                  <ProviderCard
                    item={item}
                    variant="strip"
                    theme={theme}
                    onSelect={() => openProvider(item)}
                  />
                )}
              />
            </View>
          );
        })}

        {!isLoading && providers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.outline }]}>No providers found.</Text>
          </View>
        ) : null}
        {isFetchingNextPage ? (
          <View style={styles.empty}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  searchWrap: { paddingTop: 12, paddingBottom: 8 },
  searchBar: { borderRadius: 14, elevation: 0 },
  filtersPanel: { paddingBottom: 12, gap: 10 },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filtersHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  filtersTitle: { fontSize: 14, fontWeight: '900' },
  filtersCount: { fontSize: 12, fontWeight: '900' },
  clearFiltersText: { fontSize: 13, fontWeight: '900' },
  filterGroup: { gap: 6 },
  filterLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  filterChipRow: { gap: 8, paddingRight: 8 },
  filterChip: {
    maxWidth: 150,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '800' },
  scroll: { flex: 1 },
  section: {
    marginBottom: 28,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  sectionCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  horizontalList: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  providerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  cardImageWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardImage: {
    width: '100%',
    backgroundColor: '#E8EEF6',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pricePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  cardContent: { padding: 12 },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardMetaText: { fontSize: 12 },
  seeAllScrollContent: {
    flexGrow: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: { fontSize: 15 },
});
