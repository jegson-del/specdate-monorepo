import { useState } from 'react'
import type {
  AdminMediaModerationItem,
  AdminMediaModerationStatus,
  AdminPagination,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type MediaModerationQueuePanelProps = {
  approvingMediaId: number | null
  items: AdminMediaModerationItem[]
  onApproveMedia: (mediaId: number) => void
  onPageChange: (page: number) => void
  onStatusChange: (status: AdminMediaModerationStatus) => void
  pagination: AdminPagination | null
  status: AdminMediaModerationStatus
}

const statusOptions: AdminMediaModerationStatus[] = [
  'needs_review',
  'reported',
  'stale',
  'flagged',
  'manual_pending',
  'pending',
  'scanning',
  'failed',
  'approved',
  'hidden',
]

export function MediaModerationQueuePanel({
  approvingMediaId,
  items,
  onApproveMedia,
  onPageChange,
  onStatusChange,
  pagination,
  status,
}: MediaModerationQueuePanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <section id="media-moderation" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black">Upload moderation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest uploads first. Open a row to inspect the file, reports, labels, and approval action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminPaginationSummary pagination={pagination} />
          <select
            value={status}
            onChange={(event) => {
              setExpandedId(null)
              onStatusChange(event.target.value as AdminMediaModerationStatus)
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <MediaModerationRow
            key={item.id}
            approvingMediaId={approvingMediaId}
            expanded={expandedId === item.id}
            item={item}
            onApproveMedia={onApproveMedia}
            onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
          />
        ))}
        {items.length === 0 && (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            No uploads in this moderation view.
          </div>
        )}
      </div>

      <AdminPaginationBar
        onPageChange={(page) => {
          setExpandedId(null)
          onPageChange(page)
        }}
        pagination={pagination}
      />
    </section>
  )
}

function MediaModerationRow({
  approvingMediaId,
  expanded,
  item,
  onApproveMedia,
  onToggle,
}: {
  approvingMediaId: number | null
  expanded: boolean
  item: AdminMediaModerationItem
  onApproveMedia: (mediaId: number) => void
  onToggle: () => void
}) {
  const isApproving = approvingMediaId === item.id
  const canApprove = item.hidden_at === null && item.moderation_status !== 'approved'

  return (
    <article className="bg-white">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[7rem_1.4fr_1fr_0.9fr_8rem_5rem]"
      >
        <div className="flex items-center gap-3">
          <PreviewThumb item={item} />
          <span className="font-black text-slate-500">#{item.id}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{item.file_path}</p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{displayUser(item)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MediaStatusBadge status={item.moderation_status} />
          {item.open_reports_count > 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
              {item.open_reports_count} report{item.open_reports_count === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-slate-600">{item.mime_type || item.type || 'Unknown'}</p>
        <p className="text-sm font-bold text-slate-500">{formatDateTime(item.created_at)}</p>
        <span className="text-sm font-black text-pink-700">{expanded ? 'Close' : 'Review'}</span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'max-h-[62rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
            <MediaPreview item={item} />
            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 rounded-lg bg-white p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <Detail label="Owner" value={displayUser(item)} />
                <Detail label="Size" value={formatBytes(item.size)} />
                <Detail label="Checked" value={formatDateTime(item.moderation_checked_at)} />
                <Detail label="Reports" value={`${item.reports_count} total`} />
              </div>

              {item.moderation_error && (
                <p className="rounded-lg bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                  {item.moderation_error}
                </p>
              )}
              {item.hidden_reason && (
                <p className="rounded-lg bg-slate-200 p-3 text-xs font-bold leading-5 text-slate-700">
                  Hidden: {item.hidden_reason}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700"
                >
                  Open file
                </a>
                <button
                  type="button"
                  disabled={!canApprove || isApproving}
                  onClick={() => onApproveMedia(item.id)}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ReportList item={item} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Labels
                  </p>
                  <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                    {JSON.stringify(item.moderation_labels ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function PreviewThumb({ item }: { item: AdminMediaModerationItem }) {
  const mime = item.mime_type || ''
  if (mime.startsWith('image/')) {
    return <img src={item.url} alt="" className="h-12 w-12 rounded-lg bg-slate-200 object-cover" />
  }

  return (
    <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-200 text-xs font-black text-slate-500">
      {mime.startsWith('video/') ? 'VID' : mime.startsWith('audio/') ? 'AUD' : 'FILE'}
    </span>
  )
}

function MediaPreview({ item }: { item: AdminMediaModerationItem }) {
  const mime = item.mime_type || ''
  if (mime.startsWith('image/')) {
    return (
      <img
        src={item.url}
        alt={`Upload ${item.id}`}
        className="max-h-[28rem] w-full rounded-lg bg-slate-200 object-contain"
      />
    )
  }
  if (mime.startsWith('video/')) {
    return <video src={item.url} controls className="max-h-[28rem] w-full rounded-lg bg-slate-950" />
  }
  if (mime.startsWith('audio/')) {
    return (
      <div className="flex min-h-40 items-center rounded-lg bg-slate-200 p-4">
        <audio src={item.url} controls className="w-full" />
      </div>
    )
  }

  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg bg-slate-200 px-4 text-center text-sm font-black text-slate-500">
      Preview unavailable
    </div>
  )
}

function ReportList({ item }: { item: AdminMediaModerationItem }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        Recent reports
      </p>
      {item.reports.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {item.reports.map((report) => (
            <li key={report.id} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
              <span className="font-black text-slate-900">{report.reason}</span>
              {report.details ? ` - ${report.details}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-bold text-slate-500">No user reports attached.</p>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 truncate font-bold text-slate-700">{value}</dd>
    </div>
  )
}

function MediaStatusBadge({ status }: { status: string }) {
  const tone = status === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'flagged' || status === 'failed'
      ? 'bg-rose-100 text-rose-700'
      : status === 'manual_pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-200 text-slate-700'

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{formatStatus(status)}</span>
}

function displayUser(item: AdminMediaModerationItem) {
  if (!item.user) return 'Unknown'
  return item.user.username || item.user.name || item.user.email || `User #${item.user.id}`
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatBytes(value?: number | null) {
  if (!value) return 'Unknown'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not checked'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
