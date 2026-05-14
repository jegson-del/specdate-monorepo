import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import {
  adminTokenKey,
  banAdminUser,
  getAdminUser,
  getAdminUsers,
  pauseAdminUser,
  unbanAdminUser,
  unpauseAdminUser,
  updateAdminUserNote,
} from '../lib/adminApi'
import type { AdminUserRole, AdminUserStatus } from '../types/admin'

export function useAdminUsers() {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<AdminUserRole>('all')
  const [status, setStatus] = useState<AdminUserStatus>('all')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const usersQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'users', query, role, status, page],
    queryFn: () => getAdminUsers(token, { q: query, role, status }, page, 25),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const userDetailQuery = useQuery({
    enabled: Boolean(token && selectedUserId),
    queryKey: ['admin', 'user', selectedUserId],
    queryFn: () => getAdminUser(token, selectedUserId as number),
    staleTime: 10_000,
  })

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'user'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const changeRole = (value: AdminUserRole) => {
    setRole(value)
    setPage(1)
  }

  const changeStatus = (value: AdminUserStatus) => {
    setStatus(value)
    setPage(1)
  }

  const actionMutation = useMutation({
    mutationFn: ({
      action,
      reason,
      userId,
    }: {
      action: 'ban' | 'pause' | 'unban' | 'unpause'
      reason?: string
      userId: number
    }) => {
      if (action === 'pause') return pauseAdminUser(token, userId)
      if (action === 'unpause') return unpauseAdminUser(token, userId)
      if (action === 'ban') return banAdminUser(token, userId, reason || '')
      return unbanAdminUser(token, userId)
    },
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'User action failed',
        message: error instanceof Error ? error.message : 'User could not be updated.',
      })
    },
    onSuccess: (message) => {
      showAlert({ tone: 'success', title: 'User updated', message })
      invalidateUsers()
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ note, userId }: { note: string; userId: number }) =>
      updateAdminUserNote(token, userId, note),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Note not saved',
        message: error instanceof Error ? error.message : 'User note could not be saved.',
      })
    },
    onSuccess: (message) => {
      showAlert({ tone: 'success', title: 'User note saved', message })
      invalidateUsers()
    },
  })

  return {
    actionUserId: actionMutation.variables?.userId ?? noteMutation.variables?.userId ?? null,
    isAuthenticated: Boolean(token),
    isLoading: usersQuery.isFetching || userDetailQuery.isFetching,
    page,
    pagination: usersQuery.data?.pagination ?? null,
    query,
    role,
    saveNote: (userId: number, note: string) => noteMutation.mutate({ note, userId }),
    selectedUser: userDetailQuery.data ?? null,
    selectedUserId,
    setPage,
    setQuery: changeQuery,
    setRole: changeRole,
    setSelectedUserId,
    setStatus: changeStatus,
    status,
    updateUserStatus: (
      userId: number,
      action: 'ban' | 'pause' | 'unban' | 'unpause',
      reason?: string,
    ) => actionMutation.mutate({ action, reason, userId }),
    users: usersQuery.data?.items ?? [],
  }
}
