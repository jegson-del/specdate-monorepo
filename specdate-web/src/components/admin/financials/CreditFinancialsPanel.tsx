import type {
  AdminFinancialAppliedFilters,
  AdminFinancialCreditSummary,
  AdminFinancialCreditTransaction,
  AdminFinancialCreditType,
  AdminFinancialPeriod,
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
  Metric,
  PanelHeader,
  periodOptions,
  ResetButton,
  SelectField,
  TextField,
} from './financialUi'

type CreditFinancialsPanelProps = {
  appliedFilters: AdminFinancialAppliedFilters | null
  filters: {
    currency?: string
    date?: string
    from?: string
    itemType?: string
    month?: string
    period: AdminFinancialPeriod
    to?: string
    type: AdminFinancialCreditType
    userId?: string
  }
  isLoading: boolean
  onCurrencyChange: (currency: string) => void
  onDateChange: (date: string) => void
  onFromChange: (from: string) => void
  onItemTypeChange: (itemType: string) => void
  onMonthChange: (month: string) => void
  onPageChange: (page: number) => void
  onPeriodChange: (period: AdminFinancialPeriod) => void
  onReset: () => void
  onToChange: (to: string) => void
  onTypeChange: (type: AdminFinancialCreditType) => void
  onUserIdChange: (userId: string) => void
  pagination: AdminPagination | null
  summary: AdminFinancialCreditSummary | null
  transactions: AdminFinancialCreditTransaction[]
}

const creditTypeOptions: AdminFinancialCreditType[] = ['all', 'CREDIT', 'DEBIT']

export function CreditFinancialsPanel({
  appliedFilters,
  filters,
  isLoading,
  onCurrencyChange,
  onDateChange,
  onFromChange,
  onItemTypeChange,
  onMonthChange,
  onPageChange,
  onPeriodChange,
  onReset,
  onToChange,
  onTypeChange,
  onUserIdChange,
  pagination,
  summary,
  transactions,
}: CreditFinancialsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <PanelHeader
        action={<ResetButton onClick={onReset} />}
        pagination={pagination}
        subtitle="Credit purchases, grants, spend movement, item types, and purchase amount by currency."
        title="Credit financials"
      />

      <div className="border-b border-slate-200 p-5">
        <div className="grid gap-3 lg:grid-cols-[150px_150px_140px_150px_170px_140px]">
          <SelectField label="Period" options={periodOptions} value={filters.period} onChange={onPeriodChange} />
          <SelectField label="Type" options={creditTypeOptions} value={filters.type} onChange={onTypeChange} />
          <TextField label="User ID" type="number" value={filters.userId ?? ''} onChange={onUserIdChange} />
          <TextField label="Currency" maxLength={3} value={filters.currency ?? ''} onChange={onCurrencyChange} />
          <TextField label="Item type" value={filters.itemType ?? ''} onChange={onItemTypeChange} />
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

      <CreditSummary summary={summary} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Quantity</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Purpose</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <CreditRow key={transaction.id} transaction={transaction} />
            ))}
            {transactions.length === 0 && (
              <EmptyRow colSpan={6} isLoading={isLoading} label="No credit transactions in this view." />
            )}
          </tbody>
        </table>
      </div>

      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function CreditSummary({ summary }: { summary: AdminFinancialCreditSummary | null }) {
  if (!summary) return null

  return (
    <div className="border-b border-slate-200 p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Transactions" value={summary.total_transactions} />
        <Metric label="Credits in" value={summary.credits_purchased_or_granted} />
        <Metric label="Credits spent" value={summary.credits_spent} />
        <Metric label="Net movement" value={summary.net_credit_movement} />
      </div>
      <CurrencyBreakdown
        emptyLabel="No credit purchase amount recorded."
        items={summary.purchase_amount_by_currency.map((item) => ({
          currency: item.currency,
          meta: `${item.transaction_count} transactions`,
          value: formatMoney(item.total_amount, item.currency),
        }))}
      />
    </div>
  )
}

function CreditRow({ transaction }: { transaction: AdminFinancialCreditTransaction }) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">{userName(transaction.user)}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {transaction.user?.email || `User #${transaction.user?.id ?? 'N/A'}`}
        </p>
      </td>
      <td className="px-5 py-4">
        <CreditTypeBadge type={transaction.type} />
        <p className="mt-2 text-xs font-bold text-slate-500">{transaction.item_type || 'No item type'}</p>
      </td>
      <td className="px-5 py-4 font-black">{transaction.quantity}</td>
      <td className="px-5 py-4">
        <p className="font-black">
          {transaction.amount === null
            ? 'No amount'
            : formatMoney(transaction.amount, transaction.currency || 'USD')}
        </p>
        <p className="mt-1 max-w-xs truncate text-xs font-bold text-slate-500">
          {transaction.revenue_cat_transaction_id || 'No payment reference'}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="max-w-xs truncate font-bold">{transaction.purpose || 'Not supplied'}</p>
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDateTime(transaction.created_at)}</td>
    </tr>
  )
}

function CreditTypeBadge({ type }: { type: AdminFinancialCreditTransaction['type'] }) {
  const style = type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>{type}</span>
}

function userName(user: AdminFinancialCreditTransaction['user']) {
  return user?.username || user?.name || 'Not available'
}
