import { useState } from 'react'
import type { AdminPagination, ProviderApplication, ProviderApplicationStatus } from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type ProviderApplicationsTableProps = {
  isLoading: boolean
  onApprove: (providerId: number) => void
  onOpenProvider: (providerId: number) => void
  onPageChange: (page: number) => void
  onReject: (providerId: number, reason: string, adminNote?: string) => void
  onResendSetupEmail: (providerId: number) => void
  onSaveNote: (providerId: number, note: string) => void
  onStatusChange: (status: ProviderApplicationStatus) => void
  pagination: AdminPagination | null
  providers: ProviderApplication[]
  selectedProvider: ProviderApplication | null
  selectedProviderId: number | null
  status: ProviderApplicationStatus
  updatingProviderId: number | null
}

export function ProviderApplicationsTable({
  isLoading,
  onApprove,
  onOpenProvider,
  onPageChange,
  onReject,
  onResendSetupEmail,
  onSaveNote,
  onStatusChange,
  pagination,
  providers,
  selectedProvider,
  selectedProviderId,
  status,
  updatingProviderId,
}: ProviderApplicationsTableProps) {
  return (
    <section id="providers" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Provider applications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review provider details, approve, reject, save internal notes, or resend setup email.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminPaginationSummary pagination={pagination} />
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ProviderApplicationStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providers.map((provider) => (
                <ProviderApplicationRow
                  key={provider.id}
                  isSelected={selectedProviderId === provider.id}
                  isUpdating={updatingProviderId === provider.id || isLoading}
                  onApprove={onApprove}
                  onOpenProvider={onOpenProvider}
                  provider={provider}
                />
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                    No provider applications in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ProviderDetailPanel
          key={selectedProvider?.id ?? 'empty'}
          isUpdating={Boolean(selectedProviderId && updatingProviderId === selectedProviderId)}
          onApprove={onApprove}
          onReject={onReject}
          onResendSetupEmail={onResendSetupEmail}
          onSaveNote={onSaveNote}
          provider={selectedProvider}
        />
      </div>
      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function ProviderApplicationRow({
  isSelected,
  isUpdating,
  onApprove,
  onOpenProvider,
  provider,
}: {
  isSelected: boolean
  isUpdating: boolean
  onApprove: (providerId: number) => void
  onOpenProvider: (providerId: number) => void
  provider: ProviderApplication
}) {
  return (
    <tr className={`align-top ${isSelected ? 'bg-pink-50/70' : ''}`}>
      <td className="px-5 py-4">
        <p className="font-black">{provider.business_name}</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
          {provider.notes || provider.address || 'No notes supplied'}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{provider.email}</p>
        <p className="mt-1 text-slate-500">{provider.phone}</p>
      </td>
      <td className="px-5 py-4">{provider.category}</td>
      <td className="px-5 py-4">
        {[provider.city, provider.country, provider.postcode].filter(Boolean).join(', ') ||
          'Not supplied'}
      </td>
      <td className="px-5 py-4">
        <ProviderStatusBadge status={provider.status} />
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(provider.created_at)}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <ProviderActionButton
            disabled={isUpdating}
            label="View"
            onClick={() => onOpenProvider(provider.id)}
          />
          {provider.status === 'pending' && (
            <ProviderActionButton
              disabled={isUpdating}
              label={isUpdating ? 'Approving...' : 'Approve'}
              onClick={() => onApprove(provider.id)}
              tone="primary"
            />
          )}
        </div>
      </td>
    </tr>
  )
}

function ProviderDetailPanel({
  isUpdating,
  onApprove,
  onReject,
  onResendSetupEmail,
  onSaveNote,
  provider,
}: {
  isUpdating: boolean
  onApprove: (providerId: number) => void
  onReject: (providerId: number, reason: string, adminNote?: string) => void
  onResendSetupEmail: (providerId: number) => void
  onSaveNote: (providerId: number, note: string) => void
  provider: ProviderApplication | null
}) {
  const [adminNote, setAdminNote] = useState(provider?.admin_note ?? '')
  const [rejectReason, setRejectReason] = useState(provider?.rejection_reason ?? '')

  if (!provider) {
    return (
      <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
        <p className="text-sm font-black text-slate-700">No provider selected</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select a provider application to inspect details and perform safer admin actions.
        </p>
      </aside>
    )
  }

  return (
    <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <ProviderStatusBadge status={provider.status} />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          #{provider.id}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-black text-slate-950">{provider.business_name}</h3>
      <div className="mt-4 space-y-3 text-sm">
        <DetailLine label="Email" value={provider.email} />
        <DetailLine label="Phone" value={provider.phone} />
        <DetailLine label="Category" value={provider.category} />
        <DetailLine
          label="Location"
          value={[provider.city, provider.country, provider.postcode].filter(Boolean).join(', ')}
        />
        <DetailLine label="Address" value={provider.address} />
        <DetailLine label="Submitted note" value={provider.notes} />
        <DetailLine label="Rejected reason" value={provider.rejection_reason} />
        <DetailLine label="Reviewed by" value={provider.reviewed_by?.email} />
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Internal admin note
        </span>
        <textarea
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          placeholder="Internal note for admins only..."
        />
      </label>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => onSaveNote(provider.id, adminNote)}
        className="mt-2 h-9 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save note
      </button>

      {provider.status === 'pending' && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Rejection reason
            </span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              placeholder="Reason required before rejecting..."
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProviderActionButton
              disabled={isUpdating}
              label="Approve"
              onClick={() => onApprove(provider.id)}
              tone="primary"
            />
            <ProviderActionButton
              disabled={isUpdating || rejectReason.trim().length < 3}
              label="Reject"
              onClick={() => onReject(provider.id, rejectReason.trim(), adminNote.trim())}
              tone="danger"
            />
          </div>
        </div>
      )}

      {provider.status === 'approved' && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <ProviderActionButton
            disabled={isUpdating}
            label="Resend setup email"
            onClick={() => onResendSetupEmail(provider.id)}
            tone="primary"
          />
        </div>
      )}
    </aside>
  )
}

function DetailLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-800">{value || 'Not supplied'}</p>
    </div>
  )
}

function ProviderActionButton({
  disabled,
  label,
  onClick,
  tone = 'default',
}: {
  disabled: boolean
  label: string
  onClick: () => void
  tone?: 'danger' | 'default' | 'primary'
}) {
  const className =
    tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-500'
      : tone === 'primary'
        ? 'bg-slate-950 text-white hover:bg-pink-600'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-950 hover:text-white'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  )
}

function ProviderStatusBadge({ status }: { status: ProviderApplication['status'] }) {
  const styles: Record<ProviderApplication['status'], string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-rose-100 text-rose-700',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{status}</span>
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
