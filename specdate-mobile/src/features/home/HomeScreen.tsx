import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ScrollView, Modal as RNModal } from 'react-native';
import { ActivityIndicator, Text, useTheme, IconButton, Surface, Searchbar, Avatar, SegmentedButtons, Button, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SpecService } from '../../services/specs';
import { useUser } from '../../hooks/useUser';
import { toImageUri } from '../../utils/imageUrl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SpecCard from './components/SpecCard';
import PersonCard, { UserItem } from './components/PersonCard';
import RequestCard from './components/RequestCard';
import SearchModal from './components/SearchModal';
import { useMutation } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { UserService } from '../../services/user';

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
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const [sexFilter, setSexFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [cityQuery, setCityQuery] = useState<string>(''); // debounced value sent to API

  // Debounce city filter (400ms) so we don't refetch on every keystroke
  React.useEffect(() => {
    const t = setTimeout(() => setCityQuery(cityFilter.trim()), 400);
    return () => clearTimeout(t);
  }, [cityFilter]);

  // Fetch users query (sex + city filters)
  const { data: usersData, refetch: refetchUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', sexFilter, cityQuery, query],
    queryFn: () => UserService.getAll({
      sex: sexFilter,
      city: cityQuery || undefined,
      query: query,
      page: 1,
    }),
    enabled: tab === 'People',
  });

  const usersList = useMemo(() => {
    const raw = usersData?.data;
    const list = Array.isArray(raw) ? raw : (raw?.data || []);
    return list as UserItem[];
  }, [usersData]);



  const fetchSpecsForFeed = useCallback(async (f: FeedKey): Promise<SpecCardItem[]> => {
    const res = await SpecService.getAll(f);
    const paginator = res?.data;
    const fetched: any[] = Array.isArray(paginator) ? paginator : (paginator?.data || []);

    return fetched.map((s: any) => {
      const end = new Date(s.expires_at);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const expiresText = diffDays > 0 ? `Ends in ${diffDays} d` : 'Ending soon';

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
    staleTime: 0, // Always fetch fresh
    queryFn: () => fetchSpecsForFeed(feed),
  });

  const [specTab, setSpecTab] = useState<'Owned' | 'Joined'>('Owned');

  // Queries for other tabs
  const { data: mySpecsData, refetch: refetchMySpecs, isLoading: isLoadingMySpecs } = useQuery({
    queryKey: ['my-specs', specTab],
    queryFn: () => SpecService.getMySpecs(specTab.toLowerCase() as 'owned' | 'joined'),
    enabled: bottomTab === 'Specs',
  });

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: SpecService.getPendingRequests,
    enabled: bottomTab === 'Requests',
    refetchInterval: bottomTab === 'Requests' ? 15000 : false, // Poll every 15s when on Requests tab
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ specId, applicationId }: { specId: string, applicationId: string }) =>
      SpecService.approveApplication(specId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-specs'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ specId, applicationId }: { specId: string, applicationId: string }) =>
      SpecService.rejectApplication(specId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    }
  });

  const mySpecs = useMemo(() => {
    // response is { data: { data: [...] } } or just data: [...] depending on pagination
    const rawData = mySpecsData?.data;
    return Array.isArray(rawData) ? rawData : (rawData?.data || []);
  }, [mySpecsData]);

  const requests = useMemo(() => requestsData?.data || [], [requestsData]);

  const feedKeys: FeedKey[] = ['LIVE', 'ONGOING', 'POPULAR', 'HOTTEST'];

  // When Home is focused: refetch current feed and prefetch other feeds so tab clicks show data quickly
  useFocusEffect(
    useCallback(() => {
      refetch();
      // Also refresh user data (and notification counts) when landing on home
      queryClient.invalidateQueries({ queryKey: ['user'] });

      feedKeys.forEach((f) => {
        if (f !== feed) {
          queryClient.prefetchQuery({ queryKey: ['specs', f], queryFn: () => fetchSpecsForFeed(f) });
        }
      });
    }, [refetch, feed, queryClient, fetchSpecsForFeed])
  );

  // Real-time Notifications Listener
  const player = useAudioPlayer(require('../../../assets/sounds/notification.wav'));

  React.useEffect(() => {
    if (!user?.id) return;
    const { echo } = require('../../utils/echo');

    // Private channel: App.Models.User.{id}
    const channel = echo.private(`App.Models.User.${user.id}`);

    channel.listen('.NotificationCreated', async (e: any) => {
      // Refresh user to update notification count badge
      queryClient.invalidateQueries({ queryKey: ['user'] });
      console.log('New notification received!', e);

      // Play sound
      player.play();
    });

    return () => {
      channel.stopListening('.NotificationCreated');
    };
  }, [user?.id, queryClient, player]);

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



  // Remove old dummy people logic


  return (
    <View style={[styles.container, { backgroundColor: homeColors.bg }]}>
      {/* Top Bar (Modernized) */}
      <Surface
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 8,
            paddingLeft: 16,
            paddingRight: 16,
            minHeight: 100, // Sufficient height for the large logo
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
            elevation: 4, // Android shadow
            shadowColor: '#000', // iOS shadow
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            zIndex: 10,
          },
        ]}
      >
        {/* Left: Avatar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
          style={styles.headerIconBtn}
        >
          {avatarUrl ? (
            <Avatar.Image size={38} source={{ uri: avatarUrl }} />
          ) : (
            <MaterialCommunityIcons name="account-circle" size={38} color={theme.colors.onSurfaceVariant} />
          )}
        </TouchableOpacity>

        {/* Center: Logo */}
        <View style={[styles.titleWrap, { paddingTop: insets.top + 8, paddingBottom: 8 }]} pointerEvents="none">
          <Image
            source={require('../../../assets/dateusher_icon_only.png')}
            style={{
              width: 180, // Slightly reduced
              height: 90,
              resizeMode: 'contain',
              // Removed tintColor to keep original colors
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          />
        </View>

        {/* Right: Actions */}
        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}
          >
            <View>
              <MaterialCommunityIcons name="message-text-outline" size={26} color={theme.colors.onSurface} />
              {/* Message Count Badge (Placeholder) */}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <View>
              <MaterialCommunityIcons name="bell-outline" size={26} color={theme.colors.onSurface} />
              {(user?.unread_notifications_count || 0) > 0 && (
                <View style={styles.activeBadge} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Main Content Area based on Bottom Tab */}
      <View style={{ flex: 1 }}>
        {bottomTab === 'Home' ? (
          <>
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
                <TouchableOpacity
                  onPress={() => setSearchOpen(true)}
                  style={styles.controlsIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={28}
                    color={theme.colors.primary}
                    style={{ textShadowColor: theme.colors.primary, textShadowRadius: 10 }}
                  />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <SegmentedButtons
                    value={tab}
                    onValueChange={(v) => setTab(v as HomeTab)}
                    buttons={[
                      { value: 'Specs', label: 'Specs', icon: 'view-grid' },
                      { value: 'People', label: 'People', icon: 'account-multiple' },
                    ]}
                    density="small"
                    style={styles.segmentedTabs}
                  />
                </View>

                {/* Provider icon last */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('Providers', { source: 'home' })}
                  style={styles.controlsIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="silverware-fork-knife"
                    size={28}
                    color={theme.colors.primary}
                    style={{ textShadowColor: theme.colors.primary, textShadowRadius: 10 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search modal */}
            <SearchModal
              visible={searchOpen}
              onClose={() => setSearchOpen(false)}
              tab={tab}
              query={query}
              setQuery={setQuery}
            />

            {/* Feed selector or People Filters */}
            {tab === 'Specs' ? (
              <View style={[styles.feedWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
                {/* ... existing feed scroll ... */}
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
            ) : (
              // People filters: minimal row — Sex + City
              <View style={[styles.peopleFiltersWrap, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleFiltersRow}>
                  {['All', 'Male', 'Female'].map((s) => {
                    const active = sexFilter === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSexFilter(s)}
                        style={[
                          styles.peoplePill,
                          {
                            backgroundColor: active ? theme.colors.primary : theme.colors.elevation.level2,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.peoplePillText, { color: active ? '#fff' : theme.colors.onSurface }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.cityFilterWrap, { backgroundColor: theme.colors.elevation.level2 }]}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.outline} />
                  <TextInput
                    placeholder="City"
                    value={cityFilter}
                    onChangeText={setCityFilter}
                    mode="flat"
                    dense
                    style={styles.cityInput}
                    contentStyle={{ fontSize: 14 }}
                    placeholderTextColor={theme.colors.outline}
                    textColor={theme.colors.onSurface}
                  />
                </View>
              </View>
            )}

            {tab === 'Specs' ? (
              <View style={[styles.specGridContainer, { backgroundColor: theme.colors.surface }]}>
                <FlatList
                  key="home-specs"
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
                  onEndReachedThreshold={0.6}
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
              </View>
            ) : (
              <View style={[styles.specGridContainer, { backgroundColor: theme.colors.surface }]}>
                <FlatList
                  key="home-people"
                  data={usersList}
                  keyExtractor={(item) => String(item.id)}
                  numColumns={3}
                  columnWrapperStyle={styles.peopleGridRow}
                  contentContainerStyle={[
                    styles.peopleGridContent,
                    {
                      paddingLeft: insets.left + 12,
                      paddingRight: insets.right + 12,
                      paddingBottom: insets.bottom + bottomNavHeight + 24,
                    },
                  ]}
                  onRefresh={() => refetchUsers()}
                  refreshing={isLoadingUsers}
                  renderItem={({ item }) => (
                    <PersonCard
                      item={item}
                      theme={theme}
                      onPress={() => navigation.navigate('ProfileViewer', { userId: Number(item.id) })}
                    />
                  )}
                  ListEmptyComponent={
                    <View style={styles.peopleEmpty}>
                      {isLoadingUsers ? (
                        <>
                          <ActivityIndicator animating color={theme.colors.primary} size="large" />
                          <Text style={[styles.peopleEmptyText, { color: theme.colors.outline }]}>Loading people…</Text>
                        </>
                      ) : (
                        <Text style={[styles.peopleEmptyText, { color: theme.colors.outline }]}>No people found. Try another city or filter.</Text>
                      )}
                    </View>
                  }
                />
              </View>
            )}
          </>
        ) : bottomTab === 'Specs' ? (
          <View style={{ flex: 1, paddingTop: 10 }}>
            <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
              <SegmentedButtons
                value={specTab}
                onValueChange={(v) => setSpecTab(v as 'Owned' | 'Joined')}
                buttons={[
                  {
                    value: 'Owned',
                    label: 'My Specs',
                    checkedColor: theme.colors.primary,
                    uncheckedColor: homeColors.subtext,
                    style: { borderColor: theme.colors.primary }
                  },
                  {
                    value: 'Joined',
                    label: 'My Quest',
                    checkedColor: theme.colors.primary,
                    uncheckedColor: homeColors.subtext,
                    style: { borderColor: theme.colors.primary }
                  },
                ]}
                theme={{ colors: { secondaryContainer: 'rgba(124, 58, 237, 0.12)' } }} // Light purple bg for active
              />
            </View>
            <View style={[styles.specGridContainer, { backgroundColor: theme.colors.surface }]}>
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
                onRefresh={refetchMySpecs}
                refreshing={isLoadingMySpecs}
                ListEmptyComponent={
                  isLoadingMySpecs ? (
                    <View style={{ paddingTop: 30, alignItems: 'center' }}>
                      <ActivityIndicator animating color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View style={{ paddingTop: 30, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.outline }}>
                        {specTab === 'Owned' ? 'You haven\'t created any specs yet.' : 'You haven\'t joined any specs yet.'}
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
                      ownerAvatar: item.owner?.profile?.avatar, // Use the injected avatar
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
        ) : bottomTab === 'Requests' ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.onSurface }}>
              Pending Requests
            </Text>
            <FlatList
              key="requests"
              data={requests}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: bottomNavHeight + 24 }}
              onRefresh={refetchRequests}
              refreshing={isLoading}
              ListEmptyComponent={
                <View style={{ paddingTop: 30, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.outline }}>No pending application requests.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <RequestCard
                  item={item}
                  isProcessing={approveMutation.isPending || rejectMutation.isPending}
                  onAccept={(sid, appId) => approveMutation.mutate({ specId: sid, applicationId: appId })}
                  onReject={(sid, appId) => rejectMutation.mutate({ specId: sid, applicationId: appId })}
                />
              )}
            />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={64} color={theme.colors.outline} />
            <Text style={{ marginTop: 16, color: theme.colors.outline }}>Date timeline coming soon!</Text>
          </View>
        )}
      </View>

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
            {bottomTab === 'Home' ? (
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
                  name="home"
                  size={24}
                  color={theme.colors.primary}
                  style={{ textShadowColor: theme.colors.primary, textShadowRadius: 10 }}
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name="home-outline"
                size={28}
                color={theme.colors.primary}
                style={{ opacity: 0.5 }}
              />
            )}
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
            <View style={styles.iconWithBadge}>
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
              {(user?.unread_requests_count ?? 0) > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { borderColor: theme.colors.elevation?.level2 ?? theme.colors.surface, backgroundColor: '#EF4444' },
                  ]}
                >
                  <Text style={styles.countBadgeText}>
                    {user!.unread_requests_count! > 99 ? '99+' : user!.unread_requests_count}
                  </Text>
                </View>
              )}
            </View>
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Increased gap for better spacing
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.04)', // Subtle gray background for buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithBadge: {
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444', // Red dot for notifications
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  controlsWrap: {
    paddingTop: 20, // Increased spacing from top
    paddingBottom: 8, // Added bottom padding to separate from feed/content
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8, // Increased vertical padding
    borderRadius: 14,
    borderWidth: 0,
  },
  controlsIconBtn: {
    padding: 4,
  },
  segmentedTabs: {
    flex: 1,
  },
  feedWrap: {
    paddingTop: 12, // Increased spacing from controls
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
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

