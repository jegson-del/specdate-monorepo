import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import { setStoredAdminToken, useAdminToken } from './useAdminToken'
import { useAdminRealtime } from './useAdminRealtime'
import {
  adminLogin,
  approveAdminMedia,
  approveProviderApplication,
  decideAdminModerationAppeal,
  getAdminActivity,
  getAdminDashboard,
  getAdminMediaModerationQueue,
  getAdminMe,
  getAdminModerationAppeals,
  getAdminModerationCase,
  getAdminModerationCases,
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
  updateAdminModerationCase,
  updateAdminReport,
  updateAdminSupportTicketStatus,
  verifyAdminLoginOtp,
} from '../lib/adminApi'
import type { AdminLoginResult } from '../lib/adminApi'
import type {
  AdminMediaModerationStatus,
  AdminModerationAppealStatus,
  AdminModerationCaseSeverity,
  AdminModerationCaseSource,
  AdminModerationCaseStatus,
  AdminReportAction,
  AdminReportStatus,
  AdminSupportTicketStatus,
  ProviderApplicationStatus,
} from '../types/admin'

type AdminDashboardOptions = {
  loadDashboard?: boolean
  loadMediaModeration?: boolean
  loadModerationAppeals?: boolean
  loadModerationCases?: boolean
  loadProviders?: boolean
  loadReports?: boolean
  loadSupport?: boolean
  mediaPerPage?: number
  moderationAppealPerPage?: number
  moderationCasePerPage?: number
  providerPerPage?: number
  reportPerPage?: number
  supportPerPage?: number
}

type ReportUpdatePayload = {
  action?: AdminReportAction
  action_note?: string
  status?: Exclude<AdminReportStatus, 'all'>
}

type CaseUpdatePayload = {
  note?: string
  status: Exclude<AdminModerationCaseStatus, 'all' | 'open' | 'appealed'>
}

type AdminLoginVariables = {
  email: string
  loginChallenge?: string
  otpCode?: string
  password: string
}

const adminQueryKeys = {
  activity: ['admin', 'activity'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  me: ['admin', 'me'] as const,
  providers: (status: ProviderApplicationStatus, page: number, perPage: number) =>
    ['admin', 'providers', status, page, perPage] as const,
  reports: (status: AdminReportStatus, page: number, perPage: number) =>
    ['admin', 'reports', status, page, perPage] as const,
  mediaModeration: (status: AdminMediaModerationStatus, page: number, perPage: number) =>
    ['admin', 'media-moderation', status, page, perPage] as const,
  moderationAppeals: (status: AdminModerationAppealStatus, page: number, perPage: number) =>
    ['admin', 'moderation-appeals', status, page, perPage] as const,
  moderationCases: (
    status: AdminModerationCaseStatus,
    source: AdminModerationCaseSource,
    severity: AdminModerationCaseSeverity,
    query: string,
    page: number,
    perPage: number,
  ) => ['admin', 'moderation-cases', status, source, severity, query, page, perPage] as const,
  root: ['admin'] as const,
  support: (status: AdminSupportTicketStatus, page: number, perPage: number) =>
    ['admin', 'support', status, page, perPage] as const,
}

export function useAdminDashboard({
  loadDashboard = true,
  loadMediaModeration = false,
  loadModerationAppeals = false,
  loadModerationCases = false,
  loadProviders = true,
  loadReports = true,
  loadSupport = true,
  mediaPerPage = 25,
  moderationAppealPerPage = 25,
  moderationCasePerPage = 25,
  providerPerPage = 10,
  reportPerPage = 10,
  supportPerPage = 10,
}: AdminDashboardOptions = {}) {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const token = useAdminToken()
  const [mediaStatus, setMediaStatus] = useState<AdminMediaModerationStatus>('needs_review')
  const [moderationAppealStatus, setModerationAppealStatus] =
    useState<AdminModerationAppealStatus>('open')
  const [moderationCaseSeverity, setModerationCaseSeverity] =
    useState<AdminModerationCaseSeverity>('all')
  const [moderationCaseSource, setModerationCaseSource] =
    useState<AdminModerationCaseSource>('all')
  const [moderationCaseStatus, setModerationCaseStatus] =
    useState<AdminModerationCaseStatus>('open')
  const [moderationCaseQuery, setModerationCaseQuery] = useState('')
  const [mediaPage, setMediaPage] = useState(1)
  const [moderationAppealPage, setModerationAppealPage] = useState(1)
  const [moderationCasePage, setModerationCasePage] = useState(1)
  const [selectedModerationCaseId, setSelectedModerationCaseId] = useState<number | null>(null)
  const [providerPage, setProviderPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const [supportPage, setSupportPage] = useState(1)
  const [reportStatus, setReportStatus] = useState<AdminReportStatus>('open')
  const [providerStatus, setProviderStatus] = useState<ProviderApplicationStatus>('pending')
  const [supportStatus, setSupportStatus] = useState<AdminSupportTicketStatus>('pending_admin')
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<number | null>(null)
  const previousMediaNeedsReviewRef = useRef<number | null>(null)

  const isAuthenticated = Boolean(token)

  useAdminRealtime({
    enabled: isAuthenticated,
    queryClient,
    showAlert,
    token,
  })

  const clearSession = useCallback(() => {
    setStoredAdminToken('')
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
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const activityQuery = useQuery({
    enabled: isAuthenticated && loadDashboard,
    queryKey: adminQueryKeys.activity,
    queryFn: () => getAdminActivity(token, 25),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const providersQuery = useQuery({
    enabled: isAuthenticated && loadProviders,
    queryKey: adminQueryKeys.providers(providerStatus, providerPage, providerPerPage),
    queryFn: () => getProviderApplications(token, providerStatus, providerPage, providerPerPage),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const providerDetailQuery = useQuery({
    enabled: isAuthenticated && Boolean(selectedProviderId),
    queryKey: ['admin', 'provider', selectedProviderId],
    queryFn: () => getProviderApplication(token, selectedProviderId as number),
    staleTime: 10_000,
  })

  const reportsQuery = useQuery({
    enabled: isAuthenticated && loadReports,
    queryKey: adminQueryKeys.reports(reportStatus, reportPage, reportPerPage),
    queryFn: () => getAdminReports(token, reportStatus, reportPage, reportPerPage),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const mediaModerationQuery = useQuery({
    enabled: isAuthenticated && loadMediaModeration,
    queryKey: adminQueryKeys.mediaModeration(mediaStatus, mediaPage, mediaPerPage),
    queryFn: () => getAdminMediaModerationQueue(token, mediaStatus, mediaPage, mediaPerPage),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const moderationAppealsQuery = useQuery({
    enabled: isAuthenticated && loadModerationAppeals,
    queryKey: adminQueryKeys.moderationAppeals(
      moderationAppealStatus,
      moderationAppealPage,
      moderationAppealPerPage,
    ),
    queryFn: () =>
      getAdminModerationAppeals(
        token,
        moderationAppealStatus,
        moderationAppealPage,
        moderationAppealPerPage,
      ),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const moderationCasesQuery = useQuery({
    enabled: isAuthenticated && loadModerationCases,
    queryKey: adminQueryKeys.moderationCases(
      moderationCaseStatus,
      moderationCaseSource,
      moderationCaseSeverity,
      moderationCaseQuery,
      moderationCasePage,
      moderationCasePerPage,
    ),
    queryFn: () =>
      getAdminModerationCases(
        token,
        {
          q: moderationCaseQuery,
          severity: moderationCaseSeverity,
          source: moderationCaseSource,
          status: moderationCaseStatus,
        },
        moderationCasePage,
        moderationCasePerPage,
      ),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const moderationCaseDetailQuery = useQuery({
    enabled: isAuthenticated && Boolean(selectedModerationCaseId),
    queryKey: ['admin', 'moderation-case', selectedModerationCaseId],
    queryFn: () => getAdminModerationCase(token, selectedModerationCaseId as number),
    staleTime: 10_000,
  })

  const supportQuery = useQuery({
    enabled: isAuthenticated && loadSupport,
    queryKey: adminQueryKeys.support(supportStatus, supportPage, supportPerPage),
    queryFn: () => getAdminSupportTickets(token, supportStatus, supportPage, supportPerPage),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const supportTicketDetailQuery = useQuery({
    enabled: isAuthenticated && Boolean(selectedSupportTicketId),
    queryKey: ['admin', 'support-ticket', selectedSupportTicketId],
    queryFn: () => getAdminSupportTicket(token, selectedSupportTicketId as number),
    staleTime: 5_000,
  })

  useEffect(() => {
    const hasAuthFailure = [
      activityQuery.error,
      meQuery.error,
      dashboardQuery.error,
      mediaModerationQuery.error,
      moderationAppealsQuery.error,
      moderationCasesQuery.error,
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
    activityQuery.error,
    clearSession,
    dashboardQuery.error,
    mediaModerationQuery.error,
    moderationAppealsQuery.error,
    moderationCasesQuery.error,
    meQuery.error,
    providersQuery.error,
    reportsQuery.error,
    showAlert,
    supportQuery.error,
  ])

  useEffect(() => {
    if (!isAuthenticated || !dashboardQuery.data) return

    const current = dashboardQuery.data.stats.media_needs_review ?? 0
    const previous = previousMediaNeedsReviewRef.current
    previousMediaNeedsReviewRef.current = current

    if (previous === null || current <= previous) return

    const increase = current - previous
    showAlert({
      tone: 'warning',
      title: 'New upload moderation case',
      message: `${increase} new upload${increase === 1 ? '' : 's'} need admin review.`,
    })
  }, [dashboardQuery.data, isAuthenticated, showAlert])

  const invalidateAdminWork = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard })
    queryClient.invalidateQueries({ queryKey: ['admin', 'media-moderation'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-appeals'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-cases'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
  }, [queryClient])

  const loginMutation = useMutation<AdminLoginResult, Error, AdminLoginVariables>({
    mutationFn: ({
      email,
      loginChallenge,
      otpCode,
      password,
    }) =>
      loginChallenge && otpCode
        ? verifyAdminLoginOtp(email, loginChallenge, otpCode)
        : adminLogin(email, password),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Admin login failed',
        message: error instanceof Error ? error.message : 'Check the admin login details.',
      })
    },
    onSuccess: (result) => {
      if (result.requires_otp === true) {
        showAlert({
          tone: 'success',
          title: 'Check your email',
          message: 'Enter the admin verification code to finish signing in.',
        })
        return
      }

      setStoredAdminToken(result.token)
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

  const updateModerationCaseMutation = useMutation({
    mutationFn: ({
      caseId,
      payload,
    }: {
      caseId: number
      payload: CaseUpdatePayload
    }) => updateAdminModerationCase(token, caseId, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Case update failed',
        message: error instanceof Error ? error.message : 'Moderation case could not be updated.',
      })
    },
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(['admin', 'moderation-case', updatedCase.id], updatedCase)
      showAlert({
        tone: 'success',
        title: 'Case updated',
        message: 'Moderation case decision saved.',
      })
      invalidateAdminWork()
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-case'] })
    },
  })

  const decideAppealMutation = useMutation({
    mutationFn: ({
      appealId,
      decisionNote,
      status,
    }: {
      appealId: number
      decisionNote: string
      status: 'granted' | 'denied'
    }) =>
      decideAdminModerationAppeal(token, appealId, {
        status,
        decision_note: decisionNote,
      }),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Appeal decision failed',
        message: error instanceof Error ? error.message : 'Appeal decision could not be saved.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Appeal decision saved',
        message,
      })
      invalidateAdminWork()
    },
  })

  const approveMediaMutation = useMutation({
    mutationFn: (mediaId: number) => approveAdminMedia(token, mediaId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Media approval failed',
        message: error instanceof Error ? error.message : 'Media could not be approved.',
      })
    },
    onSuccess: (message) => {
      showAlert({
        tone: 'success',
        title: 'Media approved',
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

  const changeMediaStatus = (status: AdminMediaModerationStatus) => {
    setMediaStatus(status)
    setMediaPage(1)
  }

  const changeModerationAppealStatus = (status: AdminModerationAppealStatus) => {
    setModerationAppealStatus(status)
    setModerationAppealPage(1)
  }

  const changeModerationCaseStatus = (status: AdminModerationCaseStatus) => {
    setModerationCaseStatus(status)
    setModerationCasePage(1)
  }

  const changeModerationCaseSource = (source: AdminModerationCaseSource) => {
    setModerationCaseSource(source)
    setModerationCasePage(1)
  }

  const changeModerationCaseSeverity = (severity: AdminModerationCaseSeverity) => {
    setModerationCaseSeverity(severity)
    setModerationCasePage(1)
  }

  const changeModerationCaseQuery = (query: string) => {
    setModerationCaseQuery(query)
    setModerationCasePage(1)
  }

  const changeProviderStatus = (status: ProviderApplicationStatus) => {
    setProviderStatus(status)
    setProviderPage(1)
  }

  const changeReportStatus = (status: AdminReportStatus) => {
    setReportStatus(status)
    setReportPage(1)
  }

  const changeSupportStatus = (status: AdminSupportTicketStatus) => {
    setSupportStatus(status)
    setSupportPage(1)
  }

  return {
    admin: meQuery.data ?? null,
    activityItems: activityQuery.data?.items ?? [],
    approvingId: approveProviderMutation.isPending ? approveProviderMutation.variables : null,
    approveProvider: (providerId: number) => approveProviderMutation.mutate(providerId),
    clearSession,
    dashboard: dashboardQuery.data ?? null,
    isAuthenticated,
    isLoading:
      meQuery.isFetching ||
      activityQuery.isFetching ||
      dashboardQuery.isFetching ||
      mediaModerationQuery.isFetching ||
      moderationAppealsQuery.isFetching ||
      moderationCasesQuery.isFetching ||
      moderationCaseDetailQuery.isFetching ||
      providersQuery.isFetching ||
      reportsQuery.isFetching ||
      supportQuery.isFetching,
    isLoggingIn: loginMutation.isPending,
    login: (
      email: string,
      password: string,
      otpCode?: string,
      loginChallenge?: string,
    ) => loginMutation.mutateAsync({ email, loginChallenge, otpCode, password }),
    approveMedia: (mediaId: number) => approveMediaMutation.mutate(mediaId),
    approvingMediaId: approveMediaMutation.isPending ? approveMediaMutation.variables : null,
    mediaModerationItems: mediaModerationQuery.data?.items ?? [],
    moderationAppeals: moderationAppealsQuery.data?.items ?? [],
    moderationAppealPagination: moderationAppealsQuery.data?.pagination ?? null,
    moderationAppealPage,
    moderationAppealStatus,
    moderationCases: moderationCasesQuery.data?.items ?? [],
    moderationCasePagination: moderationCasesQuery.data?.pagination ?? null,
    moderationCasePage,
    moderationCaseQuery,
    moderationCaseSeverity,
    moderationCaseSource,
    moderationCaseStatus,
    selectedModerationCase: moderationCaseDetailQuery.data ?? null,
    selectedModerationCaseId,
    mediaPagination: mediaModerationQuery.data?.pagination ?? null,
    mediaPage,
    mediaStatus,
    providerPagination: providersQuery.data?.pagination ?? null,
    providerPage,
    providerStatus,
    providers: providersQuery.data?.items ?? [],
    rejectProvider: (providerId: number, reason: string, adminNote?: string) =>
      rejectProviderMutation.mutate({ adminNote, providerId, reason }),
    reports: reportsQuery.data?.items ?? [],
    reportPagination: reportsQuery.data?.pagination ?? null,
    reportPage,
    reportStatus,
    resendProviderSetupEmail: (providerId: number) => resendSetupEmailMutation.mutate(providerId),
    selectedSupportTicket: supportTicketDetailQuery.data ?? null,
    selectedSupportTicketId,
    saveProviderNote: (providerId: number, note: string) =>
      saveProviderNoteMutation.mutate({ note, providerId }),
    selectedProvider: providerDetailQuery.data ?? null,
    selectedProviderId,
    setSelectedProviderId,
    setProviderPage,
    setProviderStatus: changeProviderStatus,
    setMediaPage,
    setMediaStatus: changeMediaStatus,
    setModerationAppealPage,
    setModerationAppealStatus: changeModerationAppealStatus,
    setModerationCasePage,
    setModerationCaseQuery: changeModerationCaseQuery,
    setModerationCaseSeverity: changeModerationCaseSeverity,
    setModerationCaseSource: changeModerationCaseSource,
    setModerationCaseStatus: changeModerationCaseStatus,
    setReportPage,
    setReportStatus: changeReportStatus,
    setSelectedModerationCaseId,
    setSupportPage,
    setSupportStatus: changeSupportStatus,
    sendSupportReply: (ticketId: number, body: string) =>
      sendSupportReplyMutation.mutate({ body, ticketId }),
    supportStatus,
    supportPagination: supportQuery.data?.pagination ?? null,
    supportPage,
    supportTickets: supportQuery.data?.items ?? [],
    openSupportTicket,
    updateReport: (reportId: number, payload: ReportUpdatePayload) =>
      updateReportMutation.mutate({ payload, reportId }),
    updateModerationCase: (caseId: number, payload: CaseUpdatePayload) =>
      updateModerationCaseMutation.mutate({ caseId, payload }),
    updatingModerationCaseId: updateModerationCaseMutation.isPending
      ? updateModerationCaseMutation.variables?.caseId ?? null
      : null,
    decideAppeal: (appealId: number, status: 'granted' | 'denied', decisionNote: string) =>
      decideAppealMutation.mutate({ appealId, decisionNote, status }),
    updatingAppealId: decideAppealMutation.isPending
      ? decideAppealMutation.variables?.appealId ?? null
      : null,
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
