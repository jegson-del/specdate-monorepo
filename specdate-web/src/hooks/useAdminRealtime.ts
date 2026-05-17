import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createAdminEcho } from '../lib/adminRealtime'
import type { AdminActivityEvent, DashboardData } from '../types/admin'

type AdminActivityPayload = {
  activity?: AdminActivityEvent
  counts?: Record<string, number>
}

type ShowAlert = (alert: {
  durationMs?: number
  message?: string
  title: string
  tone?: 'success' | 'error' | 'info' | 'warning'
}) => void

export function useAdminRealtime({
  enabled,
  queryClient,
  showAlert,
  token,
}: {
  enabled: boolean
  queryClient: QueryClient
  showAlert: ShowAlert
  token: string
}) {
  useEffect(() => {
    if (!enabled || !token) return

    const echo = createAdminEcho(token)
    if (!echo) return

    const channel = echo.private('admin.dashboard')
    channel.listen('.AdminActivityCreated', (payload: AdminActivityPayload) => {
      if (payload.counts) {
        queryClient.setQueryData<DashboardData>(['admin', 'dashboard'], (current) =>
          current ? { ...current, stats: { ...current.stats, ...payload.counts } } : current,
        )
      }

      const activity = payload.activity
      if (activity) {
        queryClient.setQueryData<{ counts: Record<string, number>; items: AdminActivityEvent[] }>(
          ['admin', 'activity'],
          (current) => ({
            counts: payload.counts ?? current?.counts ?? {},
            items: [activity, ...(current?.items ?? []).filter((item) => item.id !== activity.id)].slice(0, 25),
          }),
        )

        showAlert({
          tone: alertToneFor(activity.type),
          title: activity.title,
          message: activity.body ?? undefined,
        })
      }

      invalidateByActivityType(queryClient, activity?.type)
    })

    return () => {
      echo.leave('admin.dashboard')
      echo.disconnect()
    }
  }, [enabled, queryClient, showAlert, token])
}

function invalidateByActivityType(queryClient: QueryClient, type?: string) {
  if (type === 'provider_application_created') {
    queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] })
    return
  }

  if (type === 'report_created') {
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-cases'] })
    return
  }

  if (type === 'media_needs_review') {
    queryClient.invalidateQueries({ queryKey: ['admin', 'media-moderation'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-cases'] })
    return
  }

  if (type === 'contact_message_created') {
    queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] })
    return
  }

  if (type === 'support_message_created' || type === 'support_ticket_created') {
    queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
  }
}

function alertToneFor(type: string) {
  if (type === 'report_created' || type === 'media_needs_review') return 'warning'
  if (type === 'support_ticket_created' || type === 'support_message_created') return 'info'
  return 'success'
}
