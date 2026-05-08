jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: 'localhost:8081',
  },
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    playing: false,
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  }),
  useAudioPlayerStatus: () => ({
    playing: false,
    duration: 0,
  }),
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    loop: false,
    pause: jest.fn(),
    play: jest.fn(),
    status: 'readyToPlay',
    playing: false,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  }),
  VideoView: 'VideoView',
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }: { name?: string }) => React.createElement(Text, null, name ?? 'icon');

  return {
    MaterialCommunityIcons: Icon,
    MaterialIcons: Icon,
    Ionicons: Icon,
    Feather: Icon,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
