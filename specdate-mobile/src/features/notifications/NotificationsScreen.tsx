import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { routeNotification } from './notificationRouting';

export default function NotificationsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();

    const notificationsQuery = useInfiniteQuery({
        queryKey: ['notifications'],
        initialPageParam: 1,
        queryFn: async ({ pageParam }) => {
            const res = await api.get('/notifications', { params: { page: Number(pageParam), limit: 20 } });
            return res.data; // Laravel pagination: { data: [...], current_page, ... }
        },
        getNextPageParam: (lastPage) => {
            const current = lastPage?.current_page ?? 1;
            const last = lastPage?.last_page ?? current;
            return current < last ? current + 1 : undefined;
        },
        staleTime: 0,
    });
    const { isLoading, refetch, isRefetching } = notificationsQuery;

    // When landing on Notifications (e.g. from Spec Details or anywhere), refetch all notifications for this user
    useFocusEffect(
        useCallback(() => {
            queryClient.refetchQueries({ queryKey: ['notifications'] });
        }, [queryClient])
    );

    const notifications = useMemo(() => {
        return notificationsQuery.data?.pages.flatMap((page) => Array.isArray(page?.data) ? page.data : []) ?? [];
    }, [notificationsQuery.data]);

    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] }); // To update badge count
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const handlePress = (item: any) => {
        if (!item.read_at) {
            markReadMutation.mutate(item.id);
        }

        routeNotification(item, navigation, queryClient);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = !item.read_at;
        const type = item.type;
        // Clearer, more distinctive icons by type
        let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'bell-badge-outline';
        let color = theme.colors.primary;
        let bgColor = theme.colors.elevation.level2;

        if (type === 'round_started') {
            iconName = 'play-circle-outline';
            color = '#F59E0B';
            bgColor = 'rgba(245, 158, 11, 0.15)';
        } else if (type === 'round_nudge') {
            iconName = 'message-question-outline';
            color = '#8B5CF6';
            bgColor = 'rgba(139, 92, 246, 0.15)';
        } else if (type === 'eliminated') {
            iconName = 'close-circle-outline';
            color = '#EF4444';
            bgColor = 'rgba(239, 68, 68, 0.15)';
        } else if (type === 'application_accepted') {
            iconName = 'handshake-outline';
            color = '#10B981';
            bgColor = 'rgba(16, 185, 129, 0.15)';
        } else if (type === 'round_answer') {
            iconName = 'comment-check-outline';
            color = '#3B82F6'; // Blue
            bgColor = 'rgba(59, 130, 246, 0.15)';
        } else if (type === 'spec_starts_today' || type === 'spec_starts_tomorrow') {
            iconName = 'calendar-heart';
            color = '#7C3AED';
            bgColor = 'rgba(124, 58, 237, 0.15)';
        } else if (type === 'spec_full') {
            iconName = 'account-group';
            color = '#EC4899';
            bgColor = 'rgba(236, 72, 153, 0.15)';
        } else if (type === 'support_reply' || type === 'support_ticket') {
            iconName = 'lifebuoy';
            color = '#0EA5E9';
            bgColor = 'rgba(14, 165, 233, 0.15)';
        } else if (type === 'chat_message') {
            iconName = 'chat-outline';
            color = '#2563EB';
            bgColor = 'rgba(37, 99, 235, 0.15)';
        } else if (type === 'voucher_redeemed') {
            iconName = 'clipboard-check-outline';
            color = '#16A34A';
            bgColor = 'rgba(22, 163, 74, 0.15)';
        } else if (type === 'voucher_created') {
            iconName = 'ticket-confirmation-outline';
            color = '#F97316';
            bgColor = 'rgba(249, 115, 22, 0.15)';
        } else if (type === 'voucher_approved') {
            iconName = 'ticket-percent-outline';
            color = '#16A34A';
            bgColor = 'rgba(22, 163, 74, 0.15)';
        } else if (type === 'voucher_rejected') {
            iconName = 'ticket-outline';
            color = '#EF4444';
            bgColor = 'rgba(239, 68, 68, 0.15)';
        } else if (type === 'admin_media_moderation') {
            iconName = 'shield-alert-outline';
            color = '#DC2626';
            bgColor = 'rgba(220, 38, 38, 0.15)';
        } else if (type === 'moderation_appeal_granted') {
            iconName = 'shield-check-outline';
            color = '#16A34A';
            bgColor = 'rgba(22, 163, 74, 0.15)';
        } else if (type === 'moderation_appeal_denied') {
            iconName = 'shield-alert-outline';
            color = '#F59E0B';
            bgColor = 'rgba(245, 158, 11, 0.15)';
        } else if (type === 'moderation_warning' || type === 'moderation_strike' || type === 'moderation_suspension' || type === 'moderation_ban') {
            iconName = 'account-alert-outline';
            color = '#DC2626';
            bgColor = 'rgba(220, 38, 38, 0.15)';
        }

        const timeText = item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '';

        return (
            <TouchableOpacity
                onPress={() => handlePress(item)}
                style={[
                    styles.item,
                    { backgroundColor: isUnread ? theme.colors.elevation.level1 : theme.colors.background }
                ]}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                    <MaterialCommunityIcons name={iconName} size={26} color={color} />
                </View>
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: theme.colors.onSurface, fontWeight: isUnread ? '700' : '500' }]}>
                            {item.data?.title || 'Notification'}
                        </Text>
                        <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
                            {timeText}
                        </Text>
                    </View>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }} numberOfLines={2}>
                        {item.data?.message || 'You have a new notification.'}
                    </Text>
                </View>
                {isUnread && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={24} />
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 48 }} />
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={{ color: theme.colors.outline }}>No notifications yet.</Text>
                        </View>
                    ) : null
                }
                onEndReached={() => {
                    if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
                        notificationsQuery.fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.35}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
        gap: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 15,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    empty: {
        padding: 30,
        alignItems: 'center',
    }
});
