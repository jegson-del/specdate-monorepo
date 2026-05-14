import type { ReactNode } from 'react'
import type {
  AdminIpRiskEvent,
  AdminIpRiskEventType,
  AdminPagination,
  AdminRiskSeverity,
  AdminRiskUser,
  AdminUserRiskDetail,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type RiskManagementPanelProps = {
  ipEvents: AdminIpRiskEvent[]
  ipEventsPagination: AdminPagination | null
  ipEventType: AdminIpRiskEventType
  ipQuery: string
  ipSeverity: AdminRiskSeverity
  ipUserId: string
  onIpEventTypeChange: (eventType: AdminIpRiskEventType) => void
  onIpPageChange: (page: number) => void
  onIpQueryChange: (query: string) => void
  onIpSeverityChange: (severity: AdminRiskSeverity) => void
  onIpUserIdChange: (userId: string) => void
  onOpenRiskUser: (userId: number) => void
  onRiskUserPageChange: (page: number) => void
  onRiskUserQueryChange: (query: string) => void
  riskUserQuery: string
  riskUsers: AdminRiskUser[]
  riskUsersPagination: AdminPagination | null
  selectedRiskUser: AdminUserRiskDetail | null
  selectedRiskUserId: number | null
}

const eventTypeOptions: AdminIpRiskEventType[] = [
  'all',
  'report_rate_limit',
  'appeal_rate_limit',
  'false_report_pattern',
]
const severityOptions: AdminRiskSeverity[] = ['all', 'high', 'medium', 'low']

export function RiskManagementPanel({
  ipEvents,
  ipEventsPagination,
  ipEventType,
  ipQuery,
  ipSeverity,
  ipUserId,
  onIpEventTypeChange,
  onIpPageChange,
  onIpQueryChange,
  onIpSeverityChange,
  onIpUserIdChange,
  onOpenRiskUser,
  onRiskUserPageChange,
  onRiskUserQueryChange,
  riskUserQuery,
  riskUsers,
  riskUsersPagination,
  selectedRiskUser,
  selectedRiskUserId,
}: RiskManagementPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black">Risk users</h2>
              <p className="mt-1 text-sm text-slate-500">
                Users with strikes, reporter risk, device activity, or IP risk signals.
              </p>
              <div className="mt-3">
                <AdminPaginationSummary pagination={riskUsersPagination} />
              </div>
            </div>
            <input
              value={riskUserQuery}
              onChange={(event) => onRiskUserQueryChange(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:w-80"
              placeholder="Search risk users..."
              type="search"
            />
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Scores</th>
                  <th className="px-5 py-3">Reports</th>
                  <th className="px-5 py-3">Signals</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskUsers.map((user) => (
                  <RiskUserRow
                    key={user.id}
                    isSelected={selectedRiskUserId === user.id}
                    onOpenRiskUser={onOpenRiskUser}
                    user={user}
                  />
                ))}
                {riskUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                      No risk users in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <RiskUserDetail user={selectedRiskUser} />
        </div>

        <AdminPaginationBar onPageChange={onRiskUserPageChange} pagination={riskUsersPagination} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-black">IP risk events</h2>
              <p className="mt-1 text-sm text-slate-500">
                Rate-limit and false-report signals grouped by user, IP, and event type.
              </p>
              <div className="mt-3">
                <AdminPaginationSummary pagination={ipEventsPagination} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_140px_170px_120px]">
              <RiskSelect value={ipEventType} options={eventTypeOptions} onChange={onIpEventTypeChange} />
              <RiskSelect value={ipSeverity} options={severityOptions} onChange={onIpSeverityChange} />
              <input
                value={ipQuery}
                onChange={(event) => onIpQueryChange(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                placeholder="IP search"
              />
              <input
                value={ipUserId}
                onChange={(event) => onIpUserIdChange(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                placeholder="User ID"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Occurred</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ipEvents.map((event) => (
                <IpEventRow key={event.id} event={event} onOpenRiskUser={onOpenRiskUser} />
              ))}
              {ipEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                    No IP risk events in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPaginationBar onPageChange={onIpPageChange} pagination={ipEventsPagination} />
      </section>
    </div>
  )
}

function RiskUserRow({
  isSelected,
  onOpenRiskUser,
  user,
}: {
  isSelected: boolean
  onOpenRiskUser: (userId: number) => void
  user: AdminRiskUser
}) {
  return (
    <tr className={`align-top ${isSelected ? 'bg-pink-50/70' : ''}`}>
      <td className="px-5 py-4">
        <p className="font-black">{user.username || user.name}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{user.email}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">User: {user.user_risk_score}</p>
        <p className="mt-1 text-slate-500">Reporter: {user.reporter_risk_score}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{user.false_report_count} false</p>
        <p className="mt-1 text-slate-500">{user.valid_report_count} valid</p>
      </td>
      <td className="px-5 py-4">
        <p>{user.device_count} devices</p>
        <p>{user.ip_risk_events_count} IP events</p>
        <p>{user.strike_count} strikes</p>
      </td>
      <td className="px-5 py-4">
        <RiskBadge value={user.moderation_status || 'active'} tone={user.strike_count > 0 ? 'warning' : 'neutral'} />
      </td>
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => onOpenRiskUser(user.id)}
          className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600"
        >
          Inspect
        </button>
      </td>
    </tr>
  )
}

function IpEventRow({
  event,
  onOpenRiskUser,
}: {
  event: AdminIpRiskEvent
  onOpenRiskUser: (userId: number) => void
}) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <RiskBadge value={event.event_type} tone={event.severity === 'high' ? 'danger' : 'warning'} />
        <p className="mt-2 text-xs font-bold text-slate-500">Score {event.score}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{event.user?.username || event.user?.name || `User #${event.user_id ?? 'N/A'}`}</p>
        <p className="mt-1 text-slate-500">{event.user?.email || 'No email'}</p>
        {event.user_id && (
          <button
            type="button"
            onClick={() => onOpenRiskUser(event.user_id as number)}
            className="mt-2 text-xs font-black text-pink-700 hover:text-pink-500"
          >
            Inspect user
          </button>
        )}
      </td>
      <td className="px-5 py-4 font-bold">{event.ip_address}</td>
      <td className="px-5 py-4">
        <p className="font-bold">{event.method || 'N/A'}</p>
        <p className="mt-1 max-w-xs truncate text-slate-500">{event.path || 'No path'}</p>
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(event.occurred_at)}</td>
    </tr>
  )
}

function RiskUserDetail({ user }: { user: AdminUserRiskDetail | null }) {
  if (!user) {
    return (
      <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
        <p className="text-sm font-black text-slate-700">No risk user selected</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select a user to inspect recent devices and IP risk events.
        </p>
      </aside>
    )
  }

  return (
    <aside className="space-y-5 border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
      <div>
        <RiskBadge value={user.moderation_status || 'active'} tone="warning" />
        <h3 className="mt-3 text-lg font-black">{user.username || user.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="User score" value={user.user_risk_score} />
        <Metric label="Reporter score" value={user.reporter_risk_score} />
        <Metric label="False reports" value={user.false_report_count} />
        <Metric label="IP events" value={user.ip_risk_events_count} />
      </div>

      <DetailList title="Recent devices">
        {user.recent_devices.length > 0 ? (
          user.recent_devices.map((device) => (
            <p key={device.id} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
              <span className="font-black text-slate-900">{device.platform || 'unknown'} {device.device_model || ''}</span>
              <br />
              {device.ip_address || 'No IP'} - seen {formatDate(device.last_seen_at)}
            </p>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">No device fingerprints captured.</p>
        )}
      </DetailList>

      <DetailList title="Recent IP events">
        {user.recent_ip_events.length > 0 ? (
          user.recent_ip_events.map((event) => (
            <p key={event.id} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
              <span className="font-black text-slate-900">{labelize(event.event_type)}</span>
              <br />
              {event.ip_address} - score {event.score} - {formatDate(event.occurred_at)}
            </p>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">No IP events recorded.</p>
        )}
      </DetailList>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

function DetailList({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  )
}

function RiskSelect<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void
  options: T[]
  value: T
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labelize(option)}
        </option>
      ))}
    </select>
  )
}

function RiskBadge({ tone, value }: { tone: 'danger' | 'neutral' | 'warning'; value: string }) {
  const styles = {
    danger: 'bg-rose-100 text-rose-700',
    neutral: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-100 text-amber-800',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}>{labelize(value)}</span>
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
