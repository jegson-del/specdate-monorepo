import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';

type Props = {
  user: any;
  insets: { top: number };
  theme: any;
  navigation: any;
};

export default function HomeHeader({ user, insets, theme, navigation }: Props) {
  const avatarUrl = useMemo(() => toImageUri(user?.profile?.avatar), [user?.profile?.avatar]);
  const unreadChatCount = Number(user?.unread_chat_count ?? 0);

  return (
    <Surface
      style={[
        styles.topBar,
        {
          paddingTop: insets.top + 6,
          paddingBottom: 6,
          paddingLeft: 12,
          paddingRight: 12,
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          zIndex: 10,
        },
      ]}
    >
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8} style={styles.headerIconBtn}>
        {avatarUrl ? (
          <Avatar.Image size={40} source={{ uri: avatarUrl }} />
        ) : (
          <MaterialCommunityIcons name="account-circle-outline" size={40} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      <View style={[styles.titleWrap, { paddingTop: insets.top + 8, paddingBottom: 8 }]} pointerEvents="none">
        <Image
          source={require('../../../../assets/dateusher_header_icon_white.png')}
          style={styles.logo}
        />
      </View>

      <View style={styles.rightIcons}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Messages')} activeOpacity={0.7}>
          <View>
            <MaterialCommunityIcons name="chat-outline" size={28} color="#FFFFFF" />
            {unreadChatCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={28} color="#FFFFFF" />
            {(user?.unread_notifications_count || 0) > 0 && <View style={styles.activeBadge} />}
          </View>
        </TouchableOpacity>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 52,
    height: 42,
    resizeMode: 'contain',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  countBadge: {
    position: 'absolute',
    top: -7,
    right: -9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
});
