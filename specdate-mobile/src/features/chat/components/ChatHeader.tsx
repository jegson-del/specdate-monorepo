import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text } from 'react-native-paper';

type ChatHeaderProps = {
  avatar?: string | null;
  borderColor: string;
  name: string;
  onBack: () => void;
  onOpenActions: () => void;
  subtitle: string;
  surfaceColor: string;
  textColor: string;
  topInset: number;
  variantTextColor: string;
};

export default function ChatHeader({
  avatar,
  borderColor,
  name,
  onBack,
  onOpenActions,
  subtitle,
  surfaceColor,
  textColor,
  topInset,
  variantTextColor,
}: ChatHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 6, backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
      <IconButton icon="arrow-left" size={24} onPress={onBack} />
      {avatar ? (
        <Avatar.Image size={42} source={{ uri: avatar }} />
      ) : (
        <Avatar.Text size={42} label={name.slice(0, 2).toUpperCase()} />
      )}
      <View style={styles.headerText}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.spec, { color: variantTextColor }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <IconButton icon="dots-vertical" size={22} onPress={onOpenActions} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '900',
  },
  spec: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
