import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

type AlertTone = 'success' | 'error' | 'info' | 'warning'

type AlertInput = {
  title: string
  message?: string
  tone?: AlertTone
  durationMs?: number
}

type Alert = Required<Pick<AlertInput, 'title' | 'tone' | 'durationMs'>> &
  Pick<AlertInput, 'message'> & {
    id: number
  }

type AlertContextValue = {
  showAlert: (alert: AlertInput) => void
  dismissAlert: (id: number) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

const toneStyles: Record<AlertTone, { icon: string; className: string }> = {
  success: {
    icon: '✓',
    className:
      'border-emerald-300/50 bg-emerald-500/20 text-emerald-50 shadow-emerald-950/40',
  },
  error: {
    icon: '!',
    className: 'border-rose-300/50 bg-rose-500/20 text-rose-50 shadow-rose-950/40',
  },
  info: {
    icon: 'i',
    className: 'border-sky-300/50 bg-sky-500/20 text-sky-50 shadow-sky-950/40',
  },
  warning: {
    icon: '!',
    className: 'border-amber-300/50 bg-amber-500/20 text-amber-50 shadow-amber-950/40',
  },
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, number>>(new Map())

  const dismissAlert = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setAlerts((current) => current.filter((alert) => alert.id !== id))
  }, [])

  const showAlert = useCallback(
    ({ title, message, tone = 'info', durationMs = 5600 }: AlertInput) => {
      const id = idRef.current + 1
      idRef.current = id

      setAlerts((current) => [{ id, title, message, tone, durationMs }, ...current].slice(0, 4))

      const timer = window.setTimeout(() => dismissAlert(id), durationMs)
      timersRef.current.set(id, timer)
    },
    [dismissAlert],
  )

  const value = useMemo(() => ({ showAlert, dismissAlert }), [showAlert, dismissAlert])

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-md flex-col gap-3 px-4 sm:right-4 sm:left-auto sm:mx-0"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {alerts.map((alert) => {
          const style = toneStyles[alert.tone]

          return (
            <div
              key={alert.id}
              className={`alert-enter pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${style.className}`}
              role={alert.tone === 'error' ? 'alert' : 'status'}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black">
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-5">{alert.title}</p>
                  {alert.message && (
                    <p className="mt-1 text-sm leading-5 text-white/80">{alert.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="rounded-full px-2 text-lg leading-6 text-white/65 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="alert-timer h-full rounded-full bg-white/70"
                  style={{ animationDuration: `${alert.durationMs}ms` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used inside AlertProvider')
  }

  return context
}
