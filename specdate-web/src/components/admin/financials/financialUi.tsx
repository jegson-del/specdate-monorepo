/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import type { AdminFinancialAppliedFilters, AdminFinancialPeriod, AdminPagination } from '../../../types/admin'
import { AdminPaginationSummary } from '../AdminPaginationBar'

export const periodOptions: AdminFinancialPeriod[] = ['all', 'day', 'week', 'month', 'custom']

export function PanelHeader({
  action,
  pagination,
  subtitle,
  title,
}: {
  action: ReactNode
  pagination: AdminPagination | null
  subtitle: string
  title: string
}) {
  return (
    <div className="border-b border-slate-200 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-3">
            <AdminPaginationSummary pagination={pagination} />
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: T[]
  value: T
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelize(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextField({
  label,
  maxLength,
  onChange,
  type = 'text',
  value,
}: {
  label: string
  maxLength?: number
  onChange: (value: string) => void
  type?: string
  value: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        maxLength={maxLength}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
      />
    </label>
  )
}

export function DateControls({
  date,
  from,
  month,
  onDateChange,
  onFromChange,
  onMonthChange,
  onToChange,
  period,
  to,
}: {
  date: string
  from: string
  month: string
  onDateChange: (date: string) => void
  onFromChange: (from: string) => void
  onMonthChange: (month: string) => void
  onToChange: (to: string) => void
  period: AdminFinancialPeriod
  to: string
}) {
  if (period === 'day' || period === 'week') {
    return <TextField label="Date" type="date" value={date} onChange={onDateChange} />
  }

  if (period === 'month') {
    return <TextField label="Month" type="month" value={month} onChange={onMonthChange} />
  }

  if (period === 'custom') {
    return (
      <>
        <TextField label="From" type="date" value={from} onChange={onFromChange} />
        <TextField label="To" type="date" value={to} onChange={onToChange} />
      </>
    )
  }

  return null
}

export function AppliedRange({ filters }: { filters: AdminFinancialAppliedFilters | null }) {
  if (!filters?.from || !filters.to) return null

  return (
    <p className="mt-3 text-xs font-bold text-slate-500">
      Active range: {formatDateTime(filters.from)} to {formatDateTime(filters.to)}
    </p>
  )
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

export function CurrencyBreakdown({
  emptyLabel,
  items,
}: {
  emptyLabel: string
  items: Array<{ currency: string; meta: string; value: string }>
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.currency} className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {item.currency}
          </p>
          <p className="mt-1 text-lg font-black text-slate-950">{item.value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm font-bold text-slate-500">{emptyLabel}</p>}
    </div>
  )
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700"
    >
      Reset filters
    </button>
  )
}

export function EmptyRow({ colSpan, isLoading, label }: { colSpan: number; isLoading: boolean; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
        {isLoading ? 'Loading...' : label}
      </td>
    </tr>
  )
}

export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      style: 'currency',
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
