import React from 'react';
import { FlatList, Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { UserService, type UserFilterOption } from '../../../services/user';
import { flagForCountry } from '../../../utils/countryFlags';

type Props = {
  visible: boolean;
  theme: any;
  selectedCountry: string;
  selectedCity: string;
  sex: string;
  query: string;
  onClose: () => void;
  onApply: (filters: { country: string; city: string }) => void;
};

function optionMatches(option: UserFilterOption, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return option.name.toLowerCase().includes(needle);
}

function OptionRow({
  option,
  selected,
  icon,
  onPress,
  theme,
}: {
  option: UserFilterOption;
  selected: boolean;
  icon: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.optionRow,
        {
          backgroundColor: selected ? theme.colors.primary + '12' : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: selected ? theme.colors.primary : theme.colors.elevation.level2 }]}>
        {icon === 'flag' ? (
          <Text style={styles.optionFlag}>{flagForCountry(option.name, option.code) || '--'}</Text>
        ) : (
          <MaterialCommunityIcons name={icon as any} size={18} color={selected ? theme.colors.onPrimary : theme.colors.primary} />
        )}
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionName, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {option.name}
        </Text>
        <Text style={[styles.optionMeta, { color: theme.colors.onSurfaceVariant }]}>
          {option.count} {option.count === 1 ? 'person' : 'people'}
        </Text>
      </View>
      {selected ? <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} /> : null}
    </TouchableOpacity>
  );
}

export default function PeopleLocationFilterModal({
  visible,
  theme,
  selectedCountry,
  selectedCity,
  sex,
  query,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draftCountry, setDraftCountry] = React.useState(selectedCountry);
  const [draftCity, setDraftCity] = React.useState(selectedCity);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!visible) return;
    setDraftCountry(selectedCountry);
    setDraftCity(selectedCity);
    setSearch('');
  }, [selectedCity, selectedCountry, visible]);

  const optionsQuery = useQuery({
    queryKey: ['user-filter-options', sex, query, draftCountry],
    queryFn: () => UserService.getFilterOptions({
      sex,
      query: query.trim() || undefined,
      country: draftCountry || undefined,
    }),
    enabled: visible,
    staleTime: 60_000,
  });

  const countries = React.useMemo(
    () => (optionsQuery.data?.countries ?? []).filter((option) => optionMatches(option, search)),
    [optionsQuery.data?.countries, search]
  );
  const cities = React.useMemo(
    () => (optionsQuery.data?.cities ?? []).filter((option) => optionMatches(option, search)),
    [optionsQuery.data?.cities, search]
  );
  const showingCities = Boolean(draftCountry);
  const list = showingCities ? cities : countries;
  const draftCountryOption = optionsQuery.data?.countries.find((option) => option.name === draftCountry);
  const draftFlag = flagForCountry(draftCountry, draftCountryOption?.code);

  const apply = () => {
    onApply({ country: draftCountry, city: draftCity });
    onClose();
  };

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Location</Text>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {showingCities ? 'Choose a city' : 'Choose a country'}
              </Text>
            </View>
            <IconButton icon="close" size={22} onPress={onClose} style={styles.closeButton} />
          </View>

          <Searchbar
            value={search}
            onChangeText={setSearch}
            placeholder={showingCities ? 'Search cities' : 'Search countries'}
            style={[styles.search, { backgroundColor: theme.colors.elevation.level2 }]}
            inputStyle={{ color: theme.colors.onSurface }}
            iconColor={theme.colors.primary}
          />

          <View style={styles.selectedRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                setDraftCountry('');
                setDraftCity('');
                setSearch('');
              }}
              style={[styles.selectionPill, { backgroundColor: !draftCountry ? theme.colors.primary : theme.colors.elevation.level2 }]}
            >
              <Text style={[styles.selectionPillText, { color: !draftCountry ? theme.colors.onPrimary : theme.colors.onSurface }]}>
                All countries
              </Text>
            </TouchableOpacity>
            {draftCountry ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  setDraftCity('');
                  setSearch('');
                }}
                style={[styles.selectionPill, { backgroundColor: !draftCity ? theme.colors.primary : theme.colors.elevation.level2 }]}
              >
                <Text style={[styles.selectionPillText, { color: !draftCity ? theme.colors.onPrimary : theme.colors.onSurface }]}>
                  All cities
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {draftCountry ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                setDraftCountry('');
                setDraftCity('');
                setSearch('');
              }}
              style={[styles.countryTrail, { borderColor: theme.colors.outlineVariant }]}
            >
              {draftFlag ? (
                <Text style={styles.trailFlag}>{draftFlag}</Text>
              ) : (
                <MaterialCommunityIcons name="earth" size={17} color={theme.colors.primary} />
              )}
              <Text style={[styles.countryTrailText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {draftCountry}
              </Text>
              <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}

          {optionsQuery.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Loading locations...</Text>
            </View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(item) => item.name}
              style={styles.list}
              contentContainerStyle={list.length ? styles.listContent : styles.emptyContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <OptionRow
                  option={item}
                  selected={showingCities ? draftCity === item.name : draftCountry === item.name}
                  icon={showingCities ? 'map-marker-outline' : 'flag'}
                  theme={theme}
                  onPress={() => {
                    if (showingCities) {
                      setDraftCity(draftCity === item.name ? '' : item.name);
                      return;
                    }
                    setDraftCountry(draftCountry === item.name ? '' : item.name);
                    setDraftCity('');
                    setSearch('');
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="map-search-outline" size={34} color={theme.colors.outline} />
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No matching locations yet.
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => {
                setDraftCountry('');
                setDraftCity('');
                onApply({ country: '', city: '' });
                onClose();
              }}
              style={styles.actionButton}
            >
              Reset
            </Button>
            <Button mode="contained" onPress={apply} style={styles.actionButton}>
              Apply
            </Button>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.18)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  closeButton: {
    margin: 0,
  },
  search: {
    marginTop: 14,
    borderRadius: 12,
    elevation: 0,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectionPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  selectionPillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  countryTrail: {
    minHeight: 38,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  countryTrailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  list: {
    marginTop: 12,
  },
  listContent: {
    gap: 8,
    paddingBottom: 10,
  },
  optionRow: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionFlag: {
    fontSize: 18,
    lineHeight: 22,
  },
  trailFlag: {
    fontSize: 16,
    lineHeight: 20,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  optionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
});
