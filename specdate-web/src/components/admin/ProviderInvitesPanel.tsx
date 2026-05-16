import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AdminPagination, ProviderInvite } from '../../types/admin'
import { AdminPaginationBar } from './AdminPaginationBar'

type Props = {
  actionInviteId: number | null
  invites: ProviderInvite[]
  isCreating: boolean
  isLoading: boolean
  onCreate: (payload: {
    provider_name: string
    email: string
    service_type?: string
    personal_message?: string
  }) => void
  onPageChange: (page: number) => void
  onQueryChange: (query: string) => void
  onRevoke: (inviteId: number) => void
  pagination: AdminPagination | null
  query: string
}

const serviceTypes = ['', 'restaurant', 'hotel', 'spa', 'venue', 'experience', 'other']

export function ProviderInvitesPanel({
  actionInviteId,
  invites,
  isCreating,
  isLoading,
  onCreate,
  onPageChange,
  onQueryChange,
  onRevoke,
  pagination,
  query,
}: Props) {
  const [providerName, setProviderName] = useState('')
  const [email, setEmail] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!providerName.trim() || !email.trim()) return
    onCreate({
      provider_name: providerName.trim(),
      email: email.trim(),
      service_type: serviceType || undefined,
      personal_message: message.trim() || undefined,
    })
    setProviderName('')
    setEmail('')
    setServiceType('')
    setMessage('')
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Provider invites</h2>
            <p className="mt-1 text-sm text-slate-500">
              Send branded marketing invites to venues and track whether they register.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:w-80"
            placeholder="Search provider invites..."
            type="search"
          />
        </div>
        <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]" onSubmit={submit}>
          <input
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="Provider name"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="provider@example.com"
            type="email"
          />
          <select
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          >
            {serviceTypes.map((value) => (
              <option key={value} value={value}>
                {value ? value : 'Service optional'}
              </option>
            ))}
          </select>
          <button
            disabled={isCreating}
            className="h-10 rounded-lg bg-pink-600 px-4 text-xs font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {isCreating ? 'Sending...' : 'Send invite'}
          </button>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:col-span-4"
            placeholder="Optional personal note shown in the email"
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Service</th>
              <th className="px-5 py-3">Invite status</th>
              <th className="px-5 py-3">Sent</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Completed</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td className="px-5 py-4">
                  <p className="font-black">{invite.provider_name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{invite.email}</p>
                </td>
                <td className="px-5 py-4 text-xs font-bold text-slate-500">{invite.service_type || 'Any'}</td>
                <td className="px-5 py-4">
                  <ProviderInviteStatusBadge status={invite.status} />
                  <p className="mt-1 text-xs font-semibold text-slate-500">{providerInviteStatusText(invite)}</p>
                </td>
                <td className="px-5 py-4 text-xs font-bold text-slate-500">{formatDate(invite.created_at)}</td>
                <td className="px-5 py-4 text-xs font-bold text-slate-500">{formatDate(invite.expires_at)}</td>
                <td className="px-5 py-4 text-xs font-bold text-slate-500">
                  {invite.accepted_at ? `Accepted ${formatDate(invite.accepted_at)}` : null}
                  {invite.revoked_at ? `Revoked ${formatDate(invite.revoked_at)}` : null}
                  {!invite.accepted_at && !invite.revoked_at ? '-' : null}
                </td>
                <td className="px-5 py-4">
                  {invite.status === 'pending' ? (
                    <button
                      disabled={isLoading || actionInviteId === invite.id}
                      onClick={() => onRevoke(invite.id)}
                      className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 disabled:opacity-60"
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{providerInviteActionText(invite.status)}</span>
                  )}
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                  {isLoading ? 'Loading invites...' : 'No provider invites found.'}
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

function ProviderInviteStatusBadge({ status }: { status: ProviderInvite['status'] }) {
  const styles: Record<ProviderInvite['status'], string> = {
    accepted: 'border-green-200 bg-green-50 text-green-700',
    expired: 'border-amber-200 bg-amber-50 text-amber-700',
    pending: 'border-blue-200 bg-blue-50 text-blue-700',
    revoked: 'border-slate-200 bg-slate-100 text-slate-600',
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}

function providerInviteStatusText(invite: ProviderInvite) {
  if (invite.status === 'accepted') return 'Provider used the invite and submitted an application.'
  if (invite.status === 'revoked') return 'Invite link was disabled by admin.'
  if (invite.status === 'expired') return 'Invite link expired before registration.'
  return 'Invite link sent and still usable.'
}

function providerInviteActionText(status: ProviderInvite['status']) {
  if (status === 'accepted') return 'Tracked in applications'
  if (status === 'revoked') return 'No active link'
  if (status === 'expired') return 'Expired'
  return ''
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
