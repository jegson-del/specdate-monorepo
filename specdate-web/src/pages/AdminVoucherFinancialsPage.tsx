import { AdminLogin, AdminShell } from '../components/admin'
import { VoucherFinancialsPanel } from '../components/admin/financials/VoucherFinancialsPanel'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminVoucherFinancials } from '../hooks/useAdminFinancials'

export default function AdminVoucherFinancialsPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const vouchers = useAdminVoucherFinancials()

  if (!adminDashboard.isAuthenticated || !vouchers.isAuthenticated) {
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
      title="Voucher financials"
    >
      <VoucherFinancialsPanel
        appliedFilters={vouchers.appliedFilters}
        filters={vouchers.filters}
        isLoading={vouchers.isLoading}
        onCurrencyChange={vouchers.setCurrency}
        onDateChange={vouchers.setDate}
        onDateFieldChange={vouchers.setDateField}
        onFromChange={vouchers.setFrom}
        onMonthChange={vouchers.setMonth}
        onPageChange={vouchers.setPage}
        onPeriodChange={vouchers.setPeriod}
        onProviderIdChange={vouchers.setProviderId}
        onReset={vouchers.resetFilters}
        onStatusChange={vouchers.setStatus}
        onToChange={vouchers.setTo}
        pagination={vouchers.pagination}
        summary={vouchers.summary}
        vouchers={vouchers.vouchers}
      />
    </AdminShell>
  )
}
