import { useState } from 'react'
import type {
  AdminModerationAppeal,
  AdminModerationAppealStatus,
  AdminPagination,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type ModerationAppealsPanelProps = {
  appeals: AdminModerationAppeal[]
  onDecideAppeal: (appealId: number, status: 'granted' | 'denied', decisionNote: string) => void
  onPageChange: (page: number) => void
  onStatusChange: (status: AdminModerationAppealStatus) => void
  pagination: AdminPagination | null
  status: AdminModerationAppealStatus
  updatingAppealId: number | null
}

const statusOptions: AdminModerationAppealStatus[] = [
  'open',
  'under_review',
  'granted',
  'denied',
  'closed',
  'all',
]

export function ModerationAppealsPanel({
  appeals,
  onDecideAppeal,
  onPageChange,
  onStatusChange,
  pagination,
  status,
  updatingAppealId,
}: ModerationAppealsPanelProps) {
  return (
    <section id="appeals" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Moderation appeals</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review user appeals, record a decision note, and grant or deny account moderation reversals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminPaginationSummary pagination={pagination} />
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as AdminModerationAppealStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {labelize(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Appeal</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Decision</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appeals.map((appeal) => (
              <ModerationAppealRow
                key={appeal.id}
                appeal={appeal}
                onDecideAppeal={onDecideAppeal}
                updatingAppealId={updatingAppealId}
              />
            ))}
            {appeals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                  No appeals in this view.
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

function ModerationAppealRow({
  appeal,
  onDecideAppeal,
  updatingAppealId,
}: {
  appeal: AdminModerationAppeal
  onDecideAppeal: ModerationAppealsPanelProps['onDecideAppeal']
  updatingAppealId: number | null
}) {
  const [decisionNote, setDecisionNote] = useState('')
  const isUpdating = updatingAppealId === appeal.id
  const canDecide = appeal.status === 'open' || appeal.status === 'under_review'
  const note = decisionNote.trim()

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">Appeal #{appeal.id}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          {appeal.appeal_text}
        </p>
        {appeal.decision_note && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
            Decision note: {appeal.decision_note}
          </p>
        )}
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{displayUser(appeal)}</p>
        <p className="mt-1 text-slate-500">{appeal.user?.email || 'No email'}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">
          {labelize(appeal.user?.moderation_status || 'unknown')} · {appeal.user?.strike_count ?? 0} strikes
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{labelize(appeal.action?.action || 'case appeal')}</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
          {appeal.action?.reason || appeal.case?.summary || 'No reason supplied'}
        </p>
        <p className="mt-2 text-xs font-bold text-slate-400">
          Case #{appeal.case_id ?? 'N/A'} · Action #{appeal.action_id ?? 'N/A'}
        </p>
      </td>
      <td className="px-5 py-4">
        <AppealStatusBadge status={appeal.status} />
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(appeal.submitted_at || appeal.created_at)}</td>
      <td className="px-5 py-4">
        {canDecide ? (
          <div className="w-72 space-y-3">
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              rows={3}
              placeholder="Decision note"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
            <div className="flex flex-wrap gap-2">
              <AppealDecisionButton
                disabled={isUpdating || note.length < 3}
                label="Grant"
                onClick={() => onDecideAppeal(appeal.id, 'granted', note)}
                tone="success"
              />
              <AppealDecisionButton
                disabled={isUpdating || note.length < 3}
                label="Deny"
                onClick={() => onDecideAppeal(appeal.id, 'denied', note)}
                tone="danger"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-500">
            Reviewed {formatDate(appeal.reviewed_at)}
          </p>
        )}
      </td>
    </tr>
  )
}

function AppealDecisionButton({
  disabled,
  label,
  onClick,
  tone,
}: {
  disabled: boolean
  label: string
  onClick: () => void
  tone: 'success' | 'danger'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-3 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
      }`}
    >
      {disabled ? 'Note required' : label}
    </button>
  )
}

function AppealStatusBadge({ status }: { status: AdminModerationAppeal['status'] }) {
  const styles: Record<AdminModerationAppeal['status'], string> = {
    closed: 'bg-slate-100 text-slate-700',
    denied: 'bg-rose-100 text-rose-700',
    granted: 'bg-emerald-100 text-emerald-700',
    open: 'bg-amber-100 text-amber-800',
    under_review: 'bg-sky-100 text-sky-700',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{labelize(status)}</span>
}

function displayUser(appeal: AdminModerationAppeal) {
  const user = appeal.user
  if (!user) return `User #${appeal.user_id}`
  return user.username || user.name || `User #${user.id}`
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
