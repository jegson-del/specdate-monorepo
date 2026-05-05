const TESTIMONIAL_SOURCES = [
  {
    title: 'Admin featured stories',
    body: 'Curated stories selected by the Dateusher team after a match has been confirmed.',
    status: 'Coming from admin',
  },
  {
    title: 'Post-date reviews',
    body: 'Feedback collected from users after they meet, review the experience, and choose to share it.',
    status: 'Coming from reviews',
  },
  {
    title: 'Provider memories',
    body: 'Moments linked to restaurants, hotels, spas, and experiences booked with Dateusher discounts.',
    status: 'Coming from providers',
  },
] as const

export function SuccessStoriesSection() {
  return (
    <section
      id="success-stories"
      className="scroll-mt-8 py-16 sm:py-20 md:py-24"
      aria-labelledby="success-stories-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-pink-300/90">
              Success stories
            </p>
            <h2
              id="success-stories-heading"
              className="mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl"
            >
              Testimonials from real Dateusher outcomes
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              This section is ready for verified match stories, post-date reviews, and provider-backed
              memories once they are collected from users.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-white/75">
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2">
                Verified matches
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2">
                Date reviews
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2">
                Provider discounts
              </span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-5">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm font-bold text-white">Story queue</p>
                  <p className="mt-1 text-sm text-white/55">Connected later to admin and user review data.</p>
                </div>
                <span className="rounded-full bg-pink-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-pink-200">
                  Empty
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {TESTIMONIAL_SOURCES.map((source) => (
                  <article
                    key={source.title}
                    className="grid gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <h3 className="text-base font-bold text-white">{source.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/58">{source.body}</p>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/60">
                      {source.status}
                    </span>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-white/15 px-5 py-6 text-center">
                <p className="text-lg font-bold text-white">No public testimonials yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
                  Once users share reviews after dates, this area can show verified stories with names,
                  photos, ratings, provider details, and match outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
