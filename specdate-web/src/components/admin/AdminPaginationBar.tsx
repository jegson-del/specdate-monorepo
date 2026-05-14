import type { AdminPagination } from '../../types/admin'

type AdminPaginationBarProps = {
  onPageChange: (page: number) => void
  pagination: AdminPagination | null
}

export function AdminPaginationBar({ onPageChange, pagination }: AdminPaginationBarProps) {
  if (!pagination || pagination.last_page <= 1) return null

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
      <AdminPaginationSummary pagination={pagination} />
      <div className="flex gap-2">
        <PageButton
          disabled={pagination.current_page <= 1}
          label="Previous"
          onClick={() => onPageChange(pagination.current_page - 1)}
        />
        <PageButton
          disabled={pagination.current_page >= pagination.last_page}
          label="Next"
          onClick={() => onPageChange(pagination.current_page + 1)}
        />
      </div>
    </div>
  )
}

export function AdminPaginationSummary({ pagination }: { pagination: AdminPagination | null }) {
  if (!pagination) return null

  return (
    <p className="text-xs font-bold text-slate-500">
      Showing {pagination.from ?? 0}-{pagination.to ?? 0} of {pagination.total}
    </p>
  )
}

function PageButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 rounded-lg border border-slate-300 px-4 text-xs font-black text-slate-700 transition hover:border-pink-300 hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}
