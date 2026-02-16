import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type SpecCardItem = {
    id: string;
    title: string;
    owner: string;
    expiresIn: string;
    joinCount: number;
    maxParticipants: number;
    eliminatedCount: number;
    firstDateProvider: string;
    likesCount: number;
    tag: 'LIVE' | 'ONGOING' | 'POPULAR' | 'HOTTEST';
    ownerAvatar?: string;
};

type Props = {
    item: SpecCardItem;
    theme: any;
    homeColors: any;
    tagColor: (tag: string) => string;
    withAlpha: (color: string, alpha: number) => string;
    onPress?: () => void;
};

const SpecCard = memo(({ item, theme, homeColors, tagColor, withAlpha, onPress }: Props) => {
    const navigation = useNavigation<any>();

    const handlePressProvider = (e: any) => {
        e?.stopPropagation?.();
        navigation.navigate('Providers', { specId: item.id });
    };

    const handlePress = () => {
        if (onPress) onPress();
        else navigation.navigate('SpecDetails', { specId: item.id });
    };

    return (
        <View style={styles.cardWrap}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
                <Surface
                    style={[
                        styles.card,
                        {
                            backgroundColor: homeColors.cardBg,
                            borderWidth: 1,
                            borderColor: theme.colors.outline,
                        },
                    ]}
                    elevation={1}
                >
                    <View style={styles.cardContent}>
                        {/* Media */}
                        <View style={styles.cardMedia}>
                            <ImageBackground
                                source={{ uri: item.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.owner || 'User')}&size=512&background=random` }}
                                style={StyleSheet.absoluteFillObject}
                                imageStyle={styles.cardMediaImage}
                                resizeMode="cover"
                            />
                            <View style={[styles.tagPill, { backgroundColor: tagColor(item.tag) }]}>
                                <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{item.tag}</Text>
                            </View>
                            {/* Owner tag (glass) – anchored to image */}
                            <View style={styles.ownerOverlay}>
                                <View style={[styles.ownerGlass, { paddingLeft: 4, paddingVertical: 4 }]}>
                                    {item.ownerAvatar ? (
                                        <Image
                                            source={{ uri: item.ownerAvatar }}
                                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee' }}
                                        />
                                    ) : (
                                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialCommunityIcons name="account" size={14} color="rgba(255,255,255,0.95)" />
                                        </View>
                                    )}
                                    <Text style={[styles.ownerGlassText, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 }]} numberOfLines={1} ellipsizeMode="tail">
                                        {item.owner}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Body */}
                        <View style={styles.cardBody}>
                            <Text style={[styles.cardTitle, { color: homeColors.cardText }]} numberOfLines={2}>
                                {item.title}
                            </Text>

                            {/* Meta Rows */}
                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                                <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                                    {(item.title.split('•')[1] || 'Location').trim()}
                                </Text>
                            </View>

                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="account-group" size={16} color={theme.colors.primary} />
                                <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                                    {item.joinCount}/{item.maxParticipants} participants
                                </Text>
                            </View>

                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="balloon" size={16} color={theme.colors.primary} />
                                <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                                    {item.eliminatedCount} eliminated
                                </Text>
                            </View>

                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={theme.colors.primary} />
                                <TouchableOpacity
                                    onPress={handlePressProvider}
                                    style={{ flex: 1 }}
                                    hitSlop={8}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                                        First date: {item.firstDateProvider === '—' ? 'Choose provider' : item.firstDateProvider}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.metaRow}>
                                <MaterialCommunityIcons name="timer-sand" size={16} color={theme.colors.primary} />
                                <Text style={[styles.metaText, { color: homeColors.cardSubtext }]} numberOfLines={1}>
                                    {item.expiresIn}
                                </Text>
                                {typeof item.likesCount === 'number' && item.likesCount > 0 ? (
                                    <View style={styles.likesInline}>
                                        <MaterialCommunityIcons name="heart" size={14} color="#EF4444" />
                                        <Text style={[styles.likesText, { color: homeColors.cardSubtext }]}>
                                            {item.likesCount}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </Surface>
            </TouchableOpacity>
        </View>
    );
});

export default SpecCard;

const styles = StyleSheet.create({
    cardWrap: {
        flex: 1,
        marginBottom: 16,
        maxWidth: '48%',
        marginHorizontal: '1%',
    },
    card: {
        borderRadius: 16,
        backgroundColor: '#FFFFFF', // ensure bg color on Surface for shadow
    },
    cardContent: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardMedia: {
        height: 124,
        backgroundColor: '#eee',
        position: 'relative',
    },
    cardMediaImage: {
        width: '100%',
        height: '100%',
    },
    tagPill: {
        position: 'absolute',
        top: 8,
        right: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    ownerOverlay: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 8,
    },
    ownerGlass: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(40,40,40,0.35)', // greyish glass
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        maxWidth: '92%',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    ownerGlassText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    cardBody: { padding: 10, gap: 6 },
    cardTitle: {
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 18,
        marginBottom: 4,
        height: 36, // Fixed height for 2 lines
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 11,
        flex: 1,
        minWidth: 0,
    },
    likesInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    likesText: {
        fontSize: 11,
        fontWeight: '900',
    }
});
