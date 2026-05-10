import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Text, Button, IconButton, useTheme, ActivityIndicator, TextInput, Modal, Portal } from 'react-native-paper';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateVoucherItem, VoucherService } from '../../services/vouchers';
const statusCopy: Record<string, { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; body: string }> = {
    redeemed: {
        title: 'Voucher already redeemed',
        icon: 'check-decagram',
        color: '#16A34A',
        body: 'This voucher has already been used. There is no further action needed.',
    },
    cancelled: {
        title: 'Voucher cancelled',
        icon: 'calendar-remove-outline',
        color: '#64748B',
        body: 'This voucher is cancelled and cannot be redeemed.',
    },
    completed: {
        title: 'Date completed',
        icon: 'check-circle-outline',
        color: '#16A34A',
        body: 'This date has already been completed.',
    },
    expired: {
        title: 'Voucher expired',
        icon: 'timer-off-outline',
        color: '#7C3AED',
        body: 'This voucher has expired and cannot be redeemed.',
    },
    rejected: {
        title: 'Voucher rejected',
        icon: 'close-circle-outline',
        color: '#EF4444',
        body: 'This voucher request was rejected and cannot be redeemed.',
    },
    pending_provider: {
        title: 'Booking pending',
        icon: 'calendar-clock',
        color: '#F59E0B',
        body: 'This booking still needs provider approval before redemption.',
    },
};

export default function QRScannerScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [pendingCode, setPendingCode] = useState('');
    const [spendModalVisible, setSpendModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [scanResult, setScanResult] = useState<DateVoucherItem | null>(null);
    const [totalSpent, setTotalSpent] = useState('');

    if (!permission) {
        // Camera permissions are still loading
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} mode="contained">Grant Permission</Button>
            </View>
        );
    }

    const redeemCode = async (code: string) => {
        if (scanned || loading) return;

        const trimmed = code.trim();
        if (!trimmed) return;
        setScanned(true);
        setLoading(true);
        try {
            const preview = await VoucherService.previewProviderScan(trimmed);
            const voucher = preview.data;
            setScanResult(voucher);
            if (voucher.status === 'active') {
                setPendingCode(trimmed);
                setSpendModalVisible(true);
            } else {
                setStatusModalVisible(true);
            }
        } catch (error: any) {
            Alert.alert('Voucher not found', error?.response?.data?.message || 'Invalid voucher code.', [
                { text: 'Try Again', onPress: resetPendingRedemption },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const resetPendingRedemption = () => {
        setSpendModalVisible(false);
        setStatusModalVisible(false);
        setScanResult(null);
        setPendingCode('');
        setTotalSpent('');
        setScanned(false);
        setLoading(false);
    };

    const submitRedemption = async (amount?: number | null) => {
        if (!pendingCode || loading) return;

        setLoading(true);

        try {
            const response = await api.post('/provider/scan-qr', { code: pendingCode, total_spent: amount ?? null });
            setSpendModalVisible(false);
            setTotalSpent('');
            setScanResult(response.data?.data ?? null);

            Alert.alert(
                'Success!',
                'Voucher redeemed successfully.',
                [
                    { text: 'Scan Another', onPress: () => { setPendingCode(''); setScanned(false); setLoading(false); } },
                    { text: 'Done', onPress: () => navigation.goBack() }
                ]
            );
        } catch (error: any) {
            console.error('Scan error:', error);
            const message = error.response?.data?.message || 'Invalid voucher code.';
            Alert.alert(
                'Error',
                message,
                [{ text: 'Try Again', onPress: resetPendingRedemption }]
            );
        }
    };

    const submitSpend = () => {
        const cleaned = totalSpent.replace(/[^0-9.]/g, '');
        submitRedemption(cleaned ? Number(cleaned) : null);
    };

    const handleBarCodeScanned = async ({ data }: any) => {
        redeemCode(data);
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            {/* Overlay */}
            <View style={StyleSheet.absoluteFillObject}>
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <IconButton icon="arrow-left" iconColor="#fff" size={30} onPress={() => navigation.goBack()} />
                    <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>Scan Voucher QR</Text>
                    <View style={{ width: 48 }} />
                </View>

                <View style={styles.centerRegion}>
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />
                        {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={StyleSheet.absoluteFillObject} />}
                    </View>
                    <Text style={{ color: '#fff', marginTop: 20, textAlign: 'center', opacity: 0.8 }}>
                        Align the QR code within the frame
                    </Text>
                    <View style={styles.manualCard}>
                        <TextInput
                            mode="outlined"
                            label="Voucher code"
                            value={manualCode}
                            onChangeText={(value) => setManualCode(value.toUpperCase())}
                            autoCapitalize="characters"
                            style={styles.manualInput}
                            dense
                        />
                        <Button
                            mode="contained"
                            disabled={!manualCode.trim() || loading}
                            loading={loading}
                            onPress={() => redeemCode(manualCode.trim())}
                        >
                            Confirm code
                        </Button>
                    </View>
                </View>
            </View>
            <Portal>
                <Modal
                    visible={statusModalVisible}
                    onDismiss={resetPendingRedemption}
                    contentContainerStyle={[styles.spendModal, { backgroundColor: theme.colors.surface }]}
                >
                    {(() => {
                        const status = scanResult?.status || 'unknown';
                        const copy = statusCopy[status] ?? {
                            title: 'Voucher unavailable',
                            icon: 'information-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
                            color: theme.colors.primary,
                            body: 'This voucher cannot be redeemed right now.',
                        };
                        return (
                            <>
                                <View style={[styles.spendIcon, { backgroundColor: `${copy.color}18` }]}>
                                    <MaterialCommunityIcons name={copy.icon} size={28} color={copy.color} />
                                </View>
                                <Text style={[styles.spendTitle, { color: theme.colors.onSurface }]}>{copy.title}</Text>
                                <Text style={[styles.spendText, { color: theme.colors.onSurfaceVariant }]}>{copy.body}</Text>
                                {scanResult ? (
                                    <View style={[styles.statusDetails, { borderColor: theme.colors.outlineVariant || theme.colors.outline }]}>
                                        <Text style={[styles.statusLine, { color: theme.colors.onSurface }]}>
                                            {scanResult.provider?.name || 'Provider'} - {scanResult.discount_percentage}% off
                                        </Text>
                                        <Text style={[styles.statusSubLine, { color: theme.colors.onSurfaceVariant }]}>
                                            Voucher {scanResult.voucher_code}
                                        </Text>
                                        {scanResult.redeemed_at ? (
                                            <Text style={[styles.statusSubLine, { color: theme.colors.onSurfaceVariant }]}>
                                                Redeemed {new Date(scanResult.redeemed_at).toLocaleString()}
                                            </Text>
                                        ) : null}
                                        {scanResult.total_spent != null ? (
                                            <Text style={[styles.statusSubLine, { color: theme.colors.onSurfaceVariant }]}>
                                                Spend recorded: NGN {Number(scanResult.total_spent).toLocaleString()}
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : null}
                                <Button mode="contained" onPress={() => navigation.goBack()} style={styles.fullButton}>
                                    Close
                                </Button>
                            </>
                        );
                    })()}
                </Modal>
                <Modal
                    visible={spendModalVisible}
                    onDismiss={loading ? undefined : resetPendingRedemption}
                    contentContainerStyle={[styles.spendModal, { backgroundColor: theme.colors.surface }]}
                >
                    <View style={styles.spendIcon}>
                        <MaterialCommunityIcons name="cash-register" size={26} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.spendTitle, { color: theme.colors.onSurface }]}>Total spent on this visit</Text>
                    <Text style={[styles.spendText, { color: theme.colors.onSurfaceVariant }]}>
                        Add the total bill for this redeemed voucher. You can skip this if the spend is not available.
                    </Text>
                    <TextInput
                        mode="outlined"
                        label="Total spent"
                        value={totalSpent}
                        onChangeText={(value) => setTotalSpent(value.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        left={<TextInput.Affix text="₦" />}
                        style={{ backgroundColor: theme.colors.surface }}
                    />
                    <View style={styles.spendActions}>
                        <Button mode="outlined" onPress={() => submitRedemption(null)} disabled={loading} style={styles.spendButton}>
                            Skip
                        </Button>
                        <Button mode="contained" onPress={submitSpend} loading={loading} disabled={loading} style={styles.spendButton}>
                            Save & redeem
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    centerRegion: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    scanFrame: {
        width: 260,
        height: 260,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#fff',
        borderWidth: 4,
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    manualCard: {
        width: '100%',
        marginTop: 24,
        padding: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.94)',
        gap: 10,
    },
    manualInput: {
        backgroundColor: '#fff',
    },
    spendModal: {
        margin: 20,
        padding: 20,
        borderRadius: 20,
        gap: 12,
    },
    spendIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(139,92,246,0.12)',
    },
    spendTitle: { fontSize: 18, fontWeight: '900' },
    spendText: { fontSize: 14, lineHeight: 20 },
    spendActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    spendButton: { flex: 1, borderRadius: 12 },
    fullButton: { borderRadius: 12 },
    statusDetails: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 4,
    },
    statusLine: { fontSize: 14, fontWeight: '900' },
    statusSubLine: { fontSize: 12, fontWeight: '700' },
});
