import { AdminLogin, AdminShell, ContactMessagesPanel } from '../components/admin'
import { useAdminContact } from '../hooks/useAdminContact'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminContactPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const contact = useAdminContact()

  if (!adminDashboard.isAuthenticated || !contact.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  if (!adminDashboard.admin?.admin_access?.can_manage_contact_messages) {
    return (
      <AdminShell
        admin={adminDashboard.admin}
        onLogout={adminDashboard.clearSession}
        stats={adminDashboard.dashboard?.stats}
        title="Contact messages"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">No contact access</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ask an admin manager to enable contact message access for this account.
          </p>
        </section>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      admin={adminDashboard.admin}
      onLogout={adminDashboard.clearSession}
      stats={adminDashboard.dashboard?.stats}
      title="Contact messages"
    >
      <ContactMessagesPanel
        isLoading={contact.isLoading}
        onDelete={contact.deleteContact}
        onOpenTicket={contact.setSelectedTicketId}
        onPageChange={contact.setPage}
        onReply={contact.reply}
        onStatusChange={contact.setStatus}
        onUpdateStatus={contact.updateStatus}
        pagination={contact.pagination}
        selectedThread={contact.selectedThread}
        selectedTicketId={contact.selectedTicketId}
        status={contact.status}
        tickets={contact.tickets}
        updatingTicketId={contact.updatingTicketId}
      />
    </AdminShell>
  )
}
