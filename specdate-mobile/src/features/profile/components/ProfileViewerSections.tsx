import React from 'react';
import { View } from 'react-native';
import { Avatar, Divider, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileImageGrid } from './ProfileImageGrid';
import { cmToFeetInches, getIdealDateIcon } from '../profileViewerUtils';
import { styles } from '../profileViewerStyles';

export function PublicProfileHeader({
    avatarUri,
    displayName,
    accountUsername,
    location,
    age,
}: {
    avatarUri: string;
    displayName: string;
    accountUsername?: string | null;
    location: string;
    age: number | null;
}) {
    const theme = useTheme();
    const hasLocation = location !== '-';

    return (
        <View style={styles.header}>
            <Avatar.Image
                size={120}
                source={{ uri: avatarUri }}
                style={{ backgroundColor: theme.colors.surfaceVariant }}
            />
            <Text variant="headlineMedium" style={[styles.nameText, { color: theme.colors.onSurface }]}>
                {displayName}
            </Text>
            {accountUsername ? (
                <Text variant="bodyMedium" style={[styles.usernameText, { color: theme.colors.onSurfaceVariant }]}>
                    {accountUsername}
                </Text>
            ) : null}
            <View style={styles.headerMeta}>
                {hasLocation && (
                    <>
                        <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {location}
                        </Text>
                    </>
                )}
                {age != null && (
                    <>
                        {hasLocation && <Text style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 8 }}>-</Text>}
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {age} y/o
                        </Text>
                    </>
                )}
                {!hasLocation && age == null && (
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        No location or age set
                    </Text>
                )}
            </View>
        </View>
    );
}

export function ProfileActivitySection({
    specsCreated,
    specsParticipated,
    datesCount,
}: {
    specsCreated: number;
    specsParticipated: number;
    datesCount: number;
}) {
    const theme = useTheme();

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Activity
            </Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <View style={[styles.statIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="clipboard-edit-outline" size={22} color={theme.colors.primary} />
                    </View>
                    <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                        {specsCreated}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Specs created</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
                <View style={styles.statItem}>
                    <View style={[styles.statIconWrap, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <MaterialCommunityIcons name="account-group" size={22} color={theme.colors.secondary} />
                    </View>
                    <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                        {specsParticipated}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Participated</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
                <View style={styles.statItem}>
                    <View style={[styles.statIconWrap, { backgroundColor: theme.colors.elevation.level2 }]}>
                        <MaterialCommunityIcons name="heart" size={22} color={theme.colors.primary} />
                    </View>
                    <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                        {datesCount}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Dates</Text>
                </View>
            </View>
        </Surface>
    );
}

export function PublicProfilePhotosSection({
    images,
    imagesFilled,
    onImagePress,
}: {
    images: (string | null)[];
    imagesFilled: string[];
    onImagePress: (index: number) => void;
}) {
    const theme = useTheme();

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Photos
            </Text>
            {imagesFilled.length > 0 ? (
                <>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                        {imagesFilled.length} photo{imagesFilled.length !== 1 ? 's' : ''}
                    </Text>
                    <ProfileImageGrid images={images} maxSlots={6} readOnly onImagePress={onImagePress} />
                </>
            ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    No photos yet
                </Text>
            )}
        </Surface>
    );
}

export function ProfileAboutSection({ profile }: { profile: any }) {
    const theme = useTheme();
    const hasAbout = profile?.occupation || profile?.job_title || profile?.qualification || profile?.religion;
    if (!hasAbout) return null;

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                About
            </Text>
            {profile?.occupation && <InfoRow icon="briefcase" label={profile.occupation} />}
            {profile?.job_title && <InfoRow icon="briefcase-account" label={profile.job_title} />}
            {profile?.qualification && <InfoRow icon="school" label={profile.qualification} />}
            {profile?.religion && <InfoRow icon="book-open-variant" label={profile.religion} />}
        </Surface>
    );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
    const theme = useTheme();

    return (
        <View style={styles.infoRow}>
            <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
                {label}
            </Text>
        </View>
    );
}

export function ProfileBioSection({ hobbies }: { hobbies?: string | null }) {
    const theme = useTheme();
    if (!hobbies) return null;

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Bio / Hobbies
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                {hobbies}
            </Text>
        </Surface>
    );
}

export function ProfileIdealDatesSection({ idealDates }: { idealDates: string[] }) {
    const theme = useTheme();
    if (idealDates.length === 0) return null;

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Ideal Dates
            </Text>
            <View style={styles.idealDateGrid}>
                {idealDates.map((date) => (
                    <View
                        key={date}
                        style={[
                            styles.idealDateChip,
                            {
                                backgroundColor: theme.colors.primaryContainer,
                                borderColor: theme.colors.primary + '33',
                            },
                        ]}
                    >
                        <MaterialCommunityIcons name={getIdealDateIcon(date) as any} size={17} color={theme.colors.primary} />
                        <Text style={[styles.idealDateText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {date}
                        </Text>
                    </View>
                ))}
            </View>
        </Surface>
    );
}

export function ProfileLifestyleSection({ profile }: { profile: any }) {
    const theme = useTheme();

    return (
        <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Lifestyle
            </Text>
            <LifestyleRow icon="smoking" label="Smoker" value={profile?.is_smoker ? 'Yes' : 'No'} />
            <Divider style={styles.divider} />
            <LifestyleRow icon="glass-cocktail" label="Drinking" value={profile?.drinking || 'No'} capitalize />
            <Divider style={styles.divider} />
            <LifestyleRow icon="pill" label="Drug Use" value={profile?.is_drug_user ? 'Yes' : 'No'} />
            {profile?.height != null && (
                <>
                    <Divider style={styles.divider} />
                    <LifestyleRow
                        icon="human-male-height"
                        label="Height"
                        value={`${profile.height} cm (${cmToFeetInches(profile.height)})`}
                    />
                </>
            )}
        </Surface>
    );
}

function LifestyleRow({
    icon,
    label,
    value,
    capitalize = false,
}: {
    icon: string;
    label: string;
    value: string;
    capitalize?: boolean;
}) {
    const theme = useTheme();

    return (
        <View style={styles.lifestyleRow}>
            <View style={styles.lifestyleLabel}>
                <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    {label}
                </Text>
            </View>
            <Text
                variant="bodyLarge"
                style={{
                    color: theme.colors.onSurfaceVariant,
                    textTransform: capitalize ? 'capitalize' : 'none',
                }}
            >
                {value}
            </Text>
        </View>
    );
}
