import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import type { ProviderDashboardCounts } from '../types';
import { styles } from './providerDashboardStyles';

export function ProviderDashboardCards({
  counts,
  discountPercentage,
  minimumSpendShortDisplay,
  reviewsCount,
  editMode,
  navigation,
  reviews,
  theme,
}: {
  counts: ProviderDashboardCounts;
  discountPercentage: string;
  minimumSpendShortDisplay: string;
  reviewsCount: number;
  editMode: boolean;
  navigation: any;
  reviews: any[];
  theme: any;
}) {
  return (
    <View style={styles.dashboardGrid}>
      <DashboardCard
        title="Bookings"
        value={counts.confirmed_bookings}
        helper="Confirmed"
        icon="calendar-check"
        color={theme.colors.primary}
        theme={theme}
        onPress={() => navigation.navigate('ProviderBookings', { initialFilter: 'confirmed' })}
      />
      <DashboardCard
        title="Upcoming"
        value={counts.unconfirmed_bookings}
        helper="Pending"
        icon="calendar-clock"
        color="#0891B2"
        theme={theme}
        onPress={() => navigation.navigate('ProviderBookings', { initialFilter: 'pending' })}
      />
      <DashboardCard
        title="Discount"
        value={`${discountPercentage}%`}
        helper={minimumSpendShortDisplay}
        icon="ticket-percent"
        color="#16A34A"
        theme={theme}
      />
      <DashboardCard
        title="Reviews"
        value={reviewsCount}
        helper="View all"
        icon="star-outline"
        color="#F59E0B"
        theme={theme}
        onPress={() => navigation.navigate('ProviderReviews', { reviews })}
      />
      <DashboardCard
        title="Scan"
        value="QR"
        helper="Voucher"
        icon="qrcode-scan"
        color="#DC2626"
        theme={theme}
        onPress={() => navigation.navigate('QRScanner')}
      />
      <DashboardCard
        title="Settings"
        value="Tools"
        helper={editMode ? 'Editing' : ' Logout'}
        icon="cog-outline"
        color="#64748B"
        theme={theme}
        onPress={() => navigation.navigate('ProviderSettings')}
      />
    </View>
  );
}

function DashboardCard({
  title,
  value,
  helper,
  icon,
  color,
  onPress,
  theme,
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress?: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.dashboardCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.dashboardIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.dashboardValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.dashboardTitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
        {title}
      </Text>
      {helper ? (
        <Text style={[styles.dashboardHelper, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {helper}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
