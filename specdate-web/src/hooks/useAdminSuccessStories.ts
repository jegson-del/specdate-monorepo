import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAlert } from '../components/AlertProvider'
import {
  adminTokenKey,
  createAdminSuccessStory,
  deleteAdminSuccessStory,
  getAdminSuccessStories,
  updateAdminSuccessStory,
} from '../lib/adminApi'
import type {
  AdminSuccessStoryPayload,
  AdminSuccessStoryStatus,
} from '../types/admin'

export function useAdminSuccessStories() {
  const { showAlert } = useAlert()
  const queryClient = useQueryClient()
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [status, setStatusState] = useState<AdminSuccessStoryStatus>('all')
  const [page, setPage] = useState(1)

  const storiesQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'success-stories', status, page],
    queryFn: () => getAdminSuccessStories(token, status, page, 25),
    staleTime: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: AdminSuccessStoryPayload) => createAdminSuccessStory(token, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Story not created',
        message: error instanceof Error ? error.message : 'Success story could not be created.',
      })
    },
    onSuccess: () => {
      showAlert({
        tone: 'success',
        title: 'Story created',
        message: 'The success story was saved.',
      })
      invalidateStories()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      storyId,
    }: {
      payload: Partial<AdminSuccessStoryPayload>
      storyId: number
    }) => updateAdminSuccessStory(token, storyId, payload),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Story not updated',
        message: error instanceof Error ? error.message : 'Success story could not be updated.',
      })
    },
    onSuccess: () => {
      showAlert({
        tone: 'success',
        title: 'Story updated',
        message: 'The success story changes were saved.',
      })
      invalidateStories()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (storyId: number) => deleteAdminSuccessStory(token, storyId),
    onError: (error) => {
      showAlert({
        tone: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Success story could not be deleted.',
      })
    },
    onSuccess: (message) => {
      showAlert({ tone: 'success', title: 'Story deleted', message })
      invalidateStories()
    },
  })

  const invalidateStories = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'success-stories'] })
  }

  const setStatus = (nextStatus: AdminSuccessStoryStatus) => {
    setStatusState(nextStatus)
    setPage(1)
  }

  return {
    createStory: (payload: AdminSuccessStoryPayload) => createMutation.mutate(payload),
    deleteStory: (storyId: number) => deleteMutation.mutate(storyId),
    isAuthenticated: Boolean(token),
    isLoading: storiesQuery.isFetching,
    page,
    pagination: storiesQuery.data?.pagination ?? null,
    setPage,
    setStatus,
    status,
    stories: storiesQuery.data?.items ?? [],
    updateStory: (storyId: number, payload: Partial<AdminSuccessStoryPayload>) =>
      updateMutation.mutate({ payload, storyId }),
    updatingStoryId:
      updateMutation.isPending || deleteMutation.isPending
        ? (updateMutation.variables?.storyId ?? deleteMutation.variables ?? null)
        : null,
  }
}
