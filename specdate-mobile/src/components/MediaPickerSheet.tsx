import React from 'react';
import { Animated, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type SheetOption = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  helper: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onDismiss: () => void;
};

export default function MediaPickerSheet({ visible, title, options, onDismiss }: Props) {
  const theme = useTheme();
  const translateY = React.useRef(new Animated.Value(260)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 180 : 130,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 260,
        damping: 24,
        stiffness: 260,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  const handleOptionPress = (onPress: () => void) => {
    onDismiss();
    setTimeout(onPress, 220);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
          <View style={styles.options}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.label}
                activeOpacity={0.78}
                style={[styles.option, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => handleOptionPress(option.onPress)}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary }]}>
                  <MaterialCommunityIcons name={option.icon} size={22} color={theme.colors.onPrimary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: theme.colors.onSurface }]}>{option.label}</Text>
                  <Text style={[styles.optionHelper, { color: theme.colors.onSurfaceVariant }]}>{option.helper}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 66,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  optionHelper: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
});
