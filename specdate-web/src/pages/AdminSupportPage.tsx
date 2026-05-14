import { AdminLogin, AdminShell, SupportTicketsPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminSupportPage() {
  const adminDashboard = useAdminDashboard({
    loadProviders: false,
    loadReports: false,
    supportPerPage: 25,
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
      title="Support inbox"
    >
      <SupportTicketsPanel
        isUpdating={adminDashboard.isLoading}
        onOpenTicket={adminDashboard.openSupportTicket}
        onPageChange={adminDashboard.setSupportPage}
        onReply={adminDashboard.sendSupportReply}
        onStatusChange={adminDashboard.setSupportStatus}
        onUpdateStatus={adminDashboard.updateSupportStatus}
        pagination={adminDashboard.supportPagination}
        selectedTicket={adminDashboard.selectedSupportTicket}
        selectedTicketId={adminDashboard.selectedSupportTicketId}
        status={adminDashboard.supportStatus}
        tickets={adminDashboard.supportTickets}
        updatingTicketId={adminDashboard.updatingSupportTicketId}
      />
    </AdminShell>
  )
}
