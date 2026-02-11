import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type VideoViewerModalProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

/** Full-screen video viewer (like ImageViewerModal). Tap close to dismiss. */
export function VideoViewerModal({ visible, uri, onClose }: VideoViewerModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible || !uri) return null;

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          iconColor="#fff"
          size={24}
          onPress={onClose}
          style={styles.closeBtn}
        />
      </View>
      <View style={styles.videoWrap}>
        <Video
          source={{ uri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay={false}
          isLooping={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  closeBtn: {
    margin: 0,
  },
  videoWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
});
