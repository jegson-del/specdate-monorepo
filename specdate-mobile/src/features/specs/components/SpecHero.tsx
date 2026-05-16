import React from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, IconButton, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type SpecHeroProps = {
    canEdit: boolean;
    headerLine: string;
    insetsTop: number;
    onBack: () => void;
    onEdit: () => void;
    onOpenCreatorProfile: () => void;
    ownerAvatar: string;
    ownerName: string;
    specStatus: string;
    specTitle: string;
    specTone: {
        label: string;
        backgroundColor: string;
        textColor: string;
    };
};

export function SpecHero({
    canEdit,
    headerLine,
    insetsTop,
    onBack,
    onEdit,
    onOpenCreatorProfile,
    ownerAvatar,
    ownerName,
    specStatus,
    specTitle,
    specTone,
}: SpecHeroProps) {
    return (
        <View style={styles.heroWrap}>
            <ImageBackground
                source={{ uri: ownerAvatar }}
                style={styles.hero}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFillObject}
                />

                <IconButton
                    icon="arrow-left"
                    iconColor="#FFFFFF"
                    style={[styles.backButton, { top: insetsTop + 12 }]}
                    onPress={onBack}
                />

                {canEdit ? (
                    <IconButton
                        icon="pencil"
                        iconColor="#FFFFFF"
                        style={[styles.editButton, { top: insetsTop + 12 }]}
                        onPress={onEdit}
                    />
                ) : null}

                <View style={styles.heroContent}>
                    <View style={styles.ownerInfoMinimal}>
                        <TouchableOpacity
                            onPress={onOpenCreatorProfile}
                            style={styles.ownerAvatarWrap}
                            activeOpacity={0.7}
                            hitSlop={12}
                        >
                            <Avatar.Image size={40} source={{ uri: ownerAvatar }} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onOpenCreatorProfile}
                            style={styles.ownerTextWrap}
                            activeOpacity={0.7}
                            hitSlop={8}
                        >
                            <View style={styles.ownerInfoText}>
                                <Text style={styles.ownerLabel}>Created by</Text>
                                <Text style={styles.ownerNameMinimal} numberOfLines={1}>
                                    {ownerName}
                                </Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={20}
                                color="rgba(255,255,255,0.7)"
                                style={styles.ownerChevron}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.heroTitle}>{specTitle}</Text>

                    <View style={styles.statusRow}>
                        {specStatus !== 'OPEN' ? (
                            <View style={[styles.statusBadge, { backgroundColor: specTone.backgroundColor }]}>
                                <Text style={[styles.statusBadgeText, { color: specTone.textColor }]}>{specTone.label}</Text>
                            </View>
                        ) : null}
                    </View>

                    {headerLine ? (
                        <View style={styles.heroMetaRow}>
                            <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.heroMetaText} numberOfLines={1}>
                                {headerLine}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    heroWrap: { height: 380 },
    hero: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    backButton: {
        position: 'absolute',
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        marginTop: 0,
    },
    editButton: {
        position: 'absolute',
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        margin: 0,
    },
    heroContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 16,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        marginTop: 4,
    },
    heroMetaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    ownerInfoMinimal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingRight: 4,
    },
    ownerAvatarWrap: {
        padding: 4,
    },
    ownerTextWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
    },
    ownerInfoText: {
        gap: 2,
        flex: 1,
        minWidth: 0,
    },
    ownerLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ownerNameMinimal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        maxWidth: 200,
    },
    ownerChevron: {
        marginLeft: 'auto',
        opacity: 0.7,
    },
});
