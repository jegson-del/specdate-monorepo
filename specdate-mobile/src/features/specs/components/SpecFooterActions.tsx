import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Surface } from 'react-native-paper';

type SpecFooterActionsProps = {
    bottomInset: number;
    isOwner: boolean;
    isSpecClosed: boolean;
    joinLoading: boolean;
    myApplication: any;
    onJoin: () => void;
    spec: any;
    specStatus: string;
    theme: any;
};

export function SpecFooterActions({
    bottomInset,
    isOwner,
    isSpecClosed,
    joinLoading,
    myApplication,
    onJoin,
    spec,
    specStatus,
    theme,
}: SpecFooterActionsProps) {
    return (
        <Surface style={[styles.footer, { paddingBottom: bottomInset + 10, backgroundColor: theme.colors.surface }]} elevation={3}>
            {isOwner ? (
                <Button
                    mode="contained"
                    disabled
                    style={[styles.footerBtn, { backgroundColor: theme.colors.elevation.level2 }]}
                    textColor={theme.colors.onSurface}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                    icon="crown"
                >
                    You are the Host
                </Button>
            ) : myApplication ? (
                <Button
                    mode="outlined"
                    disabled
                    style={[styles.footerBtn, { borderColor: theme.colors.outlineVariant }]}
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 16, fontWeight: '600' }}
                    icon="check-circle"
                >
                    {myApplication.status === 'ACCEPTED' ? 'Joined' : 'Applied'}
                </Button>
            ) : isSpecClosed ? (
                <Button
                    mode="contained"
                    disabled
                    style={[styles.footerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                >
                    Spec Closed
                </Button>
            ) : (spec.expires_at && new Date(spec.expires_at) <= new Date()) ? (
                <Button
                    mode="contained"
                    disabled
                    style={[styles.footerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                >
                    Applications Closed
                </Button>
            ) : specStatus !== 'OPEN' ? (
                <Button
                    mode="contained"
                    disabled
                    style={[styles.footerBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                >
                    Quest Started
                </Button>
            ) : (
                <Button
                    mode="contained"
                    onPress={onJoin}
                    loading={joinLoading}
                    style={styles.footerBtn}
                    buttonColor={theme.colors.primary}
                    labelStyle={{ fontSize: 16, fontWeight: '800' }}
                >
                    Join Spec for Free
                </Button>
            )}
        </Surface>
    );
}

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
    },
    footerBtn: { borderRadius: 999, paddingVertical: 6 },
});
