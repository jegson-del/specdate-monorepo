import { AdminLogin, AdminShell } from '../components/admin'
import { CreditFinancialsPanel } from '../components/admin/financials/CreditFinancialsPanel'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminCreditFinancials } from '../hooks/useAdminFinancials'

export default function AdminCreditFinancialsPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const credits = useAdminCreditFinancials()

  if (!adminDashboard.isAuthenticated || !credits.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  return (
    <AdminShell
      admin={adminDashboard.admin}
      onLogout={adminDashboard.clearSession}
      stats={adminDashboard.dashboard?.stats}
      title="Credit financials"
    >
      <CreditFinancialsPanel
        appliedFilters={credits.appliedFilters}
        filters={credits.filters}
        isLoading={credits.isLoading}
        onCurrencyChange={credits.setCurrency}
        onDateChange={credits.setDate}
        onFromChange={credits.setFrom}
        onItemTypeChange={credits.setItemType}
        onMonthChange={credits.setMonth}
        onPageChange={credits.setPage}
        onPeriodChange={credits.setPeriod}
        onReset={credits.resetFilters}
        onToChange={credits.setTo}
        onTypeChange={credits.setType}
        onUserIdChange={credits.setUserId}
        pagination={credits.pagination}
        summary={credits.summary}
        transactions={credits.transactions}
      />
    </AdminShell>
  )
}
