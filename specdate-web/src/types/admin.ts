export type AdminUser = {
  admin_access?: AdminAccess | null
  id: number
  name: string
  email: string
  role: string
}

export type AdminAccess = {
  [key: string]: boolean
}

export type AdminAccessPermission = {
  key: string
  label: string
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
  case_id: number | null
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

export type AdminRiskUser = {
  id: number
  name: string
  username: string | null
  email: string
  mobile: string | null
  role: string
  moderation_status: string | null
  user_risk_score: number
  strike_count: number
  device_count: number
  ip_risk_events_count: number
  moderation_strikes_count: number
  reporter_risk_score: number
  false_report_count: number
  valid_report_count: number
  last_false_report_at: string | null
  last_valid_report_at: string | null
  created_at: string
}

export type AdminIpRiskEventType =
  | 'all'
  | 'report_rate_limit'
  | 'appeal_rate_limit'
  | 'false_report_pattern'

export type AdminRiskSeverity = 'all' | 'low' | 'medium' | 'high'

export type AdminIpRiskEvent = {
  id: number
  user_id: number | null
  ip_address: string
  event_type: Exclude<AdminIpRiskEventType, 'all'>
  severity: Exclude<AdminRiskSeverity, 'all'>
  score: number
  method: string | null
  path: string | null
  user_agent: string | null
  metadata: unknown
  occurred_at: string
  user: {
    id: number
    name: string
    username: string | null
    email: string
    role: string
    risk_score: number
    strike_count: number
  } | null
}

export type AdminUserRiskDetail = AdminRiskUser & {
  recent_ip_events: AdminIpRiskEvent[]
  recent_devices: Array<{
    id: number
    platform: string | null
    app_version: string | null
    device_model: string | null
    ip_address: string | null
    first_seen_at: string | null
    last_seen_at: string | null
    last_authenticated_at: string | null
  }>
}

export type AdminModerationCaseStatus =
  | 'all'
  | 'open'
  | 'under_review'
  | 'actioned'
  | 'dismissed'
  | 'appealed'
  | 'closed'

export type AdminModerationCaseSource = 'all' | 'report' | 'ai_media' | 'admin' | 'system'

export type AdminModerationCaseSeverity = 'all' | 'low' | 'medium' | 'high' | 'critical'

export type AdminModerationCaseUser = {
  id: number
  name: string
  username: string | null
  email: string
  role: string
  moderation_status?: string | null
  strike_count?: number | null
  is_paused?: boolean | null
  banned_at?: string | null
} | null

export type AdminModerationCase = {
  id: number
  subject_user_id: number | null
  opened_by_user_id: number | null
  assigned_admin_id: number | null
  source: Exclude<AdminModerationCaseSource, 'all'>
  target_type: string | null
  target_id: number | null
  severity: Exclude<AdminModerationCaseSeverity, 'all'>
  status: Exclude<AdminModerationCaseStatus, 'all'>
  summary: string | null
  opened_at: string | null
  closed_at: string | null
  created_at: string
  subject_user: AdminModerationCaseUser
  opened_by_user: AdminModerationCaseUser
  assigned_admin: AdminModerationCaseUser
  reports_count: number
  actions_count: number
  appeals_count: number
  strikes_count: number
}

export type AdminModerationCaseDetail = AdminModerationCase & {
  evidence: unknown
  reports: AdminReport[]
  actions: Array<{
    id: number
    user_id: number | null
    target_type: string | null
    target_id: number | null
    admin_id: number | null
    action: string
    reason: string | null
    metadata: unknown
    created_at: string
    user: AdminModerationCaseUser
    admin: AdminModerationCaseUser
  }>
  strikes: Array<{
    id: number
    user_id: number
    strike_number: number
    category: string
    severity: string
    reason: string
    active: boolean
    expires_at: string | null
    revoked_at: string | null
    revocation_reason: string | null
    created_at: string
    issued_by_user: AdminModerationCaseUser
    revoked_by_user: AdminModerationCaseUser
  }>
  appeals: Array<{
    id: number
    user_id: number
    action_id: number | null
    status: Exclude<AdminModerationAppealStatus, 'all'>
    appeal_text: string
    decision_note: string | null
    submitted_at: string | null
    reviewed_at: string | null
    user: AdminModerationCaseUser
    reviewed_by_user: AdminModerationCaseUser
  }>
}

export type AdminReport = {
  id: number
  case_id: number | null
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

export type AdminUserStatus = 'all' | 'active' | 'paused' | 'suspended' | 'banned'

export type AdminUserRole = 'all' | 'user' | 'provider'

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
  risk_score?: number
  strike_count?: number
  moderation_status?: string
  suspended_until?: string | null
  last_violation_at?: string | null
  risk_summary?: {
    user_risk_score: number
    strike_count: number
    device_count: number
    ip_risk_events_count: number
    false_report_count: number
    valid_report_count: number
    reporter_risk_score: number
    last_false_report_at: string | null
    last_valid_report_at: string | null
  }
}

export type AdminManagedAdmin = {
  id: number
  name: string
  username: string | null
  email: string
  role: 'admin'
  created_at: string
  admin_access: AdminAccess
}

export type AdminFinancialPeriod = 'all' | 'day' | 'week' | 'month' | 'custom'

export type AdminFinancialVoucherStatus =
  | 'all'
  | 'pending_provider'
  | 'active'
  | 'rejected'
  | 'redeemed'
  | 'cancelled'
  | 'completed'
  | 'expired'

export type AdminFinancialVoucherDateField =
  | 'created_at'
  | 'provider_decision_at'
  | 'redeemed_at'
  | 'spend_recorded_at'

export type AdminFinancialCreditType = 'all' | 'CREDIT' | 'DEBIT'

export type AdminFinancialUser = {
  id: number
  name: string
  username: string | null
  email: string
  role?: string
} | null

export type AdminFinancialVoucher = {
  id: number
  voucher_code: string
  date_code: string | null
  spec_date_id: number | null
  spec: {
    id: number
    title: string
    location_city: string | null
  } | null
  provider: {
    id: number
    user_id: number | null
    name: string | null
    email: string | null
    city: string | null
    country: string | null
    category: string | null
  } | null
  daters: {
    owner: AdminFinancialUser
    winner: AdminFinancialUser
  }
  requested_by: AdminFinancialUser
  status: Exclude<AdminFinancialVoucherStatus, 'all'>
  discount_percentage: number
  minimum_spend: number | null
  total_spent: number | null
  currency: string
  created_at: string
  provider_decision_at: string | null
  redeemed_at: string | null
  spend_recorded_at: string | null
  redeemed_by_provider: AdminFinancialUser
}

export type AdminFinancialVoucherSummary = {
  total_vouchers: number
  pending_provider: number
  active: number
  redeemed: number
  completed: number
  rejected: number
  cancelled: number
  expired: number
  spend_by_currency: Array<{
    currency: string
    voucher_count: number
    total_spent: number
    average_spent: number
  }>
}

export type AdminFinancialCreditTransaction = {
  id: number
  user: AdminFinancialUser
  type: Exclude<AdminFinancialCreditType, 'all'>
  item_type: string | null
  quantity: number
  amount: number | null
  currency: string | null
  purpose: string | null
  revenue_cat_transaction_id: string | null
  metadata: unknown
  created_at: string
}

export type AdminFinancialCreditSummary = {
  total_transactions: number
  credit_transactions: number
  debit_transactions: number
  credits_purchased_or_granted: number
  credits_spent: number
  net_credit_movement: number
  purchase_amount_by_currency: Array<{
    currency: string
    transaction_count: number
    total_amount: number
  }>
}

export type AdminFinancialAppliedFilters = {
  date_field?: AdminFinancialVoucherDateField
  from: string | null
  to: string | null
}
