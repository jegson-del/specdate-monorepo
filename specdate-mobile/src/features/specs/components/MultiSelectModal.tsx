import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Divider, Modal, Portal, Searchbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  title: string;
  options: readonly string[] | string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label?: string;
  actionPlacement?: 'inline' | 'header';
};

function uniq(xs: string[]) {
  return Array.from(new Set(xs));
}

export function MultiSelectModal({
  title,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  actionPlacement = 'inline',
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<string[]>(value);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = Array.from(options);
    if (!query) return list;
    return list.filter((option) => option.toLowerCase().includes(query));
  }, [options, q]);

  const openPicker = () => {
    setDraft(value);
    setQ('');
    setOpen(true);
  };

  const closePicker = () => {
    setDraft(value);
    setQ('');
    setOpen(false);
  };

  const savePicker = () => {
    onChange(draft);
    setQ('');
    setOpen(false);
  };

  const toggleDraft = (option: string) => {
    if (draft.includes(option)) {
      setDraft(draft.filter((item) => item !== option));
    } else {
      setDraft(uniq([...draft, option]));
    }
  };

  const showActions = value.length > 0;
  const actionButtons = showActions ? (
    <View style={styles.iconActions}>
      <TouchableOpacity
        accessibilityLabel={`Edit ${label ?? title}`}
        onPress={openPicker}
        activeOpacity={0.85}
        style={[styles.circleAction, { backgroundColor: theme.colors.primary }]}
      >
        <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.onPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel={`Clear ${label ?? title}`}
        onPress={() => onChange([])}
        activeOpacity={0.85}
        style={[styles.circleAction, styles.clearCircleAction]}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="titleSmall" style={[styles.labelText, { color: theme.colors.onSurface }]}>
            {label}
          </Text>
          {actionPlacement === 'header' ? actionButtons : null}
        </View>
      ) : null}
      <View style={styles.previewRow}>
        {value.length === 0 ? (
          <Chip onPress={openPicker} textStyle={styles.placeholderChipText}>
            {placeholder}
          </Chip>
        ) : (
          <>
            {value.map((item) => (
              <Chip
                key={item}
                onClose={() => onChange(value.filter((current) => current !== item))}
                textStyle={styles.selectedPreviewText}
                style={styles.selectedPreviewChip}
              >
                {item}
              </Chip>
            ))}
            {actionPlacement === 'inline' ? (
              <>
                <Chip icon="pencil-outline" onPress={openPicker} textStyle={styles.editChipText} style={styles.editChip}>
                  Edit
                </Chip>
                <Chip icon="trash-can-outline" onPress={() => onChange([])} textStyle={styles.clearChipText} style={styles.clearChip}>
                  Clear
                </Chip>
              </>
            ) : null}
          </>
        )}
      </View>

      <Portal>
        <Modal
          visible={open}
          onDismiss={closePicker}
          contentContainerStyle={[
            styles.modal,
            {
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {draft.length} selected
              </Text>
            </View>
          </View>

          <Searchbar placeholder="Search..." value={q} onChangeText={setQ} autoCapitalize="none" style={styles.search} />

          {draft.length > 0 ? (
            <View style={styles.selectedBlock}>
              <Text variant="labelLarge" style={[styles.blockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Selected
              </Text>
              <View style={styles.optionsWrap}>
                {draft.map((item) => (
                  <Chip key={item} onClose={() => toggleDraft(item)} mode="flat" textStyle={styles.selectedPreviewText}>
                    {item}
                  </Chip>
                ))}
              </View>
            </View>
          ) : null}

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={[styles.blockLabel, { color: theme.colors.onSurfaceVariant }]}>
            Options
          </Text>
          <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsWrap} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No options found.</Text>
            ) : (
              filtered.map((option) => {
                const selected = draft.includes(option);
                return (
                  <Chip
                    key={option}
                    mode={selected ? 'flat' : 'outlined'}
                    selected={selected}
                    onPress={() => toggleDraft(option)}
                    style={styles.optionChip}
                  >
                    {option}
                  </Chip>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button mode="outlined" onPress={closePicker} style={styles.footerButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={savePicker} style={styles.footerButton}>
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelText: {
    flex: 1,
    fontWeight: '900',
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  clearCircleAction: {
    backgroundColor: '#DC2626',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  placeholderChipText: {
    fontSize: 11,
  },
  selectedPreviewChip: {
    height: 28,
  },
  selectedPreviewText: {
    fontSize: 10,
    fontWeight: '800',
  },
  editChip: {
    height: 28,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  clearChip: {
    height: 28,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  editChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7C3AED',
  },
  clearChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
  },
  modal: {
    flex: 1,
    margin: 0,
    paddingHorizontal: 16,
  },
  header: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    fontWeight: '900',
  },
  search: {
    marginTop: 10,
    marginBottom: 12,
  },
  selectedBlock: {
    gap: 8,
  },
  blockLabel: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  divider: {
    marginVertical: 12,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  optionChip: {
    alignSelf: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  footerButton: {
    flex: 1,
  },
});
