import { useState } from 'react'
import type {
  AdminPagination,
  AdminSuccessStory,
  AdminSuccessStoryPayload,
  AdminSuccessStoryStatus,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type Props = {
  isLoading: boolean
  onCreate: (payload: AdminSuccessStoryPayload) => void
  onDelete: (storyId: number) => void
  onPageChange: (page: number) => void
  onStatusChange: (status: AdminSuccessStoryStatus) => void
  onUpdate: (storyId: number, payload: Partial<AdminSuccessStoryPayload>) => void
  pagination: AdminPagination | null
  status: AdminSuccessStoryStatus
  stories: AdminSuccessStory[]
  updatingStoryId: number | null
}

const statusOptions: AdminSuccessStoryStatus[] = ['all', 'draft', 'published', 'archived']

const emptyForm = {
  attribution: '',
  body: '',
  image_url: '',
  is_featured: false,
  location: '',
  provider_profile_id: '',
  published_at: '',
  rating: '',
  sort_order: '0',
  status: 'draft' as Exclude<AdminSuccessStoryStatus, 'all'>,
  story_type: 'date',
  title: '',
}

type StoryFormState = typeof emptyForm

export function SuccessStoriesPanel({
  isLoading,
  onCreate,
  onDelete,
  onPageChange,
  onStatusChange,
  onUpdate,
  pagination,
  status,
  stories,
  updatingStoryId,
}: Props) {
  const [editingStory, setEditingStory] = useState<AdminSuccessStory | null>(null)

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Success stories</h2>
            <p className="mt-1 text-sm text-slate-500">
              Curate privacy-safe stories shown on the public homepage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminPaginationSummary pagination={pagination} />
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as AdminSuccessStoryStatus)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {labelize(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {stories.map((story) => (
            <StoryRow
              key={story.id}
              isUpdating={isLoading || updatingStoryId === story.id}
              onDelete={onDelete}
              onEdit={setEditingStory}
              onUpdate={onUpdate}
              story={story}
            />
          ))}
          {stories.length === 0 && (
            <p className="px-5 py-10 text-center text-sm font-bold text-slate-500">
              No success stories in this view.
            </p>
          )}
        </div>

        <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
      </div>

      <StoryForm
        key={editingStory?.id ?? 'new'}
        editingStory={editingStory}
        onCancelEdit={() => setEditingStory(null)}
        onCreate={onCreate}
        onUpdate={(storyId, payload) => {
          onUpdate(storyId, payload)
          setEditingStory(null)
        }}
      />
    </section>
  )
}

function StoryRow({
  isUpdating,
  onDelete,
  onEdit,
  onUpdate,
  story,
}: {
  isUpdating: boolean
  onDelete: (storyId: number) => void
  onEdit: (story: AdminSuccessStory) => void
  onUpdate: (storyId: number, payload: Partial<AdminSuccessStoryPayload>) => void
  story: AdminSuccessStory
}) {
  return (
    <article className="grid gap-4 p-5 lg:grid-cols-[160px_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
        {story.image_url ? (
          <img src={story.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={story.status} />
          {story.is_featured ? (
            <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700">
              Featured
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {labelize(story.story_type)}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-950">{story.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{story.body}</p>
        <p className="mt-2 text-xs font-bold text-slate-400">
          {story.attribution || 'No attribution'} · {story.location || 'No location'} ·{' '}
          {story.provider?.name || 'No provider'} · {story.published_at ? formatDate(story.published_at) : 'Unpublished'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={isUpdating} label="Edit" onClick={() => onEdit(story)} primary />
          {story.status !== 'published' ? (
            <ActionButton
              disabled={isUpdating}
              label="Publish"
              onClick={() => onUpdate(story.id, { status: 'published' })}
            />
          ) : (
            <ActionButton
              disabled={isUpdating}
              label="Unpublish"
              onClick={() => onUpdate(story.id, { status: 'draft' })}
            />
          )}
          <ActionButton
            disabled={isUpdating}
            label={story.is_featured ? 'Unfeature' : 'Feature'}
            onClick={() => onUpdate(story.id, { is_featured: !story.is_featured })}
          />
          <ActionButton disabled={isUpdating} label="Delete" onClick={() => onDelete(story.id)} danger />
        </div>
      </div>
    </article>
  )
}

function StoryForm({
  editingStory,
  onCancelEdit,
  onCreate,
  onUpdate,
}: {
  editingStory: AdminSuccessStory | null
  onCancelEdit: () => void
  onCreate: (payload: AdminSuccessStoryPayload) => void
  onUpdate: (storyId: number, payload: Partial<AdminSuccessStoryPayload>) => void
}) {
  const [form, setForm] = useState<StoryFormState>(() => storyToForm(editingStory))

  const canSubmit = form.title.trim().length >= 3 && form.body.trim().length >= 10

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{editingStory ? 'Edit story' : 'Create story'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Publish only stories with explicit permission and privacy-safe attribution.
          </p>
        </div>
        {editingStory ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          const payload = formPayload(form)
          if (editingStory) {
            onUpdate(editingStory.id, payload)
          } else {
            onCreate(payload)
            setForm(emptyForm)
          }
        }}
      >
        <TextInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Story</span>
          <textarea
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            rows={6}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Attribution" value={form.attribution} onChange={(attribution) => setForm({ ...form, attribution })} />
          <TextInput label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
        </div>
        <TextInput label="Image URL" value={form.image_url} onChange={(image_url) => setForm({ ...form, image_url })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Story type" value={form.story_type} onChange={(story_type) => setForm({ ...form, story_type })} />
          <TextInput label="Provider ID" value={form.provider_profile_id} onChange={(provider_profile_id) => setForm({ ...form, provider_profile_id })} />
          <TextInput label="Rating" value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          <TextInput label="Sort order" value={form.sort_order} onChange={(sort_order) => setForm({ ...form, sort_order })} />
        </div>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as Exclude<AdminSuccessStoryStatus, 'all'>,
              })
            }
            className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            {statusOptions.filter((option) => option !== 'all').map((option) => (
              <option key={option} value={option}>
                {labelize(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
            className="h-4 w-4 accent-pink-600"
          />
          Feature this story
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-lg bg-pink-600 px-4 text-sm font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editingStory ? 'Save story' : 'Create story'}
        </button>
      </form>
    </aside>
  )
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
      />
    </label>
  )
}

function formPayload(form: StoryFormState): AdminSuccessStoryPayload {
  return {
    attribution: nullableString(form.attribution),
    body: form.body.trim(),
    image_url: nullableString(form.image_url),
    is_featured: form.is_featured,
    location: nullableString(form.location),
    provider_profile_id: form.provider_profile_id.trim() ? Number(form.provider_profile_id) : null,
    published_at: nullableString(form.published_at),
    rating: form.rating.trim() ? Number(form.rating) : null,
    sort_order: form.sort_order.trim() ? Number(form.sort_order) : 0,
    status: form.status,
    story_type: form.story_type.trim() || 'date',
    title: form.title.trim(),
  }
}

function storyToForm(story: AdminSuccessStory | null): StoryFormState {
  if (!story) {
    return emptyForm
  }

  return {
    attribution: story.attribution ?? '',
    body: story.body,
    image_url: story.image_url ?? '',
    is_featured: story.is_featured,
    location: story.location ?? '',
    provider_profile_id: story.provider_profile_id ? String(story.provider_profile_id) : '',
    published_at: toDateTimeLocal(story.published_at),
    rating: story.rating ? String(story.rating) : '',
    sort_order: String(story.sort_order),
    status: story.status,
    story_type: story.story_type,
    title: story.title,
  }
}

function nullableString(value: string) {
  const next = value.trim()
  return next ? next : null
}

function ActionButton({
  danger = false,
  disabled,
  label,
  onClick,
  primary = false,
}: {
  danger?: boolean
  disabled: boolean
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
        primary
          ? 'bg-slate-950 text-white hover:bg-pink-600'
          : danger
            ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-950 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status: AdminSuccessStory['status'] }) {
  const styles: Record<AdminSuccessStory['status'], string> = {
    archived: 'bg-slate-100 text-slate-700',
    draft: 'bg-amber-100 text-amber-800',
    published: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>
      {labelize(status)}
    </span>
  )
}

function labelize(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return 'not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 16)
}
