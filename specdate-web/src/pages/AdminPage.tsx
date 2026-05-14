import {
  ActivityFeed,
  AdminLogin,
  AdminShell,
  AnalyticsPanels,
  ModerationReportsPanel,
  ProviderApplicationsTable,
  StatGrid,
  SupportTicketsPanel,
} from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminPage() {
  const adminDashboard = useAdminDashboard({
    providerPerPage: 10,
    reportPerPage: 10,
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
      title="Admin overview"
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-pink-600">
          Latest activity
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Brief admin view</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          This overview shows the latest ten provider applications and moderation reports first.
          Use the full pages for deeper review and bulk work.
        </p>
      </section>
      <StatGrid stats={adminDashboard.dashboard?.stats ?? {}} />
      <AnalyticsPanels dashboard={adminDashboard.dashboard} />
      <ActivityFeed
        providers={adminDashboard.providers}
        reports={adminDashboard.reports}
        supportTickets={adminDashboard.supportTickets}
      />
      <ProviderApplicationsTable
        isLoading={adminDashboard.isLoading}
        onApprove={adminDashboard.approveProvider}
        onOpenProvider={adminDashboard.setSelectedProviderId}
        onReject={adminDashboard.rejectProvider}
        onResendSetupEmail={adminDashboard.resendProviderSetupEmail}
        onSaveNote={adminDashboard.saveProviderNote}
        onStatusChange={adminDashboard.setProviderStatus}
        providers={adminDashboard.providers}
        selectedProvider={adminDashboard.selectedProvider}
        selectedProviderId={adminDashboard.selectedProviderId}
        status={adminDashboard.providerStatus}
        updatingProviderId={adminDashboard.updatingProviderId}
      />
      <ModerationReportsPanel
        onPageChange={adminDashboard.setReportPage}
        onStatusChange={adminDashboard.setReportStatus}
        onUpdateReport={adminDashboard.updateReport}
        pagination={adminDashboard.reportPagination}
        reports={adminDashboard.reports}
        status={adminDashboard.reportStatus}
        updatingReportId={adminDashboard.updatingReportId}
      />
      <SupportTicketsPanel
        isUpdating={adminDashboard.isLoading}
        onOpenTicket={adminDashboard.openSupportTicket}
        onReply={adminDashboard.sendSupportReply}
        onStatusChange={adminDashboard.setSupportStatus}
        onUpdateStatus={adminDashboard.updateSupportStatus}
        selectedTicket={adminDashboard.selectedSupportTicket}
        selectedTicketId={adminDashboard.selectedSupportTicketId}
        status={adminDashboard.supportStatus}
        tickets={adminDashboard.supportTickets}
        updatingTicketId={adminDashboard.updatingSupportTicketId}
      />
    </AdminShell>
  )
}
