import type {
  AdminReport,
  AdminReportAction,
  AdminReportStatus,
} from '../../types/admin'

type ModerationReportsPanelProps = {
  onStatusChange: (status: AdminReportStatus) => void
  onUpdateReport: (
    reportId: number,
    payload: {
      action?: AdminReportAction
      action_note?: string
      status?: Exclude<AdminReportStatus, 'all'>
    },
  ) => void
  reports: AdminReport[]
  status: AdminReportStatus
  updatingReportId: number | null
}

const statusOptions: AdminReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed', 'all']

export function ModerationReportsPanel({
  onStatusChange,
  onUpdateReport,
  reports,
  status,
  updatingReportId,
}: ModerationReportsPanelProps) {
  return (
    <section id="moderation" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Moderation reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Triage reports, mark reviews in progress, resolve safe cases, or apply moderation actions.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as AdminReportStatus)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Report</th>
              <th className="px-5 py-3">People</th>
              <th className="px-5 py-3">Target</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => (
              <ModerationReportRow
                key={report.id}
                onUpdateReport={onUpdateReport}
                report={report}
                updatingReportId={updatingReportId}
              />
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                  No reports in this moderation view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ModerationReportRow({
  onUpdateReport,
  report,
  updatingReportId,
}: {
  onUpdateReport: ModerationReportsPanelProps['onUpdateReport']
  report: AdminReport
  updatingReportId: number | null
}) {
  const isUpdating = updatingReportId === report.id

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">{report.reason}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          {report.details || 'No extra details supplied'}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">Reporter: {displayPerson(report.reporter)}</p>
        <p className="mt-1 text-slate-500">Reported: {displayPerson(report.reported_user)}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{report.target_type.replace('_', ' ')}</p>
        <p className="mt-1 text-slate-500">#{report.target_id}</p>
      </td>
      <td className="px-5 py-4">
        <ReportStatusBadge status={report.status} />
      </td>
      <td className="px-5 py-4 text-slate-500">{formatDate(report.created_at)}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <ReportActionButton
            disabled={isUpdating}
            label="Reviewing"
            onClick={() => onUpdateReport(report.id, { status: 'reviewing', action: 'none' })}
          />
          <ReportActionButton
            disabled={isUpdating}
            label="Resolve"
            onClick={() => onUpdateReport(report.id, { status: 'resolved', action: 'none' })}
          />
          <ReportActionButton
            disabled={isUpdating}
            label="Dismiss"
            onClick={() => onUpdateReport(report.id, { status: 'dismissed', action: 'none' })}
          />
          <ReportActionButton
            disabled={isUpdating}
            label="Suspend"
            tone="danger"
            onClick={() =>
              onUpdateReport(report.id, {
                action: 'suspend_user',
                action_note: 'Suspended from admin moderation dashboard.',
                status: 'resolved',
              })
            }
          />
        </div>
      </td>
    </tr>
  )
}

function ReportActionButton({
  disabled,
  label,
  onClick,
  tone = 'default',
}: {
  disabled: boolean
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === 'danger'
          ? 'bg-rose-600 text-white hover:bg-rose-500'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-950 hover:text-white'
      }`}
    >
      {disabled ? 'Updating...' : label}
    </button>
  )
}

function ReportStatusBadge({ status }: { status: AdminReport['status'] }) {
  const styles: Record<AdminReport['status'], string> = {
    dismissed: 'bg-slate-100 text-slate-700',
    open: 'bg-rose-100 text-rose-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    reviewing: 'bg-amber-100 text-amber-800',
  }

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{status}</span>
}

function displayPerson(person: AdminReport['reporter']) {
  if (!person) return 'Unknown'
  return person.username || person.name || `User #${person.id}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
