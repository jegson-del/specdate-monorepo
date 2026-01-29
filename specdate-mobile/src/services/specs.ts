import { api } from './api';
import { CreateSpecPayload } from '../hooks/useSpecs';

export type Spec = {
    id: number;
    user_id: number;
    title: string;
    description: string;
    location_city: string;
    location_lat?: number;
    location_lng?: number;
    duration: number;
    max_participants: number;
    status: 'OPEN' | 'CLOSED' | 'COMPLETED';
    expires_at: string;
    created_at: string;
    updated_at: string;
    applications_count?: number;
    owner?: {
        id: number;
        name: string;
        email: string;
        profile?: {
            full_name: string;
            avatar?: string;
        };
    };
    requirements?: any[];
};

export const SpecService = {
    async getAll(filter = 'LIVE') {
        // GET /api/specs?filter=...
        const response = await api.get('/specs', { params: { filter } });
        return response.data; // { success, message, data: { current_page, data: Spec[] } }
    },

    async getMySpecs() {
        const response = await api.get('/my-specs');
        return response.data;
    },

    async getOne(id: string) {
        const response = await api.get(`/specs/${id}`);
        const body = response.data as any;
        // Laravel sendResponse wraps as { success, data, message }; unwrap so caller gets the spec object
        return body?.data !== undefined ? body.data : body;
    },

    async create(payload: CreateSpecPayload) {
        const response = await api.post('/specs', payload);
        return response.data;
    },

    async joinSpec(specId: string) {
        const response = await api.post(`/specs/${specId}/join`);
        return response.data;
    },

    async approveApplication(specId: string, applicationId: string) {
        const response = await api.post(`/specs/${specId}/applications/${applicationId}/approve`);
        return response.data;
    },

    async rejectApplication(specId: string, applicationId: string) {
        const response = await api.post(`/specs/${specId}/applications/${applicationId}/reject`);
        return response.data;
    },

    async eliminateApplication(specId: string, applicationId: string) {
        const response = await api.post(`/specs/${specId}/applications/${applicationId}/eliminate`);
        return response.data;
    },

    async startRound(specId: string, question: string) {
        const response = await api.post(`/specs/${specId}/rounds`, { question });
        return response.data;
    },

    async submitAnswer(roundId: number, answer: string) {
        const response = await api.post(`/rounds/${roundId}/answer`, { answer });
        return response.data;
    },

    async toggleLike(specId: string) {
        const response = await api.post(`/specs/${specId}/like`);
        return response.data;
    },
};
