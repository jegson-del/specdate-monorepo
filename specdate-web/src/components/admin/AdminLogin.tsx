import { useState } from 'react'

type AdminLoginProps = {
  isSubmitting: boolean
  onLogin: (email: string, password: string) => void
}

const inputClass =
  'h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100'

export function AdminLogin({ isSubmitting, onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('admin@dateusher.test')
  const [password, setPassword] = useState('password')

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-pink-300">
              DateUsher Admin
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              Operational control, away from the public site.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Review provider applications, monitor platform health, and keep the marketplace
              moving from a direct admin-only route.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {['Providers', 'Reports', 'Support'].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Queue
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center bg-white px-6 py-12 text-slate-950 sm:px-10 lg:px-16">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onLogin(email, password)
            }}
            className="w-full max-w-md"
          >
            <h2 className="text-2xl font-black">Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Admin access only. Please use your credentials to access the dashboard and manage the platform.
            </p>
            <label className="mt-8 block">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-12 w-full rounded-lg bg-pink-600 text-sm font-black text-white shadow-lg shadow-pink-900/20 transition hover:bg-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Open dashboard'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
