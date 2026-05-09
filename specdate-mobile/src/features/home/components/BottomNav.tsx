import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabKey, HomeColors } from '../types';

type Props = {
  activeTab: BottomTabKey;
  onTabChange: (tab: BottomTabKey) => void;
  onCreate: () => void;
  user: any;
  theme: any;
  homeColors: HomeColors;
  insets: { bottom: number; left: number; right: number };
};

const items: Array<{
  key: BottomTabKey;
  label: string;
  activeIcon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  inactiveIcon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}> = [
  { key: 'Home', label: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline', color: '' },
  { key: 'Matches', label: 'Matches', activeIcon: 'account-group', inactiveIcon: 'account-group-outline', color: '#ef5a46' },
  { key: 'Dates', label: 'Dates', activeIcon: 'heart', inactiveIcon: 'heart-outline', color: '#D946EF' },
  { key: 'Specs', label: 'Specs', activeIcon: 'clipboard-list', inactiveIcon: 'clipboard-list-outline', color: '#8B5CF6' },
  { key: 'Requests', label: 'Requests', activeIcon: 'account-plus', inactiveIcon: 'account-plus-outline', color: '#06B6D4' },
];

function ActiveIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View style={[styles.activeIconWrap, { shadowColor: color }]}>
      {children}
    </View>
  );
}

export default function BottomNav({ activeTab, onTabChange, onCreate, user, theme, homeColors, insets }: Props) {
  return (
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
        {items.slice(0, 3).map((item) => (
          <NavItem
            key={item.key}
            item={item}
            activeTab={activeTab}
            onTabChange={onTabChange}
            user={user}
            theme={theme}
            homeColors={homeColors}
          />
        ))}

        <TouchableOpacity onPress={onCreate} style={styles.bottomNavCenterWrap} activeOpacity={0.7}>
          <View style={[styles.bottomNavCenterBtn, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
          </View>
          <Text style={[styles.bottomNavLabel, { color: homeColors.subtext, marginTop: 6 }]}>Create</Text>
        </TouchableOpacity>

        {items.slice(3).map((item) => (
          <NavItem
            key={item.key}
            item={item}
            activeTab={activeTab}
            onTabChange={onTabChange}
            user={user}
            theme={theme}
            homeColors={homeColors}
          />
        ))}
      </View>
    </Surface>
  );
}

function NavItem({ item, activeTab, onTabChange, user, theme, homeColors }: any) {
  const active = activeTab === item.key;
  const color = item.color || theme.colors.primary;

  return (
    <TouchableOpacity onPress={() => onTabChange(item.key)} style={styles.bottomNavItem} activeOpacity={0.7}>
      <View style={styles.iconWithBadge}>
        {active ? (
          <ActiveIcon color={color}>
            <MaterialCommunityIcons name={item.activeIcon} size={24} color={color} style={{ textShadowColor: color, textShadowRadius: 10 }} />
          </ActiveIcon>
        ) : (
          <MaterialCommunityIcons name={item.inactiveIcon} size={28} color={color} style={{ opacity: 0.5 }} />
        )}
        {item.key === 'Requests' && (user?.unread_requests_count ?? 0) > 0 && (
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
      <Text style={[styles.bottomNavLabel, { color: active ? theme.colors.primary : homeColors.subtext }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  activeIconWrap: {
    shadowRadius: 8,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 6,
  },
  iconWithBadge: {
    position: 'relative',
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
