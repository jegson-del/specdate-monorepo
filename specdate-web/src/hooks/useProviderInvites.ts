import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import { useAdminToken } from './useAdminToken'
import {
  createProviderInvite,
  getProviderInvites,
  revokeProviderInvite,
} from '../lib/adminApi'

export function useProviderInvites(enabled = true) {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const token = useAdminToken()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const invitesQuery = useQuery({
    enabled: Boolean(token) && enabled,
    queryKey: ['admin', 'provider-invites', query, page],
    queryFn: () => getProviderInvites(token, query, page, 25),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: {
      provider_name: string
      email: string
      service_type?: string
      personal_message?: string
    }) => createProviderInvite(token, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Invite not sent',
        message: error instanceof Error ? error.message : 'Provider invite could not be sent.',
      })
    },
    onSuccess: () => {
      showAlert({ tone: 'success', title: 'Provider invite sent', message: 'The marketing invite email has been queued.' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'provider-invites'] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => revokeProviderInvite(token, inviteId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Invite not revoked',
        message: error instanceof Error ? error.message : 'Provider invite could not be revoked.',
      })
    },
    onSuccess: () => {
      showAlert({ tone: 'success', title: 'Invite revoked', message: 'The provider invite can no longer be used.' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'provider-invites'] })
    },
  })

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  return {
    actionInviteId: revokeMutation.isPending ? revokeMutation.variables ?? null : null,
    createInvite: createMutation.mutate,
    invites: invitesQuery.data?.items ?? [],
    isCreating: createMutation.isPending,
    isLoading: invitesQuery.isFetching,
    onRevoke: revokeMutation.mutate,
    page,
    pagination: invitesQuery.data?.pagination ?? null,
    query,
    setPage,
    setQuery: changeQuery,
  }
}
