import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Text, useTheme } from 'react-native-paper';

type AudioMessagePlayerProps = {
  uri: string;
  compact?: boolean;
  label?: string;
};

const WAVE_BAR_HEIGHTS = [12, 20, 14, 26, 18, 23, 13, 21, 15];

function formatDuration(seconds?: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Number(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function AudioWaveform({
  active,
  compact,
  color,
  idleColor,
}: {
  active: boolean;
  compact: boolean;
  color: string;
  idleColor: string;
}) {
  const values = useRef(WAVE_BAR_HEIGHTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    values.forEach((value) => value.setValue(0));

    if (!active) return;

    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 55),
          Animated.timing(value, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [active, values]);

  return (
    <View style={[styles.waveRow, compact && styles.compactWaveRow]} accessibilityElementsHidden>
      {WAVE_BAR_HEIGHTS.map((height, index) => {
        const scaleY = values[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1.18],
        });
        const opacity = values[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1],
        });

        return (
          <Animated.View
            key={`${height}-${index}`}
            style={[
              styles.waveBar,
              {
                height: compact ? Math.max(8, height - 5) : height,
                backgroundColor: active ? color : idleColor,
                opacity: active ? opacity : 0.45,
                transform: [{ scaleY: active ? scaleY : 1 }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function AudioMessagePlayer({ uri, compact = false, label = 'Audio note' }: AudioMessagePlayerProps) {
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
        {
          backgroundColor: theme.colors.surface,
          borderColor: isPlaying ? theme.colors.primary : theme.colors.outlineVariant || theme.colors.outline + '40',
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={togglePlayback}
        style={[
          styles.playButton,
          compact && styles.compactPlayButton,
          { backgroundColor: isPlaying ? theme.colors.primary : theme.colors.primaryContainer || theme.colors.primary },
        ]}
        accessibilityLabel={isPlaying ? `Pause ${label}` : `Play ${label}`}
      >
        <MaterialCommunityIcons
          name={isPlaying ? 'pause' : 'play'}
          size={compact ? 18 : 22}
          color={isPlaying ? '#fff' : theme.colors.onPrimaryContainer || '#fff'}
        />
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons name="waveform" size={compact ? 14 : 16} color={theme.colors.primary} />
            <Text style={[styles.label, compact && styles.compactLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Text>
        </View>
        <AudioWaveform
          active={isPlaying}
          compact={compact}
          color={theme.colors.primary}
          idleColor={theme.colors.outlineVariant || theme.colors.outline + '50'}
        />
        <View style={[styles.track, { backgroundColor: theme.colors.outlineVariant || theme.colors.outline + '30' }]}>
          <View style={[styles.progress, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 280,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactWrap: {
    width: 230,
    padding: 10,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  body: { flex: 1, minWidth: 0 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  labelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: { fontSize: 13, fontWeight: '700' },
  compactLabel: { fontSize: 12 },
  time: { fontSize: 11, fontWeight: '600' },
  waveRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  compactWaveRow: {
    height: 22,
    marginBottom: 7,
  },
  waveBar: {
    width: 4,
    borderRadius: 999,
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 999,
  },
});
