import { useEffect, useState } from 'react'
import type {
  AdminAccess,
  AdminAccessPermission,
  AdminManagedAdmin,
  AdminPagination,
} from '../../types/admin'
import { AdminPaginationBar, AdminPaginationSummary } from './AdminPaginationBar'

type AdminManagementPanelProps = {
  actionAdminId: number | null
  admins: AdminManagedAdmin[]
  isLoading: boolean
  onPageChange: (page: number) => void
  onQueryChange: (query: string) => void
  onSaveAccess: (adminId: number, access: AdminAccess) => void
  pagination: AdminPagination | null
  permissions: AdminAccessPermission[]
  query: string
}

export function AdminManagementPanel({
  actionAdminId,
  admins,
  isLoading,
  onPageChange,
  onQueryChange,
  onSaveAccess,
  pagination,
  permissions,
  query,
}: AdminManagementPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Admin management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage admin-only access flags. New access columns added on the backend appear here automatically.
            </p>
            <div className="mt-3">
              <AdminPaginationSummary pagination={pagination} />
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 lg:w-80"
            placeholder="Search admins..."
            type="search"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Admin</th>
              {permissions.map((permission) => (
                <th key={permission.key} className="px-5 py-3">
                  {permission.label}
                </th>
              ))}
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <AdminAccessRow
                key={admin.id}
                admin={admin}
                isUpdating={isLoading || actionAdminId === admin.id}
                onSaveAccess={onSaveAccess}
                permissions={permissions}
              />
            ))}
            {admins.length === 0 && (
              <tr>
                <td
                  colSpan={permissions.length + 2}
                  className="px-5 py-10 text-center text-sm font-bold text-slate-500"
                >
                  {isLoading ? 'Loading admins...' : 'No admin users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPaginationBar onPageChange={onPageChange} pagination={pagination} />
    </section>
  )
}

function AdminAccessRow({
  admin,
  isUpdating,
  onSaveAccess,
  permissions,
}: {
  admin: AdminManagedAdmin
  isUpdating: boolean
  onSaveAccess: (adminId: number, access: AdminAccess) => void
  permissions: AdminAccessPermission[]
}) {
  const [access, setAccess] = useState<AdminAccess>(admin.admin_access)

  useEffect(() => {
    setAccess(admin.admin_access)
  }, [admin.admin_access])

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-black">{admin.name}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{admin.email}</p>
        <p className="mt-1 text-xs text-slate-400">Joined {formatDate(admin.created_at)}</p>
      </td>
      {permissions.map((permission) => (
        <td key={permission.key} className="px-5 py-4">
          <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
            <input
              checked={Boolean(access[permission.key])}
              onChange={(event) =>
                setAccess((current) => ({
                  ...current,
                  [permission.key]: event.target.checked,
                }))
              }
              type="checkbox"
              className="h-5 w-5 accent-pink-600"
            />
            <span>{Boolean(access[permission.key]) ? 'Enabled' : 'Off'}</span>
          </label>
        </td>
      ))}
      <td className="px-5 py-4">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onSaveAccess(admin.id, normalizeAccess(access, permissions))}
          className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save
        </button>
      </td>
    </tr>
  )
}

function normalizeAccess(access: AdminAccess, permissions: AdminAccessPermission[]) {
  return permissions.reduce<AdminAccess>((payload, permission) => {
    payload[permission.key] = Boolean(access[permission.key])
    return payload
  }, {})
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
