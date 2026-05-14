import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLogin, AdminShell, ModerationCasesPanel } from '../components/admin'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export default function AdminModerationCasesPage() {
  const [searchParams] = useSearchParams()
  const adminDashboard = useAdminDashboard({
    loadMediaModeration: false,
    loadModerationCases: true,
    loadProviders: false,
    loadReports: false,
    loadSupport: false,
    moderationCasePerPage: 25,
  })
  const requestedCaseId = Number(searchParams.get('case') || 0)
  const selectedModerationCaseId = adminDashboard.selectedModerationCaseId
  const setSelectedModerationCaseId = adminDashboard.setSelectedModerationCaseId

  useEffect(() => {
    if (requestedCaseId > 0 && selectedModerationCaseId !== requestedCaseId) {
      setSelectedModerationCaseId(requestedCaseId)
    }
  }, [requestedCaseId, selectedModerationCaseId, setSelectedModerationCaseId])

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
      title="Moderation cases"
    >
      <ModerationCasesPanel
        cases={adminDashboard.moderationCases}
        onCaseQueryChange={adminDashboard.setModerationCaseQuery}
        onOpenCase={adminDashboard.setSelectedModerationCaseId}
        onPageChange={adminDashboard.setModerationCasePage}
        onSeverityChange={adminDashboard.setModerationCaseSeverity}
        onSourceChange={adminDashboard.setModerationCaseSource}
        onStatusChange={adminDashboard.setModerationCaseStatus}
        pagination={adminDashboard.moderationCasePagination}
        query={adminDashboard.moderationCaseQuery}
        selectedCase={adminDashboard.selectedModerationCase}
        selectedCaseId={adminDashboard.selectedModerationCaseId}
        severity={adminDashboard.moderationCaseSeverity}
        source={adminDashboard.moderationCaseSource}
        status={adminDashboard.moderationCaseStatus}
      />
    </AdminShell>
  )
}
