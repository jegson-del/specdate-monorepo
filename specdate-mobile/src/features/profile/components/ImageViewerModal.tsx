import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Image,
    Dimensions,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ImageViewerModalProps = {
    visible: boolean;
    images: string[];
    initialIndex?: number;
    onClose: () => void;
};

/** Full-screen image viewer overlay (swipe between images, close via X). */
export function ImageViewerModal({ visible, images, initialIndex = 0, onClose }: ImageViewerModalProps) {
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            if (images.length > 0) {
                const idx = Math.min(Math.max(0, initialIndex), images.length - 1);
                setTimeout(() => {
                    listRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: false });
                }, 100);
            }
        }
    }, [visible, initialIndex, images.length]);

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (i >= 0 && i < images.length) setCurrentIndex(i);
    };

    if (!visible) return null;

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
                <Text variant="bodyMedium" style={styles.counter}>
                    {currentIndex + 1} / {images.length}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {images.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialCommunityIcons name="image-off" size={64} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.emptyText}>No image</Text>
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={images}
                    style={styles.flatList}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(uri, i) => `${i}-${uri}`}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                    initialScrollIndex={Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1))}
                    renderItem={({ item }) => (
                        <View style={styles.page}>
                            <Image
                                source={{ uri: item }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                />
            )}
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
        backgroundColor: 'rgba(0,0,0,0.96)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    closeBtn: {
        margin: 0,
    },
    flatList: {
        flex: 1,
    },
    counter: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    page: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - 120,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
    },
});
