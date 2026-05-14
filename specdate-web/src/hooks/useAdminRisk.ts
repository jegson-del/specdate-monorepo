import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  adminTokenKey,
  getAdminIpRiskEvents,
  getAdminRiskUsers,
  getAdminUserRisk,
} from '../lib/adminApi'
import type { AdminIpRiskEventType, AdminRiskSeverity } from '../types/admin'

export function useAdminRisk() {
  const [token] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [riskUserQuery, setRiskUserQuery] = useState('')
  const [riskUsersPage, setRiskUsersPage] = useState(1)
  const [ipEventType, setIpEventType] = useState<AdminIpRiskEventType>('all')
  const [ipSeverity, setIpSeverity] = useState<AdminRiskSeverity>('all')
  const [ipQuery, setIpQuery] = useState('')
  const [ipUserId, setIpUserId] = useState('')
  const [ipEventsPage, setIpEventsPage] = useState(1)
  const [selectedRiskUserId, setSelectedRiskUserId] = useState<number | null>(null)

  const riskUsersQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'risk-users', riskUserQuery, riskUsersPage],
    queryFn: () => getAdminRiskUsers(token, riskUserQuery, riskUsersPage, 25),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const ipEventsQuery = useQuery({
    enabled: Boolean(token),
    queryKey: ['admin', 'ip-risk-events', ipEventType, ipSeverity, ipQuery, ipUserId, ipEventsPage],
    queryFn: () =>
      getAdminIpRiskEvents(
        token,
        {
          eventType: ipEventType,
          ip: ipQuery,
          severity: ipSeverity,
          userId: ipUserId,
        },
        ipEventsPage,
        25,
      ),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const userRiskQuery = useQuery({
    enabled: Boolean(token && selectedRiskUserId),
    queryKey: ['admin', 'user-risk', selectedRiskUserId],
    queryFn: () => getAdminUserRisk(token, selectedRiskUserId as number),
    staleTime: 10_000,
  })

  const changeRiskUserQuery = (query: string) => {
    setRiskUserQuery(query)
    setRiskUsersPage(1)
  }
  const changeIpEventType = (eventType: AdminIpRiskEventType) => {
    setIpEventType(eventType)
    setIpEventsPage(1)
  }
  const changeIpSeverity = (severity: AdminRiskSeverity) => {
    setIpSeverity(severity)
    setIpEventsPage(1)
  }
  const changeIpQuery = (query: string) => {
    setIpQuery(query)
    setIpEventsPage(1)
  }
  const changeIpUserId = (userId: string) => {
    setIpUserId(userId.replace(/\D/g, ''))
    setIpEventsPage(1)
  }

  return {
    ipEvents: ipEventsQuery.data?.items ?? [],
    ipEventsPage,
    ipEventsPagination: ipEventsQuery.data?.pagination ?? null,
    ipEventType,
    ipQuery,
    ipSeverity,
    ipUserId,
    isAuthenticated: Boolean(token),
    isLoading: riskUsersQuery.isFetching || ipEventsQuery.isFetching || userRiskQuery.isFetching,
    riskUserQuery,
    riskUsers: riskUsersQuery.data?.items ?? [],
    riskUsersPage,
    riskUsersPagination: riskUsersQuery.data?.pagination ?? null,
    selectedRiskUser: userRiskQuery.data ?? null,
    selectedRiskUserId,
    setIpEventsPage,
    setIpEventType: changeIpEventType,
    setIpQuery: changeIpQuery,
    setIpSeverity: changeIpSeverity,
    setIpUserId: changeIpUserId,
    setRiskUserQuery: changeRiskUserQuery,
    setRiskUsersPage,
    setSelectedRiskUserId,
  }
}
