import { useState, type ReactNode } from 'react'
import type {
  AdminModerationCase,
  AdminModerationCaseDetail,
  AdminModerationCaseSeverity,
  AdminModerationCaseSource,
  AdminModerationCaseStatus,
  AdminPagination,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type ModerationCasesPanelProps = {
  cases: AdminModerationCase[]
  onCaseQueryChange: (query: string) => void
  onOpenCase: (caseId: number) => void
  onPageChange: (page: number) => void
  onSeverityChange: (severity: AdminModerationCaseSeverity) => void
  onSourceChange: (source: AdminModerationCaseSource) => void
  onStatusChange: (status: AdminModerationCaseStatus) => void
  onUpdateCaseStatus: (
    caseId: number,
    payload: {
      note?: string
      status: Exclude<AdminModerationCaseStatus, 'all' | 'open' | 'appealed'>
    },
  ) => void
  pagination: AdminPagination | null
  query: string
  selectedCase: AdminModerationCaseDetail | null
  selectedCaseId: number | null
  severity: AdminModerationCaseSeverity
  source: AdminModerationCaseSource
  status: AdminModerationCaseStatus
  updatingCaseId: number | null
}

const statusOptions: AdminModerationCaseStatus[] = [
  'open',
  'under_review',
  'actioned',
  'dismissed',
  'appealed',
  'closed',
  'all',
]
const sourceOptions: AdminModerationCaseSource[] = ['all', 'report', 'ai_media', 'admin', 'system']
const severityOptions: AdminModerationCaseSeverity[] = ['all', 'critical', 'high', 'medium', 'low']

export function ModerationCasesPanel({
  cases,
  onCaseQueryChange,
  onOpenCase,
  onPageChange,
  onSeverityChange,
  onSourceChange,
  onStatusChange,
  onUpdateCaseStatus,
  pagination,
  query,
  selectedCase,
  selectedCaseId,
  severity,
  source,
  status,
  updatingCaseId,
}: ModerationCasesPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Moderation cases</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review unified cases across reports, AI media flags, strikes, actions, and appeals.
            </p>
            <div className="mt-3">
              <AdminPaginationSummary pagination={pagination} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_150px_150px_150px]">
            <input
              value={query}
              onChange={(event) => onCaseQueryChange(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
              placeholder="Search cases..."
              type="search"
            />
            <CaseSelect value={status} options={statusOptions} onChange={onStatusChange} />
            <CaseSelect value={source} options={sourceOptions} onChange={onSourceChange} />
            <CaseSelect value={severity} options={severityOptions} onChange={onSeverityChange} />
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Case</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Counts</th>
                <th className="px-5 py-3">Opened</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((item) => (
                <CaseRow
                  key={item.id}
                  item={item}
                  isSelected={selectedCaseId === item.id}
                  onOpenCase={onOpenCase}
                />
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                    No moderation cases in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <CaseDetailPanel
          key={selectedCase?.id ?? 'empty'}
          selectedCase={selectedCase}
          onUpdateCaseStatus={onUpdateCaseStatus}
          updatingCaseId={updatingCaseId}
        />
      </div>

      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function CaseRow({
  isSelected,
  item,
  onOpenCase,
}: {
  isSelected: boolean
  item: AdminModerationCase
  onOpenCase: (caseId: number) => void
}) {
  return (
    <tr className={`align-top ${isSelected ? 'bg-pink-50/70' : ''}`}>
      <td className="px-5 py-4">
        <p className="font-black">Case #{item.id}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          {item.summary || 'No summary'}
        </p>
        <p className="mt-2 text-xs font-bold text-slate-400">
          {item.target_type || 'target'} #{item.target_id ?? 'N/A'}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{displayUser(item.subject_user)}</p>
        <p className="mt-1 text-slate-500">{item.subject_user?.email || 'No email'}</p>
      </td>
      <td className="px-5 py-4">
        <StatusBadge value={item.source} tone="neutral" />
        <div className="mt-2">
          <StatusBadge value={item.status} tone={item.status === 'open' ? 'warning' : 'neutral'} />
        </div>
      </td>
      <td className="px-5 py-4">
        <StatusBadge value={item.severity} tone={severityTone(item.severity)} />
      </td>
      <td className="px-5 py-4 text-slate-600">
        <p>{item.reports_count} reports</p>
        <p>{item.actions_count} actions</p>
        <p>{item.strikes_count} strikes</p>
        <p>{item.appeals_count} appeals</p>
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(item.opened_at || item.created_at)}</td>
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => onOpenCase(item.id)}
          className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600"
        >
          View
        </button>
      </td>
    </tr>
  )
}

function CaseDetailPanel({
  onUpdateCaseStatus,
  selectedCase,
  updatingCaseId,
}: {
  onUpdateCaseStatus: (
    caseId: number,
    payload: {
      note?: string
      status: Exclude<AdminModerationCaseStatus, 'all' | 'open' | 'appealed'>
    },
  ) => void
  selectedCase: AdminModerationCaseDetail | null
  updatingCaseId: number | null
}) {
  const [decisionNote, setDecisionNote] = useState('')

  if (!selectedCase) {
    return (
      <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
        <p className="text-sm font-black text-slate-700">No case selected</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select a case to inspect evidence, reports, actions, strikes, and appeals.
        </p>
      </aside>
    )
  }

  const isUpdating = updatingCaseId === selectedCase.id
  const hasDecisionNote = decisionNote.trim().length > 0
  const submitDecision = (
    status: Exclude<AdminModerationCaseStatus, 'all' | 'open' | 'appealed'>,
  ) => {
    onUpdateCaseStatus(selectedCase.id, {
      status,
      note: decisionNote.trim() || undefined,
    })
  }

  return (
    <aside className="space-y-5 border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={selectedCase.status} tone="warning" />
          <StatusBadge value={selectedCase.severity} tone={severityTone(selectedCase.severity)} />
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-950">Case #{selectedCase.id}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{selectedCase.summary}</p>
      </div>

      <DetailBlock title="Subject">
        <p>{displayUser(selectedCase.subject_user)}</p>
        <p className="text-slate-500">{selectedCase.subject_user?.email || 'No email'}</p>
        <p className="text-slate-500">
          {selectedCase.subject_user?.moderation_status || 'unknown'} - {selectedCase.subject_user?.strike_count ?? 0} strikes
        </p>
      </DetailBlock>

      <DetailBlock title="Case decision">
        <textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          placeholder="Add an admin note before resolving, dismissing, or closing..."
        />
        <div className="grid grid-cols-2 gap-2">
          <CaseDecisionButton
            disabled={isUpdating}
            label="Mark reviewing"
            onClick={() => submitDecision('under_review')}
          />
          <CaseDecisionButton
            disabled={isUpdating || !hasDecisionNote}
            label="Resolve"
            onClick={() => submitDecision('actioned')}
            tone="success"
          />
          <CaseDecisionButton
            disabled={isUpdating || !hasDecisionNote}
            label="Dismiss"
            onClick={() => submitDecision('dismissed')}
            tone="warning"
          />
          <CaseDecisionButton
            disabled={isUpdating || !hasDecisionNote}
            label="Close"
            onClick={() => submitDecision('closed')}
          />
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Dismiss, resolve, and close require a note. Linked reports are updated with the same decision.
        </p>
      </DetailBlock>

      <DetailBlock title="Reports">
        {selectedCase.reports.length > 0 ? (
          selectedCase.reports.map((report) => (
            <p key={report.id} className="rounded-lg bg-white p-3 text-xs leading-5">
              <span className="font-black">#{report.id} {report.reason}</span>
              <br />
              {report.details || 'No details'}
            </p>
          ))
        ) : (
          <p className="text-slate-500">No linked reports.</p>
        )}
      </DetailBlock>

      <DetailBlock title="Actions">
        {selectedCase.actions.length > 0 ? (
          selectedCase.actions.map((action) => (
            <p key={action.id} className="rounded-lg bg-white p-3 text-xs leading-5">
              <span className="font-black">{labelize(action.action)}</span>
              <br />
              {action.reason || 'No reason'} - {formatDate(action.created_at)}
            </p>
          ))
        ) : (
          <p className="text-slate-500">No actions recorded.</p>
        )}
      </DetailBlock>

      <DetailBlock title="Appeals">
        {selectedCase.appeals.length > 0 ? (
          selectedCase.appeals.map((appeal) => (
            <p key={appeal.id} className="rounded-lg bg-white p-3 text-xs leading-5">
              <span className="font-black">{labelize(appeal.status)}</span>
              <br />
              {appeal.appeal_text}
            </p>
          ))
        ) : (
          <p className="text-slate-500">No appeals linked.</p>
        )}
      </DetailBlock>

      <DetailBlock title="Evidence">
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {JSON.stringify(selectedCase.evidence ?? {}, null, 2)}
        </pre>
      </DetailBlock>
    </aside>
  )
}

function CaseDecisionButton({
  disabled = false,
  label,
  onClick,
  tone = 'neutral',
}: {
  disabled?: boolean
  label: string
  onClick: () => void
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const styles = {
    neutral: 'bg-slate-950 text-white hover:bg-pink-600 disabled:bg-slate-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300',
    warning: 'bg-amber-500 text-slate-950 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-white',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed ${styles[tone]}`}
    >
      {label}
    </button>
  )
}

function CaseSelect<T extends string>({
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

function DetailBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2 text-sm font-semibold text-slate-800">{children}</div>
    </div>
  )
}

function StatusBadge({ tone, value }: { tone: 'danger' | 'neutral' | 'success' | 'warning'; value: string }) {
  const styles = {
    danger: 'bg-rose-100 text-rose-700',
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-800',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}>{labelize(value)}</span>
}

function severityTone(value: string) {
  if (value === 'critical' || value === 'high') return 'danger'
  if (value === 'medium') return 'warning'
  return 'neutral'
}

function displayUser(user: AdminModerationCase['subject_user']) {
  if (!user) return 'Unknown'
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
