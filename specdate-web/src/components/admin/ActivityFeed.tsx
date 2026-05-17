import type {
  AdminActivityEvent,
  AdminReport,
  AdminSupportTicket,
  ProviderApplication,
} from '../../types/admin'

type ActivityFeedProps = {
  activities?: AdminActivityEvent[]
  providers: ProviderApplication[]
  reports: AdminReport[]
  supportTickets: AdminSupportTicket[]
}

type ActivityItem = {
  date: string
  label: string
  meta: string
  tone: 'contact' | 'media' | 'provider' | 'report' | 'support'
  title: string
}

const toneStyles: Record<ActivityItem['tone'], string> = {
  contact: 'bg-violet-100 text-violet-700',
  media: 'bg-amber-100 text-amber-700',
  provider: 'bg-pink-100 text-pink-700',
  report: 'bg-rose-100 text-rose-700',
  support: 'bg-sky-100 text-sky-700',
}

export function ActivityFeed({
  activities = [],
  providers,
  reports,
  supportTickets,
}: ActivityFeedProps) {
  const fallbackItems = [
    ...providers.map((provider): ActivityItem => ({
      date: provider.created_at,
      label: 'Provider',
      meta: provider.country || provider.category || 'Application',
      title: provider.business_name,
      tone: 'provider',
    })),
    ...reports.map((report): ActivityItem => ({
      date: report.created_at,
      label: 'Report',
      meta: report.target_type.replace('_', ' '),
      title: report.reason,
      tone: 'report',
    })),
    ...supportTickets.map((ticket): ActivityItem => ({
      date: ticket.last_message_at || ticket.created_at,
      label: 'Support',
      meta: ticket.status.replace('_', ' '),
      title: ticket.subject,
      tone: 'support',
    })),
  ]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 12)
  const items = activities.length > 0 ? activities.map(activityToItem).slice(0, 12) : fallbackItems

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black">Activity feed</h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest provider, moderation, support, and contact activity from the admin event log.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, index) => (
          <article key={`${item.tone}-${item.title}-${item.date}-${index}`} className="flex gap-3 p-5">
            <span
              className={`h-fit rounded-full px-3 py-1 text-xs font-black ${toneStyles[item.tone]}`}
            >
              {item.label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {item.meta} - {formatDate(item.date)}
              </p>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <p className="px-5 py-10 text-center text-sm font-bold text-slate-500">
            No recent activity to show yet.
          </p>
        )}
      </div>
    </section>
  )
}

function activityToItem(activity: AdminActivityEvent): ActivityItem {
  return {
    date: activity.created_at,
    label: labelForType(activity.type),
    meta: activity.type.replaceAll('_', ' '),
    title: activity.title,
    tone: toneForType(activity.type),
  }
}

function labelForType(type: string) {
  if (type.startsWith('provider_')) return 'Provider'
  if (type.startsWith('report_')) return 'Report'
  if (type.startsWith('media_')) return 'Media'
  if (type.startsWith('contact_')) return 'Contact'
  if (type.startsWith('support_')) return 'Support'
  return 'Admin'
}

function toneForType(type: string): ActivityItem['tone'] {
  if (type.startsWith('provider_')) return 'provider'
  if (type.startsWith('report_')) return 'report'
  if (type.startsWith('media_')) return 'media'
  if (type.startsWith('contact_')) return 'contact'
  return 'support'
}

function formatDate(value?: string | null) {
  if (!value) return 'not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
