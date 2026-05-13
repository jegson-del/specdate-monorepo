import {
  AdminLogin,
  AdminShell,
  ModerationReportsPanel,
} from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminModerationPage() {
  const adminDashboard = useAdminDashboard({
    loadProviders: false,
    loadSupport: false,
    reportPerPage: 25,
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
      title="Moderation"
    >
      <ModerationReportsPanel
        onStatusChange={adminDashboard.setReportStatus}
        onUpdateReport={adminDashboard.updateReport}
        reports={adminDashboard.reports}
        status={adminDashboard.reportStatus}
        updatingReportId={adminDashboard.updatingReportId}
      />
    </AdminShell>
  )
}
