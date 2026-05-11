import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import {
  adminLogin,
  adminTokenKey,
  approveProviderApplication,
  getAdminDashboard,
  getAdminMe,
  getAdminReports,
  getAdminSupportTicket,
  getAdminSupportTickets,
  getProviderApplication,
  getProviderApplications,
  markAdminSupportTicketRead,
  rejectProviderApplication,
  resendProviderSetupEmail,
  saveProviderAdminNote,
  sendAdminSupportMessage,
  updateAdminReport,
  updateAdminSupportTicketStatus,
} from '../lib/adminApi'
import type {
  AdminReportAction,
  AdminReportStatus,
  AdminSupportTicketStatus,
  ProviderApplicationStatus,
} from '../types/admin'

type AdminDashboardOptions = {
  loadDashboard?: boolean
  loadProviders?: boolean
  loadReports?: boolean
  loadSupport?: boolean
  providerPerPage?: number
  reportPerPage?: number
  supportPerPage?: number
}

type ReportUpdatePayload = {
  action?: AdminReportAction
  action_note?: string
  status?: Exclude<AdminReportStatus, 'all'>
}

const adminQueryKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  me: ['admin', 'me'] as const,
  providers: (status: ProviderApplicationStatus, perPage: number) =>
    ['admin', 'providers', status, perPage] as const,
  reports: (status: AdminReportStatus, perPage: number) =>
    ['admin', 'reports', status, perPage] as const,
  root: ['admin'] as const,
  support: (status: AdminSupportTicketStatus, perPage: number) =>
    ['admin', 'support', status, perPage] as const,
}

export function useAdminDashboard({
  loadDashboard = true,
  loadProviders = true,
  loadReports = true,
  loadSupport = true,
  providerPerPage = 10,
  reportPerPage = 10,
  supportPerPage = 10,
}: AdminDashboardOptions = {}) {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const [token, setToken] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [reportStatus, setReportStatus] = useState<AdminReportStatus>('open')
  const [providerStatus, setProviderStatus] = useState<ProviderApplicationStatus>('pending')
  const [supportStatus, setSupportStatus] = useState<AdminSupportTicketStatus>('pending_admin')
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<number | null>(null)

  const isAuthenticated = Boolean(token)

  const clearSession = useCallback(() => {
    localStorage.removeItem(adminTokenKey)
    setToken('')
    queryClient.removeQueries({ queryKey: adminQueryKeys.root })
  }, [queryClient])

  const meQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: adminQueryKeys.me,
    queryFn: () => getAdminMe(token),
    retry: false,
    staleTime: 30_000,
  })

  const dashboardQuery = useQuery({
    enabled: isAuthenticated && loadDashboard,
    queryKey: adminQueryKeys.dashboard,
    queryFn: () => getAdminDashboard(token),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const providersQuery = useQuery({
    enabled: isAuthenticated && loadProviders,
    queryKey: adminQueryKeys.providers(providerStatus, providerPerPage),
    queryFn: () => getProviderApplications(token, providerStatus, providerPerPage),
    refetchInterval: 20_000,
    staleTime: 10_000,
  })

  const providerDetailQuery = useQuery({
    enabled: isAuthenticated && Boolean(selectedProviderId),
    queryKey: ['admin', 'provider', selectedProviderId],
    queryFn: () => getProviderApplication(token, selectedProviderId as number),
    staleTime: 10_000,
  })

  const reportsQuery = useQuery({
    enabled: isAuthenticated && loadReports,
    queryKey: adminQueryKeys.reports(reportStatus, reportPerPage),
    queryFn: () => getAdminReports(token, reportStatus, reportPerPage),
    refetchInterval: 20_000,
    staleTime: 10_000,
  })

  const supportQuery = useQuery({
    enabled: isAuthenticated && loadSupport,
    queryKey: adminQueryKeys.support(supportStatus, supportPerPage),
    queryFn: () => getAdminSupportTickets(token, supportStatus, supportPerPage),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const supportTicketDetailQuery = useQuery({
    enabled: isAuthenticated && Boolean(selectedSupportTicketId),
    queryKey: ['admin', 'support-ticket', selectedSupportTicketId],
    queryFn: () => getAdminSupportTicket(token, selectedSupportTicketId as number),
    staleTime: 5_000,
  })

  useEffect(() => {
    const hasAuthFailure = [
      meQuery.error,
      dashboardQuery.error,
      providersQuery.error,
      reportsQuery.error,
      supportQuery.error,
    ].some((error) => error instanceof Error && error.message.includes('expired'))

    if (!hasAuthFailure) return

    clearSession()
    showAlert({
      tone: 'error',
      title: 'Admin session expired',
      message: 'Please sign in again to continue.',
    })
  }, [
    clearSession,
    dashboardQuery.error,
    meQuery.error,
    providersQuery.error,
    reportsQuery.error,
    showAlert,
    supportQuery.error,
  ])

  const invalidateAdminWork = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard })
    queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      adminLogin(email, password),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Admin login failed',
        message: error instanceof Error ? error.message : 'Check the admin email and password.',
      })
    },
    onSuccess: (result) => {
      localStorage.setItem(adminTokenKey, result.token)
      setToken(result.token)
      queryClient.setQueryData(adminQueryKeys.me, result.user)
      showAlert({
        tone: 'success',
        title: 'Welcome back',
        message: 'Admin dashboard is ready.',
      })
    },
  })

  const approveProviderMutation = useMutation({
    mutationFn: (providerId: number) => approveProviderApplication(token, providerId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Approval failed',
        message: error instanceof Error ? error.message : 'The provider could not be approved.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Provider approved',
        message,
      })
      invalidateAdminWork()
    },
  })

  const rejectProviderMutation = useMutation({
    mutationFn: ({
      adminNote,
      providerId,
      reason,
    }: {
      adminNote?: string
      providerId: number
      reason: string
    }) => rejectProviderApplication(token, providerId, { admin_note: adminNote, reason }),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Reject failed',
        message: error instanceof Error ? error.message : 'The provider could not be rejected.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Provider rejected',
        message,
      })
      invalidateAdminWork()
      if (selectedProviderId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'provider', selectedProviderId] })
      }
    },
  })

  const saveProviderNoteMutation = useMutation({
    mutationFn: ({ note, providerId }: { note: string; providerId: number }) =>
      saveProviderAdminNote(token, providerId, note),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Note not saved',
        message: error instanceof Error ? error.message : 'Provider note could not be saved.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Provider note saved',
        message,
      })
      invalidateAdminWork()
      if (selectedProviderId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'provider', selectedProviderId] })
      }
    },
  })

  const resendSetupEmailMutation = useMutation({
    mutationFn: (providerId: number) => resendProviderSetupEmail(token, providerId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Setup email failed',
        message: error instanceof Error ? error.message : 'Provider setup email could not be resent.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Setup email sent',
        message,
      })
    },
  })

  const updateReportMutation = useMutation({
    mutationFn: ({ payload, reportId }: { payload: ReportUpdatePayload; reportId: number }) =>
      updateAdminReport(token, reportId, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Report update failed',
        message: error instanceof Error ? error.message : 'The report could not be updated.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Report updated',
        message,
      })
      invalidateAdminWork()
    },
  })

  const sendSupportReplyMutation = useMutation({
    mutationFn: ({ body, ticketId }: { body: string; ticketId: number }) =>
      sendAdminSupportMessage(token, ticketId, body),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Reply failed',
        message: error instanceof Error ? error.message : 'Support reply could not be sent.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Support reply sent',
        message,
      })
      invalidateAdminWork()
    },
  })

  const updateSupportStatusMutation = useMutation({
    mutationFn: ({
      status,
      ticketId,
    }: {
      status: Exclude<AdminSupportTicketStatus, 'all'>
      ticketId: number
    }) => updateAdminSupportTicketStatus(token, ticketId, status),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Support update failed',
        message: error instanceof Error ? error.message : 'Support ticket could not be updated.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Support ticket updated',
        message,
      })
      invalidateAdminWork()
    },
  })

  const markSupportReadMutation = useMutation({
    mutationFn: (ticketId: number) => markAdminSupportTicketRead(token, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
      if (selectedSupportTicketId) {
        queryClient.invalidateQueries({
          queryKey: ['admin', 'support-ticket', selectedSupportTicketId],
        })
      }
    },
  })

  const openSupportTicket = (ticketId: number) => {
    setSelectedSupportTicketId(ticketId)
    markSupportReadMutation.mutate(ticketId)
  }

  return {
    admin: meQuery.data ?? null,
    approvingId: approveProviderMutation.isPending ? approveProviderMutation.variables : null,
    approveProvider: (providerId: number) => approveProviderMutation.mutate(providerId),
    clearSession,
    dashboard: dashboardQuery.data ?? null,
    isAuthenticated,
    isLoading:
      meQuery.isFetching ||
      dashboardQuery.isFetching ||
      providersQuery.isFetching ||
      reportsQuery.isFetching ||
      supportQuery.isFetching,
    isLoggingIn: loginMutation.isPending,
    login: (email: string, password: string) => loginMutation.mutate({ email, password }),
    providerStatus,
    providers: providersQuery.data ?? [],
    rejectProvider: (providerId: number, reason: string, adminNote?: string) =>
      rejectProviderMutation.mutate({ adminNote, providerId, reason }),
    reports: reportsQuery.data ?? [],
    reportStatus,
    resendProviderSetupEmail: (providerId: number) => resendSetupEmailMutation.mutate(providerId),
    selectedSupportTicket: supportTicketDetailQuery.data ?? null,
    selectedSupportTicketId,
    saveProviderNote: (providerId: number, note: string) =>
      saveProviderNoteMutation.mutate({ note, providerId }),
    selectedProvider: providerDetailQuery.data ?? null,
    selectedProviderId,
    setSelectedProviderId,
    setProviderStatus,
    setReportStatus,
    setSupportStatus,
    sendSupportReply: (ticketId: number, body: string) =>
      sendSupportReplyMutation.mutate({ body, ticketId }),
    supportStatus,
    supportTickets: supportQuery.data ?? [],
    openSupportTicket,
    updateReport: (reportId: number, payload: ReportUpdatePayload) =>
      updateReportMutation.mutate({ payload, reportId }),
    updateSupportStatus: (
      ticketId: number,
      status: Exclude<AdminSupportTicketStatus, 'all'>,
    ) => updateSupportStatusMutation.mutate({ status, ticketId }),
    updatingReportId: updateReportMutation.isPending
      ? updateReportMutation.variables?.reportId ?? null
      : null,
    updatingSupportTicketId:
      sendSupportReplyMutation.isPending || updateSupportStatusMutation.isPending
        ? (sendSupportReplyMutation.variables?.ticketId ??
          updateSupportStatusMutation.variables?.ticketId ??
          null)
        : null,
    updatingProviderId:
      approveProviderMutation.isPending ||
      rejectProviderMutation.isPending ||
      saveProviderNoteMutation.isPending ||
      resendSetupEmailMutation.isPending
        ? (approveProviderMutation.variables ??
          rejectProviderMutation.variables?.providerId ??
          saveProviderNoteMutation.variables?.providerId ??
          resendSetupEmailMutation.variables ??
          null)
        : null,
  }
}
