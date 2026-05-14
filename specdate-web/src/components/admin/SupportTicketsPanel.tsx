import { useState } from 'react'
import type {
  AdminPagination,
  AdminSupportTicket,
  AdminSupportTicketDetail,
  AdminSupportTicketStatus,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type SupportTicketsPanelProps = {
  isUpdating: boolean
  onOpenTicket: (ticketId: number) => void
  onPageChange: (page: number) => void
  onReply: (ticketId: number, body: string) => void
  onStatusChange: (status: AdminSupportTicketStatus) => void
  onUpdateStatus: (
    ticketId: number,
    status: Exclude<AdminSupportTicketStatus, 'all'>,
  ) => void
  pagination: AdminPagination | null
  selectedTicket: AdminSupportTicketDetail | null
  selectedTicketId: number | null
  status: AdminSupportTicketStatus
  tickets: AdminSupportTicket[]
  updatingTicketId: number | null
}

const statusOptions: AdminSupportTicketStatus[] = [
  'pending_admin',
  'open',
  'pending_user',
  'resolved',
  'closed',
  'all',
]

export function SupportTicketsPanel({
  isUpdating,
  onOpenTicket,
  onPageChange,
  onReply,
  onStatusChange,
  onUpdateStatus,
  pagination,
  selectedTicket,
  selectedTicketId,
  status,
  tickets,
  updatingTicketId,
}: SupportTicketsPanelProps) {
  return (
    <section id="support" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Support inbox</h2>
          <p className="mt-1 text-sm text-slate-500">
            Open tickets to read the full thread, reply with context, and move conversations forward.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminPaginationSummary pagination={pagination} />
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as AdminSupportTicketStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <SupportTicketRow
              key={ticket.id}
              isSelected={selectedTicketId === ticket.id}
              isUpdating={isUpdating || updatingTicketId === ticket.id}
              onOpenTicket={onOpenTicket}
              onUpdateStatus={onUpdateStatus}
              ticket={ticket}
            />
          ))}
          {tickets.length === 0 && (
            <p className="px-5 py-10 text-center text-sm font-bold text-slate-500">
              No support tickets in this view.
            </p>
          )}
        </div>
        <SupportThreadPanel
          isUpdating={isUpdating || Boolean(selectedTicketId && updatingTicketId === selectedTicketId)}
          onReply={onReply}
          selectedTicket={selectedTicket}
        />
      </div>
      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function SupportTicketRow({
  isSelected,
  isUpdating,
  onOpenTicket,
  onUpdateStatus,
  ticket,
}: {
  isSelected: boolean
  isUpdating: boolean
  onOpenTicket: (ticketId: number) => void
  onUpdateStatus: SupportTicketsPanelProps['onUpdateStatus']
  ticket: AdminSupportTicket
}) {
  return (
    <article className={`p-5 ${isSelected ? 'bg-pink-50/70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SupportStatusBadge status={ticket.status} />
        {ticket.unread_count > 0 && (
          <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700">
            {ticket.unread_count} unread
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {ticket.category}
        </span>
      </div>
      <h3 className="mt-3 text-base font-black">{ticket.subject}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {ticket.user?.username || ticket.user?.name || `User #${ticket.user_id}`} - last activity{' '}
        {formatDate(ticket.last_message_at || ticket.created_at)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <SupportActionButton
          disabled={isUpdating}
          label="Open thread"
          onClick={() => onOpenTicket(ticket.id)}
          tone="primary"
        />
        <SupportActionButton
          disabled={isUpdating}
          label="Pending user"
          onClick={() => onUpdateStatus(ticket.id, 'pending_user')}
        />
        <SupportActionButton
          disabled={isUpdating}
          label="Pending admin"
          onClick={() => onUpdateStatus(ticket.id, 'pending_admin')}
        />
        <SupportActionButton
          disabled={isUpdating}
          label="Resolve"
          onClick={() => onUpdateStatus(ticket.id, 'resolved')}
        />
        <SupportActionButton
          disabled={isUpdating}
          label="Close"
          onClick={() => onUpdateStatus(ticket.id, 'closed')}
        />
      </div>
    </article>
  )
}

function SupportThreadPanel({
  isUpdating,
  onReply,
  selectedTicket,
}: {
  isUpdating: boolean
  onReply: (ticketId: number, body: string) => void
  selectedTicket: AdminSupportTicketDetail | null
}) {
  const [reply, setReply] = useState('')
  const ticket = selectedTicket?.ticket
  const canReply = Boolean(ticket) && reply.trim().length > 0 && !isUpdating

  if (!ticket) {
    return (
      <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
        <p className="text-sm font-black text-slate-700">No ticket open</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Open a support ticket to read the message thread and reply with context.
        </p>
      </aside>
    )
  }

  return (
    <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Thread #{ticket.id}
      </p>
      <h3 className="mt-2 text-base font-black text-slate-950">{ticket.subject}</h3>

      <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {selectedTicket.messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-lg border p-3 ${
              message.sender_role === 'admin'
                ? 'border-pink-200 bg-pink-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {message.sender_role === 'admin'
                  ? 'Admin'
                  : message.sender?.username || message.sender?.name || 'User'}
              </p>
              <p className="shrink-0 text-xs font-bold text-slate-400">
                {formatDate(message.created_at)}
              </p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
              {message.body}
            </p>
          </article>
        ))}
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canReply || !ticket) return
          onReply(ticket.id, reply.trim())
          setReply('')
        }}
      >
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Thread reply
          </span>
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
            placeholder="Reply to this support thread..."
          />
        </label>
        <button
          type="submit"
          disabled={!canReply}
          className="mt-2 h-9 rounded-lg bg-pink-600 px-3 text-xs font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? 'Sending...' : 'Send thread reply'}
        </button>
      </form>
    </aside>
  )
}

function SupportActionButton({
  disabled,
  label,
  onClick,
  tone = 'default',
}: {
  disabled: boolean
  label: string
  onClick: () => void
  tone?: 'default' | 'primary'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === 'primary'
          ? 'bg-slate-950 text-white hover:bg-pink-600'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-950 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function SupportStatusBadge({ status }: { status: AdminSupportTicket['status'] }) {
  const styles: Record<AdminSupportTicket['status'], string> = {
    closed: 'bg-slate-100 text-slate-700',
    open: 'bg-sky-100 text-sky-700',
    pending_admin: 'bg-rose-100 text-rose-700',
    pending_user: 'bg-amber-100 text-amber-800',
    resolved: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
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
