import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  adminTokenKey,
  getAdminFinancialCredits,
  getAdminFinancialVouchers,
  type AdminFinancialCreditFilters,
  type AdminFinancialVoucherFilters,
} from '../lib/adminApi'
import type {
  AdminFinancialCreditType,
  AdminFinancialPeriod,
  AdminFinancialVoucherDateField,
  AdminFinancialVoucherStatus,
} from '../types/admin'

const perPage = 25

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function defaultVoucherFilters(): AdminFinancialVoucherFilters {
  return {
    currency: '',
    date: currentDate(),
    dateField: 'redeemed_at',
    from: '',
    month: currentMonth(),
    period: 'month',
    providerId: '',
    status: 'all',
    to: '',
  }
}

function defaultCreditFilters(): AdminFinancialCreditFilters {
  return {
    currency: '',
    date: currentDate(),
    from: '',
    itemType: '',
    month: currentMonth(),
    period: 'month',
    to: '',
    type: 'all',
    userId: '',
  }
}

export function useAdminVoucherFinancials() {
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AdminFinancialVoucherFilters>(() => defaultVoucherFilters())

  const vouchersQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'financials', 'vouchers', filters, page, perPage],
    queryFn: () => getAdminFinancialVouchers(token, filters, page, perPage),
    refetchInterval: 60_000,
    staleTime: 20_000,
  })

  const updateFilters = (next: Partial<AdminFinancialVoucherFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(defaultVoucherFilters())
    setPage(1)
  }

  return {
    appliedFilters: vouchersQuery.data?.filters ?? null,
    filters,
    isAuthenticated: Boolean(token),
    isLoading: vouchersQuery.isFetching,
    pagination: vouchersQuery.data?.pagination ?? null,
    resetFilters,
    setCurrency: (currency: string) => updateFilters({ currency }),
    setDate: (date: string) => updateFilters({ date }),
    setDateField: (dateField: AdminFinancialVoucherDateField) => updateFilters({ dateField }),
    setFrom: (from: string) => updateFilters({ from }),
    setMonth: (month: string) => updateFilters({ month }),
    setPage,
    setPeriod: (period: AdminFinancialPeriod) => updateFilters({ period }),
    setProviderId: (providerId: string) => updateFilters({ providerId }),
    setStatus: (status: AdminFinancialVoucherStatus) => updateFilters({ status }),
    setTo: (to: string) => updateFilters({ to }),
    summary: vouchersQuery.data?.summary ?? null,
    vouchers: vouchersQuery.data?.items ?? [],
  }
}

export function useAdminCreditFinancials() {
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AdminFinancialCreditFilters>(() => defaultCreditFilters())

  const creditsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'financials', 'credits', filters, page, perPage],
    queryFn: () => getAdminFinancialCredits(token, filters, page, perPage),
    refetchInterval: 60_000,
    staleTime: 20_000,
  })

  const updateFilters = (next: Partial<AdminFinancialCreditFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(defaultCreditFilters())
    setPage(1)
  }

  return {
    appliedFilters: creditsQuery.data?.filters ?? null,
    filters,
    isAuthenticated: Boolean(token),
    isLoading: creditsQuery.isFetching,
    pagination: creditsQuery.data?.pagination ?? null,
    resetFilters,
    setCurrency: (currency: string) => updateFilters({ currency }),
    setDate: (date: string) => updateFilters({ date }),
    setFrom: (from: string) => updateFilters({ from }),
    setItemType: (itemType: string) => updateFilters({ itemType }),
    setMonth: (month: string) => updateFilters({ month }),
    setPage,
    setPeriod: (period: AdminFinancialPeriod) => updateFilters({ period }),
    setTo: (to: string) => updateFilters({ to }),
    setType: (type: AdminFinancialCreditType) => updateFilters({ type }),
    setUserId: (userId: string) => updateFilters({ userId }),
    summary: creditsQuery.data?.summary ?? null,
    transactions: creditsQuery.data?.items ?? [],
  }
}
