export type AdminUser = {
  id: number
  name: string
  email: string
  role: string
}

export type ProviderApplicationStatus = 'all' | 'pending' | 'approved' | 'rejected'

export type ProviderApplication = {
  id: number
  business_name: string
  email: string
  phone: string
  category: string
  city: string | null
  country: string | null
  postcode: string | null
  address: string | null
  notes: string | null
  admin_note: string | null
  rejection_reason: string | null
  status: Exclude<ProviderApplicationStatus, 'all'>
  rejected_at: string | null
  created_at: string
  reviewed_by: {
    id: number
    name: string
    email: string
  } | null
}

export type DashboardData = {
  stats: Record<string, number>
  provider_status: {
    pending: number
    approved: number
    total: number
  }
  voucher_status: Record<string, number>
  recent_providers: ProviderApplication[]
}

export type AdminReportStatus = 'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'

export type AdminReportAction = 'none' | 'hide_content' | 'suspend_user' | 'delete_media'

export type AdminMediaModerationStatus =
  | 'needs_review'
  | 'reported'
  | 'stale'
  | 'pending'
  | 'scanning'
  | 'manual_pending'
  | 'flagged'
  | 'failed'
  | 'approved'
  | 'hidden'

export type AdminMediaModerationItem = {
  id: number
  user: {
    id: number
    name: string
    username: string
    email: string
  } | null
  url: string
  file_path: string
  type: string
  mime_type: string | null
  size: number | null
  hidden_at: string | null
  hidden_reason: string | null
  moderation_status: string
  moderation_labels: unknown
  rekognition_job_id: string | null
  moderation_checked_at: string | null
  moderation_error: string | null
  reports_count: number
  open_reports_count: number
  reports: Array<{
    id: number
    reason: string
    details: string | null
    status: string
    created_at: string
    reporter: {
      id: number
      name: string
      username: string
    } | null
  }>
  created_at: string
}

export type AdminPagination = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export type AdminReport = {
  id: number
  target_type: string
  target_id: number
  reason: string
  details: string | null
  status: Exclude<AdminReportStatus, 'all'>
  action: AdminReportAction | null
  action_note: string | null
  created_at: string
  reporter: {
    id: number
    name: string
    username: string
  } | null
  reported_user: {
    id: number
    name: string
    username: string
  } | null
  reviewer: {
    id: number
    name: string
    username: string
  } | null
}

export type AdminModerationAppealStatus =
  | 'all'
  | 'open'
  | 'under_review'
  | 'granted'
  | 'denied'
  | 'closed'

export type AdminModerationAppeal = {
  id: number
  user_id: number
  case_id: number | null
  action_id: number | null
  status: Exclude<AdminModerationAppealStatus, 'all'>
  appeal_text: string
  decision_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  user: {
    id: number
    name: string
    username: string | null
    email: string
    role: string
    moderation_status: string
    strike_count: number
    is_paused: boolean
    suspended_until: string | null
    banned_at: string | null
  } | null
  action: {
    id: number
    case_id: number | null
    action: string
    reason: string | null
    metadata: unknown
    created_at: string
  } | null
  case: {
    id: number
    target_type: string | null
    target_id: number | null
    severity: string
    status: string
    summary: string | null
  } | null
  reviewed_by_user?: {
    id: number
    name: string
    username: string | null
    email: string
  } | null
}

export type AdminSupportTicketStatus =
  | 'all'
  | 'open'
  | 'pending_admin'
  | 'pending_user'
  | 'resolved'
  | 'closed'

export type AdminSupportTicket = {
  id: number
  user_id: number
  category: string
  subject: string
  status: Exclude<AdminSupportTicketStatus, 'all'>
  last_message_at: string | null
  resolved_at: string | null
  unread_count: number
  created_at: string
  user: {
    id: number
    name: string
    username: string
  } | null
}

export type AdminSupportMessage = {
  id: number
  support_ticket_id: number
  sender_id: number | null
  sender_role: 'admin' | 'user'
  body: string
  read_at: string | null
  created_at: string
  sender: {
    id: number
    name: string
    username: string
  } | null
}

export type AdminSupportTicketDetail = {
  ticket: AdminSupportTicket
  messages: AdminSupportMessage[]
  message_pagination: {
    has_more: boolean
    next_before_id: number | null
    per_page: number
  }
}

export type AdminUserStatus = 'all' | 'active' | 'paused' | 'banned'

export type AdminUserRole = 'all' | 'user' | 'provider' | 'admin'

export type AdminManagedUser = {
  id: number
  name: string
  username: string
  email: string
  mobile: string | null
  role: Exclude<AdminUserRole, 'all'>
  status: Exclude<AdminUserStatus, 'all'>
  is_paused: boolean
  banned_at: string | null
  ban_reason: string | null
  admin_note: string | null
  created_at: string
  provider_profile: {
    id: number
    company_name: string | null
    is_verified: boolean
    status: 'approved' | 'pending' | 'rejected'
  } | null
  banned_by: {
    id: number
    name: string
    email: string
  } | null
}
