import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';

export type CreditProduct = {
    id: number;
    product_id: string;
    quantity: number;
    name: string | null;
};

export type GrantCreditsPayload = {
    product_id: string;
    revenue_cat_transaction_id: string;
    platform?: string | null;
    store?: string | null;
    store_transaction_id?: string | null;
    revenue_cat_app_user_id?: string | null;
    environment?: string | null;
    is_sandbox?: boolean | null;
    currency?: string | null;
    amount?: number | null;
};

export type GrantCreditsResult = {
    message: string;
    credits: number;
};

export async function fetchCreditProducts(): Promise<CreditProduct[]> {
    const response = await api.get('/credits/products');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
}

export async function grantCredits(payload: GrantCreditsPayload): Promise<GrantCreditsResult> {
    const response = await api.post('/credits/grant', payload);
    return response.data as GrantCreditsResult;
}

export async function refreshCreditState(queryClient: QueryClient): Promise<void> {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['credits-transactions'] }),
    ]);
}
