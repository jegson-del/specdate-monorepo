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
import { Text, useTheme, IconButton, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 160;
const CARD_MARGIN = 12;
const GRID_GAP = 12;
const GRID_PADDING = 20;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type ProviderCategory = 'Restaurant' | 'Cafe' | 'Cinema' | 'Activity' | 'Lounge';

const CATEGORIES: ProviderCategory[] = ['Restaurant', 'Cafe', 'Cinema', 'Activity', 'Lounge'];

type ProviderItem = {
  id: string;
  name: string;
  category: ProviderCategory;
  city: string;
  price: '₦' | '₦₦' | '₦₦₦';
  rating: number;
  imageUrl: string;
};

const MOCK_PROVIDERS: ProviderItem[] = [
  // Restaurant
  { id: 'p1', name: 'Nile Bites', category: 'Restaurant', city: 'Lagos', price: '₦₦', rating: 4.4, imageUrl: 'https://picsum.photos/seed/specdate-provider-3/500/400' },
  { id: 'p2', name: 'The Vineyard', category: 'Restaurant', city: 'Abuja', price: '₦₦₦', rating: 4.8, imageUrl: 'https://picsum.photos/seed/specdate-provider-6/500/400' },
  { id: 'p3', name: 'Spice Route', category: 'Restaurant', city: 'Lagos', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-r1/500/400' },
  { id: 'p4', name: 'Coastal Kitchen', category: 'Restaurant', city: 'Port Harcourt', price: '₦₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-r2/500/400' },
  { id: 'p5', name: 'Sunset Grill', category: 'Restaurant', city: 'Abuja', price: '₦₦', rating: 4.3, imageUrl: 'https://picsum.photos/seed/specdate-r3/500/400' },
  { id: 'p6', name: 'Lagos Bistro', category: 'Restaurant', city: 'Lagos', price: '₦', rating: 4.2, imageUrl: 'https://picsum.photos/seed/specdate-r4/500/400' },
  { id: 'p7', name: 'Jollof House', category: 'Restaurant', city: 'Abuja', price: '₦₦', rating: 4.6, imageUrl: 'https://picsum.photos/seed/specdate-r5/500/400' },
  // Cafe
  { id: 'p8', name: 'Bloom Café', category: 'Cafe', city: 'Abuja', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-provider-2/500/400' },
  { id: 'p9', name: 'Bean & Brew', category: 'Cafe', city: 'Lagos', price: '₦', rating: 4.3, imageUrl: 'https://picsum.photos/seed/specdate-provider-7/500/400' },
  { id: 'p10', name: 'Artisan Roast', category: 'Cafe', city: 'Lagos', price: '₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-c1/500/400' },
  { id: 'p11', name: 'Honey & Latte', category: 'Cafe', city: 'Abuja', price: '₦₦', rating: 4.4, imageUrl: 'https://picsum.photos/seed/specdate-c2/500/400' },
  { id: 'p12', name: 'Corner Brew', category: 'Cafe', city: 'Port Harcourt', price: '₦', rating: 4.1, imageUrl: 'https://picsum.photos/seed/specdate-c3/500/400' },
  { id: 'p13', name: 'Velvet Bean', category: 'Cafe', city: 'Lagos', price: '₦₦₦', rating: 4.8, imageUrl: 'https://picsum.photos/seed/specdate-c4/500/400' },
  { id: 'p14', name: 'Morning Sun Café', category: 'Cafe', city: 'Abuja', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-c5/500/400' },
  // Cinema
  { id: 'p15', name: 'Cinema Night', category: 'Cinema', city: 'Port Harcourt', price: '₦', rating: 4.2, imageUrl: 'https://picsum.photos/seed/specdate-provider-4/500/400' },
  { id: 'p16', name: 'Starlight Cinema', category: 'Cinema', city: 'Lagos', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-provider-8/500/400' },
  { id: 'p17', name: 'Film House', category: 'Cinema', city: 'Lagos', price: '₦₦', rating: 4.6, imageUrl: 'https://picsum.photos/seed/specdate-m1/500/400' },
  { id: 'p18', name: 'Premier Screens', category: 'Cinema', city: 'Abuja', price: '₦₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-m2/500/400' },
  { id: 'p19', name: 'Drive-In Lagos', category: 'Cinema', city: 'Lagos', price: '₦₦', rating: 4.4, imageUrl: 'https://picsum.photos/seed/specdate-m3/500/400' },
  { id: 'p20', name: 'Rooftop Movies', category: 'Cinema', city: 'Port Harcourt', price: '₦₦₦', rating: 4.8, imageUrl: 'https://picsum.photos/seed/specdate-m4/500/400' },
  { id: 'p21', name: 'Classic Theatre', category: 'Cinema', city: 'Abuja', price: '₦', rating: 4.3, imageUrl: 'https://picsum.photos/seed/specdate-m5/500/400' },
  // Activity
  { id: 'p22', name: 'Paint & Sip Studio', category: 'Activity', city: 'Lagos', price: '₦₦', rating: 4.6, imageUrl: 'https://picsum.photos/seed/specdate-provider-5/500/400' },
  { id: 'p23', name: 'Adventure Park', category: 'Activity', city: 'Port Harcourt', price: '₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-provider-9/500/400' },
  { id: 'p24', name: 'Escape Room NG', category: 'Activity', city: 'Lagos', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-a1/500/400' },
  { id: 'p25', name: 'Bowling & Arcade', category: 'Activity', city: 'Abuja', price: '₦', rating: 4.2, imageUrl: 'https://picsum.photos/seed/specdate-a2/500/400' },
  { id: 'p26', name: 'Cooking Masterclass', category: 'Activity', city: 'Lagos', price: '₦₦₦', rating: 4.8, imageUrl: 'https://picsum.photos/seed/specdate-a3/500/400' },
  { id: 'p27', name: 'Karaoke Lounge', category: 'Activity', city: 'Port Harcourt', price: '₦₦', rating: 4.4, imageUrl: 'https://picsum.photos/seed/specdate-a4/500/400' },
  { id: 'p28', name: 'Kayak & Paddle', category: 'Activity', city: 'Lagos', price: '₦₦', rating: 4.6, imageUrl: 'https://picsum.photos/seed/specdate-a5/500/400' },
  { id: 'p29', name: 'Pottery Studio', category: 'Activity', city: 'Abuja', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-a6/500/400' },
  // Lounge
  { id: 'p30', name: 'Skyline Rooftop', category: 'Lounge', city: 'Lagos', price: '₦₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-provider-1/500/400' },
  { id: 'p31', name: 'Velvet Lounge', category: 'Lounge', city: 'Abuja', price: '₦₦₦', rating: 4.6, imageUrl: 'https://picsum.photos/seed/specdate-provider-10/500/400' },
  { id: 'p32', name: 'The Hideout', category: 'Lounge', city: 'Lagos', price: '₦₦', rating: 4.5, imageUrl: 'https://picsum.photos/seed/specdate-l1/500/400' },
  { id: 'p33', name: 'Sunset Bar', category: 'Lounge', city: 'Port Harcourt', price: '₦₦₦', rating: 4.8, imageUrl: 'https://picsum.photos/seed/specdate-l2/500/400' },
  { id: 'p34', name: 'Jazz & Wine', category: 'Lounge', city: 'Abuja', price: '₦₦₦', rating: 4.7, imageUrl: 'https://picsum.photos/seed/specdate-l3/500/400' },
  { id: 'p35', name: 'Poolside Lounge', category: 'Lounge', city: 'Lagos', price: '₦₦', rating: 4.4, imageUrl: 'https://picsum.photos/seed/specdate-l4/500/400' },
  { id: 'p36', name: 'Speakeasy NG', category: 'Lounge', city: 'Lagos', price: '₦₦₦', rating: 4.9, imageUrl: 'https://picsum.photos/seed/specdate-l5/500/400' },
];

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
  const cardWidth = isGrid ? GRID_CARD_WIDTH : CARD_WIDTH;
  const imageHeight = isGrid ? 120 : 108;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onSelect}
      style={[
        styles.providerCard,
        styles.cardShadow,
        {
          width: cardWidth,
          marginRight: isGrid ? 0 : CARD_MARGIN,
          marginBottom: isGrid ? GRID_GAP : 0,
          backgroundColor: theme.colors.surface,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: (theme.colors as any).outlineVariant ?? `${theme.colors.outline}18`,
        },
      ]}
    >
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: item.imageUrl }} style={[styles.cardImage, { height: imageHeight }]} />
        <View style={styles.cardImageOverlay} />
        <View style={[styles.pricePill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <Text style={styles.pricePillText}>{item.price}</Text>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
          <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <View style={[styles.cardContent, { padding: isGrid ? 8 : 10 }]}>
        <Text style={[styles.cardName, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProvidersScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const seeAllCategory = (route.params?.seeAllCategory as ProviderCategory | undefined) ?? null;

  const providers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_PROVIDERS;
    return MOCK_PROVIDERS.filter((p) =>
      (p.name + ' ' + p.city + ' ' + p.category).toLowerCase().includes(q)
    );
  }, [query]);

  const byCategory = useMemo(() => {
    const map: Record<ProviderCategory, ProviderItem[]> = {
      Restaurant: [],
      Cafe: [],
      Cinema: [],
      Activity: [],
      Lounge: [],
    };
    providers.forEach((p) => {
      if (map[p.category]) map[p.category].push(p);
    });
    return map;
  }, [providers]);

  const handleSeeAll = (cat: ProviderCategory) => {
    navigation.push('Providers', { seeAllCategory: cat });
  };

  const handleBack = () => navigation.goBack();

  // —— See All mode: vertical scroll, cards in horizontal rows (2 per row)
  if (seeAllCategory) {
    const list = byCategory[seeAllCategory] ?? [];
    const rows: ProviderItem[][] = [];
    for (let i = 0; i < list.length; i += 2) {
      rows.push(list.slice(i, i + 2));
    }
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4, paddingHorizontal: 8 }]}>
          <IconButton icon="arrow-left" size={24} onPress={handleBack} iconColor={theme.colors.onSurface} />
          <Text style={[styles.screenTitle, { color: theme.colors.onSurface }]}>{seeAllCategory}</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView
          vertical
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[
            styles.seeAllScrollContent,
            {
              paddingHorizontal: GRID_PADDING,
              paddingBottom: insets.bottom + 24,
              paddingTop: 12,
            },
          ]}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item) => (
                <ProviderCard
                  key={item.id}
                  item={item}
                  variant="grid"
                  theme={theme}
                  onSelect={() => navigation.push('ProviderDetail', { provider: { id: item.id, name: item.name, category: item.category, city: item.city, price: item.price, rating: item.rating, imageUrl: item.imageUrl } })}
                />
              ))}
              {row.length === 1 && <View style={{ width: GRID_CARD_WIDTH }} />}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // —— Marketplace mode: vertical scroll, category sections with horizontal strips
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
      >
        <View style={[styles.searchWrap, { paddingHorizontal: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <Searchbar
            placeholder="Search providers…"
            value={query}
            onChangeText={setQuery}
            style={[styles.searchBar, { backgroundColor: theme.colors.surfaceContainerHighest || theme.colors.elevation?.level2 }]}
            iconColor={theme.colors.primary}
            inputStyle={{ color: theme.colors.onSurface }}
          />
        </View>

        {CATEGORIES.map((cat) => {
          const items = byCategory[cat];
          if (items.length === 0) return null;

          return (
            <View key={cat} style={[styles.section, styles.sectionCard, { backgroundColor: (theme.colors as any).surfaceContainerLow ?? theme.colors.surface }]}>
              <View style={[styles.sectionHeader, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{cat}</Text>
                <TouchableOpacity onPress={() => handleSeeAll(cat)} hitSlop={12} style={[styles.seeAllBtn, styles.seeAllPill, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See all</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.horizontalList,
                  { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 },
                ]}
                renderItem={({ item }) => (
                  <ProviderCard
                    item={item}
                    variant="strip"
                    theme={theme}
                    onSelect={() => navigation.push('ProviderDetail', { provider: { id: item.id, name: item.name, category: item.category, city: item.city, price: item.price, rating: item.rating, imageUrl: item.imageUrl } })}
                  />
                )}
              />
            </View>
          );
        })}

        {providers.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.outline }]}>No providers found.</Text>
          </View>
        )}
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
    letterSpacing: -0.3,
  },
  searchWrap: { paddingTop: 12, paddingBottom: 8 },
  searchBar: { borderRadius: 14, elevation: 0 },
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
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  providerCard: {},
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
    backgroundColor: '#e8e8e8',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    letterSpacing: 0.5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  cardContent: { padding: 12 },
  cardName: { fontSize: 15, fontWeight: '800', marginBottom: 2, letterSpacing: -0.2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMetaText: { fontSize: 12, flex: 1 },
  seeAllScrollContent: {
    flexGrow: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 15 },
});
