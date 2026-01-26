import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, Divider, Modal, Portal, Searchbar, Text, useTheme } from 'react-native-paper';

type Props = {
  title: string;
  options: readonly string[] | string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

function uniq(xs: string[]) {
  return Array.from(new Set(xs));
}

export function MultiSelectModal({
  title,
  options,
  value,
  onChange,
  placeholder = 'Select…',
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = Array.from(options);
    if (!query) return list;
    return list.filter((o) => o.toLowerCase().includes(query));
  }, [options, q]);

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange(uniq([...value, opt]));
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {value.length === 0 ? (
          <Chip onPress={() => setOpen(true)} textStyle={{ fontSize: 11 }}>
            {placeholder}
          </Chip>
        ) : (
          <>
            {value.map((v) => (
              <Chip
                key={v}
                onClose={() => toggle(v)}
                textStyle={{ fontSize: 10, fontWeight: '800' }}
                style={{ height: 28 }}
              >
                {v}
              </Chip>
            ))}
            <Chip onPress={() => setOpen(true)} textStyle={{ fontSize: 10, fontWeight: '900' }}>
              Edit
            </Chip>
            <Chip onPress={() => onChange([])} textStyle={{ fontSize: 10, fontWeight: '900' }}>
              Clear
            </Chip>
          </>
        )}
      </View>

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={{
            margin: 16,
            padding: 14,
            borderRadius: 16,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '900', marginBottom: 8 }}>
            {title}
          </Text>

          <Searchbar placeholder="Search…" value={q} onChangeText={setQ} autoCapitalize="none" />
          <Divider style={{ marginVertical: 10 }} />

          <View style={{ maxHeight: 360, gap: 6 }}>
            {filtered.map((opt) => {
              const selected = value.includes(opt);
              return (
                <Chip
                  key={opt}
                  mode={selected ? 'flat' : 'outlined'}
                  onPress={() => toggle(opt)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {selected ? `✓ ${opt}` : opt}
                </Chip>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <Button mode="text" onPress={() => setOpen(false)}>
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

