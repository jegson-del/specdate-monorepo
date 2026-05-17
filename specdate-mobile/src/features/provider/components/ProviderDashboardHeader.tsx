import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import type { ProviderDashboardCounts } from '../types';
import { styles } from './providerDashboardStyles';

export function ProviderDashboardHeader({
  companyName,
  counts,
  insetsTop,
  navigation,
  theme,
}: {
  companyName: string;
  counts: ProviderDashboardCounts;
  insetsTop: number;
  navigation: any;
  theme: any;
}) {
  return (
    <View style={[styles.topBar, { paddingTop: insetsTop + 12, backgroundColor: theme.colors.primary }]}>
      <View style={styles.topBarTitleWrap}>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {companyName || 'Dashboard'}
        </Text>
      </View>
      <HeaderIcon
        icon="bell-outline"
        badge={counts.unread_notifications}
        onPress={() => navigation.navigate('Notifications')}
      />
      <HeaderIcon
        icon="message-text-outline"
        badge={counts.unread_messages}
        onPress={() => navigation.navigate('Messages')}
      />
    </View>
  );
}

function HeaderIcon({
  icon,
  badge,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badge: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.headerIconButton} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color="#fff" />
      {badge > 0 ? <Text style={styles.headerBadge}>{badge}</Text> : null}
    </TouchableOpacity>
  );
}
