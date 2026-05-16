import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../profileScreenStyles';

export type ProfileWalletSectionProps = {
    credits: number;
    onTransactionsPress: () => void;
    onTopUpPress: () => void;
};

export function ProfileWalletSection({ credits, onTransactionsPress, onTopUpPress }: ProfileWalletSectionProps) {
    const theme = useTheme();

    return (
        <Surface style={[styles.walletSection, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <View style={styles.walletHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary, marginBottom: 0 }]}>
                    Wallet
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                        onPress={onTransactionsPress}
                        style={[styles.walletTopUp, { backgroundColor: theme.colors.primaryContainer }]}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="history" size={18} color={theme.colors.primary} />
                        <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 6 }}>
                            Transactions
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onTopUpPress}
                        style={[styles.walletTopUp, { backgroundColor: theme.colors.primaryContainer }]}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus-circle" size={18} color={theme.colors.primary} />
                        <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 6 }}>
                            Buy credits
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.walletRow}>
                <View style={[styles.walletCard, { backgroundColor: theme.colors.primary }]}>
                    <View style={styles.walletBalanceRow}>
                        <View style={styles.walletCoinWrap}>
                            <Image
                                source={require('../../../../assets/specdate_coin.png')}
                                style={styles.walletCoin}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.walletBalanceCopy}>
                            <Text style={styles.walletBalanceLabel}>Credit balance</Text>
                            <Text style={styles.walletBalanceHint}>1 credit creates 1 spec</Text>
                        </View>
                        <Text style={styles.walletAmount}>{credits}</Text>
                    </View>
                </View>
            </View>
        </Surface>
    );
}
