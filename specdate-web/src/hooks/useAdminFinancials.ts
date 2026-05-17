import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAdminToken } from './useAdminToken'
import {
  getProviderApplications,
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
    date: currentDate(),
    dateField: 'redeemed_at',
    from: '',
    month: currentMonth(),
    period: 'month',
    providerIds: [],
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
  const token = useAdminToken()
  const [page, setPage] = useState(1)
  const [providerPage, setProviderPage] = useState(1)
  const [providerCountry, setProviderCountryValue] = useState('')
  const [providerSearch, setProviderSearchValue] = useState('')
  const [filters, setFilters] = useState<AdminFinancialVoucherFilters>(() => defaultVoucherFilters())

  const vouchersQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'financials', 'vouchers', filters, page, perPage],
    queryFn: () => getAdminFinancialVouchers(token, filters, page, perPage),
    refetchInterval: 60_000,
    staleTime: 20_000,
  })

  const providerOptionsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'financials', 'voucher-provider-options', providerPage, providerSearch, providerCountry],
    queryFn: () => getProviderApplications(token, 'approved', providerPage, 25, {
      country: providerCountry,
      q: providerSearch,
    }),
    staleTime: 60_000,
  })

  const updateFilters = (next: Partial<AdminFinancialVoucherFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(defaultVoucherFilters())
    setPage(1)
    setProviderCountryValue('')
    setProviderPage(1)
    setProviderSearchValue('')
  }

  const setProviderSearch = (search: string) => {
    setProviderSearchValue(search)
    setProviderPage(1)
  }

  const setProviderCountry = (country: string) => {
    setProviderCountryValue(country)
    setProviderPage(1)
  }

  return {
    appliedFilters: vouchersQuery.data?.filters ?? null,
    filters,
    isAuthenticated: Boolean(token),
    isLoading: vouchersQuery.isFetching,
    pagination: vouchersQuery.data?.pagination ?? null,
    providerCountry,
    providerOptions: providerOptionsQuery.data?.items ?? [],
    providerOptionsLoading: providerOptionsQuery.isFetching,
    providerOptionsPagination: providerOptionsQuery.data?.pagination ?? null,
    providerSearch,
    resetFilters,
    setDate: (date: string) => updateFilters({ date }),
    setDateField: (dateField: AdminFinancialVoucherDateField) => updateFilters({ dateField }),
    setFrom: (from: string) => updateFilters({ from }),
    setMonth: (month: string) => updateFilters({ month }),
    setPage,
    setPeriod: (period: AdminFinancialPeriod) => updateFilters({ period }),
    setProviderCountry,
    setProviderIds: (providerIds: number[]) => updateFilters({ providerIds }),
    setProviderOptionsPage: setProviderPage,
    setProviderSearch,
    setStatus: (status: AdminFinancialVoucherStatus) => updateFilters({ status }),
    setTo: (to: string) => updateFilters({ to }),
    summary: vouchersQuery.data?.summary ?? null,
    vouchers: vouchersQuery.data?.items ?? [],
  }
}

export function useAdminCreditFinancials() {
  const token = useAdminToken()
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
