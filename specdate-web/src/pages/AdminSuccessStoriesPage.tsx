import { AdminLogin, AdminShell, SuccessStoriesPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminSuccessStories } from '../hooks/useAdminSuccessStories'

export default function AdminSuccessStoriesPage() {
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const stories = useAdminSuccessStories()

  if (!adminDashboard.isAuthenticated || !stories.isAuthenticated) {
    return (
      <AdminLogin
        isSubmitting={adminDashboard.isLoggingIn}
        onLogin={adminDashboard.login}
      />
    )
  }

  if (!adminDashboard.admin?.admin_access?.can_manage_success_stories) {
    return (
      <AdminShell
        admin={adminDashboard.admin}
        onLogout={adminDashboard.clearSession}
        stats={adminDashboard.dashboard?.stats}
        title="Success stories"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">No success story access</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ask an admin manager to enable success story access for this account.
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
      title="Success stories"
    >
      <SuccessStoriesPanel
        isLoading={stories.isLoading}
        onCreate={stories.createStory}
        onDelete={stories.deleteStory}
        onPageChange={stories.setPage}
        onStatusChange={stories.setStatus}
        onUpdate={stories.updateStory}
        pagination={stories.pagination}
        status={stories.status}
        stories={stories.stories}
        updatingStoryId={stories.updatingStoryId}
      />
    </AdminShell>
  )
}
