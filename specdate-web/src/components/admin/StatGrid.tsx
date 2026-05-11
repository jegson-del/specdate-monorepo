const statLabels: Record<string, string> = {
  users_total: 'Total users',
  daters_total: 'Daters',
  providers_total: 'Providers',
  providers_pending: 'Pending providers',
  providers_approved: 'Approved providers',
  reports_open: 'Open reports',
  support_needs_admin: 'Support queue',
  vouchers_total: 'Date vouchers',
}

type StatGridProps = {
  stats: Record<string, number>
}

export function StatGrid({ stats }: StatGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.entries(statLabels).map(([key, label]) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{stats[key] ?? 0}</p>
        </article>
      ))}
    </section>
  )
}
