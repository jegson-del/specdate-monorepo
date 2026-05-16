import { AdminLogin, AdminManagementPanel, AdminShell } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminManagement } from '../hooks/useAdminManagement'

export default function AdminManagementPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const adminManagement = useAdminManagement()

  if (!adminDashboard.isAuthenticated || !adminManagement.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  if (!adminDashboard.admin?.admin_access?.can_manage_admin_users) {
    return (
      <AdminShell
        admin={adminDashboard.admin}
        onLogout={adminDashboard.clearSession}
        stats={adminDashboard.dashboard?.stats}
        title="Admin management"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">No admin management access</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ask another admin to enable admin management for this account.
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
      title="Admin management"
    >
      <AdminManagementPanel
        actionAdminId={adminManagement.actionAdminId}
        actionInviteId={adminManagement.actionInviteId}
        adminInvites={adminManagement.adminInvites}
        admins={adminManagement.admins}
        invitePagination={adminManagement.invitePagination}
        inviteQuery={adminManagement.inviteQuery}
        isCreatingInvite={adminManagement.isCreatingInvite}
        isLoading={adminManagement.isLoading}
        onApproveInvite={adminManagement.onApproveInvite}
        onCreateInvite={adminManagement.createAdminInvite}
        onInvitePageChange={adminManagement.setInvitePage}
        onInviteQueryChange={adminManagement.setInviteQuery}
        onPageChange={adminManagement.setPage}
        onQueryChange={adminManagement.setQuery}
        onRevokeInvite={adminManagement.onRevokeInvite}
        onSaveAccess={adminManagement.onSaveAccess}
        pagination={adminManagement.pagination}
        permissions={adminManagement.permissions}
        query={adminManagement.query}
      />
    </AdminShell>
  )
}
