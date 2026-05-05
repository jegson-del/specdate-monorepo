import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export type RoundMediaAsset = {
  uri: string;
  mimeType: string;
  assetType: 'image' | 'video' | 'audio';
};

function getAudioMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (Platform.OS === 'web' || ext === 'webm') return 'audio/webm';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === '3gp') return 'audio/3gpp';
  if (ext === 'aac') return 'audio/aac';
  return 'audio/mp4';
}

export function useRoundAudioRecorder(onRecorded: (asset: RoundMediaAsset) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const startRecording = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Allow microphone access to record a voice note.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 90 });
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      const uri = recorder.uri || recorder.getStatus().url;
      if (!uri) {
        Alert.alert('Recording unavailable', 'The voice note could not be saved. Please try again.');
        return;
      }

      onRecorded({
        uri,
        mimeType: getAudioMimeType(uri),
        assetType: 'audio',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  }, [onRecorded, recorder]);

  const cancelRecording = useCallback(async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      await setAudioModeAsync({ allowsRecording: false });
    }
  }, [recorder, recorderState.isRecording]);

  return {
    durationMillis: recorderState.durationMillis,
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
