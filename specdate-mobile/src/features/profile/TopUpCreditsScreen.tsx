import React, { useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { fetchCreditProducts, grantCredits, refreshCreditState, type CreditProduct } from '../../services/credits';
import {
  configureRevenueCatForUser,
  fetchRevenueCatCustomerInfo,
  fetchRevenueCatOfferings,
  hasRevenueCatEntitlement,
  hasRevenueCatApiKey,
  isRevenueCatSupportedPlatform,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '../../services/revenueCat';
import { useUser } from '../../hooks/useUser';

type PackRow = {
  product: CreditProduct;
  rcPackage: PurchasesPackage | null;
};

function purchaseErrorMessage(error: any): string {
  if (error?.userCancelled) {
    return 'Purchase cancelled.';
  }
  return error?.response?.data?.message || error?.message || 'Purchase failed. Please try again.';
}

function packageForProduct(packages: PurchasesPackage[], productId: string): PurchasesPackage | null {
  return packages.find((item) => item.product.identifier === productId || item.identifier === productId) ?? null;
}

export default function TopUpCreditsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['credit-products'],
    queryFn: fetchCreditProducts,
    staleTime: 5 * 60 * 1000,
  });

  const revenueCatReady = isRevenueCatSupportedPlatform() && hasRevenueCatApiKey() && user?.id != null;

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat-offerings', user?.id],
    enabled: revenueCatReady,
    queryFn: async () => {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is not configured for this build.');
      }
      return fetchRevenueCatOfferings();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat-customer-info', user?.id],
    enabled: revenueCatReady,
    queryFn: async () => {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is not configured for this build.');
      }
      return fetchRevenueCatCustomerInfo();
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const availablePackages = offeringsQuery.data?.current?.availablePackages ?? [];
  const rows = useMemo<PackRow[]>(() => (
    (productsQuery.data ?? []).map((product) => ({
      product,
      rcPackage: packageForProduct(availablePackages, product.product_id),
    }))
  ), [availablePackages, productsQuery.data]);

  const syncRevenueCatTransactions = async () => {
    const customerInfo = await fetchRevenueCatCustomerInfo();
    const products = productsQuery.data ?? [];
    const knownProductIds = new Set(products.map((product) => product.product_id));
    const packagesByProductId = new Map(availablePackages.map((item) => [item.product.identifier, item]));
    const transactions = customerInfo.nonSubscriptionTransactions.filter((transaction) => (
      knownProductIds.has(transaction.productIdentifier)
    ));

    let synced = 0;
    for (const transaction of transactions) {
      const rcPackage = packagesByProductId.get(transaction.productIdentifier);
      await grantCredits({
        product_id: transaction.productIdentifier,
        revenue_cat_transaction_id: transaction.transactionIdentifier,
        platform: Platform.OS,
        currency: rcPackage?.product.currencyCode ?? null,
        amount: rcPackage?.product.price ?? null,
      });
      synced += 1;
    }

    await refreshCreditState(queryClient);
    await customerInfoQuery.refetch();
    return synced;
  };

  const handlePurchase = async (row: PackRow) => {
    if (!row.rcPackage) {
      Alert.alert('Unavailable', 'This credit pack is not available from RevenueCat yet.');
      return;
    }

    setBusyProductId(row.product.product_id);
    try {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is missing its public SDK key for this platform.');
      }

      const result = await purchaseRevenueCatPackage(row.rcPackage);
      const transactionId = result.transaction?.transactionIdentifier;
      if (!transactionId) {
        throw new Error('The purchase completed, but no transaction id was returned.');
      }

      const product = row.rcPackage.product;
      const grant = await grantCredits({
        product_id: row.product.product_id,
        revenue_cat_transaction_id: transactionId,
        platform: Platform.OS,
        currency: product.currencyCode,
        amount: product.price,
      });

      await refreshCreditState(queryClient);
      await customerInfoQuery.refetch();
      Alert.alert('Credits added', grant.message || `${row.product.quantity} credits added.`);
    } catch (error: any) {
      const message = purchaseErrorMessage(error);
      if (message !== 'Purchase cancelled.') {
        Alert.alert('Purchase failed', message);
      }
    } finally {
      setBusyProductId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is missing its public SDK key for this platform.');
      }

      const customerInfo = await restoreRevenueCatPurchases();
      await customerInfoQuery.refetch();
      const granted = await syncRevenueCatTransactions();
      Alert.alert(
        'Restore complete',
        granted > 0 || customerInfo.nonSubscriptionTransactions.length > 0
          ? 'Restored purchases were checked against your credit balance.'
          : 'No restorable credit purchases were found for this account.',
      );
    } catch (error: any) {
      Alert.alert('Restore failed', purchaseErrorMessage(error));
    } finally {
      setRestoring(false);
    }
  };

  const handleRevenueCatPaywall = async () => {
    setRestoring(true);
    try {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is missing its public SDK key for this platform.');
      }

      await presentRevenueCatPaywall();
      const synced = await syncRevenueCatTransactions();
      if (synced > 0) {
        Alert.alert('Credits checked', 'Your RevenueCat purchases were synced with your DateUsher balance.');
      }
    } catch (error: any) {
      Alert.alert('Paywall unavailable', purchaseErrorMessage(error));
    } finally {
      setRestoring(false);
    }
  };

  const handleCustomerCenter = async () => {
    try {
      const configured = await configureRevenueCatForUser(user?.id);
      if (!configured) {
        throw new Error('RevenueCat is missing its public SDK key for this platform.');
      }
      await presentRevenueCatCustomerCenter();
      await customerInfoQuery.refetch();
    } catch (error: any) {
      Alert.alert('Customer Center unavailable', purchaseErrorMessage(error));
    }
  };

  const refreshing = productsQuery.isRefetching || offeringsQuery.isRefetching;
  const loading = productsQuery.isLoading || (revenueCatReady && offeringsQuery.isLoading);
  const configMessage = !isRevenueCatSupportedPlatform()
    ? 'Credit purchases are available in iOS and Android builds.'
    : !hasRevenueCatApiKey()
      ? 'RevenueCat public SDK keys are not set for this build yet.'
      : null;
  const creditsEntitlementActive = customerInfoQuery.data
    ? hasRevenueCatEntitlement(customerInfoQuery.data)
    : false;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Top up credits</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              productsQuery.refetch();
              if (revenueCatReady) {
                offeringsQuery.refetch();
              }
            }}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Surface style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]} elevation={0}>
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons name="star-four-points" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>Current balance</Text>
            <Text style={styles.balanceHint}>1 credit creates 1 spec</Text>
          </View>
          <Text style={styles.balanceAmount}>{user?.balance?.credits ?? 0}</Text>
        </Surface>

        {configMessage && (
          <Surface style={[styles.notice, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
            <Text style={{ color: theme.colors.onErrorContainer }}>{configMessage}</Text>
          </Surface>
        )}

        {__DEV__ && revenueCatReady && (
          <Surface style={[styles.notice, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              RevenueCat Credits entitlement: {creditsEntitlementActive ? 'active' : 'inactive'}
            </Text>
          </Surface>
        )}

        <View style={styles.packList}>
          {loading ? (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading credit packs...</Text>
            </Surface>
          ) : rows.length === 0 ? (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No credit packs are available yet.</Text>
            </Surface>
          ) : rows.map((row) => {
            const price = row.rcPackage?.product.priceString ?? 'Unavailable';
            const isBusy = busyProductId === row.product.product_id;
            return (
              <Surface key={row.product.product_id} style={[styles.packCard, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                <View style={styles.packMain}>
                  <View style={[styles.packIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.packCopy}>
                    <Text style={[styles.packTitle, { color: theme.colors.onSurface }]}>
                      {row.product.name || `${row.product.quantity} Credits`}
                    </Text>
                    <Text style={[styles.packSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                      {row.product.quantity} credit{row.product.quantity === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  compact
                  disabled={!row.rcPackage || Boolean(busyProductId)}
                  loading={isBusy}
                  onPress={() => handlePurchase(row)}
                  style={styles.buyButton}
                >
                  {price}
                </Button>
              </Surface>
            );
          })}
        </View>

        <Button
          mode="outlined"
          icon="restore"
          disabled={!revenueCatReady || restoring || Boolean(busyProductId)}
          loading={restoring}
          onPress={handleRestore}
          style={styles.restoreButton}
        >
          Restore purchases
        </Button>

        <Button
          mode="outlined"
          icon="storefront-outline"
          disabled={!revenueCatReady || restoring || Boolean(busyProductId)}
          onPress={handleRevenueCatPaywall}
          style={styles.restoreButton}
        >
          Open RevenueCat paywall
        </Button>

        <Button
          mode="text"
          icon="account-cog-outline"
          disabled={!revenueCatReady}
          onPress={handleCustomerCenter}
        >
          Customer Center
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  balanceCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCopy: {
    flex: 1,
  },
  balanceLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  balanceHint: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 34,
  },
  notice: {
    borderRadius: 14,
    padding: 14,
  },
  packList: {
    gap: 10,
  },
  packCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  packMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packCopy: {
    flex: 1,
  },
  packTitle: {
    fontWeight: '800',
    fontSize: 16,
  },
  packSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  buyButton: {
    borderRadius: 999,
    minWidth: 104,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  restoreButton: {
    borderRadius: 14,
  },
});
