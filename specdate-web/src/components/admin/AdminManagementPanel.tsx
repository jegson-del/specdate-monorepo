import { useState } from 'react'
import type { FormEvent } from 'react'
import type {
  AdminAccess,
  AdminAccessPermission,
  AdminInvite,
  AdminManagedAdmin,
  AdminPagination,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type AdminManagementPanelProps = {
  actionAdminId: number | null
  actionInviteId: number | null
  adminInvites: AdminInvite[]
  admins: AdminManagedAdmin[]
  invitePagination: AdminPagination | null
  inviteQuery: string
  isCreatingInvite: boolean
  isLoading: boolean
  onApproveInvite: (inviteId: number) => void
  onCreateInvite: (payload: { name?: string; email: string }) => void
  onPageChange: (page: number) => void
  onQueryChange: (query: string) => void
  onInvitePageChange: (page: number) => void
  onInviteQueryChange: (query: string) => void
  onRevokeInvite: (inviteId: number) => void
  onSaveAccess: (adminId: number, access: AdminAccess) => void
  pagination: AdminPagination | null
  permissions: AdminAccessPermission[]
  query: string
}

export function AdminManagementPanel({
  actionAdminId,
  actionInviteId,
  adminInvites,
  admins,
  invitePagination,
  inviteQuery,
  isCreatingInvite,
  isLoading,
  onApproveInvite,
  onCreateInvite,
  onInvitePageChange,
  onInviteQueryChange,
  onPageChange,
  onQueryChange,
  onRevokeInvite,
  onSaveAccess,
  pagination,
  permissions,
  query,
}: AdminManagementPanelProps) {
  return (
    <div className="space-y-6">
      <AdminInvitesPanel
        actionInviteId={actionInviteId}
        invites={adminInvites}
        isCreating={isCreatingInvite}
        isLoading={isLoading}
        onApprove={onApproveInvite}
        onCreate={onCreateInvite}
        onPageChange={onInvitePageChange}
        onQueryChange={onInviteQueryChange}
        onRevoke={onRevokeInvite}
        pagination={invitePagination}
        query={inviteQuery}
      />
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Admin management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage admin-only access flags. New access columns added on the backend appear here automatically.
            </p>
            <div className="mt-3">
              <AdminPaginationSummary pagination={pagination} />
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:w-80"
            placeholder="Search admins..."
            type="search"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Admin</th>
              {permissions.map((permission) => (
                <th key={permission.key} className="px-5 py-3">
                  {permission.label}
                </th>
              ))}
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <AdminAccessRow
                key={`${admin.id}-${accessSignature(admin.admin_access, permissions)}`}
                admin={admin}
                isUpdating={isLoading || actionAdminId === admin.id}
                onSaveAccess={onSaveAccess}
                permissions={permissions}
              />
            ))}
            {admins.length === 0 && (
              <tr>
                <td
                  colSpan={permissions.length + 2}
                  className="px-5 py-10 text-center text-sm font-bold text-slate-500"
                >
                  {isLoading ? 'Loading admins...' : 'No admin users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
    </div>
  )
}

function AdminInvitesPanel({
  actionInviteId,
  invites,
  isCreating,
  isLoading,
  onApprove,
  onCreate,
  onPageChange,
  onQueryChange,
  onRevoke,
  pagination,
  query,
}: {
  actionInviteId: number | null
  invites: AdminInvite[]
  isCreating: boolean
  isLoading: boolean
  onApprove: (inviteId: number) => void
  onCreate: (payload: { name?: string; email: string }) => void
  onPageChange: (page: number) => void
  onQueryChange: (query: string) => void
  onRevoke: (inviteId: number) => void
  pagination: AdminPagination | null
  query: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    onCreate({ name: name.trim() || undefined, email: email.trim() })
    setName('')
    setEmail('')
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Admin invites</h2>
            <p className="mt-1 text-sm text-slate-500">
              Invite admins, track registration, and approve dashboard access after email OTP setup.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:w-80"
            placeholder="Search invites..."
            type="search"
          />
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submit}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="Name optional"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="admin@example.com"
            type="email"
          />
          <button
            disabled={isCreating}
            className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {isCreating ? 'Sending...' : 'Send invite'}
          </button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Invitee</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td className="px-5 py-4">
                  <p className="font-black">{invite.name || 'Pending admin'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{invite.email}</p>
                </td>
                <td className="px-5 py-4 text-xs font-black uppercase text-slate-500">{invite.status.replace('_', ' ')}</td>
                <td className="px-5 py-4 text-xs font-bold text-slate-500">{formatDate(invite.expires_at)}</td>
                <td className="space-x-2 px-5 py-4">
                  {invite.status === 'awaiting_approval' ? (
                    <button
                      disabled={isLoading || actionInviteId === invite.id}
                      onClick={() => onApprove(invite.id)}
                      className="h-8 rounded-lg bg-pink-600 px-3 text-xs font-black text-white disabled:opacity-60"
                      type="button"
                    >
                      Approve
                    </button>
                  ) : null}
                  {['pending', 'awaiting_approval'].includes(invite.status) ? (
                    <button
                      disabled={isLoading || actionInviteId === invite.id}
                      onClick={() => onRevoke(invite.id)}
                      className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 disabled:opacity-60"
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                  {isLoading ? 'Loading invites...' : 'No admin invites found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function AdminAccessRow({
  admin,
  isUpdating,
  onSaveAccess,
  permissions,
}: {
  admin: AdminManagedAdmin
  isUpdating: boolean
  onSaveAccess: (adminId: number, access: AdminAccess) => void
  permissions: AdminAccessPermission[]
}) {
  const [access, setAccess] = useState<AdminAccess>(admin.admin_access)

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">{admin.name}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{admin.email}</p>
        <p className="mt-1 text-xs text-slate-400">Joined {formatDate(admin.created_at)}</p>
      </td>
      {permissions.map((permission) => (
        <td key={permission.key} className="px-5 py-4">
          <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
            <input
              checked={Boolean(access[permission.key])}
              onChange={(event) =>
                setAccess((current) => ({
                  ...current,
                  [permission.key]: event.target.checked,
                }))
              }
              type="checkbox"
              className="h-5 w-5 accent-pink-600"
            />
            <span>{access[permission.key] ? 'Enabled' : 'Off'}</span>
          </label>
        </td>
      ))}
      <td className="px-5 py-4">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onSaveAccess(admin.id, normalizeAccess(access, permissions))}
          className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save
        </button>
      </td>
    </tr>
  )
}

function normalizeAccess(access: AdminAccess, permissions: AdminAccessPermission[]) {
  return permissions.reduce<AdminAccess>((payload, permission) => {
    payload[permission.key] = Boolean(access[permission.key])
    return payload
  }, {})
}

function accessSignature(access: AdminAccess, permissions: AdminAccessPermission[]) {
  return permissions.map((permission) => `${permission.key}:${access[permission.key] ? 1 : 0}`).join('|')
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
