import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../../services/auth';
import { AccountService } from '../../services/account';
import { useUser } from '../../hooks/useUser';
import { ConfirmModal } from './components';

type ConfirmAction = 'pause' | 'unpause' | 'delete' | null;

function SettingsItem({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  destructive,
  badgeCount,
  onPress,
  theme,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  destructive?: boolean;
  badgeCount?: number;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, destructive && styles.deleteItem, { borderColor: destructive ? theme.colors.error : theme.colors.outline }]}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.itemText}>
          <Text variant="bodyLarge" style={{ color: destructive ? theme.colors.error : theme.colors.onSurface, fontWeight: destructive ? '700' : '600' }}>
            {title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        {badgeCount && badgeCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={20} color={destructive ? theme.colors.error : theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [confirmModal, setConfirmModal] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await AuthService.logout();
    queryClient.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  const confirmConfig = useMemo(() => (
    confirmModal === 'pause'
      ? {
          title: 'Pause account?',
          message: 'Your profile will be hidden from others and you will not be able to create specs. You can still log in and unpause anytime.',
          confirmLabel: 'Pause',
          destructive: false,
        }
      : confirmModal === 'unpause'
        ? {
            title: 'Unpause account?',
            message: 'Your profile will become visible again and you can create specs.',
            confirmLabel: 'Unpause',
            destructive: false,
          }
        : confirmModal === 'delete'
          ? {
              title: 'Delete account?',
              message: 'This is permanent. All your data will be removed. You will not be able to recover your account.',
              confirmLabel: 'Delete account',
              destructive: true,
            }
          : null
  ), [confirmModal]);

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal === 'pause') {
        await AccountService.pause();
        queryClient.invalidateQueries({ queryKey: ['user'] });
      } else if (confirmModal === 'unpause') {
        await AccountService.unpause();
        queryClient.invalidateQueries({ queryKey: ['user'] });
      } else if (confirmModal === 'delete') {
        await AccountService.deleteAccount();
        await AuthService.logout();
        queryClient.clear();
        setConfirmModal(null);
        navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
        return;
      }
      setConfirmModal(null);
    } catch (e: any) {
      Alert.alert('Account action failed', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} iconColor={theme.colors.onSurface} onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>Account</Text>
          <SettingsItem
            icon={user?.is_paused ? 'play-circle' : 'pause-circle'}
            iconColor={theme.colors.secondary}
            iconBg={theme.colors.secondaryContainer}
            title={user?.is_paused ? 'Paused' : 'Pause Account'}
            subtitle={user?.is_paused ? 'Your profile is hidden. Tap to unpause.' : 'Hide your profile temporarily'}
            onPress={() => setConfirmModal(user?.is_paused ? 'unpause' : 'pause')}
            theme={theme}
          />
          <SettingsItem
            icon="logout"
            iconColor={theme.colors.error}
            iconBg={theme.colors.errorContainer}
            title="Log Out"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            theme={theme}
          />
          <SettingsItem
            icon="delete-outline"
            iconColor={theme.colors.error}
            iconBg={theme.colors.errorContainer}
            title="Delete My Account"
            subtitle="Permanently delete your account"
            destructive
            onPress={() => setConfirmModal('delete')}
            theme={theme}
          />
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>Safety</Text>
          <SettingsItem
            icon="lifebuoy"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primaryContainer}
            title="Contact Support"
            subtitle="Message the support team about safety, account, credits, or privacy"
            badgeCount={Number(user?.unread_support_count ?? 0)}
            onPress={() => navigation.navigate('SupportTickets')}
            theme={theme}
          />
          <SettingsItem
            icon="shield-check-outline"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primaryContainer}
            title="Safety Center"
            subtitle="Dating tips, chat rules, consent, scams, and emergency guidance"
            onPress={() => navigation.navigate('SafetyCenter')}
            theme={theme}
          />
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>Legal</Text>
          <SettingsItem
            icon="file-document-outline"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primaryContainer}
            title="Terms of Use"
            subtitle="Rules for uploads, chat, and safety"
            onPress={() => navigation.navigate('Legal', { type: 'terms' })}
            theme={theme}
          />
          <SettingsItem
            icon="shield-account-outline"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primaryContainer}
            title="Privacy Policy"
            subtitle="Data handling and moderation review"
            onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            theme={theme}
          />
        </Surface>
      </ScrollView>

      {confirmConfig && (
        <ConfirmModal
          visible={!!confirmModal}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
          destructive={confirmConfig.destructive}
          loading={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  content: {
    paddingBottom: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    marginBottom: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  deleteItem: {
    borderWidth: 1.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
