import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { Text, useTheme, IconButton, Searchbar, Surface, Button, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProviderCategory = 'Restaurant' | 'Cafe' | 'Cinema' | 'Activity' | 'Lounge';

type ProviderItem = {
  id: string;
  name: string;
  category: ProviderCategory;
  city: string;
  price: '₦' | '₦₦' | '₦₦₦';
  rating: number;
  imageUrl: string;
};

export default function ProvidersScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProviderCategory | 'All'>('All');

  const providers = useMemo<ProviderItem[]>(
    () => [
      {
        id: 'p1',
        name: 'Skyline Rooftop',
        category: 'Lounge',
        city: 'Lagos',
        price: '₦₦₦',
        rating: 4.7,
        imageUrl: 'https://picsum.photos/seed/specdate-provider-1/500/400',
      },
      {
        id: 'p2',
        name: 'Bloom Café',
        category: 'Cafe',
        city: 'Abuja',
        price: '₦₦',
        rating: 4.5,
        imageUrl: 'https://picsum.photos/seed/specdate-provider-2/500/400',
      },
      {
        id: 'p3',
        name: 'Nile Bites',
        category: 'Restaurant',
        city: 'Lagos',
        price: '₦₦',
        rating: 4.4,
        imageUrl: 'https://picsum.photos/seed/specdate-provider-3/500/400',
      },
      {
        id: 'p4',
        name: 'Cinema Night',
        category: 'Cinema',
        city: 'Port Harcourt',
        price: '₦',
        rating: 4.2,
        imageUrl: 'https://picsum.photos/seed/specdate-provider-4/500/400',
      },
      {
        id: 'p5',
        name: 'Paint & Sip Studio',
        category: 'Activity',
        city: 'Lagos',
        price: '₦₦',
        rating: 4.6,
        imageUrl: 'https://picsum.photos/seed/specdate-provider-5/500/400',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCategory = category === 'All' ? providers : providers.filter((p) => p.category === category);
    if (!q) return byCategory;
    return byCategory.filter((p) => (p.name + ' ' + p.city + ' ' + p.category).toLowerCase().includes(q));
  }, [category, providers, query]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 6,
            paddingLeft: insets.left + 10,
            paddingRight: insets.right + 10,
          },
        ]}
      >
        <IconButton icon="arrow-left" size={22} onPress={() => navigation.goBack()} iconColor={theme.colors.onBackground} />
        <Text style={[styles.title, { color: theme.colors.primary }]}>Providers</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <Searchbar
          placeholder="Search providers…"
          value={query}
          onChangeText={setQuery}
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.elevation.level2,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            },
          ]}
          iconColor={theme.colors.primary}
          inputStyle={{ color: theme.colors.onBackground }}
        />
      </View>

      {/* Categories */}
      <View style={[styles.chipsRow, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        {(['All', 'Restaurant', 'Cafe', 'Cinema', 'Activity', 'Lounge'] as const).map((c) => (
          <Chip
            key={c}
            selected={category === c}
            onPress={() => setCategory(c)}
            style={[
              styles.chip,
              { backgroundColor: category === c ? theme.colors.primary : theme.colors.elevation.level2 },
            ]}
            textStyle={{ color: category === c ? theme.colors.onPrimary : theme.colors.onBackground, fontWeight: '800' }}
          >
            {c}
          </Chip>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 24 },
        ]}
        renderItem={({ item }) => (
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: theme.colors.outline, fontWeight: '700' }} numberOfLines={1}>
                {item.category} • {item.city} • {item.price} • {item.rating.toFixed(1)}
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.goBack()}
                style={styles.selectBtn}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                compact
              >
                Select
              </Button>
            </View>
          </Surface>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 30 }}>
            <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>No providers found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  searchWrap: {
    paddingTop: 10,
  },
  searchBar: {
    borderRadius: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  chip: {
    borderRadius: 999,
  },
  listContent: {
    paddingTop: 10,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },
  thumb: {
    width: 96,
    height: 96,
    backgroundColor: '#EDEDED',
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  selectBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: 6,
  },
});

