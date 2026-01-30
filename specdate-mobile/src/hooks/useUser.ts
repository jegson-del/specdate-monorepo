import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export type ProfileGallerySlot = { id: number; url: string };

export type UserBalance = {
    id: number;
    user_id: number;
    red_sparks: number;
    blue_sparks: number;
    created_at: string;
    updated_at: string;
};

export type User = {
    id: number;
    name: string;
    email: string;
    username?: string;
    mobile?: string;
    profile?: any;
    profile_complete: boolean;
    balance?: UserBalance;
    spark_skin?: any;
    images?: string[];
    /** Gallery slots with id+url so client can send media_id when replacing a slot (max 6). */
    profile_gallery_media?: ProfileGallerySlot[];
    /** When true, profile is hidden and user cannot create specs. */
    is_paused?: boolean;
    unread_notifications_count?: number;
};

async function fetchUser(): Promise<User> {
    const response = await api.get('/user');
    // Laravel resource wrapper or direct model?
    // Our previous code handled: `me.data?.data ?? me.data`.
    const data = response.data;
    return (data?.data ?? data) as User;
}

export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: 1000 * 30, // 30 seconds — profile/image updates show sooner when navigating back
        retry: false, // Don't retry if 401/failed
        // Keep showing previous user data while refetching (e.g. on Profile focus) so profile doesn't flash to empty/dummy
        placeholderData: (previousData) => previousData,
    });
}
