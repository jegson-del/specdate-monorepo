import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import { useAdminToken } from './useAdminToken'
import {
  deleteAdminContact,
  getAdminContactThread,
  getAdminContactTickets,
  replyAdminContact,
  updateAdminContactStatus,
} from '../lib/adminApi'
import type { AdminSupportTicketStatus } from '../types/admin'

export function useAdminContact() {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const token = useAdminToken()
  const [status, setStatusState] = useState<AdminSupportTicketStatus>('pending_admin')
  const [page, setPage] = useState(1)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

  const ticketsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'contact', 'tickets', status, page],
    queryFn: () => getAdminContactTickets(token, status, page, 25),
    refetchInterval: 20_000,
    staleTime: 10_000,
  })

  const threadQuery = useQuery({
    enabled: Boolean(token && selectedTicketId),
    queryKey: ['admin', 'contact', 'thread', selectedTicketId],
    queryFn: () => getAdminContactThread(token, selectedTicketId as number),
    staleTime: 5_000,
  })

  const replyMutation = useMutation({
    mutationFn: ({ body, ticketId }: { body: string; ticketId: number }) =>
      replyAdminContact(token, ticketId, body),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Reply failed',
        message: error instanceof Error ? error.message : 'Contact reply could not be sent.',
      })
    },
    onSuccess: () => {
      showAlert({
        tone: 'success',
        title: 'Reply sent',
        message: 'The visitor was emailed and the thread was updated.',
      })
      invalidateContact()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({
      nextStatus,
      ticketId,
    }: {
      nextStatus: Exclude<AdminSupportTicketStatus, 'all'>
      ticketId: number
    }) => updateAdminContactStatus(token, ticketId, nextStatus),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Status not saved',
        message: error instanceof Error ? error.message : 'Contact status could not be updated.',
      })
    },
    onSuccess: () => {
      invalidateContact()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (ticketId: number) => deleteAdminContact(token, ticketId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Contact message could not be deleted.',
      })
    },
    onSuccess: (message) => {
      showAlert({ tone: 'success', title: 'Contact deleted', message })
      setSelectedTicketId(null)
      invalidateContact()
    },
  })

  const invalidateContact = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const setStatus = (nextStatus: AdminSupportTicketStatus) => {
    setStatusState(nextStatus)
    setPage(1)
  }

  return {
    deleteContact: (ticketId: number) => deleteMutation.mutate(ticketId),
    isAuthenticated: Boolean(token),
    isLoading: ticketsQuery.isFetching || threadQuery.isFetching,
    page,
    pagination: ticketsQuery.data?.pagination ?? null,
    reply: (ticketId: number, body: string) => replyMutation.mutate({ body, ticketId }),
    selectedTicketId,
    selectedThread: threadQuery.data ?? null,
    setPage,
    setSelectedTicketId,
    setStatus,
    status,
    tickets: ticketsQuery.data?.items ?? [],
    updatingTicketId:
      replyMutation.isPending || statusMutation.isPending || deleteMutation.isPending
        ? (replyMutation.variables?.ticketId ??
          statusMutation.variables?.ticketId ??
          deleteMutation.variables ??
          null)
        : null,
    updateStatus: (
      ticketId: number,
      nextStatus: Exclude<AdminSupportTicketStatus, 'all'>,
    ) => statusMutation.mutate({ nextStatus, ticketId }),
  }
}
