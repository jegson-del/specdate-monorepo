import type { DashboardData } from '../../types/admin'

type AnalyticsPanelsProps = {
  dashboard: DashboardData | null
}

export function AnalyticsPanels({ dashboard }: AnalyticsPanelsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <MetricPanel title="Provider pipeline">
        {Object.entries(dashboard?.provider_status ?? {}).map(([label, value]) => (
          <BarMetric key={label} label={label} value={value} max={providerMax(dashboard)} tone="pink" />
        ))}
      </MetricPanel>

      <MetricPanel title="Voucher activity">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(dashboard?.voucher_status ?? {}).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-3">
              <BarMetric label={label.replace('_', ' ')} value={value} max={voucherMax(dashboard)} tone="sky" />
            </div>
          ))}
        </div>
      </MetricPanel>
    </section>
  )
}

function MetricPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </article>
  )
}

function BarMetric({
  label,
  max,
  tone,
  value,
}: {
  label: string
  max: number
  tone: 'pink' | 'sky'
  value: number
}) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span className="capitalize text-slate-600">{label}</span>
        <span>{value}</span>
      </div>
      <progress
        value={value}
        max={max}
        className={`admin-progress admin-progress-${tone} mt-2 h-3 w-full overflow-hidden rounded-full`}
      />
    </div>
  )
}

function providerMax(dashboard: DashboardData | null) {
  return Math.max(dashboard?.provider_status.pending ?? 0, dashboard?.provider_status.approved ?? 0, 1)
}

function voucherMax(dashboard: DashboardData | null) {
  return Math.max(...Object.values(dashboard?.voucher_status ?? { none: 1 }), 1)
}
