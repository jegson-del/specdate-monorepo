import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RoundMediaAsset } from '../components';

type RoundMediaTarget = 'answer' | 'next_question';

type UseRoundMediaPickerParams = {
    onMediaSelected: (target: RoundMediaTarget, asset: RoundMediaAsset) => void;
};

export function useRoundMediaPicker({ onMediaSelected }: UseRoundMediaPickerParams) {
    const pickFromLibrary = useCallback(async (target: RoundMediaTarget, assetType: 'image' | 'video') => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Allow photo library access to share media.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: assetType === 'image' ? ['images'] : ['videos'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                videoMaxDuration: 60,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                const mimeType = asset.mimeType ?? (assetType === 'video' ? 'video/mp4' : 'image/jpeg');
                onMediaSelected(target, { uri: asset.uri, mimeType, assetType });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    }, [onMediaSelected]);

    const takePhoto = useCallback(async (target: RoundMediaTarget) => {
        try {
            const cam = await ImagePicker.requestCameraPermissionsAsync();
            if (!cam.granted) {
                Alert.alert('Permission Required', 'Allow camera access to take a photo.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                onMediaSelected(target, {
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'image/jpeg',
                    assetType: 'image',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    }, [onMediaSelected]);

    const recordVideo = useCallback(async (target: RoundMediaTarget) => {
        try {
            const cam = await ImagePicker.requestCameraPermissionsAsync();
            if (!cam.granted) {
                Alert.alert('Permission Required', 'Allow camera access to record video.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                videoMaxDuration: 60,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                onMediaSelected(target, {
                    uri: asset.uri,
                    mimeType: asset.mimeType ?? 'video/mp4',
                    assetType: 'video',
                });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || String(e));
        }
    }, [onMediaSelected]);

    return {
        pickFromLibrary,
        takePhoto,
        recordVideo,
    };
}
