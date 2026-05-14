import { useState } from 'react'
import type {
  AdminFinancialAppliedFilters,
  AdminFinancialVoucher,
  AdminFinancialVoucherDateField,
  AdminFinancialVoucherStatus,
  AdminFinancialVoucherSummary,
  AdminPagination,
  ProviderApplication,
} from '../../../types/admin'
import { AdminPaginationBar } from '../AdminPaginationBar'
import {
  AppliedRange,
  CurrencyBreakdown,
  DateControls,
  EmptyRow,
  formatDateTime,
  formatMoney,
  labelize,
  Metric,
  PanelHeader,
  periodOptions,
  ResetButton,
  SelectField,
} from './financialUi'

type VoucherFinancialsPanelProps = {
  appliedFilters: AdminFinancialAppliedFilters | null
  filters: {
    date?: string
    dateField: AdminFinancialVoucherDateField
    from?: string
    month?: string
    period: 'all' | 'day' | 'week' | 'month' | 'custom'
    providerIds: number[]
    status: AdminFinancialVoucherStatus
    to?: string
  }
  isLoading: boolean
  onDateChange: (date: string) => void
  onDateFieldChange: (dateField: AdminFinancialVoucherDateField) => void
  onFromChange: (from: string) => void
  onMonthChange: (month: string) => void
  onPageChange: (page: number) => void
  onPeriodChange: (period: 'all' | 'day' | 'week' | 'month' | 'custom') => void
  onProviderCountryChange: (country: string) => void
  onProviderIdsChange: (providerIds: number[]) => void
  onProviderOptionsPageChange: (page: number) => void
  onProviderSearchChange: (search: string) => void
  onReset: () => void
  onStatusChange: (status: AdminFinancialVoucherStatus) => void
  onToChange: (to: string) => void
  pagination: AdminPagination | null
  providerCountry: string
  providerOptions: ProviderApplication[]
  providerOptionsLoading: boolean
  providerOptionsPagination: AdminPagination | null
  providerSearch: string
  summary: AdminFinancialVoucherSummary | null
  vouchers: AdminFinancialVoucher[]
}

const voucherStatusOptions: AdminFinancialVoucherStatus[] = [
  'all',
  'pending_provider',
  'active',
  'redeemed',
  'completed',
  'rejected',
  'cancelled',
  'expired',
]
const voucherDateFields: AdminFinancialVoucherDateField[] = [
  'created_at',
  'provider_decision_at',
  'redeemed_at',
  'spend_recorded_at',
]

export function VoucherFinancialsPanel({
  appliedFilters,
  filters,
  isLoading,
  onDateChange,
  onDateFieldChange,
  onFromChange,
  onMonthChange,
  onPageChange,
  onPeriodChange,
  onProviderCountryChange,
  onProviderIdsChange,
  onProviderOptionsPageChange,
  onProviderSearchChange,
  onReset,
  onStatusChange,
  onToChange,
  pagination,
  providerCountry,
  providerOptions,
  providerOptionsLoading,
  providerOptionsPagination,
  providerSearch,
  summary,
  vouchers,
}: VoucherFinancialsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <PanelHeader
        action={<ResetButton onClick={onReset} />}
        pagination={pagination}
        subtitle="Voucher usage, provider redemption, dater pairs, status, and spend by currency."
        title="Voucher financials"
      />

      <div className="border-b border-slate-200 p-5">
        <div className="grid gap-3 lg:grid-cols-[150px_160px_150px_minmax(220px,1fr)_140px_150px]">
          <SelectField label="Period" options={periodOptions} value={filters.period} onChange={onPeriodChange} />
          <SelectField
            label="Date field"
            options={voucherDateFields}
            value={filters.dateField}
            onChange={onDateFieldChange}
          />
          <SelectField
            label="Status"
            options={voucherStatusOptions}
            value={filters.status}
            onChange={onStatusChange}
          />
          <ProviderPicker
            country={providerCountry}
            isLoading={providerOptionsLoading}
            onCountryChange={onProviderCountryChange}
            providerIds={filters.providerIds}
            pagination={providerOptionsPagination}
            providers={providerOptions}
            onChange={onProviderIdsChange}
            onPageChange={onProviderOptionsPageChange}
            onSearchChange={onProviderSearchChange}
            search={providerSearch}
          />
          <DateControls
            date={filters.date ?? ''}
            from={filters.from ?? ''}
            month={filters.month ?? ''}
            onDateChange={onDateChange}
            onFromChange={onFromChange}
            onMonthChange={onMonthChange}
            onToChange={onToChange}
            period={filters.period}
            to={filters.to ?? ''}
          />
        </div>
        <AppliedRange filters={appliedFilters} />
      </div>

      <VoucherSummary summary={summary} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Voucher</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Daters</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Spend</th>
              <th className="px-5 py-3">Redeemed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.map((voucher) => (
              <VoucherRow key={voucher.id} voucher={voucher} />
            ))}
            {vouchers.length === 0 && (
              <EmptyRow colSpan={6} isLoading={isLoading} label="No vouchers in this view." />
            )}
          </tbody>
        </table>
      </div>

      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function ProviderPicker({
  country,
  isLoading,
  onChange,
  onCountryChange,
  onPageChange,
  onSearchChange,
  pagination,
  providerIds,
  providers,
  search,
}: {
  country: string
  isLoading: boolean
  onChange: (providerIds: number[]) => void
  onCountryChange: (country: string) => void
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  pagination: AdminPagination | null
  providerIds: number[]
  providers: ProviderApplication[]
  search: string
}) {
  const selectedProviders = providers.filter((provider) => providerIds.includes(provider.id))
  const summary = providerIds.length === 0
    ? 'All providers'
    : providerIds.length === 1
      ? selectedProviders[0]?.business_name ?? '1 provider selected'
      : `${providerIds.length} providers`
  const totalProviders = pagination?.total ?? providers.length
  const [isOpen, setIsOpen] = useState(false)

  const toggleProvider = (providerId: number) => {
    onChange(
      providerIds.includes(providerId)
        ? providerIds.filter((id) => id !== providerId)
        : [...providerIds, providerId],
    )
  }

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        Providers
      </p>
      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"
        >
          <span className="truncate">{summary}</span>
          <span className="text-xs text-slate-400">Select</span>
        </button>
        {isOpen && (
        <div className="absolute z-30 mt-2 max-h-80 w-full min-w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid gap-2">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search provider, email, city"
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
            <input
              value={country}
              onChange={(event) => onCountryChange(event.target.value)}
              placeholder="Country filter, e.g. GB"
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
          <div className="my-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-500">
              {isLoading ? 'Loading providers...' : `${totalProviders} approved providers`}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-black text-pink-700 hover:text-pink-500"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-black text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {providers.map((provider) => (
              <label
                key={provider.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-slate-50"
              >
                <input
                  checked={providerIds.includes(provider.id)}
                  onChange={() => toggleProvider(provider.id)}
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-pink-600"
                />
                <span>
                  <span className="block font-black text-slate-800">{provider.business_name}</span>
                  <span className="block text-xs font-semibold text-slate-500">
                    {provider.city || provider.country || provider.email || `Provider #${provider.id}`}
                  </span>
                </span>
              </label>
            ))}
            {providers.length === 0 && (
              <p className="p-2 text-sm font-bold text-slate-500">
                {isLoading ? 'Loading approved providers...' : 'No approved providers found.'}
              </p>
            )}
          </div>
          {pagination && pagination.last_page > 1 && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500">
                Page {pagination.current_page} of {pagination.last_page}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.current_page <= 1}
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

function VoucherSummary({ summary }: { summary: AdminFinancialVoucherSummary | null }) {
  if (!summary) return null

  return (
    <div className="border-b border-slate-200 p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total vouchers" value={summary.total_vouchers} />
        <Metric label="Redeemed" value={summary.redeemed} />
        <Metric label="Completed" value={summary.completed} />
        <Metric label="Active" value={summary.active} />
      </div>
      <CurrencyBreakdown
        emptyLabel="No recorded voucher spend."
        items={summary.spend_by_currency.map((item) => ({
          currency: item.currency,
          meta: `${item.voucher_count} vouchers, avg ${formatMoney(item.average_spent, item.currency)}`,
          value: formatMoney(item.total_spent, item.currency),
        }))}
      />
    </div>
  )
}

function VoucherRow({ voucher }: { voucher: AdminFinancialVoucher }) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">{voucher.voucher_code}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {voucher.spec?.title || voucher.date_code || `Spec date #${voucher.spec_date_id ?? 'N/A'}`}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{voucher.provider?.name || 'No provider'}</p>
        <p className="mt-1 text-slate-500">{voucher.provider?.city || voucher.provider?.email || 'No location'}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">ID {voucher.provider?.id ?? 'N/A'}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{userName(voucher.daters.owner)}</p>
        <p className="mt-1 text-slate-500">{userName(voucher.daters.winner)}</p>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={voucher.status} />
        <p className="mt-2 text-xs font-bold text-slate-500">{voucher.discount_percentage}% discount</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-black">
          {voucher.total_spent === null ? 'Not recorded' : formatMoney(voucher.total_spent, voucher.currency)}
        </p>
        <p className="mt-1 text-slate-500">
          Min {voucher.minimum_spend === null ? 'none' : formatMoney(voucher.minimum_spend, voucher.currency)}
        </p>
      </td>
      <td className="px-5 py-4 text-slate-500">
        <p>{formatDateTime(voucher.redeemed_at)}</p>
        <p className="mt-1 text-xs font-bold">{userName(voucher.redeemed_by_provider)}</p>
      </td>
    </tr>
  )
}

function StatusBadge({ status }: { status: AdminFinancialVoucher['status'] }) {
  const styles: Record<AdminFinancialVoucher['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-700',
    completed: 'bg-indigo-100 text-indigo-700',
    expired: 'bg-slate-100 text-slate-700',
    pending_provider: 'bg-amber-100 text-amber-800',
    redeemed: 'bg-pink-100 text-pink-700',
    rejected: 'bg-rose-100 text-rose-700',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{labelize(status)}</span>
}

function userName(user: AdminFinancialVoucher['requested_by']) {
  return user?.username || user?.name || 'Not available'
}
