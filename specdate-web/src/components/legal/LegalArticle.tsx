import { Link } from 'react-router-dom'
import type { LegalPageContent } from '../../types/legal'

interface LegalArticleProps {
  page: LegalPageContent
}

function toSectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function LegalArticle({ page }: LegalArticleProps) {
  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      <header className="border-b border-white/10 bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-medium text-pink-300 transition hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
          >
            Back to home
          </Link>
          <Link
            to="/get-started"
            className="rounded-full border border-pink-300/35 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-pink-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-pink-300/90">
          {page.kicker}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/72 sm:text-lg">
          {page.summary}
        </p>
        <p className="mt-4 text-sm text-white/48">Last updated {page.lastUpdated}</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
          <aside className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-md lg:sticky lg:top-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white/55">
              On this page
            </h2>
            <nav aria-label={`${page.title} sections`} className="mt-4">
              <ul className="space-y-3">
                {page.sections.map((section) => (
                  <li key={section.title}>
                    <a
                      href={`#${toSectionId(section.title)}`}
                      className="text-sm font-medium text-white/70 transition hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="space-y-5">
            {page.sections.map((section) => (
              <section
                key={section.title}
                id={toSectionId(section.title)}
                className="rounded-2xl border border-white/10 bg-black/35 p-6 backdrop-blur-md sm:p-8"
              >
                <h2 className="text-2xl font-bold tracking-tight text-white">{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-5 space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-white/72 sm:text-base">
                        <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-pink-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </div>
      </main>
    </div>
  )
}
