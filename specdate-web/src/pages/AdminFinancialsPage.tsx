import { Navigate } from 'react-router-dom'
import { AdminLogin, AdminShell } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminFinancialsPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })

  if (!adminDashboard.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  if (adminDashboard.admin?.admin_access?.can_view_financial_vouchers) {
    return <Navigate to="/admin/financials/vouchers" replace />
  }

  if (adminDashboard.admin?.admin_access?.can_view_financial_credits) {
    return <Navigate to="/admin/financials/credits" replace />
  }

  return (
    <AdminShell
      admin={adminDashboard.admin}
      onLogout={adminDashboard.clearSession}
      stats={adminDashboard.dashboard?.stats}
      title="Financials"
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">No finance access</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Ask another admin to enable voucher or credit financials for this account.
        </p>
      </section>
    </AdminShell>
  )
}
