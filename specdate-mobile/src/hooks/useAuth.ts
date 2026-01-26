import { useQuery } from '@tanstack/react-query';
import { api, getAuthToken } from '../services/api';

export function useAuth() {
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const token = getAuthToken();
            if (!token) return null;
            try {
                const response = await api.get('/user');
                return (response.data as any)?.data ?? response.data;
            } catch (e: any) {
                if (e.response?.status === 401) return null;
                throw e;
            }
        },
        retry: false,
    });

    return { user, isLoading, isAuthenticated: !!user, error };
}
