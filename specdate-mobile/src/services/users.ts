import { api } from './api';

export type PublicProfile = {
    id: number;
    name: string;
    profile: {
        full_name?: string;
        avatar?: string | null;
        city?: string;
        state?: string;
        country?: string;
        dob?: string;
        sex?: string;
        occupation?: string;
        qualification?: string;
        hobbies?: string;
        height?: number;
        ethnicity?: string;
        is_smoker?: boolean;
        is_drug_user?: boolean;
        drinking?: string;
        sexual_orientation?: string;
        religion?: string;
    } | null;
    images?: string[];
    specs_created_count?: number;
    specs_participated_count?: number;
    dates_count?: number;
};

export const UserService = {
    getPublicProfile: async (userId: number): Promise<PublicProfile> => {
        const res = await api.get(`/users/${userId}`);
        const data = (res.data as any)?.data ?? res.data;
        return data as PublicProfile;
    },
};
