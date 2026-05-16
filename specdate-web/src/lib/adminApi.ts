import type {
  AdminReport,
  AdminReportAction,
  AdminFinancialAppliedFilters,
  AdminFinancialCreditSummary,
  AdminFinancialCreditTransaction,
  AdminFinancialCreditType,
  AdminFinancialPeriod,
  AdminFinancialVoucher,
  AdminFinancialVoucherDateField,
  AdminFinancialVoucherStatus,
  AdminFinancialVoucherSummary,
  AdminAccess,
  AdminAccessPermission,
  AdminInvite,
  AdminContactMessage,
  AdminContactThread,
  AdminContactTicket,
  AdminManagedAdmin,
  AdminMediaModerationItem,
  AdminMediaModerationStatus,
  AdminIpRiskEvent,
  AdminIpRiskEventType,
  AdminModerationAppeal,
  AdminModerationAppealStatus,
  AdminModerationCase,
  AdminModerationCaseDetail,
  AdminModerationCaseSeverity,
  AdminModerationCaseSource,
  AdminModerationCaseStatus,
  AdminPagination,
  AdminReportStatus,
  AdminRiskSeverity,
  AdminRiskUser,
  AdminSupportTicket,
  AdminSupportTicketDetail,
  AdminSupportTicketStatus,
  AdminSuccessStory,
  AdminSuccessStoryPayload,
  AdminSuccessStoryStatus,
  AdminUser,
  AdminManagedUser,
  ProviderInvite,
  AdminUserRole,
  AdminUserStatus,
  AdminUserRiskDetail,
  DashboardData,
  ProviderApplication,
  ProviderApplicationStatus,
} from '../types/admin'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

type Paginated<T> = {
  data: T[]
  current_page?: number
  from?: number | null
  last_page?: number
  per_page?: number
  to?: number | null
  total?: number
}

export type AdminLoginChallenge = {
  email: string
  expires_in: number
  login_challenge: string
  requires_otp: true
}

export type AdminLoginSession = {
  user: AdminUser
  token: string
}

export type AdminLoginResult = AdminLoginChallenge | AdminLoginSession

export type AdminFinancialVoucherFilters = {
  date?: string
  dateField: AdminFinancialVoucherDateField
  from?: string
  month?: string
  period: AdminFinancialPeriod
  providerIds: number[]
  status: AdminFinancialVoucherStatus
  to?: string
}

export type AdminFinancialCreditFilters = {
  currency?: string
  date?: string
  from?: string
  itemType?: string
  month?: string
  period: AdminFinancialPeriod
  to?: string
  type: AdminFinancialCreditType
  userId?: string
}

export const adminTokenKey = 'dateusher_admin_token'

export function getApiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

export function pickApiError(result: unknown, fallback: string) {
  if (!result || typeof result !== 'object') return fallback
  const response = result as { message?: string }
  return response.message || fallback
}

async function parseJson(response: Response) {
  return response.json().catch(() => null)
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${getApiBase()}/api/admin/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminLoginChallenge> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Check the admin email and password.'))
  }

  return result.data
}

export async function verifyAdminLoginOtp(
  email: string,
  loginChallenge: string,
  otpCode: string,
) {
  const response = await fetch(`${getApiBase()}/api/admin/login/verify-otp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      login_challenge: loginChallenge,
      otp_code: otpCode,
    }),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminLoginSession> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Check the admin verification code.'))
  }

  return result.data
}

export async function getAdminMe(token: string) {
  const response = await fetch(`${getApiBase()}/api/admin/me`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminUser> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin session expired.'))
  }

  return result.data
}

export async function getAdminDashboard(token: string) {
  const response = await fetch(`${getApiBase()}/api/admin/dashboard`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<DashboardData> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Dashboard data could not be loaded.'))
  }

  return result.data
}

export async function getAdminUsers(
  token: string,
  filters: { q?: string; role: AdminUserRole; status: AdminUserStatus },
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (filters.q) {
    query.set('q', filters.q)
  }
  if (filters.role !== 'all') {
    query.set('role', filters.role)
  }
  if (filters.status !== 'all') {
    query.set('status', filters.status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/users?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminManagedUser>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Users could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminRiskUsers(token: string, q = '', page = 1, perPage = 25) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) {
    query.set('q', q)
  }

  const response = await fetch(`${getApiBase()}/api/admin/risk/users?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminRiskUser>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Risk users could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminIpRiskEvents(
  token: string,
  filters: {
    eventType: AdminIpRiskEventType
    ip?: string
    severity: AdminRiskSeverity
    userId?: string
  },
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (filters.eventType !== 'all') {
    query.set('event_type', filters.eventType)
  }
  if (filters.severity !== 'all') {
    query.set('severity', filters.severity)
  }
  if (filters.ip) {
    query.set('ip', filters.ip)
  }
  if (filters.userId) {
    query.set('user_id', filters.userId)
  }

  const response = await fetch(`${getApiBase()}/api/admin/risk/ip-events?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminIpRiskEvent>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'IP risk events could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminUserRisk(token: string, userId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/users/${userId}/risk`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminUserRiskDetail> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'User risk detail could not be loaded.'))
  }

  return result.data
}

export async function getAdminUser(token: string, userId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/users/${userId}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminManagedUser> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'User could not be loaded.'))
  }

  return result.data
}

export async function getAdminManagedAdmins(token: string, q = '', page = 1, perPage = 25) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) {
    query.set('q', q)
  }

  const response = await fetch(`${getApiBase()}/api/admin/management/admins?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminManagedAdmin>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admins could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminAccessPermissions(token: string) {
  const response = await fetch(`${getApiBase()}/api/admin/management/permissions`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminAccessPermission[]> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin access permissions could not be loaded.'))
  }

  return result.data
}

export async function updateManagedAdminAccess(token: string, adminId: number, access: AdminAccess) {
  const response = await fetch(`${getApiBase()}/api/admin/management/admins/${adminId}/access`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(access),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Admin access could not be updated.'))
  }

  return result?.message || 'Admin access updated.'
}

export async function getAdminInvites(token: string, q = '', page = 1, perPage = 25) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) query.set('q', q)

  const response = await fetch(`${getApiBase()}/api/admin/management/admin-invites?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminInvite>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin invites could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function createAdminInvite(token: string, payload: { name?: string; email: string }) {
  const response = await fetch(`${getApiBase()}/api/admin/management/admin-invites`, {
    method: 'POST',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminInvite> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin invite could not be sent.'))
  }

  return result.data
}

export async function approveAdminInvite(token: string, inviteId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/management/admin-invites/${inviteId}/approve`, {
    method: 'POST',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminInvite> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin invite could not be approved.'))
  }

  return result.data
}

export async function revokeAdminInvite(token: string, inviteId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/management/admin-invites/${inviteId}/revoke`, {
    method: 'POST',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminInvite> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Admin invite could not be revoked.'))
  }

  return result.data
}

export async function getProviderInvites(token: string, q = '', page = 1, perPage = 25) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) query.set('q', q)

  const response = await fetch(`${getApiBase()}/api/admin/provider-invites?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<ProviderInvite>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider invites could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function createProviderInvite(
  token: string,
  payload: {
    provider_name: string
    email: string
    service_type?: string
    personal_message?: string
  },
) {
  const response = await fetch(`${getApiBase()}/api/admin/provider-invites`, {
    method: 'POST',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as ApiEnvelope<ProviderInvite> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider invite could not be sent.'))
  }

  return result.data
}

export async function revokeProviderInvite(token: string, inviteId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/provider-invites/${inviteId}/revoke`, {
    method: 'POST',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<ProviderInvite> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider invite could not be revoked.'))
  }

  return result.data
}

export async function getAdminFinancialVouchers(
  token: string,
  filters: AdminFinancialVoucherFilters,
  page = 1,
  perPage = 25,
) {
  const query = financialQuery(filters, page, perPage)
  if (filters.status !== 'all') {
    query.set('status', filters.status)
  }
  if (filters.dateField) {
    query.set('date_field', filters.dateField)
  }
  filters.providerIds.forEach((providerId) => {
    query.append('provider_ids[]', String(providerId))
  })

  const response = await fetch(`${getApiBase()}/api/admin/financials/vouchers?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<{
    filters: AdminFinancialAppliedFilters
    summary: AdminFinancialVoucherSummary
    vouchers: Paginated<AdminFinancialVoucher>
  }> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Voucher financials could not be loaded.'))
  }

  return {
    ...paginatedResult(result.data.vouchers, page, perPage),
    filters: result.data.filters,
    summary: result.data.summary,
  }
}

export async function getAdminFinancialCredits(
  token: string,
  filters: AdminFinancialCreditFilters,
  page = 1,
  perPage = 25,
) {
  const query = financialQuery(filters, page, perPage)
  if (filters.type !== 'all') {
    query.set('type', filters.type)
  }
  if (filters.itemType) {
    query.set('item_type', filters.itemType)
  }
  if (filters.userId && /^\d+$/.test(filters.userId)) {
    query.set('user_id', filters.userId)
  }

  const response = await fetch(`${getApiBase()}/api/admin/financials/credits?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<{
    filters: AdminFinancialAppliedFilters
    summary: AdminFinancialCreditSummary
    transactions: Paginated<AdminFinancialCreditTransaction>
  }> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Credit financials could not be loaded.'))
  }

  return {
    ...paginatedResult(result.data.transactions, page, perPage),
    filters: result.data.filters,
    summary: result.data.summary,
  }
}

export async function updateAdminUserNote(token: string, userId: number, adminNote: string) {
  return adminUserAction(token, userId, 'note', { admin_note: adminNote }, 'User note could not be saved.')
}

export async function pauseAdminUser(token: string, userId: number) {
  return adminUserAction(token, userId, 'pause', undefined, 'User could not be paused.')
}

export async function unpauseAdminUser(token: string, userId: number) {
  return adminUserAction(token, userId, 'unpause', undefined, 'User could not be unpaused.')
}

export async function banAdminUser(token: string, userId: number, reason: string) {
  return adminUserAction(token, userId, 'ban', { reason }, 'User could not be banned.')
}

export async function unbanAdminUser(token: string, userId: number) {
  return adminUserAction(token, userId, 'unban', undefined, 'User could not be unbanned.')
}

export async function getProviderApplications(
  token: string,
  status: ProviderApplicationStatus,
  page = 1,
  perPage = 10,
  filters: { country?: string; q?: string } = {},
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }
  if (filters.q?.trim()) {
    query.set('q', filters.q.trim())
  }
  if (filters.country?.trim()) {
    query.set('country', filters.country.trim())
  }

  const response = await fetch(`${getApiBase()}/api/admin/providers?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<ProviderApplication>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider applications could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getProviderApplication(token: string, providerId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/providers/${providerId}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<ProviderApplication> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider application could not be loaded.'))
  }

  return result.data
}

function paginatedResult<T>(result: Paginated<T>, page: number, perPage: number) {
  return {
    items: result.data,
    pagination: {
      current_page: result.current_page ?? page,
      from: result.from ?? null,
      last_page: result.last_page ?? 1,
      per_page: result.per_page ?? perPage,
      to: result.to ?? null,
      total: result.total ?? result.data.length,
    } satisfies AdminPagination,
  }
}

export async function getAdminReports(
  token: string,
  status: AdminReportStatus,
  page = 1,
  perPage = 10,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/reports?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminReport>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Moderation reports could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminMediaModerationQueue(
  token: string,
  status: AdminMediaModerationStatus,
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  query.set('status', status)

  const response = await fetch(`${getApiBase()}/api/admin/media-moderation?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminMediaModerationItem>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Media moderation queue could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function approveAdminMedia(token: string, mediaId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/media-moderation/${mediaId}/approve`, {
    method: 'PATCH',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Media could not be approved.'))
  }

  return result?.message || 'Media approved.'
}

export async function updateAdminReport(
  token: string,
  reportId: number,
  payload: {
    action?: AdminReportAction
    action_note?: string
    status?: Exclude<AdminReportStatus, 'all'>
  },
) {
  const response = await fetch(`${getApiBase()}/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'The report could not be updated.'))
  }

  return result?.message || 'Moderation report updated.'
}

export async function getAdminModerationAppeals(
  token: string,
  status: AdminModerationAppealStatus,
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/moderation/appeals?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminModerationAppeal>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Moderation appeals could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminModerationCases(
  token: string,
  filters: {
    q?: string
    severity: AdminModerationCaseSeverity
    source: AdminModerationCaseSource
    status: AdminModerationCaseStatus
  },
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (filters.q) {
    query.set('q', filters.q)
  }
  if (filters.status !== 'all') {
    query.set('status', filters.status)
  }
  if (filters.source !== 'all') {
    query.set('source', filters.source)
  }
  if (filters.severity !== 'all') {
    query.set('severity', filters.severity)
  }

  const response = await fetch(`${getApiBase()}/api/admin/moderation/cases?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminModerationCase>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Moderation cases could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminModerationCase(token: string, caseId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/moderation/cases/${caseId}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminModerationCaseDetail> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Moderation case could not be loaded.'))
  }

  return result.data
}

export async function updateAdminModerationCase(
  token: string,
  caseId: number,
  payload: {
    note?: string
    status: Exclude<AdminModerationCaseStatus, 'all' | 'open' | 'appealed'>
  },
) {
  const response = await fetch(`${getApiBase()}/api/admin/moderation/cases/${caseId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminModerationCaseDetail> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Moderation case could not be updated.'))
  }

  return result.data
}

export async function decideAdminModerationAppeal(
  token: string,
  appealId: number,
  payload: { status: 'granted' | 'denied'; decision_note: string },
) {
  const response = await fetch(`${getApiBase()}/api/admin/moderation/appeals/${appealId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Appeal decision could not be saved.'))
  }

  return result?.message || 'Appeal decision saved.'
}

export async function getAdminSupportTickets(
  token: string,
  status: AdminSupportTicketStatus,
  page = 1,
  perPage = 10,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/support/tickets?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminSupportTicket>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Support tickets could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminContactTickets(
  token: string,
  status: AdminSupportTicketStatus,
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/contact?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminContactTicket>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Contact messages could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function getAdminContactThread(token: string, ticketId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/contact/${ticketId}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminContactThread> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Contact thread could not be loaded.'))
  }

  return result.data
}

export async function replyAdminContact(token: string, ticketId: number, body: string) {
  const response = await fetch(`${getApiBase()}/api/admin/contact/${ticketId}/reply`, {
    method: 'POST',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminContactMessage> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Contact reply could not be sent.'))
  }

  return result.data
}

export async function updateAdminContactStatus(
  token: string,
  ticketId: number,
  status: Exclude<AdminSupportTicketStatus, 'all'>,
) {
  const response = await fetch(`${getApiBase()}/api/admin/contact/${ticketId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminContactTicket> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Contact status could not be updated.'))
  }

  return result.data
}

export async function deleteAdminContact(token: string, ticketId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/contact/${ticketId}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Contact message could not be deleted.'))
  }

  return result?.message || 'Contact message deleted.'
}

export async function getAdminSuccessStories(
  token: string,
  status: AdminSuccessStoryStatus,
  page = 1,
  perPage = 25,
) {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/success-stories?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<AdminSuccessStory>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Success stories could not be loaded.'))
  }

  return paginatedResult(result.data, page, perPage)
}

export async function createAdminSuccessStory(token: string, payload: AdminSuccessStoryPayload) {
  const response = await fetch(`${getApiBase()}/api/admin/success-stories`, {
    method: 'POST',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminSuccessStory> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Success story could not be created.'))
  }

  return result.data
}

export async function updateAdminSuccessStory(
  token: string,
  storyId: number,
  payload: Partial<AdminSuccessStoryPayload>,
) {
  const response = await fetch(`${getApiBase()}/api/admin/success-stories/${storyId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminSuccessStory> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Success story could not be updated.'))
  }

  return result.data
}

export async function deleteAdminSuccessStory(token: string, storyId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/success-stories/${storyId}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  })
  const result = await parseJson(response)

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Success story could not be deleted.'))
  }

  return (result as { message?: string } | null)?.message || 'Success story deleted.'
}

export async function getAdminSupportTicket(token: string, ticketId: number) {
  const response = await fetch(`${getApiBase()}/api/support/tickets/${ticketId}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<AdminSupportTicketDetail> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Support ticket could not be loaded.'))
  }

  return result.data
}

export async function markAdminSupportTicketRead(token: string, ticketId: number) {
  const response = await fetch(`${getApiBase()}/api/support/tickets/${ticketId}/read`, {
    method: 'POST',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Support ticket could not be marked as read.'))
  }

  return result?.message || 'Support ticket marked as read.'
}

export async function sendAdminSupportMessage(token: string, ticketId: number, body: string) {
  const response = await fetch(`${getApiBase()}/api/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Support reply could not be sent.'))
  }

  return result?.message || 'Support reply sent.'
}

export async function updateAdminSupportTicketStatus(
  token: string,
  ticketId: number,
  status: Exclude<AdminSupportTicketStatus, 'all'>,
) {
  const response = await fetch(`${getApiBase()}/api/support/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Support ticket status could not be updated.'))
  }

  return result?.message || 'Support ticket updated.'
}

export async function approveProviderApplication(token: string, providerId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/providers/${providerId}/approve`, {
    method: 'PATCH',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'The provider could not be approved.'))
  }

  return result?.message || 'The provider can now complete setup.'
}

export async function rejectProviderApplication(
  token: string,
  providerId: number,
  payload: { admin_note?: string; reason: string },
) {
  const response = await fetch(`${getApiBase()}/api/admin/providers/${providerId}/reject`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'The provider could not be rejected.'))
  }

  return result?.message || 'Provider application rejected.'
}

export async function saveProviderAdminNote(token: string, providerId: number, adminNote: string) {
  const response = await fetch(`${getApiBase()}/api/admin/providers/${providerId}/note`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ admin_note: adminNote }),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Provider note could not be saved.'))
  }

  return result?.message || 'Provider admin note saved.'
}

export async function resendProviderSetupEmail(token: string, providerId: number) {
  const response = await fetch(`${getApiBase()}/api/admin/providers/${providerId}/resend-setup-email`, {
    method: 'POST',
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, 'Provider setup email could not be resent.'))
  }

  return result?.message || 'Provider setup email resent.'
}

function adminHeaders(token: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function financialQuery(
  filters: AdminFinancialCreditFilters | AdminFinancialVoucherFilters,
  page: number,
  perPage: number,
) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  const currency = 'currency' in filters ? filters.currency?.trim().toUpperCase() : ''

  if (currency && currency.length === 3) {
    query.set('currency', currency)
  }
  if (filters.period !== 'all' && filters.period !== 'custom') {
    query.set('period', filters.period)
  }
  if ((filters.period === 'day' || filters.period === 'week') && filters.date) {
    query.set('date', filters.date)
  }
  if (filters.period === 'month' && filters.month) {
    query.set('month', filters.month)
  }
  if (filters.period === 'custom') {
    if (filters.from) {
      query.set('from', filters.from)
    }
    if (filters.to) {
      query.set('to', filters.to)
    }
  }

  return query
}

async function adminUserAction(
  token: string,
  userId: number,
  action: string,
  payload: Record<string, boolean | string> | undefined,
  fallback: string,
) {
  const response = await fetch(`${getApiBase()}/api/admin/users/${userId}/${action}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(token),
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  const result = (await parseJson(response)) as { message?: string } | null

  if (!response.ok) {
    throw new Error(pickApiError(result, fallback))
  }

  return result?.message || 'User updated.'
}
