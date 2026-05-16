import { AdminLogin, AdminShell, ProviderInvitesPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useProviderInvites } from '../hooks/useProviderInvites'

export default function AdminProviderInvitesPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const providerInvites = useProviderInvites(Boolean(adminDashboard.admin?.admin_access?.can_manage_provider_invites))

  if (!adminDashboard.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  if (!adminDashboard.admin?.admin_access?.can_manage_provider_invites) {
    return (
      <AdminShell
        admin={adminDashboard.admin}
        onLogout={adminDashboard.clearSession}
        stats={adminDashboard.dashboard?.stats}
        title="Provider invites"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">No provider invite access</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ask an admin manager to enable provider invite access for this account.
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
      title="Provider invites"
    >
      <ProviderInvitesPanel
        actionInviteId={providerInvites.actionInviteId}
        invites={providerInvites.invites}
        isCreating={providerInvites.isCreating}
        isLoading={providerInvites.isLoading}
        onCreate={providerInvites.createInvite}
        onPageChange={providerInvites.setPage}
        onQueryChange={providerInvites.setQuery}
        onRevoke={providerInvites.onRevoke}
        pagination={providerInvites.pagination}
        query={providerInvites.query}
      />
    </AdminShell>
  )
}
