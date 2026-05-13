import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { AdminUser } from '../../types/admin'

type NavItem = {
  badgeKey?: string
  enabled: boolean
  href?: string
  label: string
  to?: string
}

const navItems: NavItem[] = [
  { label: 'Overview', to: '/admin', enabled: true },
  { label: 'Users', to: '/admin/users', enabled: true },
  { label: 'Provider applications', to: '/admin/providers', enabled: true, badgeKey: 'providers_pending' },
  { label: 'Upload moderation', to: '/admin/media-moderation', enabled: true, badgeKey: 'media_needs_review' },
  { label: 'Reports', to: '/admin/moderation', enabled: true, badgeKey: 'reports_open' },
  { label: 'Support', to: '/admin/support', enabled: true, badgeKey: 'support_needs_admin' },
] as const

type AdminShellProps = {
  admin: AdminUser | null
  children: ReactNode
  onLogout: () => void
  stats?: Record<string, number>
  title?: string
}

export function AdminShell({
  admin,
  children,
  onLogout,
  stats = {},
  title = 'Admin dashboard',
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-950 px-5 py-6 text-white">
          <p className="text-lg font-black">DateUsher</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-pink-300">Admin</p>
          <nav className="mt-8 space-y-2 text-sm font-bold">
            {navItems.map(({ badgeKey, enabled, label, to }) =>
              enabled && to ? (
                <NavLink
                  key={label}
                  to={to}
                  end={to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
                    }`
                  }
                >
                  <span>{label}</span>
                  <AttentionBadge value={badgeKey ? stats[badgeKey] : 0} />
                </NavLink>
              ) : (
                <span key={label} className="block rounded-lg px-3 py-2 text-slate-500">
                  {label}
                </span>
              ),
            )}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Signed in as {admin?.email}</p>
                <h1 className="text-2xl font-black tracking-tight">{title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TopbarCounter label="Providers" value={stats.providers_pending ?? 0} />
                <TopbarCounter label="Moderation" value={moderationAttentionCount(stats)} />
                <TopbarCounter label="Support" value={stats.support_needs_admin ?? 0} />
                <button
                  type="button"
                  aria-label="Admin activity feed"
                  className="relative h-10 rounded-lg border border-slate-300 px-3 text-sm font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700"
                >
                  Bell
                  <AttentionBadge
                    value={
                      (stats.providers_pending ?? 0) +
                      moderationAttentionCount(stats) +
                      (stats.support_needs_admin ?? 0)
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:border-pink-300 hover:text-pink-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-6 lg:px-8" id="overview">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

function moderationAttentionCount(stats: Record<string, number>) {
  return (stats.reports_open ?? 0) + (stats.media_needs_review ?? 0)
}

function AttentionBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null

  return (
    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-pink-600 px-2 py-0.5 text-xs font-black text-white">
      {value > 99 ? '99+' : value}
    </span>
  )
}

function TopbarCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:block">
      {label}: <span className={value > 0 ? 'text-pink-700' : 'text-slate-500'}>{value}</span>
    </div>
  )
}
