import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ImageBackground, ScrollView, Image } from 'react-native';
import { ActivityIndicator, Text, useTheme, IconButton, Surface, Searchbar, Avatar, Portal, Modal, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SpecCard from './components/SpecCard';
import PersonCard from './components/PersonCard';

type SpecCardItem = {
  id: string;
  title: string;
  owner: string;
  expiresIn: string;
  joinCount: number;
  maxParticipants: number;
  eliminatedCount: number;
  firstDateProvider: string;
  likesCount: number;
  tag: 'LIVE' | 'ONGOING' | 'POPULAR' | 'HOTTEST';
  ownerAvatar?: string;
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
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const avatarUrl = useMemo(() => toImageUri(user?.profile?.avatar), [user?.profile?.avatar]);

  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<HomeTab>('Specs');
  const [feed, setFeed] = useState<FeedKey>('LIVE');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const bottomNavHeight = 64;
  const [bottomTab, setBottomTab] = useState<'Home' | 'Dates' | 'Specs' | 'Requests'>('Home');



  const fetchSpecsForFeed = useCallback(async (f: FeedKey): Promise<SpecCardItem[]> => {
    const res = await SpecService.getAll(f);
    const paginator = res?.data;
    const fetched: any[] = Array.isArray(paginator) ? paginator : (paginator?.data || []);

    return fetched.map((s: any) => {
      const end = new Date(s.expires_at);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const expiresText = diffDays > 0 ? `Ends in ${diffDays}d` : 'Ending soon';

      return {
        id: String(s.id),
        title: s.title,
        owner: s.owner?.profile?.full_name || s.owner?.name || 'Unknown',
        expiresIn: expiresText,
        joinCount: s.applications_count || 0,
        maxParticipants: s.max_participants,
        eliminatedCount: 0,
        firstDateProvider: '—',
        likesCount: s.likes_count || 0,
        tag: s.tag || f,
        ownerAvatar: s.owner?.avatar || s.owner?.profile?.avatar,
      } as SpecCardItem;
    });
  }, []);

  const { data: specs = [], isLoading, error, isError, refetch, isRefetching } = useQuery({
    queryKey: ['specs', feed],
    retry: false,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSpecsForFeed(feed),
  });

  const feedKeys: FeedKey[] = ['LIVE', 'ONGOING', 'POPULAR', 'HOTTEST'];

  // When Home is focused: refetch current feed and prefetch other feeds so tab clicks show data quickly
  useFocusEffect(
    useCallback(() => {
      refetch();
      feedKeys.forEach((f) => {
        if (f !== feed) {
          queryClient.prefetchQuery({ queryKey: ['specs', f], queryFn: () => fetchSpecsForFeed(f) });
        }
      });
    }, [refetch, feed, queryClient, fetchSpecsForFeed])
  );

  const specsErrorText = useMemo(() => {
    if (!isError) return '';
    const anyErr: any = error;
    const status = anyErr?.response?.status;
    const msg =
      anyErr?.response?.data?.message ||
      anyErr?.message ||
      'Failed to load specs.';

    // Common gotcha: using 10.0.2.2 only works on Android emulator.
    const hint =
      status === 401
        ? 'You are not authenticated. Please log in again.'
        : status
          ? `HTTP ${status}. If you are running on a physical device, update API_URL in src/services/api.ts to your PC IP.`
          : 'If you are running on a physical device, update API_URL in src/services/api.ts to your PC IP.';

    return `${msg}\n${hint}`;
  }, [error, isError]);

  /*
  // Imported components to avoid inline renderItem causing VirtualizedList warnings
  const SpecCard = require('./components/SpecCard').default;
  const PersonCard = require('./components/PersonCard').default;
  */

  const tagColor = (tag: string) => {
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

  const onRefresh = async () => {
    await refetch();
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    // For now, ignore the 'feed' tag filter since backend doesn't support tags yet
    // const byFeed = specs.filter((s) => s.tag === feed);
    const source = specs;
    if (!q) return source;
    return source.filter((s) => (s.title + ' ' + s.owner).toLowerCase().includes(q));
  }, [query, specs]);

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
        {avatarUrl ? (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8} style={{ marginLeft: 6 }}>
            <Avatar.Image size={32} source={{ uri: avatarUrl }} style={{ backgroundColor: theme.colors.surfaceVariant }} />
          </TouchableOpacity>
        ) : (
          <IconButton
            icon="account-circle"
            size={28}
            iconColor={homeColors.text}
            onPress={() => navigation.navigate('Profile')}
          />
        )}

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
            {feedKeys.map((k) => {
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
                  <View
                    style={[
                      styles.feedDot,
                      { backgroundColor: active ? 'rgba(255,255,255,0.95)' : tagColor(k) },
                    ]}
                  />
                  <Text style={[styles.feedPillText, { color: active ? '#FFFFFF' : theme.colors.onSurface }]}>
                    {k}
                  </Text>
                </TouchableOpacity>
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
          onRefresh={onRefresh}
          refreshing={isLoading || isRefetching}
          // Pagination can be added later
          onEndReachedThreshold={0.6}
          // Pagination can be added later


          ListEmptyComponent={
            <View style={{ paddingTop: 30 }}>
              {isLoading || isRefetching ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator animating color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>Loading specs…</Text>
                </View>
              ) : isError ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: theme.colors.error, textAlign: 'center', fontWeight: '800' }}>
                    Couldn’t load specs
                  </Text>
                  <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>{specsErrorText}</Text>
                </View>
              ) : (
                <Text style={{ color: theme.colors.outline, textAlign: 'center' }}>
                  No specs found.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SpecCard
              item={item}
              theme={theme}
              homeColors={homeColors}
              tagColor={tagColor}
              withAlpha={withAlpha}
              onPress={() => {
                queryClient.prefetchQuery({ queryKey: ['spec', item.id], queryFn: () => SpecService.getOne(item.id) });
                navigation.navigate('SpecDetails', { specId: item.id });
              }}
            />
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
            <PersonCard item={item} theme={theme} />
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
          <TouchableOpacity onPress={() => setBottomTab('Home')} style={styles.bottomNavItem} activeOpacity={0.7}>
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
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setBottomTab('Dates')} style={styles.bottomNavItem} activeOpacity={0.7}>
            {bottomTab === 'Dates' ? (
              <View style={{
                shadowColor: theme.colors.primary,
                shadowRadius: 8,
                shadowOpacity: 0.5,
                shadowOffset: { width: 0, height: 0 },
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 6
              }}>
                <MaterialCommunityIcons
                  name="heart"
                  size={24}
                  color="#D946EF"
                  style={{ textShadowColor: '#D946EF', textShadowRadius: 10 }}
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name="heart-outline"
                size={28}
                color="#D946EF"
                style={{ opacity: 0.5 }}
              />
            )}
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Dates' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Dates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('CreateSpec')} style={styles.bottomNavCenterWrap} activeOpacity={0.7}>
            <View style={[styles.bottomNavCenterBtn, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
            </View>
            <Text style={[styles.bottomNavLabel, { color: homeColors.subtext, marginTop: 6 }]}>Create</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setBottomTab('Specs')} style={styles.bottomNavItem} activeOpacity={0.7}>
            {bottomTab === 'Specs' ? (
              <View style={{
                shadowColor: theme.colors.primary,
                shadowRadius: 8,
                shadowOpacity: 0.5,
                shadowOffset: { width: 0, height: 0 },
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 6
              }}>
                <MaterialCommunityIcons
                  name="clipboard-list"
                  size={24}
                  color="#8B5CF6"
                  style={{ textShadowColor: '#8B5CF6', textShadowRadius: 10 }}
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={28}
                color="#8B5CF6"
                style={{ opacity: 0.5 }}
              />
            )}
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Specs' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Specs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setBottomTab('Requests')} style={styles.bottomNavItem} activeOpacity={0.7}>
            {bottomTab === 'Requests' ? (
              <View style={{
                shadowColor: theme.colors.primary,
                shadowRadius: 8,
                shadowOpacity: 0.5,
                shadowOffset: { width: 0, height: 0 },
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 6
              }}>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={24}
                  color="#06B6D4"
                  style={{ textShadowColor: '#06B6D4', textShadowRadius: 10 }}
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name="account-plus-outline"
                size={28}
                color="#06B6D4"
                style={{ opacity: 0.5 }}
              />
            )}
            <Text
              style={[
                styles.bottomNavLabel,
                { color: bottomTab === 'Requests' ? theme.colors.primary : homeColors.subtext },
              ]}
            >
              Requests
            </Text>
          </TouchableOpacity>
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

