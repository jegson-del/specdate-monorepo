const HOW_IT_WORKS_STEPS = [
  {
    label: 'Profile',
    title: 'Create your account',
    body: 'Set up your dating profile with the essentials, your style, and what you want your next chapter to feel like.',
  },
  {
    label: 'Quest',
    title: 'Launch a Spec search',
    body: 'Create a focused search quest with the criteria that matter to you, so only daters who fit can participate.',
  },
  {
    label: 'Screen',
    title: 'Ask, answer, and eliminate',
    body: 'Review each participant at the same time, compare their answers, read the vibe, and move forward with the people who feel right.',
  },
  {
    label: 'Match',
    title: 'The last person becomes your match',
    body: 'When one dater remains, Dateusher adds them as a match and opens free chat so the conversation can continue naturally.',
  },
  {
    label: 'Date',
    title: 'Make memories with providers',
    body: 'Use partner discounts from restaurants, hotels, spas, and experiences to turn the match into a real date.',
  },
] as const

const SPEC_SCREEN_TABS = ['Questions', 'Answers', 'Eliminate', 'Final match'] as const
const SPEC_ANSWERS = [
  {
    name: 'Amara',
    avatar: '/date_user_landing.png',
    answer: 'Consistency, kind planning, and showing up when it counts.',
    status: 'Kept',
  },
  {
    name: 'Dion',
    avatar: '/blackman_journey.png',
    answer: 'Effort is making time even when the week gets busy.',
    status: 'Review',
  },
  {
    name: 'Kemi',
    avatar: '/chinese_journey.png',
    answer: 'Clear communication, patience, and a little creativity.',
    status: 'Eliminated',
  },
] as const

function SpecQuestMockup() {
  return (
    <div
      className="mx-auto w-full max-w-[24rem] rounded-[1.75rem] border border-white/18 bg-gray-950/90 p-2 shadow-2xl shadow-black/40"
      aria-hidden
    >
      <div className="overflow-hidden rounded-[1.35rem] bg-white text-gray-950">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-pink-600">Spec quest</p>
              <h4 className="mt-1 text-sm font-black text-gray-950">Coffee date shortlist</h4>
            </div>
            <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[0.65rem] font-black text-pink-700">
              Round 2
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-sm">
            {SPEC_SCREEN_TABS.map((tab, index) => (
              <span
                key={tab}
                className={`rounded-xl px-1 py-1.5 text-center text-[0.56rem] font-black leading-tight ${
                  index === 1 ? 'bg-pink-600 text-white' : 'text-gray-500'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-gray-500">Question</p>
              <span className="text-[0.65rem] font-bold text-gray-400">3 answers</span>
            </div>
            <p className="text-sm font-extrabold leading-5 text-gray-950">
              What does effort look like to you?
            </p>
          </div>

          <div className="space-y-2">
            {SPEC_ANSWERS.map((participant) => (
              <div
                key={participant.name}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={participant.avatar}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full bg-pink-100 object-cover"
                      loading="lazy"
                    />
                    <p className="truncate text-sm font-black text-gray-950">{participant.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[0.62rem] font-black ${
                      participant.status === 'Kept'
                        ? 'bg-emerald-100 text-emerald-700'
                        : participant.status === 'Eliminated'
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {participant.status}
                  </span>
                </div>
                <p className="text-xs font-medium leading-5 text-gray-600">{participant.answer}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr] gap-2 pt-1">
            <span className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-center text-xs font-black text-gray-600">
              Eliminate
            </span>
            <span className="rounded-2xl bg-pink-600 px-3 py-3 text-center text-xs font-black text-white">
              Final match
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-8 py-16 sm:py-20 md:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl md:mb-14">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-pink-300/90">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl"
          >
            A dating quest built around your standards
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg">
            Dateusher turns matching into a guided Spec search, from account setup to final match,
            free chat, partner discounts, and the memories that come after.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-pink-950/30 backdrop-blur-md sm:p-8">
            <div className="grid gap-8">
              <div className="mx-auto max-w-xl text-center lg:text-left">
                <span className="inline-flex rounded-full border border-pink-300/30 bg-pink-500/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-pink-100">
                  Spec search
                </span>
                <h3 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
                  Screen with intention. Match with confidence.
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">
                  Each Spec quest gives you a structured way to filter for chemistry, values, effort,
                  and vibe before chat opens fully with the final match.
                </p>
              </div>

              <SpecQuestMockup />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <article
                key={step.label}
                className={`group rounded-3xl border border-pink-200/35 bg-pink-600/85 p-5 shadow-lg shadow-pink-950/30 backdrop-blur-sm transition hover:-translate-y-1 hover:border-pink-100/60 hover:bg-pink-500/90 ${
                  index === HOW_IT_WORKS_STEPS.length - 1 ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/25 bg-white/18 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                    {step.label}
                  </span>
                  <span className="text-sm font-black text-white/55">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/82">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
