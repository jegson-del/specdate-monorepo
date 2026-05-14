import { AdminLogin, AdminShell, UsersManagementPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { useAdminUsers } from '../hooks/useAdminUsers'

export default function AdminUsersPage() {
  const adminDashboard = useAdminDashboard({
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
  })
  const adminUsers = useAdminUsers()

  if (!adminDashboard.isAuthenticated || !adminUsers.isAuthenticated) {
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
      title="Users"
    >
      <UsersManagementPanel
        actionUserId={adminUsers.actionUserId}
        isLoading={adminUsers.isLoading}
        onPageChange={adminUsers.setPage}
        onQueryChange={adminUsers.setQuery}
        onRoleChange={adminUsers.setRole}
        onSaveNote={adminUsers.saveNote}
        onSelectUser={adminUsers.setSelectedUserId}
        onStatusChange={adminUsers.setStatus}
        onUpdateUserStatus={adminUsers.updateUserStatus}
        pagination={adminUsers.pagination}
        query={adminUsers.query}
        role={adminUsers.role}
        selectedUser={adminUsers.selectedUser}
        selectedUserId={adminUsers.selectedUserId}
        status={adminUsers.status}
        users={adminUsers.users}
      />
    </AdminShell>
  )
}
