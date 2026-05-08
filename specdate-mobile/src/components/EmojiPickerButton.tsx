import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EmojiType } from 'rn-emoji-keyboard';

const EmojiPicker = require('rn-emoji-keyboard/lib/commonjs').default;

type Props = {
  onEmojiSelected: (emoji: string) => void;
  disabled?: boolean;
  label?: string;
  style?: ViewStyle;
};

export default function EmojiPickerButton({
  onEmojiSelected,
  disabled = false,
  label = 'Emoji',
  style,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleEmojiSelected = (emoji: EmojiType) => {
    onEmojiSelected(emoji.emoji);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.action, style, disabled && styles.disabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Add emoji"
      >
        <MaterialCommunityIcons name="emoticon-happy-outline" size={21} color={theme.colors.primary} />
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </TouchableOpacity>
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        expandable
        defaultHeight={360}
        enableSearchBar
        categoryPosition="bottom"
        enableRecentlyUsed
        theme={{
          backdrop: '#00000055',
          knob: theme.colors.outlineVariant,
          container: theme.colors.surface,
          header: theme.colors.onSurface,
          category: {
            icon: theme.colors.onSurfaceVariant,
            iconActive: theme.colors.primary,
            container: theme.colors.surface,
            containerActive: theme.colors.primaryContainer,
          },
          search: {
            text: theme.colors.onSurface,
            placeholder: theme.colors.onSurfaceVariant,
            icon: theme.colors.onSurfaceVariant,
            background: theme.colors.surfaceVariant,
          },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  action: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
});
