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

function SpecSearchScreenshot() {
  return (
    <div
      className="mx-auto w-full max-w-[22rem] rounded-[2rem] border border-white/18 bg-gray-950/95 p-2 shadow-2xl shadow-black/40"
      aria-label="Spec search screen preview"
    >
      <div className="aspect-[9/20] overflow-hidden rounded-[1.55rem] bg-white">
        <img
          src="/dateusherweb-sharp.jpg"
          alt="DateUsher Spec search screen showing live quests"
          className="h-full w-full object-cover object-top"
          loading="lazy"
          width={1620}
          height={3600}
        />
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

              <SpecSearchScreenshot />
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
