import type {
  AdminFinancialAppliedFilters,
  AdminFinancialVoucher,
  AdminFinancialVoucherDateField,
  AdminFinancialVoucherStatus,
  AdminFinancialVoucherSummary,
  AdminPagination,
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
  TextField,
} from './financialUi'

type VoucherFinancialsPanelProps = {
  appliedFilters: AdminFinancialAppliedFilters | null
  filters: {
    currency?: string
    date?: string
    dateField: AdminFinancialVoucherDateField
    from?: string
    month?: string
    period: 'all' | 'day' | 'week' | 'month' | 'custom'
    providerId?: string
    status: AdminFinancialVoucherStatus
    to?: string
  }
  isLoading: boolean
  onCurrencyChange: (currency: string) => void
  onDateChange: (date: string) => void
  onDateFieldChange: (dateField: AdminFinancialVoucherDateField) => void
  onFromChange: (from: string) => void
  onMonthChange: (month: string) => void
  onPageChange: (page: number) => void
  onPeriodChange: (period: 'all' | 'day' | 'week' | 'month' | 'custom') => void
  onProviderIdChange: (providerId: string) => void
  onReset: () => void
  onStatusChange: (status: AdminFinancialVoucherStatus) => void
  onToChange: (to: string) => void
  pagination: AdminPagination | null
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
  onCurrencyChange,
  onDateChange,
  onDateFieldChange,
  onFromChange,
  onMonthChange,
  onPageChange,
  onPeriodChange,
  onProviderIdChange,
  onReset,
  onStatusChange,
  onToChange,
  pagination,
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
        <div className="grid gap-3 lg:grid-cols-[150px_160px_150px_140px_140px_140px_150px]">
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
          <TextField label="Provider ID" type="number" value={filters.providerId ?? ''} onChange={onProviderIdChange} />
          <TextField label="Currency" maxLength={3} value={filters.currency ?? ''} onChange={onCurrencyChange} />
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
