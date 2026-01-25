import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ImageBackground, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Surface, Searchbar, Avatar, Portal, Modal, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type SpecCardItem = {
  id: string;
  title: string;
  owner: string;
  expiresIn: string;
  joinCount: number;
  maxParticipants: number;
  eliminatedCount: number;
  firstDateProvider: string;
  tag: 'LIVE' | 'ONGOING' | 'POPULAR' | 'HOTTEST';
};

type FeedKey = SpecCardItem['tag'];

type HomeTab = 'Specs' | 'People';

function BalloonsIcon({ size = 24, color = '#EF4444' }: { size?: number; color?: string }) {
  const s = size;
  const balloon = Math.round(s * 0.42);
  const stringW = Math.max(1, Math.round(s * 0.06));
  const stringColor = 'rgba(0,0,0,0.35)';

  return (
    <View style={{ width: s, height: s }}>
      {/* Balloons */}
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.05),
          top: Math.round(s * 0.05),
          width: balloon,
          height: balloon,
          borderRadius: 999,
          backgroundColor: color,
          opacity: 0.95,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.32),
          top: 0,
          width: balloon,
          height: balloon,
          borderRadius: 999,
          backgroundColor: color,
          opacity: 0.85,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.55),
          top: Math.round(s * 0.1),
          width: balloon,
          height: balloon,
          borderRadius: 999,
          backgroundColor: color,
          opacity: 0.75,
        }}
      />

      {/* Strings (tied together) */}
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.26),
          top: Math.round(s * 0.46),
          width: stringW,
          height: Math.round(s * 0.46),
          backgroundColor: stringColor,
          transform: [{ rotate: '-10deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.46),
          top: Math.round(s * 0.46),
          width: stringW,
          height: Math.round(s * 0.46),
          backgroundColor: stringColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.66),
          top: Math.round(s * 0.46),
          width: stringW,
          height: Math.round(s * 0.46),
          backgroundColor: stringColor,
          transform: [{ rotate: '10deg' }],
        }}
      />

      {/* Knot */}
      <View
        style={{
          position: 'absolute',
          left: Math.round(s * 0.47),
          top: Math.round(s * 0.78),
          width: Math.round(s * 0.12),
          height: Math.round(s * 0.12),
          borderRadius: 4,
          backgroundColor: stringColor,
        }}
      />
    </View>
  );
}

function withAlpha(color: string, alpha: number) {
  if (typeof color !== 'string') return color as any;
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (full.length !== 6) return color;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<HomeTab>('Specs');
  const [feed, setFeed] = useState<FeedKey>('LIVE');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const bottomNavHeight = 64;
  const [bottomTab, setBottomTab] = useState<'Home' | 'Dates' | 'Balloons' | 'Requests'>('Home');

  const tagColor = (tag: FeedKey) => {
    // Different shades for tags (violet family)
    switch (tag) {
      case 'LIVE':
        return '#7C3AED';
      case 'ONGOING':
        return '#8B5CF6';
      case 'POPULAR':
        return '#A78BFA';
      case 'HOTTEST':
        return '#5B21B6';
      default:
        return '#7C3AED';
    }
  };

  // Home feed uses a lighter palette (Snapchat-ish).
  const homeColors = useMemo(
    () => ({
      bg: theme.colors.background,
      surface: '#FFFFFF',
      text: theme.colors.onBackground,
      subtext: 'rgba(11,11,11,0.62)',
      cardBg: '#FFFFFF',
      cardText: '#0B0B0B',
      cardSubtext: 'rgba(11,11,11,0.78)',
    }),
    [theme.colors.background, theme.colors.onBackground]
  );

  // Placeholder data until Specs APIs are implemented.
  const baseSpecs = useMemo<SpecCardItem[]>(
    () => [
      {
        id: '1',
        title: 'Ages 24–30 • Lagos • Serious relationship',
        owner: 'Ada',
        expiresIn: 'Ends in 2d',
        joinCount: 18,
        maxParticipants: 50,
        eliminatedCount: 2,
        firstDateProvider: '—',
        tag: 'LIVE',
      },
      {
        id: '2',
        title: 'Tech lover • Abuja • Tall guys preferred',
        owner: 'Musa',
        expiresIn: 'Ends in 8h',
        joinCount: 41,
        maxParticipants: 60,
        eliminatedCount: 6,
        firstDateProvider: '—',
        tag: 'HOTTEST',
      },
      {
        id: '3',
        title: 'Ages 27–35 • Diaspora • Marriage-minded',
        owner: 'Chi',
        expiresIn: 'Ends in 4d',
        joinCount: 9,
        maxParticipants: 30,
        eliminatedCount: 0,
        firstDateProvider: '—',
        tag: 'POPULAR',
      },
    ],
    []
  );

  // Demo “infinite scroll” list: we append more placeholder items on scroll end.
  const [items, setItems] = useState<SpecCardItem[]>(() => baseSpecs);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFeed = items.filter((s) => s.tag === feed);
    const source = byFeed.length > 0 ? byFeed : items;
    if (!q) return source;
    return source.filter((s) => (s.title + ' ' + s.owner).toLowerCase().includes(q));
  }, [feed, items, query]);

  type PersonItem = {
    id: string;
    name: string;
    age: number;
    city: string;
    occupation: string;
  };

  const people = useMemo<PersonItem[]>(
    () => [
      { id: 'u1', name: 'Ada N.', age: 26, city: 'Lagos', occupation: 'Product Designer' },
      { id: 'u2', name: 'Musa A.', age: 29, city: 'Abuja', occupation: 'Software Engineer' },
      { id: 'u3', name: 'Chi O.', age: 28, city: 'Lagos', occupation: 'Entrepreneur' },
      { id: 'u4', name: 'Zainab K.', age: 25, city: 'Kano', occupation: 'Student' },
      { id: 'u5', name: 'Tomi J.', age: 30, city: 'Port Harcourt', occupation: 'Marketing' },
    ],
    []
  );

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p.name + ' ' + p.city + ' ' + p.occupation).toLowerCase().includes(q));
  }, [people, query]);

  return (
    <View style={[styles.container, { backgroundColor: homeColors.bg }]}>
      {/* Top Bar (Snapchat-ish) */}
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
        <IconButton
          icon="account-circle"
          size={28}
          iconColor={homeColors.text}
          onPress={() => navigation.navigate('Profile')}
        />

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>Spec A Date</Text>
        </View>

        <View style={styles.rightIcons}>
          <View style={styles.iconWithBadge}>
            <IconButton
              icon="message-outline"
              size={26}
              iconColor={homeColors.text}
              containerColor={theme.colors.elevation.level2}
              style={styles.topIconButton}
              onPress={() => navigation.navigate('Messages')}
            />
            <View
              style={[
                styles.countBadge,
                { borderColor: theme.colors.elevation.level2, backgroundColor: '#EF4444' },
              ]}
            >
              <Text style={styles.countBadgeText}>2</Text>
            </View>
          </View>

          <View style={styles.iconWithBadge}>
            <IconButton
              icon="bell-outline"
              size={26}
              iconColor={homeColors.text}
              containerColor={theme.colors.elevation.level2}
              style={styles.topIconButton}
              onPress={() => navigation.navigate('Notifications')}
            />
            <View
              style={[
                styles.countBadge,
                { borderColor: theme.colors.elevation.level2, backgroundColor: '#EF4444' },
              ]}
            >
              <Text style={styles.countBadgeText}>5</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Controls row: search icon + tabs + providers */}
      <View
        style={[
          styles.controlsWrap,
          { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
        ]}
      >
        <View
          style={[
            styles.controlsBar,
            {
              backgroundColor: theme.colors.elevation.level2,
            },
          ]}
        >
          {/* Search icon (opens modal) */}
          <IconButton
            icon="magnify"
            size={22}
            iconColor={theme.colors.primary}
            onPress={() => setSearchOpen(true)}
            style={styles.controlsIcon}
          />

          {/* Specs/People segmented control (original design) */}
          <View style={{ flex: 1 }}>
            <SegmentedButtons
              value={tab}
              onValueChange={(v) => setTab(v as HomeTab)}
              buttons={[
                { value: 'Specs', label: 'Specs', icon: 'view-grid' },
                { value: 'People', label: 'People', icon: 'account-multiple' },
              ]}
              style={styles.segmentedTabs}
            />
          </View>

          {/* Provider icon last */}
          <IconButton
            icon="silverware-fork-knife"
            size={22}
            iconColor={theme.colors.primary}
            onPress={() => navigation.navigate('Providers', { source: 'home' })}
            style={styles.controlsIcon}
          />
        </View>
      </View>

      {/* Search modal */}
      <Portal>
        <Modal
          visible={searchOpen}
          onDismiss={() => setSearchOpen(false)}
          contentContainerStyle={[
            styles.searchModal,
            {
              // Pin to top (react-native-paper Modal centers by default)
              position: 'absolute',
              top: insets.top + 12,
              left: insets.left + 16,
              right: insets.right + 16,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Searchbar
            // Make it a clean "box only" input (no magnify / clear icons)
            icon={() => null}
            clearIcon={() => null}
            placeholder={tab === 'People' ? 'Search people…' : 'Search specs…'}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoFocus
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.elevation.level2,
                borderWidth: 1,
                borderColor: theme.colors.primary,
              },
            ]}
            inputStyle={{ color: homeColors.text }}
            placeholderTextColor={homeColors.subtext}
          />
        </Modal>
      </Portal>

      {/* Feed selector */}
      {tab === 'Specs' ? (
        <View style={[styles.feedWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
            {(['LIVE', 'ONGOING', 'POPULAR', 'HOTTEST'] as FeedKey[]).map((k) => {
              const active = feed === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setFeed(k)}
                  style={({ pressed }) => [
                    styles.feedPill,
                    {
                      backgroundColor: active ? tagColor(k) : theme.colors.elevation.level2,
                      borderColor: active ? tagColor(k) : theme.colors.outline,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.feedDot,
                      { backgroundColor: active ? 'rgba(255,255,255,0.95)' : tagColor(k) },
                    ]}
                  />
                  <Text style={[styles.feedPillText, { color: active ? '#FFFFFF' : theme.colors.onSurface }]}>
                    {k}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {tab === 'Specs' ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
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
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            // Append another “page” of placeholder content for an infinite feel.
            const suffix = String(Date.now());
            setItems((prev) => [
              ...prev,
              ...baseSpecs.map((s, idx) => ({
                ...s,
                id: `${s.id}-${suffix}-${idx}`,
              })),
            ]);
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 30 }}>
              <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>No specs found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <Pressable onPress={() => navigation.navigate('SpecDetails', { specId: item.id })}>
                <Surface
                  style={[
                    styles.card,
                    {
                      backgroundColor: homeColors.cardBg,
                      borderWidth: 1,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                  elevation={1}
                >
                  {/* Top ~40% cover image */}
                  <View style={styles.cardMedia}>
                    <ImageBackground
                      source={{ uri: `https://picsum.photos/seed/specdate-${item.id}/600/800` }}
                      style={StyleSheet.absoluteFillObject}
                      imageStyle={styles.cardMediaImage}
                      resizeMode="cover"
                    />

                    <View style={[styles.tagPill, { backgroundColor: tagColor(item.tag) }]}>
                      <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{item.tag}</Text>
                    </View>
                  </View>

                  {/* Creator name base strip (handles long names cleanly) */}
                  <LinearGradient
                    // Lighter "shadow" gradient using theme colors
                    colors={[withAlpha(theme.colors.primary, 0.35), withAlpha(theme.colors.secondary, 0.35)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ownerBase}
                  >
                    <Text style={styles.ownerBaseText} numberOfLines={1} ellipsizeMode="tail">
                      {item.owner}
                    </Text>
                  </LinearGradient>

                  {/* Body ~60% */}
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: homeColors.cardText }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                    <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                      {(item.title.split('•')[1] || 'Location').trim()}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="account-group" size={16} color={theme.colors.primary} />
                    <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                      {item.joinCount}/{item.maxParticipants} participants
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="balloon" size={16} color={theme.colors.primary} />
                    <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                      {item.eliminatedCount} eliminated
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={theme.colors.primary} />
                    <Pressable
                      onPress={(e) => {
                        // Prevent the parent card Pressable (SpecDetails) from firing.
                        // @ts-expect-error RN event supports stopPropagation at runtime
                        e?.stopPropagation?.();
                        navigation.navigate('Providers', { specId: item.id });
                      }}
                      style={{ flex: 1 }}
                      hitSlop={8}
                    >
                      <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                        First date: {item.firstDateProvider === '—' ? 'Choose provider' : item.firstDateProvider}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="timer-sand" size={16} color={theme.colors.primary} />
                    <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={2}>
                      {item.expiresIn}
                    </Text>
                  </View>
                  </View>
                </Surface>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredPeople}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
              paddingBottom: insets.bottom + bottomNavHeight + 24,
            },
          ]}
          renderItem={({ item }) => (
            <Surface
              style={[styles.personCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
              elevation={1}
            >
              <Avatar.Text
                size={44}
                label={(item.name || '?').slice(0, 1).toUpperCase()}
                style={{ backgroundColor: theme.colors.primary }}
                color={theme.colors.onPrimary}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '900' }} numberOfLines={1}>
                  {item.name} • {item.age}
                </Text>
                <Text style={{ color: theme.colors.outline, fontWeight: '700' }} numberOfLines={1}>
                  {item.city} • {item.occupation}
                </Text>
              </View>
              <IconButton icon="chevron-right" size={22} onPress={() => {}} iconColor={theme.colors.primary} />
            </Surface>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 30 }}>
              <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>No people found.</Text>
            </View>
          }
        />
      )}

      {/* Bottom nav (UI only for now) */}
      <Surface
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + 10,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
          },
        ]}
        elevation={2}
      >
        <View style={styles.bottomNavRow}>
          <Pressable onPress={() => setBottomTab('Home')} style={styles.bottomNavItem}>
            <MaterialCommunityIcons
              name="home-variant"
              size={24}
              color={bottomTab === 'Home' ? theme.colors.primary : homeColors.subtext}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Home' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Home
            </Text>
          </Pressable>

          <Pressable onPress={() => setBottomTab('Dates')} style={styles.bottomNavItem}>
            <MaterialCommunityIcons
              name="heart-multiple"
              size={24}
              color={bottomTab === 'Dates' ? theme.colors.primary : homeColors.subtext}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Dates' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Dates
            </Text>
          </Pressable>

          {/* Center create spec action */}
          <Pressable onPress={() => {}} style={styles.bottomNavCenterWrap}>
            <View style={[styles.bottomNavCenterBtn, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
            </View>
            <Text style={[styles.bottomNavLabel, { color: homeColors.subtext, marginTop: 6 }]}>Create</Text>
          </Pressable>

          <Pressable onPress={() => setBottomTab('Balloons')} style={styles.bottomNavItem}>
            <BalloonsIcon
              size={24}
              color={bottomTab === 'Balloons' ? theme.colors.primary : homeColors.subtext}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Balloons' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Balloons
            </Text>
          </Pressable>

          <Pressable onPress={() => setBottomTab('Requests')} style={styles.bottomNavItem}>
            <MaterialCommunityIcons
              name="account-check"
              size={24}
              color={bottomTab === 'Requests' ? theme.colors.primary : homeColors.subtext}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Requests' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Requests
            </Text>
          </Pressable>
        </View>
      </Surface>
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
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconWithBadge: {
    position: 'relative',
  },
  topIconButton: {
    margin: 0,
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 12,
  },
  controlsWrap: {
    paddingTop: 10,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    // Keep the background, but remove the "box" border
    borderWidth: 0,
  },
  controlsIcon: {
    margin: 0,
  },
  segmentedTabs: {
    flex: 1,
  },
  searchBar: {
    borderRadius: 50,
  },
  searchModal: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  feedWrap: {
    paddingTop: 10,
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
  listContent: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    // “Long length, shorter width” portrait card
    aspectRatio: 0.6,
    overflow: 'hidden',
  },
  cardMedia: {
    flex: 4, // ~40%
    position: 'relative',
    backgroundColor: '#EDEDED',
  },
  ownerBase: {
    height: 24,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  ownerBaseText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  cardMediaImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 6, // ~60%
    padding: 10,
  },
  tagPill: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cardTitle: {
    marginTop: 0,
    fontSize: 14,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  personCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    gap: 4,
  },
  bottomNavCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 84,
  },
  bottomNavCenterBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bottomNavLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

