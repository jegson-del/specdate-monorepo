import {
  AdminLogin,
  AdminShell,
  ModerationAppealsPanel,
  ModerationReportsPanel,
} from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useLocation } from 'react-router-dom'

export default function AdminModerationPage() {
  const location = useLocation()
  const appealsOnly = location.pathname.endsWith('/appeals')
  const adminDashboard = useAdminDashboard({
    loadModerationAppeals: appealsOnly,
    loadReports: !appealsOnly,
    loadProviders: false,
    loadSupport: false,
    moderationAppealPerPage: 25,
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
      title={appealsOnly ? 'Moderation appeals' : 'Moderation reports'}
    >
      {appealsOnly ? (
        <ModerationAppealsPanel
          appeals={adminDashboard.moderationAppeals}
          onDecideAppeal={adminDashboard.decideAppeal}
          onPageChange={adminDashboard.setModerationAppealPage}
          onStatusChange={adminDashboard.setModerationAppealStatus}
          pagination={adminDashboard.moderationAppealPagination}
          status={adminDashboard.moderationAppealStatus}
          updatingAppealId={adminDashboard.updatingAppealId}
        />
      ) : (
        <ModerationReportsPanel
          onPageChange={adminDashboard.setReportPage}
          onStatusChange={adminDashboard.setReportStatus}
          onUpdateReport={adminDashboard.updateReport}
          pagination={adminDashboard.reportPagination}
          reports={adminDashboard.reports}
          status={adminDashboard.reportStatus}
          updatingReportId={adminDashboard.updatingReportId}
        />
      )}
    </AdminShell>
  )
}
