import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

type VideoThumbnailPlayerProps = {
  uri: string;
  width?: number;
  height?: number;
  /** When set, tap opens large view (e.g. VideoViewerModal) instead of playing inline. */
  onPress?: () => void;
};

/**
 * Shows video first frame as thumbnail; tap play to play.
 * Works with local (file://) and remote (https) URIs.
 */
export function VideoThumbnailPlayer({
  uri,
  width = 160,
  height = 100,
  onPress,
}: VideoThumbnailPlayerProps) {
  const theme = useTheme();
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.pause();
  });
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const statusSubscription = (player as any).addListener?.('statusChange', ({ status }: { status: string }) => {
      setLoaded(status === 'readyToPlay');
    });
    const playingSubscription = (player as any).addListener?.('playingChange', ({ isPlaying: playing }: { isPlaying: boolean }) => {
      setIsPlaying(playing);
    });

    setLoaded(player.status === 'readyToPlay');
    setIsPlaying(player.playing);

    return () => {
      statusSubscription?.remove?.();
      playingSubscription?.remove?.();
    };
  }, [player]);

  const handleTap = () => {
    if (onPress) {
      onPress();
      return;
    }
    (async () => {
      try {
        if (isPlaying) {
          player.pause();
        } else {
          player.play();
        }
      } catch (_) {
        // ignore
      }
    })();
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={!onPress}
        fullscreenOptions={{ enable: false }}
        onFirstFrameRender={() => setLoaded(true)}
      />
      {!loaded && (
        <View style={[styles.loading, { backgroundColor: (theme.colors as any).surfaceContainerHighest ?? theme.colors.surface }]}>
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
