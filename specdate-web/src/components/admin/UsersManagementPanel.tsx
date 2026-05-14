import { useEffect, useState } from 'react'
import type { AdminManagedUser, AdminPagination, AdminUserRole, AdminUserStatus } from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type UsersManagementPanelProps = {
  actionUserId: number | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onQueryChange: (query: string) => void
  onRoleChange: (role: AdminUserRole) => void
  onSaveNote: (userId: number, note: string) => void
  onSelectUser: (userId: number) => void
  onStatusChange: (status: AdminUserStatus) => void
  onUpdateUserStatus: (
    userId: number,
    action: 'ban' | 'pause' | 'unban' | 'unpause',
    reason?: string,
  ) => void
  pagination: AdminPagination | null
  query: string
  role: AdminUserRole
  selectedUser: AdminManagedUser | null
  selectedUserId: number | null
  status: AdminUserStatus
  users: AdminManagedUser[]
}

export function UsersManagementPanel({
  actionUserId,
  isLoading,
  onPageChange,
  onQueryChange,
  onRoleChange,
  onSaveNote,
  onSelectUser,
  onStatusChange,
  onUpdateUserStatus,
  pagination,
  query,
  role,
  selectedUser,
  selectedUserId,
  status,
  users,
}: UsersManagementPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black">Users</h2>
        <p className="mt-1 text-sm text-slate-500">
          Search users, inspect account state, pause accounts, ban severe cases, and save internal notes.
        </p>
        <div className="mt-3">
          <AdminPaginationSummary pagination={pagination} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="Search name, username, email, phone..."
            type="search"
          />
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as AdminUserRole)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="provider">Providers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as AdminUserStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  isSelected={selectedUserId === user.id}
                  isUpdating={isLoading || actionUserId === user.id}
                  onSelectUser={onSelectUser}
                  user={user}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <UserDetailPanel
          isUpdating={Boolean(selectedUserId && actionUserId === selectedUserId)}
          onSaveNote={onSaveNote}
          onUpdateUserStatus={onUpdateUserStatus}
          user={selectedUser}
        />
      </div>
      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function UserRow({
  isSelected,
  isUpdating,
  onSelectUser,
  user,
}: {
  isSelected: boolean
  isUpdating: boolean
  onSelectUser: (userId: number) => void
  user: AdminManagedUser
}) {
  return (
    <tr className={`align-top ${isSelected ? 'bg-pink-50/70' : ''}`}>
      <td className="px-5 py-4">
        <p className="font-black">{user.name}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">@{user.username}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{user.email}</p>
        <p className="mt-1 text-slate-500">{user.mobile || 'No phone'}</p>
      </td>
      <td className="px-5 py-4">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {user.role}
        </span>
      </td>
      <td className="px-5 py-4">
        <UserStatusBadge status={user.status} />
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(user.created_at)}</td>
      <td className="px-5 py-4">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onSelectUser(user.id)}
          className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          View
        </button>
      </td>
    </tr>
  )
}

function UserDetailPanel({
  isUpdating,
  onSaveNote,
  onUpdateUserStatus,
  user,
}: {
  isUpdating: boolean
  onSaveNote: (userId: number, note: string) => void
  onUpdateUserStatus: UsersManagementPanelProps['onUpdateUserStatus']
  user: AdminManagedUser | null
}) {
  const [note, setNote] = useState('')
  const [banReason, setBanReason] = useState('')

  useEffect(() => {
    setNote(user?.admin_note ?? '')
    setBanReason(user?.ban_reason ?? '')
  }, [user])

  if (!user) {
    return (
      <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
        <p className="text-sm font-black text-slate-700">No user selected</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select a user to inspect account details and take enforcement actions.
        </p>
      </aside>
    )
  }

  return (
    <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <UserStatusBadge status={user.status} />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {user.role}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black text-slate-950">{user.name}</h3>
      <div className="mt-4 space-y-3 text-sm">
        <DetailLine label="Username" value={`@${user.username}`} />
        <DetailLine label="Email" value={user.email} />
        <DetailLine label="Mobile" value={user.mobile} />
        <DetailLine label="Provider" value={user.provider_profile?.company_name} />
        {user.risk_summary && (
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Risk summary</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RiskMetric label="User score" value={user.risk_summary.user_risk_score} />
              <RiskMetric label="Reporter" value={user.risk_summary.reporter_risk_score} />
              <RiskMetric label="Devices" value={user.risk_summary.device_count} />
              <RiskMetric label="IP events" value={user.risk_summary.ip_risk_events_count} />
              <RiskMetric label="False reports" value={user.risk_summary.false_report_count} />
              <RiskMetric label="Strikes" value={user.risk_summary.strike_count} />
            </div>
          </div>
        )}
        <DetailLine label="Ban reason" value={user.ban_reason} />
        <DetailLine label="Banned by" value={user.banned_by?.email} />
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Internal admin note
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          placeholder="Internal note for admins only..."
        />
      </label>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => onSaveNote(user.id, note)}
        className="mt-2 h-9 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save note
      </button>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Enforcement
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.status === 'active' && (
            <UserActionButton
              disabled={isUpdating}
              label="Pause"
              onClick={() => onUpdateUserStatus(user.id, 'pause')}
            />
          )}
          {user.status === 'paused' && (
            <UserActionButton
              disabled={isUpdating}
              label="Unpause"
              onClick={() => onUpdateUserStatus(user.id, 'unpause')}
            />
          )}
          {user.status === 'banned' && (
            <UserActionButton
              disabled={isUpdating}
              label="Unban"
              onClick={() => onUpdateUserStatus(user.id, 'unban')}
            />
          )}
        </div>
        {user.status !== 'banned' && (
          <div className="mt-4">
            <textarea
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              placeholder="Reason required before banning..."
            />
            <UserActionButton
              disabled={isUpdating || banReason.trim().length < 3}
              label="Ban user"
              onClick={() => onUpdateUserStatus(user.id, 'ban', banReason.trim())}
              tone="danger"
            />
          </div>
        )}
      </div>
    </aside>
  )
}

function UserActionButton({
  disabled,
  label,
  onClick,
  tone = 'default',
}: {
  disabled: boolean
  label: string
  onClick: () => void
  tone?: 'danger' | 'default'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mt-2 h-9 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === 'danger'
          ? 'bg-rose-600 text-white hover:bg-rose-500'
          : 'bg-slate-950 text-white hover:bg-pink-600'
      }`}
    >
      {label}
    </button>
  )
}

function UserStatusBadge({ status }: { status: AdminManagedUser['status'] }) {
  const styles: Record<AdminManagedUser['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700',
    banned: 'bg-rose-100 text-rose-700',
    paused: 'bg-amber-100 text-amber-800',
    suspended: 'bg-orange-100 text-orange-800',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{status}</span>
}

function DetailLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-800">{value || 'Not supplied'}</p>
    </div>
  )
}

function RiskMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
