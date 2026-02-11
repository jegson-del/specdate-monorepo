import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

type VideoThumbnailPlayerProps = {
  uri: string;
  width?: number;
  height?: number;
  /** When set, tap opens large view (e.g. VideoViewerModal) instead of playing inline. */
  onPress?: () => void;
};

/**
 * Shows video first frame as thumbnail; tap play to play. Uses expo-av (works in Expo Go).
 * Works with local (file://) and remote (https) URIs.
 */
export function VideoThumbnailPlayer({
  uri,
  width = 160,
  height = 100,
  onPress,
}: VideoThumbnailPlayerProps) {
  const theme = useTheme();
  const videoRef = useRef<Video>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setLoaded(true);
    setIsPlaying(status.isPlaying);
  };

  const handleTap = () => {
    if (onPress) {
      onPress();
      return;
    }
    (async () => {
      try {
        if (isPlaying) {
          await videoRef.current?.pauseAsync();
        } else {
          await videoRef.current?.playAsync();
        }
      } catch (_) {
        // ignore
      }
    })();
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        isLooping={false}
        shouldPlay={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <View style={[styles.loading, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
      {loaded && (!isPlaying || onPress) && (
        <TouchableOpacity
          style={styles.playOverlay}
          onPress={handleTap}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="play-circle" size={56} color="rgba(255,255,255,0.95)" />
          <Text style={styles.playLabel}>{onPress ? 'Tap to open' : 'Tap to play'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
