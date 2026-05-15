import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Footer } from '../components'
import { Seo } from '../components/Seo'
import { publicApiBase } from '../lib/publicProviders'

const contactEmail = 'hello@dateusher.com'

const inquiryTypes = [
  { label: 'Account support', value: 'account' },
  { label: 'Safety or moderation', value: 'safety' },
  { label: 'Provider inquiry', value: 'provider' },
  { label: 'Privacy request', value: 'privacy' },
  { label: 'Payment or credits', value: 'payments' },
  { label: 'Technical issue', value: 'technical' },
  { label: 'Other', value: 'other' },
] as const

type InquiryType = (typeof inquiryTypes)[number]['value']

function newChallenge() {
  return {
    a: Math.floor(Math.random() * 9) + 2,
    b: Math.floor(Math.random() * 9) + 2,
  }
}

export default function ContactPage() {
  const [inquiryType, setInquiryType] = useState<InquiryType>('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [challenge, setChallenge] = useState(() => newChallenge())
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(null)

  const selectedInquiryLabel = useMemo(
    () => inquiryTypes.find((type) => type.value === inquiryType)?.label ?? 'Contact',
    [inquiryType],
  )

  const canSubmit =
    name.trim().length > 1 &&
    email.trim().length > 3 &&
    subject.trim().length > 2 &&
    message.trim().length > 10 &&
    captchaAnswer.trim().length > 0 &&
    !isSubmitting

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setStatus(null)

    try {
      const response = await fetch(`${publicApiBase()}/api/public/contact`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category: inquiryType,
          subject: subject.trim(),
          message: message.trim(),
          captcha_a: challenge.a,
          captcha_b: challenge.b,
          captcha_answer: Number(captchaAnswer),
          website,
        }),
      })
      const result = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(result?.message || 'Message could not be sent.')
      }

      setStatus({
        tone: 'success',
        message: result?.message || 'Message sent. We will review it from the admin support inbox.',
      })
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setWebsite('')
      setCaptchaAnswer('')
      setChallenge(newChallenge())
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Message could not be sent.',
      })
      setCaptchaAnswer('')
      setChallenge(newChallenge())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Seo
        title="Contact DateUsher"
        description="Contact DateUsher for account support, safety, privacy requests, provider enquiries, payments, credits, and technical help."
        path="/contact"
      />
      <header className="border-b border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center rounded focus:outline-none focus:ring-2 focus:ring-pink-500">
            <img
              src="/dateusher_logo_white_text.png"
              alt="Dateusher"
              className="h-12 w-auto object-contain"
              width={134}
              height={100}
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-white/70">
            <Link to="/providers" className="transition hover:text-white">
              Providers
            </Link>
            <Link to="/get-started" className="transition hover:text-white">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-[url('/bg.png')] bg-cover bg-center">
        <div className="bg-slate-950/80">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-pink-300">
                Contact DateUsher
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                Support, safety, providers, and privacy requests.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
                Tell us what you need and include the account email or provider business name if
                it helps us find the right record.
              </p>
              <div className="mt-8 grid gap-3 text-sm text-white/75">
                <a className="font-bold text-pink-200 transition hover:text-pink-100" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                <p>Use the inquiry type so the team can route the message correctly.</p>
              </div>
            </div>

            <form
              className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-black/20 sm:p-6"
              onSubmit={submitContact}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                    autoComplete="name"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                    autoComplete="email"
                  />
                </label>
              </div>

              <label className="hidden">
                <span>Website</span>
                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-black text-slate-700">Inquiry type</span>
                <select
                  value={inquiryType}
                  onChange={(event) =>
                    setInquiryType(event.target.value as InquiryType)
                  }
                  className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                >
                  {inquiryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-black text-slate-700">Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                  placeholder={`${selectedInquiryLabel} question`}
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-black text-slate-700">Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 min-h-40 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-black text-slate-700">
                  Anti-spam question: what is {challenge.a} + {challenge.b}?
                </span>
                <input
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  inputMode="numeric"
                  className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                />
              </label>

              {status ? (
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${
                    status.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {status.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-pink-600 px-5 text-sm font-black text-white shadow-lg shadow-pink-900/20 transition hover:bg-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send message'}
              </button>

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
                <Link to="/trustandsafety" className="text-pink-700 transition hover:text-pink-600">
                  Trust and Safety
                </Link>
                <Link to="/privacy-request" className="text-pink-700 transition hover:text-pink-600">
                  Privacy Request
                </Link>
                <Link to="/register/provider" className="text-pink-700 transition hover:text-pink-600">
                  Provider Registration
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white text-slate-950">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          <ContactPath title="Account Support" body="Login, profile, wallet, credit, booking, and app access issues." />
          <ContactPath title="Safety Review" body="Reports, appeals, moderation, harassment, scams, or urgent platform risk." />
          <ContactPath title="Providers" body="Business onboarding, approval status, listing details, and provider support." />
        </div>
      </section>

      <Footer />
    </main>
  )
}

function ContactPath({ body, title }: { body: string; title: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-base font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}
