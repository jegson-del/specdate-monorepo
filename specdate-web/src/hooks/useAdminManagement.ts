import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import {
  adminTokenKey,
  getAdminAccessPermissions,
  getAdminManagedAdmins,
  updateManagedAdminAccess,
} from '../lib/adminApi'
import type { AdminAccess } from '../types/admin'

export function useAdminManagement() {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const adminsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'management', 'admins', query, page],
    queryFn: () => getAdminManagedAdmins(token, query, page, 25),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const permissionsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'management', 'permissions'],
    queryFn: () => getAdminAccessPermissions(token),
    staleTime: 60_000,
  })

  const updateAccessMutation = useMutation({
    mutationFn: ({ access, adminId }: { access: AdminAccess; adminId: number }) =>
      updateManagedAdminAccess(token, adminId, access),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Access not saved',
        message: error instanceof Error ? error.message : 'Admin access could not be updated.',
      })
    },
    onSuccess: (message) => {
      showAlert({ tone: 'success', title: 'Admin access updated', message })
      queryClient.invalidateQueries({ queryKey: ['admin', 'management', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
    },
  })

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  return {
    actionAdminId: updateAccessMutation.isPending
      ? updateAccessMutation.variables?.adminId ?? null
      : null,
    admins: adminsQuery.data?.items ?? [],
    isAuthenticated: Boolean(token),
    isLoading: adminsQuery.isFetching || permissionsQuery.isFetching,
    onSaveAccess: (adminId: number, access: AdminAccess) =>
      updateAccessMutation.mutate({ access, adminId }),
    page,
    pagination: adminsQuery.data?.pagination ?? null,
    permissions: permissionsQuery.data ?? [],
    query,
    setPage,
    setQuery: changeQuery,
  }
}
