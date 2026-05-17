import { useEffect, useState } from 'react'
import { adminTokenKey } from '../lib/adminApi'

const adminTokenChangedEvent = 'dateusher-admin-token-changed'

export function getStoredAdminToken() {
  return localStorage.getItem(adminTokenKey) || ''
}

export function setStoredAdminToken(token: string) {
  if (token) {
    localStorage.setItem(adminTokenKey, token)
  } else {
    localStorage.removeItem(adminTokenKey)
  }

  window.dispatchEvent(new Event(adminTokenChangedEvent))
}

export function useAdminToken() {
  const [token, setToken] = useState(getStoredAdminToken)

  useEffect(() => {
    const syncToken = () => setToken(getStoredAdminToken())

    window.addEventListener(adminTokenChangedEvent, syncToken)
    window.addEventListener('storage', syncToken)

    return () => {
      window.removeEventListener(adminTokenChangedEvent, syncToken)
      window.removeEventListener('storage', syncToken)
    }
  }, [])

  return token
}
