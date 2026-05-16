import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import {
  adminTokenKey,
  approveAdminInvite,
  createAdminInvite,
  getAdminAccessPermissions,
  getAdminInvites,
  getAdminManagedAdmins,
  revokeAdminInvite,
  updateManagedAdminAccess,
} from '../lib/adminApi'
import type { AdminAccess } from '../types/admin'

export function useAdminManagement() {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [query, setQuery] = useState('')
  const [inviteQuery, setInviteQuery] = useState('')
  const [page, setPage] = useState(1)
  const [invitePage, setInvitePage] = useState(1)

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

  const adminInvitesQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'management', 'admin-invites', inviteQuery, invitePage],
    queryFn: () => getAdminInvites(token, inviteQuery, invitePage, 25),
    refetchInterval: 30_000,
    staleTime: 10_000,
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

  const createInviteMutation = useMutation({
    mutationFn: (payload: { name?: string; email: string }) => createAdminInvite(token, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Invite not sent',
        message: error instanceof Error ? error.message : 'Admin invite could not be sent.',
      })
    },
    onSuccess: () => {
      showAlert({ tone: 'success', title: 'Admin invite sent', message: 'The invite email has been queued.' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'management', 'admin-invites'] })
    },
  })

  const approveInviteMutation = useMutation({
    mutationFn: (inviteId: number) => approveAdminInvite(token, inviteId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Invite not approved',
        message: error instanceof Error ? error.message : 'Admin invite could not be approved.',
      })
    },
    onSuccess: () => {
      showAlert({ tone: 'success', title: 'Admin approved', message: 'Admin dashboard access is now enabled.' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'management'] })
    },
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: number) => revokeAdminInvite(token, inviteId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Invite not revoked',
        message: error instanceof Error ? error.message : 'Admin invite could not be revoked.',
      })
    },
    onSuccess: () => {
      showAlert({ tone: 'success', title: 'Invite revoked', message: 'The admin invite can no longer be used.' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'management', 'admin-invites'] })
    },
  })

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const changeInviteQuery = (value: string) => {
    setInviteQuery(value)
    setInvitePage(1)
  }

  return {
    actionAdminId: updateAccessMutation.isPending
      ? updateAccessMutation.variables?.adminId ?? null
      : null,
    actionInviteId:
      approveInviteMutation.isPending || revokeInviteMutation.isPending
        ? approveInviteMutation.variables ?? revokeInviteMutation.variables ?? null
        : null,
    adminInvites: adminInvitesQuery.data?.items ?? [],
    admins: adminsQuery.data?.items ?? [],
    createAdminInvite: (payload: { name?: string; email: string }) => createInviteMutation.mutate(payload),
    isAuthenticated: Boolean(token),
    isCreatingInvite: createInviteMutation.isPending,
    isLoading: adminsQuery.isFetching || permissionsQuery.isFetching || adminInvitesQuery.isFetching,
    invitePagination: adminInvitesQuery.data?.pagination ?? null,
    inviteQuery,
    onSaveAccess: (adminId: number, access: AdminAccess) =>
      updateAccessMutation.mutate({ access, adminId }),
    onApproveInvite: (inviteId: number) => approveInviteMutation.mutate(inviteId),
    onRevokeInvite: (inviteId: number) => revokeInviteMutation.mutate(inviteId),
    page,
    pagination: adminsQuery.data?.pagination ?? null,
    permissions: permissionsQuery.data ?? [],
    query,
    setInvitePage,
    setInviteQuery: changeInviteQuery,
    setPage,
    setQuery: changeQuery,
  }
}
