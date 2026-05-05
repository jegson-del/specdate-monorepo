import { type ReactNode } from 'react'

/** Heart path for clip (viewBox 0 0 100 100). */
const HEART_PATH =
  'M50,88 C20,60 0,32 0,18 C0,2 14,0 28,0 C38,0 48,12 50,20 C52,12 62,0 72,0 C86,0 100,2 100,18 C100,32 80,60 50,88 Z'

export interface GalleryItem {
  src: string
  alt: string
  id: string
  /** Optional visible title under the heart */
  title?: string
  imageBox?: {
    y: number
    height: number
  }
}

export interface GalleryProps {
  items?: GalleryItem[]
  title?: ReactNode
  className?: string
}

const DEFAULT_ITEMS: GalleryItem[] = [
  {
    src: '/black_wedding.png',
    alt: 'Black wedding',
    id: 'heart-1',
    title: 'Now forever',
    imageBox: { y: -39, height: 150 },
  },
  { src: '/blackman_journey.png', alt: 'Journey', id: 'heart-2', title: 'We went on memorable dates' },
  { src: '/phone%20chat.png', alt: 'Phone chat', id: 'heart-3', title: 'Our first chats' },
]

function HeartFrame({ item }: { item: GalleryItem }) {
  const imageBox = item.imageBox ?? { y: 0, height: 100 }

  return (
    <figure className="group relative w-full">
      <svg
        viewBox="0 0 100 100"
        className="w-full aspect-square drop-shadow-xl transition transform group-hover:scale-[1.02]"
        aria-hidden
      >
        <defs>
          <clipPath id={item.id}>
            <path d={HEART_PATH} />
          </clipPath>
          <filter id={`shadow-${item.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="rgba(236,72,153,0.15)" />
          </filter>
        </defs>
        <g clipPath={`url(#${item.id})`} filter={`url(#shadow-${item.id})`}>
          <image
            href={item.src}
            x="0"
            y={imageBox.y}
            width="100"
            height={imageBox.height}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
        <path
          d={HEART_PATH}
          fill="none"
          stroke="rgba(236,72,153,0.4)"
          strokeWidth="0.8"
          className="transition group-hover:stroke-pink-500/60"
        />
      </svg>
      <figcaption className="mt-4 text-center">
        {item.title != null && item.title !== '' ? (
          <>
            <span className="text-base font-medium text-white/90 sm:text-lg">{item.title}</span>
            <span className="sr-only"> — {item.alt}</span>
          </>
        ) : (
          <span className="sr-only">{item.alt}</span>
        )}
      </figcaption>
    </figure>
  )
}

export function Gallery({
  items = DEFAULT_ITEMS,
  title,
  className = '',
}: GalleryProps) {
  return (
    <section
      className={`py-16 sm:py-20 md:py-24 ${className}`}
      aria-label="Gallery"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {title != null && (
          <h2 className="mb-12 text-center text-2xl font-light tracking-wide text-white/80 sm:text-3xl md:mb-16">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-3 md:gap-12">
          {items.map((item) => (
            <HeartFrame key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
