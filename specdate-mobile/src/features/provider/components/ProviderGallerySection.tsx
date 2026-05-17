import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import type { ProviderGalleryImage } from '../types';
import { SectionTitle } from './SectionTitle';
import { styles } from './providerDashboardStyles';

export function ProviderGallerySection({
  galleryImageItems,
  galleryImages,
  editMode,
  onOpenGalleryAt,
  onEditGalleryImageAt,
  onPickGallery,
  theme,
}: {
  galleryImageItems: ProviderGalleryImage[];
  galleryImages: string[];
  editMode: boolean;
  onOpenGalleryAt: (index: number) => void;
  onEditGalleryImageAt: (index: number) => void;
  onPickGallery: () => void;
  theme: any;
}) {
  return (
    <>
      <SectionTitle theme={theme}>Gallery</SectionTitle>
      {galleryImages.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryStrip}>
          {galleryImageItems.map((item, index) => (
            <TouchableOpacity
              key={`${item.kind}-${item.id ?? index}`}
              activeOpacity={0.9}
              onPress={() => onOpenGalleryAt(index)}
              style={styles.galleryItemWrap}
              accessibilityRole="button"
              accessibilityLabel="Open provider photo"
            >
              <Image source={{ uri: item.url }} style={styles.galleryItem} />
              <TouchableOpacity
                style={[styles.galleryEditBadge, { backgroundColor: theme.colors.primary }]}
                onPress={() => onEditGalleryImageAt(index)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={item.kind === 'cover' ? 'Edit cover photo' : 'Replace gallery photo'}
              >
                <MaterialCommunityIcons name="pencil" size={13} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={styles.galleryItemWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPickGallery}
              style={[styles.galleryItem, styles.galleryAddItem, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <MaterialCommunityIcons name="plus" size={32} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <TouchableOpacity
          onPress={onPickGallery}
          style={[styles.galleryPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons name="image-plus" size={32} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.galleryPlaceholderText, { color: theme.colors.onSurfaceVariant }]}>
            {editMode ? 'Tap to add photo' : 'No photos yet'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
