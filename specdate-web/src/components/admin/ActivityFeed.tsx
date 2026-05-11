import type { AdminReport, AdminSupportTicket, ProviderApplication } from '../../types/admin'

type ActivityFeedProps = {
  providers: ProviderApplication[]
  reports: AdminReport[]
  supportTickets: AdminSupportTicket[]
}

type ActivityItem = {
  date: string
  label: string
  meta: string
  tone: 'provider' | 'report' | 'support'
  title: string
}

const toneStyles: Record<ActivityItem['tone'], string> = {
  provider: 'bg-pink-100 text-pink-700',
  report: 'bg-rose-100 text-rose-700',
  support: 'bg-sky-100 text-sky-700',
}

export function ActivityFeed({ providers, reports, supportTickets }: ActivityFeedProps) {
  const items = [
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

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black">Activity feed</h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest provider, moderation, and support activity from real admin data.
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
                {item.meta} · {formatDate(item.date)}
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

function formatDate(value?: string | null) {
  if (!value) return 'not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
