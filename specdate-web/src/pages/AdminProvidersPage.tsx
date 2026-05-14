import { AdminLogin, AdminShell, ProviderApplicationsTable } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminProvidersPage() {
  const adminDashboard = useAdminDashboard({
    loadReports: false,
    loadSupport: false,
    providerPerPage: 25,
  })

  if (!adminDashboard.isAuthenticated) {
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
      title="Provider applications"
    >
      <ProviderApplicationsTable
        isLoading={adminDashboard.isLoading}
        onApprove={adminDashboard.approveProvider}
        onOpenProvider={adminDashboard.setSelectedProviderId}
        onPageChange={adminDashboard.setProviderPage}
        onReject={adminDashboard.rejectProvider}
        onResendSetupEmail={adminDashboard.resendProviderSetupEmail}
        onSaveNote={adminDashboard.saveProviderNote}
        onStatusChange={adminDashboard.setProviderStatus}
        pagination={adminDashboard.providerPagination}
        providers={adminDashboard.providers}
        selectedProvider={adminDashboard.selectedProvider}
        selectedProviderId={adminDashboard.selectedProviderId}
        status={adminDashboard.providerStatus}
        updatingProviderId={adminDashboard.updatingProviderId}
      />
    </AdminShell>
  )
}
