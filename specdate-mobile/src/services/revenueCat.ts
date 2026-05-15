import { Platform } from 'react-native';
import Purchases, {
    type CustomerInfo,
    type MakePurchaseResult,
    type PurchasesPackage,
    type PurchasesOfferings,
} from 'react-native-purchases';
import RevenueCatUI, { type PAYWALL_RESULT } from 'react-native-purchases-ui';

export const CREDITS_ENTITLEMENT_IDENTIFIER = 'Credits';

let configuredAppUserId: string | null = null;

function getRevenueCatApiKey(): string | null {
    const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim();
    if (__DEV__ && testKey) {
        return testKey;
    }

    const key = Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
        : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
            : undefined;

    const trimmed = key?.trim();
    return trimmed ? trimmed : null;
}

export function isRevenueCatSupportedPlatform(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function hasRevenueCatApiKey(): boolean {
    return Boolean(getRevenueCatApiKey());
}

export async function configureRevenueCatForUser(userId: number | string | null | undefined): Promise<boolean> {
    if (!isRevenueCatSupportedPlatform()) {
        return false;
    }

    if (userId == null || String(userId).trim() === '') {
        return false;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
        if (__DEV__) {
            console.warn('[RevenueCat] Missing API key. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY for dev or platform keys for release builds.');
        }
        return false;
    }

    const appUserID = String(userId);
    if (configuredAppUserId === appUserID) {
        return true;
    }

    Purchases.configure({ apiKey, appUserID });
    configuredAppUserId = appUserID;
    return true;
}

export async function resetRevenueCatSession(): Promise<void> {
    if (!configuredAppUserId || !isRevenueCatSupportedPlatform()) {
        configuredAppUserId = null;
        return;
    }

    try {
        await Purchases.logOut();
    } catch (error) {
        if (__DEV__) {
            console.warn('[RevenueCat] Logout failed.', error);
        }
    } finally {
        configuredAppUserId = null;
    }
}

export async function fetchRevenueCatOfferings(): Promise<PurchasesOfferings> {
    return Purchases.getOfferings();
}

export async function fetchRevenueCatCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
}

export function hasRevenueCatEntitlement(
    customerInfo: CustomerInfo,
    entitlementIdentifier = CREDITS_ENTITLEMENT_IDENTIFIER,
): boolean {
    return customerInfo.entitlements.active[entitlementIdentifier]?.isActive === true;
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases();
}

export async function purchaseRevenueCatPackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult> {
    return Purchases.purchasePackage(aPackage);
}

export async function presentRevenueCatPaywall(): Promise<PAYWALL_RESULT> {
    return RevenueCatUI.presentPaywall({ displayCloseButton: true });
}

export async function presentRevenueCatPaywallIfNeeded(
    entitlementIdentifier = CREDITS_ENTITLEMENT_IDENTIFIER,
): Promise<PAYWALL_RESULT> {
    return RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: entitlementIdentifier,
        displayCloseButton: true,
    });
}

export async function presentRevenueCatCustomerCenter(): Promise<void> {
    return RevenueCatUI.presentCustomerCenter();
}
