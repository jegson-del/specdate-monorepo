import { AdminLogin, AdminShell, MediaModerationQueuePanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminMediaModerationPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: true,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
    mediaPerPage: 25,
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
      title="Upload moderation"
    >
      <MediaModerationQueuePanel
        approvingMediaId={adminDashboard.approvingMediaId}
        items={adminDashboard.mediaModerationItems}
        onApproveMedia={adminDashboard.approveMedia}
        onPageChange={adminDashboard.setMediaPage}
        onStatusChange={adminDashboard.setMediaStatus}
        pagination={adminDashboard.mediaPagination}
        status={adminDashboard.mediaStatus}
      />
    </AdminShell>
  )
}
