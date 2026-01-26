import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export type SpecRequirement = {
    id?: number;
    field: string;
    operator: string;
    value: any;
    is_compulsory: boolean;
};

export type Spec = {
    id: number;
    user_id: number;
    title: string;
    description?: string;
    location_city?: string;
    location_lat?: number;
    location_lng?: number;
    expires_at: string;
    max_participants: number;
    status: string;
    owner?: any;
    requirements?: SpecRequirement[];
};

export type CreateSpecPayload = {
    title: string;
    description?: string;
    location_city?: string;
    location_lat?: number;
    location_lng?: number;
    duration: number; // days
    max_participants: number;
    requirements: Omit<SpecRequirement, 'id'>[];
};

export function useSpecs() {
    return useQuery({
        queryKey: ['specs'],
        queryFn: async () => {
            const { data } = await api.get('/specs');
            return (data.data as any[] ?? []).map(d => d as Spec);
            // Pagination handling to be added later
        },
    });
}

export function useCreateSpec() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateSpecPayload) => {
            const { data } = await api.post('/specs', payload);
            return data.data as Spec;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['specs'] });
            queryClient.invalidateQueries({ queryKey: ['user'] }); // In case we track created specs count
        },
    });
}
