import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal as RNModal } from 'react-native';
import { Text, useTheme, IconButton, Searchbar, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchModalProps {
    visible: boolean;
    onClose: () => void;
    tab: 'Specs' | 'People';
    query: string;
    setQuery: (q: string) => void;
}

export default function SearchModal({ visible, onClose, tab, query, setQuery }: SearchModalProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.searchModalBackdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => { }}
                    style={[
                        styles.searchModalSheet,
                        {
                            backgroundColor: theme.colors.surface,
                            paddingTop: insets.top + 20,
                        },
                    ]}
                >
                    <View style={styles.searchModalHeader}>
                        <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
                            {tab === 'People' ? 'Find People' : 'Discover Specs'}
                        </Text>
                        <IconButton
                            icon="close"
                            size={24}
                            iconColor={theme.colors.onSurfaceVariant}
                            onPress={onClose}
                            style={{ margin: 0 }}
                        />
                    </View>

                    <Searchbar
                        placeholder={tab === 'People' ? 'Type a name...' : 'Search titles, owners...'}
                        onChangeText={setQuery}
                        value={query}
                        autoFocus
                        iconColor={theme.colors.primary}
                        style={[
                            styles.searchBarModern,
                            {
                                backgroundColor: theme.colors.elevation.level2,
                            },
                        ]}
                        inputStyle={{ color: theme.colors.onSurface }}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                    />

                    <Button
                        mode="contained"
                        onPress={onClose}
                        style={styles.searchModalButton}
                        contentStyle={{ height: 50 }}
                        labelStyle={{ fontSize: 16, fontWeight: '700' }}
                    >
                        Search
                    </Button>
                </TouchableOpacity>
            </TouchableOpacity>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    searchModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
    },
    searchModalSheet: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    searchModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    searchBarModern: {
        borderRadius: 12,
        marginBottom: 20,
        elevation: 0,
        borderWidth: 0,
    },
    searchModalButton: {
        borderRadius: 12,
    },
});
