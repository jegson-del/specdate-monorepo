import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import type { ProviderDashboardProfile } from '../types';
import { styles } from './providerDashboardStyles';

export function ProviderHero({
  profile,
  website,
  editMode,
  ratingDisplay,
  onPressImage,
  onPressEditImage,
  onOpenWebsite,
  theme,
}: {
  profile: ProviderDashboardProfile | null;
  website: string;
  editMode: boolean;
  ratingDisplay: string | null;
  onPressImage: () => void;
  onPressEditImage: () => void;
  onOpenWebsite: () => void;
  theme: any;
}) {
  return (
    <View style={styles.mainImageWrap}>
      <TouchableOpacity
        activeOpacity={profile?.image ? 1 : 0.85}
        onPress={onPressImage}
        accessibilityRole="button"
        accessibilityLabel={profile?.image ? 'Open cover photo' : 'Add cover photo'}
      >
        {profile?.image ? (
          <Image source={{ uri: profile.image }} style={styles.mainImage} />
        ) : (
          <View style={[styles.mainImagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="store-plus" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.placeholderLabel, { color: theme.colors.onSurfaceVariant }]}>Add cover photo</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.editPhotoBadge}
        onPress={onPressEditImage}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={profile?.image ? 'Edit cover photo' : 'Add cover photo'}
      >
        <MaterialCommunityIcons name={profile?.image ? 'camera' : 'camera-plus'} size={18} color="#fff" />
      </TouchableOpacity>
      {profile?.image ? (
        <View style={[styles.ratingPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <MaterialCommunityIcons name="star" size={16} color="#FCD34D" />
          <Text style={styles.ratingText}>{ratingDisplay ?? '-'}</Text>
        </View>
      ) : null}
      {website.trim() && !editMode ? (
        <TouchableOpacity onPress={onOpenWebsite} style={styles.visitWebsiteOverlay}>
          <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
          <Text style={styles.visitWebsiteText}>Visit website</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
