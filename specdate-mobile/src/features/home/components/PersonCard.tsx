import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Avatar, IconButton } from 'react-native-paper';

type PersonItem = {
    id: string;
    name: string;
    age: number;
    city: string;
    occupation: string;
};

type Props = {
    item: PersonItem;
    theme: any;
};

const PersonCard = memo(({ item, theme }: Props) => {
    return (
        <Surface
            style={[styles.personCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            elevation={1}
        >
            <Avatar.Text
                size={44}
                label={(item.name || '?').slice(0, 1).toUpperCase()}
                style={{ backgroundColor: theme.colors.primary }}
                color={theme.colors.onPrimary}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '900' }} numberOfLines={1}>
                    {item.name} • {item.age}
                </Text>
                <Text style={{ color: theme.colors.outline, fontWeight: '700' }} numberOfLines={1}>
                    {item.city} • {item.occupation}
                </Text>
            </View>
            <IconButton icon="chevron-right" size={22} onPress={() => { }} iconColor={theme.colors.primary} />
        </Surface>
    );
});

export default PersonCard;

const styles = StyleSheet.create({
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
});
