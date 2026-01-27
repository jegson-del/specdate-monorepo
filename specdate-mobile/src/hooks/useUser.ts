import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export type ProfileGallerySlot = { id: number; url: string };

export type User = {
    id: number;
    name: string;
    email: string;
    username?: string;
    mobile?: string;
    profile?: any;
    profile_complete: boolean;
    balance?: any;
    balloon_skin?: any;
    images?: string[];
    /** Gallery slots with id+url so client can send media_id when replacing a slot (max 6). */
    profile_gallery_media?: ProfileGallerySlot[];
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
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false, // Don't retry if 401/failed
    });
}
