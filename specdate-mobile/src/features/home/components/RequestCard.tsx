import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toImageUri } from '../../../utils/imageUrl';

type RequestCardProps = {
    item: any;
    onAccept: (specId: string, applicationId: string) => void;
    onReject: (specId: string, applicationId: string) => void;
    isProcessing: boolean;
};

export default function RequestCard({ item, onAccept, onReject, isProcessing }: RequestCardProps) {
    const theme = useTheme();
    const applicant = item.user;
    const spec = item.spec;

    const avatarUrl = toImageUri(applicant.profile?.avatar);
    const age = applicant.profile?.age ?? '??';

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Avatar.Image
                        size={48}
                        source={{ uri: avatarUrl || undefined }}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.name}>
                            {applicant.profile?.full_name || applicant.name}
                            <Text style={styles.age}>  {age}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <MaterialCommunityIcons name="arrow-right-bottom" size={16} color={theme.colors.primary} />
                            <Text style={[styles.specTitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                Applying to "{spec.title}"
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <Button
                    mode="outlined"
                    onPress={() => onReject(spec.id, item.id)}
                    style={{ flex: 1, borderColor: theme.colors.error }}
                    textColor={theme.colors.error}
                    disabled={isProcessing}
                >
                    Decline
                </Button>
                <View style={{ width: 12 }} />
                <Button
                    mode="contained"
                    onPress={() => onAccept(spec.id, item.id)}
                    style={{ flex: 1 }}
                    buttonColor={theme.colors.primary}
                    disabled={isProcessing}
                >
                    Accept
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    header: {
        marginBottom: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    age: {
        fontWeight: '400',
        opacity: 0.7,
    },
    specTitle: {
        fontSize: 14,
        marginLeft: 4,
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
    },
});
