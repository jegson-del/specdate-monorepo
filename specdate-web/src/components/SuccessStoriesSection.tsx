import { Link } from 'react-router-dom'
import { useSuccessStories } from '../hooks/useSuccessStories'
import type { PublicSuccessStory } from '../lib/publicSuccessStories'

const launchCards = [
  {
    title: 'Matched and planned',
    body: 'Daters can move from spark to plan with a clearer path for where to meet and what to do next.',
    label: 'Date planning',
    imageUrl: '/dateusherweb-sharp.jpg',
  },
  {
    title: 'Provider-backed dates',
    body: 'Restaurants, spas, hotels, and experiences can become part of the date instead of an afterthought.',
    label: 'Verified providers',
    imageUrl: '/bg.png',
  },
  {
    title: 'Safer first meets',
    body: 'Profile checks, reporting, moderation, and provider venues help first dates feel more intentional.',
    label: 'Trust layer',
    imageUrl: '/date_user_landing_logo.png',
  },
] as const

export function SuccessStoriesSection() {
  const { error, isLoading, stories } = useSuccessStories()
  const hasStories = stories.length > 0
  const featuredStory = stories.find((story) => story.isFeatured) ?? stories[0]
  const supportingStories = hasStories
    ? stories.filter((story) => story.id !== featuredStory.id).slice(0, 3)
    : []

  return (
    <section
      id="success-stories"
      className="scroll-mt-8 py-16 sm:py-20 md:py-24"
      aria-labelledby="success-stories-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl md:mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-pink-300/90">
            Success stories
          </p>
          <h2
            id="success-stories-heading"
            className="mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl"
          >
            {hasStories ? 'Real DateUsher moments' : 'Stories are being made'}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">
            {hasStories
              ? 'Published stories are reviewed before they appear here, with privacy choices respected.'
              : 'As daters meet and providers host better first dates, approved stories will appear here without exposing private details.'}
          </p>
        </div>

        {isLoading ? <StoryLoadingState /> : hasStories ? (
          <PublishedStories featuredStory={featuredStory} supportingStories={supportingStories} />
        ) : (
          <LaunchStoryState error={error} />
        )}
      </div>
    </section>
  )
}

function PublishedStories({
  featuredStory,
  supportingStories,
}: {
  featuredStory: PublicSuccessStory
  supportingStories: PublicSuccessStory[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="group overflow-hidden rounded-2xl border border-white/10 bg-black/35 shadow-2xl shadow-black/25 backdrop-blur-sm">
        <div className="grid min-h-full lg:grid-cols-[0.92fr_1.08fr]">
          <StoryImage imageUrl={featuredStory.imageUrl} title={featuredStory.title} />
          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <StoryBadge>{labelForStory(featuredStory)}</StoryBadge>
              <h3 className="mt-5 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                {featuredStory.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-white/70">{featuredStory.body}</p>
            </div>
            <StoryMeta story={featuredStory} />
          </div>
        </div>
      </article>

      <div className="grid gap-4">
        {supportingStories.length > 0 ? (
          supportingStories.map((story) => <CompactStoryCard key={story.id} story={story} />)
        ) : (
          <CompactStoryCard story={featuredStory} />
        )}
      </div>
    </div>
  )
}

function LaunchStoryState({ error }: { error: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {launchCards.map((card) => (
        <article
          key={card.title}
          className="group overflow-hidden rounded-2xl border border-white/10 bg-black/35 shadow-xl shadow-black/20 backdrop-blur-sm"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={card.imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-pink-600/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
              {card.label}
            </span>
          </div>
          <div className="p-5">
            <h3 className="text-xl font-extrabold text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/65">{card.body}</p>
          </div>
        </article>
      ))}

      <div className="lg:col-span-3">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-base font-bold text-white">
              {error ? 'Story feed is warming up' : 'The first public stories will be curated.'}
            </p>
            <p className="mt-1 text-sm leading-6 text-white/60">
              {error || 'Daters and providers can share stories later, but only approved stories will be published.'}
            </p>
          </div>
          <Link
            to="/get-started"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-pink-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-950/20 transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Start your story
          </Link>
        </div>
      </div>
    </div>
  )
}

function CompactStoryCard({ story }: { story: PublicSuccessStory }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <StoryBadge>{labelForStory(story)}</StoryBadge>
      <h3 className="mt-4 text-lg font-extrabold text-white">{story.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{story.body}</p>
      <StoryMeta story={story} compact />
    </article>
  )
}

function StoryImage({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div className="relative min-h-72 overflow-hidden">
      <img
        src={imageUrl || '/dateusherweb-sharp.jpg'}
        alt=""
        className="h-full min-h-72 w-full object-cover transition duration-500"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <span className="sr-only">{title}</span>
    </div>
  )
}

function StoryMeta({ compact = false, story }: { compact?: boolean; story: PublicSuccessStory }) {
  return (
    <div className={`mt-5 flex flex-wrap items-center gap-2 text-sm text-white/65 ${compact ? 'pt-2' : ''}`}>
      <span className="font-bold text-white">{story.attribution}</span>
      {story.location ? <span>{story.location}</span> : null}
      {story.provider ? <span>{story.provider.name}</span> : null}
      {story.rating ? <span className="font-bold text-pink-200">{story.rating}.0 rated</span> : null}
    </div>
  )
}

function StoryBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-pink-300/20 bg-pink-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-pink-100">
      {children}
    </span>
  )
}

function StoryLoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 shadow-xl shadow-black/20">
          <div className="aspect-[4/3] animate-pulse bg-white/10" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-24 rounded bg-white/15" />
            <div className="h-6 w-3/4 rounded bg-white/15" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function labelForStory(story: PublicSuccessStory) {
  return story.storyType.replace(/[_-]/g, ' ')
}
