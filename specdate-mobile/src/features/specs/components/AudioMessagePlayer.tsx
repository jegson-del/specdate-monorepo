import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Text, useTheme } from 'react-native-paper';

type AudioMessagePlayerProps = {
  uri: string;
  compact?: boolean;
};

function formatDuration(seconds?: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Number(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function AudioMessagePlayer({ uri, compact = false }: AudioMessagePlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const togglePlayback = async () => {
    if (isPlaying) {
      player.pause();
      return;
    }

    if (duration > 0 && currentTime >= duration - 0.2) {
      await player.seekTo(0);
    }
    player.play();
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.compactWrap,
        { backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.outlineVariant || theme.colors.outline + '40' },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={togglePlayback}
        style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
        accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={compact ? 18 : 22} color="#fff" />
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>Voice note</Text>
          <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]}>
          <View style={[styles.progress, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 240,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactWrap: {
    width: 210,
    padding: 8,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 11, fontWeight: '600' },
  track: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 999,
  },
});
