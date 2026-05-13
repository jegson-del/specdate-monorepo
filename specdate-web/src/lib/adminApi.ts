import type {
  AdminReport,
  AdminReportAction,
  AdminMediaModerationItem,
  AdminMediaModerationStatus,
  AdminPagination,
  AdminReportStatus,
  AdminSupportTicket,
  AdminSupportTicketDetail,
  AdminSupportTicketStatus,
  AdminUser,
  AdminManagedUser,
  AdminUserRole,
  AdminUserStatus,
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
  const result = (await parseJson(response)) as ApiEnvelope<{
    user: AdminUser
    token: string
  }> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Check the admin email and password.'))
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
  perPage = 25,
) {
  const query = new URLSearchParams({ per_page: String(perPage) })
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

  return result.data.data
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
  perPage = 10,
) {
  const query = new URLSearchParams({ per_page: String(perPage) })
  if (status !== 'all') {
    query.set('status', status)
  }

  const response = await fetch(`${getApiBase()}/api/admin/providers?${query.toString()}`, {
    headers: adminHeaders(token),
  })
  const result = (await parseJson(response)) as ApiEnvelope<Paginated<ProviderApplication>> | null

  if (!response.ok || !result) {
    throw new Error(pickApiError(result, 'Provider applications could not be loaded.'))
  }

  return result.data.data
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

export async function getAdminReports(token: string, status: AdminReportStatus, perPage = 10) {
  const query = new URLSearchParams({ per_page: String(perPage) })
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

  return result.data.data
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

  return {
    items: result.data.data,
    pagination: {
      current_page: result.data.current_page ?? page,
      from: result.data.from ?? null,
      last_page: result.data.last_page ?? 1,
      per_page: result.data.per_page ?? perPage,
      to: result.data.to ?? null,
      total: result.data.total ?? result.data.data.length,
    } satisfies AdminPagination,
  }
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

export async function getAdminSupportTickets(
  token: string,
  status: AdminSupportTicketStatus,
  perPage = 10,
) {
  const query = new URLSearchParams({ per_page: String(perPage) })
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

  return result.data.data
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

async function adminUserAction(
  token: string,
  userId: number,
  action: string,
  payload: Record<string, string> | undefined,
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
