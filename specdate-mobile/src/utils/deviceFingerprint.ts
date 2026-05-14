import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_FINGERPRINT_KEY = 'specdate.deviceFingerprint';

let cachedFingerprint: string | null = null;
let pendingFingerprint: Promise<string | null> | null = null;

export async function getDeviceFingerprintHeaders(): Promise<Record<string, string>> {
    const fingerprint = await getOrCreateFingerprint();
    if (!fingerprint) {
        return {};
    }

    return {
        'X-Device-Fingerprint': fingerprint,
        'X-Device-Platform': Platform.OS,
        'X-App-Version': appVersion(),
        'X-Device-Model': deviceModel(),
    };
}

async function getOrCreateFingerprint(): Promise<string | null> {
    if (cachedFingerprint) {
        return cachedFingerprint;
    }

    if (!pendingFingerprint) {
        pendingFingerprint = loadOrCreateFingerprint();
    }

    cachedFingerprint = await pendingFingerprint;
    pendingFingerprint = null;

    return cachedFingerprint;
}

async function loadOrCreateFingerprint(): Promise<string | null> {
    try {
        const stored = await SecureStore.getItemAsync(DEVICE_FINGERPRINT_KEY);
        if (stored) {
            return stored;
        }

        const fingerprint = createInstallId();
        await SecureStore.setItemAsync(DEVICE_FINGERPRINT_KEY, fingerprint);
        return fingerprint;
    } catch {
        return null;
    }
}

function createInstallId(): string {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (randomUuid) {
        return `install_${randomUuid}`;
    }

    return `install_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function appVersion(): string {
    return (
        Constants.expoConfig?.version ||
        (Constants as any).manifest?.version ||
        'unknown'
    );
}

function deviceModel(): string {
    const constants = Platform.constants as Record<string, unknown> | undefined;
    const model = constants?.Model || constants?.model || constants?.systemName;

    return typeof model === 'string' && model.length > 0 ? model : Platform.OS;
}
