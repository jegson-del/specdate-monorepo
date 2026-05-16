import React from 'react';
import { View } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { styles } from '../createSpecStyles';

type Props = {
    title: string;
    children: React.ReactNode;
    strict?: boolean;
    onStrictChange?: (value: boolean) => void;
};

export function CreateSpecRequirementBlock({ title, children, strict, onStrictChange }: Props) {
    const theme = useTheme();
    const showStrict = typeof strict === 'boolean' && onStrictChange;

    return (
        <View style={styles.reqBlock}>
            <View style={showStrict ? styles.reqHeader : styles.reqHeaderCompact}>
                <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>
                    {title}
                </Text>
                {showStrict ? (
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>
                            Strict?
                        </Text>
                        <Switch value={strict} onValueChange={onStrictChange} />
                    </View>
                ) : null}
            </View>
            {children}
        </View>
    );
}
