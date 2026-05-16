import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { requirementIcon } from '../specDetailsUtils';

type SpecRequirementsListProps = {
    requirements: any[];
    theme: any;
};

export function SpecRequirementsList({ requirements, theme }: SpecRequirementsListProps) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Requirements</Text>
                <Chip compact style={{ backgroundColor: theme.colors.elevation.level2 }}>
                    {requirements.length} set
                </Chip>
            </View>

            {requirements.length === 0 ? (
                <Text style={{ color: theme.colors.onSurface, opacity: 0.65 }}>No requirements set.</Text>
            ) : (
                <View style={styles.reqGrid}>
                    {requirements.map((requirement: any) => (
                        <Surface
                            key={requirement.id}
                            style={[
                                styles.reqCard,
                                {
                                    width: requirement.isLong ? '100%' : '48%',
                                    borderColor: requirement.isCompulsory ? theme.colors.primary : theme.colors.outline,
                                    backgroundColor: theme.colors.surface,
                                },
                            ]}
                            elevation={0}
                        >
                            <View style={styles.reqCardTop}>
                                <View style={[styles.reqIconCircle, { backgroundColor: theme.colors.elevation.level2 }]}>
                                    <MaterialCommunityIcons
                                        name={requirementIcon(requirement.field) as any}
                                        size={18}
                                        color={requirement.isCompulsory ? theme.colors.primary : theme.colors.onSurface}
                                    />
                                </View>
                                <Chip
                                    compact
                                    style={{
                                        backgroundColor: requirement.isCompulsory
                                            ? theme.colors.primary
                                            : theme.colors.elevation.level2,
                                    }}
                                    textStyle={{
                                        color: requirement.isCompulsory ? theme.colors.onPrimary : theme.colors.onSurface,
                                        fontWeight: '900',
                                        fontSize: 11,
                                    }}
                                >
                                    {requirement.isCompulsory ? 'Strict' : 'Flexible'}
                                </Chip>
                            </View>

                            <Text style={[styles.reqField, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                {requirement.fieldLabel}
                            </Text>
                            {(requirement.kind === 'chips' && Array.isArray(requirement.valueParts) && requirement.valueParts.length > 0) ? (
                                <View style={styles.reqValueStack}>
                                    <Text style={[styles.reqOp, { color: theme.colors.onSurface, opacity: 0.72 }]}>
                                        One of
                                    </Text>
                                    <View style={styles.reqPillsRow}>
                                        {requirement.valueParts.map((value: string) => (
                                            <Chip
                                                key={value}
                                                compact
                                                style={{ backgroundColor: theme.colors.elevation.level2 }}
                                                textStyle={{ fontSize: 11, fontWeight: '800', color: theme.colors.onSurface }}
                                            >
                                                {value}
                                            </Chip>
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                <Text style={[styles.reqValue, { color: theme.colors.onSurface, opacity: 0.82 }]}>
                                    {requirement.valueText}
                                </Text>
                            )}
                        </Surface>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900' },
    reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    reqCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        gap: 6,
    },
    reqCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reqIconCircle: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    reqField: { fontSize: 12, fontWeight: '900' },
    reqValue: { fontSize: 11, fontWeight: '700' },
    reqValueStack: { gap: 8 },
    reqOp: { fontSize: 11, fontWeight: '800' },
    reqPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
