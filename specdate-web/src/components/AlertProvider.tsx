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

const toneStyles: Record<
  AlertTone,
  { accentClass: string; className: string; icon: string; iconClass: string; timerClass: string }
> = {
  success: {
    accentClass: 'bg-emerald-600',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-950/20',
    icon: 'OK',
    iconClass: 'bg-emerald-600 text-white',
    timerClass: 'bg-emerald-600',
  },
  error: {
    accentClass: 'bg-rose-600',
    className: 'border-rose-300 bg-rose-50 text-rose-950 shadow-rose-950/20',
    icon: '!',
    iconClass: 'bg-rose-600 text-white',
    timerClass: 'bg-rose-600',
  },
  info: {
    accentClass: 'bg-sky-600',
    className: 'border-sky-300 bg-sky-50 text-sky-950 shadow-sky-950/20',
    icon: 'i',
    iconClass: 'bg-sky-600 text-white',
    timerClass: 'bg-sky-600',
  },
  warning: {
    accentClass: 'bg-amber-500',
    className: 'border-amber-300 bg-amber-50 text-amber-950 shadow-amber-950/20',
    icon: '!',
    iconClass: 'bg-amber-500 text-amber-950',
    timerClass: 'bg-amber-500',
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
              className={`alert-enter pointer-events-auto overflow-hidden rounded-xl border p-0 shadow-2xl ${style.className}`}
              role={alert.tone === 'error' ? 'alert' : 'status'}
            >
              <div className={`h-1.5 ${style.accentClass}`} />
              <div className="flex items-start gap-3 p-4">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${style.iconClass}`}
                >
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black leading-5">{alert.title}</p>
                  {alert.message && (
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">
                      {alert.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="rounded-full px-2 text-lg font-black leading-6 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label="Dismiss alert"
                >
                  x
                </button>
              </div>
              <div className="h-1 overflow-hidden bg-slate-200">
                <div
                  className={`alert-timer h-full ${style.timerClass}`}
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
