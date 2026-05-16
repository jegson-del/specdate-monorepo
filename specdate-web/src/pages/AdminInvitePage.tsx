import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAlert } from '../components/AlertProvider'
import {
  registerAdminInvite,
  sendAdminInviteOtp,
  validateAdminInvite,
} from '../lib/adminInviteRegistration'

const inputClass =
  'mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/40'

export default function AdminInvitePage() {
  const { showAlert } = useAlert()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing admin invite token.')
      setIsLoading(false)
      return
    }
    validateAdminInvite(token)
      .then((invite) => {
        setEmail(invite.email)
        setName(invite.name || '')
      })
      .catch((inviteError) => setError(inviteError instanceof Error ? inviteError.message : 'Invite unavailable.'))
      .finally(() => setIsLoading(false))
  }, [token])

  const sendOtp = async () => {
    setIsSendingOtp(true)
    setError(null)
    try {
      await sendAdminInviteOtp(token)
      showAlert({ tone: 'info', title: 'Code sent', message: `We sent an admin verification code to ${email}.` })
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : 'Code could not be sent.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await registerAdminInvite({
        token,
        name,
        username,
        email,
        password,
        password_confirmation: passwordConfirmation,
        otp_code: otpCode,
      })
      setRegistered(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration could not be completed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="rounded text-sm font-medium text-pink-400 transition hover:text-pink-300">
            Date Usher
          </Link>
          <span className="text-sm text-white/50">Admin invite</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-white/10 bg-black/35 p-6 shadow-2xl shadow-pink-950/20 backdrop-blur-md">
          <h1 className="text-3xl font-light tracking-wide text-white">Accept admin invite</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Verify your email and create your account. Dashboard access starts only after an existing admin approves you.
          </p>

          {error ? <p className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          {registered ? (
            <div className="mt-8 rounded-xl border border-green-400/30 bg-green-500/10 p-5 text-sm text-green-100">
              Registration received. An approved admin must approve this invite before you can log in.
            </div>
          ) : isLoading ? (
            <p className="mt-8 text-white/60">Loading invite...</p>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-medium text-white/80">
                Email
                <input className={inputClass} value={email} disabled readOnly />
              </label>
              <label className="block text-sm font-medium text-white/80">
                Name
                <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-white/80">
                Username
                <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-white/80">
                Password
                <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-white/80">
                Confirm password
                <input className={inputClass} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
              </label>
              <div>
                <label className="block text-sm font-medium text-white/80">
                  Email OTP
                  <input className={inputClass} inputMode="numeric" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
                </label>
                <button type="button" onClick={sendOtp} disabled={isSendingOtp} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80">
                  {isSendingOtp ? 'Sending...' : 'Send verification code'}
                </button>
              </div>
              <button disabled={isSubmitting} className="w-full rounded-full bg-pink-600 py-3.5 text-base font-semibold text-white transition hover:bg-pink-500 disabled:opacity-60" type="submit">
                {isSubmitting ? 'Creating admin...' : 'Create admin account'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
