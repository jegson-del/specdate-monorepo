import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Text, Button, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QRScannerScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const handleBarCodeScanned = async ({ type, data }: any) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        try {
            // Assuming QR code contains just the code string
            const response = await api.post('/provider/scan-qr', { code: data });

            Alert.alert(
                'Success!',
                `Discount Code: ${data}\nRedeemed successfully!`,
                [
                    { text: 'Scan Another', onPress: () => { setScanned(false); setLoading(false); } },
                    { text: 'Done', onPress: () => navigation.goBack() }
                ]
            );
        } catch (error: any) {
            console.error('Scan error:', error);
            const message = error.response?.data?.message || 'Invalid or already used code.';
            Alert.alert(
                'Error',
                message,
                [{ text: 'Try Again', onPress: () => { setScanned(false); setLoading(false); } }]
            );
        }
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
                    <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>Scan Discount QR</Text>
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
                </View>
            </View>
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
});
