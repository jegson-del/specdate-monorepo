import { AdminLogin, AdminShell, RiskManagementPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminRisk } from '../hooks/useAdminRisk'

export default function AdminRiskPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const adminRisk = useAdminRisk()

  if (!adminDashboard.isAuthenticated || !adminRisk.isAuthenticated) {
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
      title="Risk signals"
    >
      <RiskManagementPanel
        ipEvents={adminRisk.ipEvents}
        ipEventsPagination={adminRisk.ipEventsPagination}
        ipEventType={adminRisk.ipEventType}
        ipQuery={adminRisk.ipQuery}
        ipSeverity={adminRisk.ipSeverity}
        ipUserId={adminRisk.ipUserId}
        onIpEventTypeChange={adminRisk.setIpEventType}
        onIpPageChange={adminRisk.setIpEventsPage}
        onIpQueryChange={adminRisk.setIpQuery}
        onIpSeverityChange={adminRisk.setIpSeverity}
        onIpUserIdChange={adminRisk.setIpUserId}
        onOpenRiskUser={adminRisk.setSelectedRiskUserId}
        onRiskUserPageChange={adminRisk.setRiskUsersPage}
        onRiskUserQueryChange={adminRisk.setRiskUserQuery}
        riskUserQuery={adminRisk.riskUserQuery}
        riskUsers={adminRisk.riskUsers}
        riskUsersPagination={adminRisk.riskUsersPagination}
        selectedRiskUser={adminRisk.selectedRiskUser}
        selectedRiskUserId={adminRisk.selectedRiskUserId}
      />
    </AdminShell>
  )
}
