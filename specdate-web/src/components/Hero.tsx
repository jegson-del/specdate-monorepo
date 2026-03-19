import { type ReactNode } from 'react'

const HERO_IMAGE_SRC = '/date_user_mobile_landing.png'

export interface HeroProps {
  /** Optional header (e.g. navbar) rendered at top of hero */
  header?: ReactNode
  /** Optional overlay content (headline, CTA, etc.) */
  children?: ReactNode
  /** Minimize height on small screens so image is still visible */
  minHeight?: string
  className?: string
}

export function Hero({ header, children, minHeight = 'min-h-[70vh]', className = '' }: HeroProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${minHeight} ${className}`}
      aria-label="Hero"
    >
      {header != null && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/40 to-transparent pt-2">
          {header}
        </div>
      )}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE_SRC}
          alt=""
          className="h-full w-full object-cover object-center md:object-contain md:object-center"
          fetchPriority="high"
          role="presentation"
        />
        {/* Subtle overlay so text stays readable if present */}
        {children != null && (
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            aria-hidden
          />
        )}
      </div>
      {children != null && (
        <div className="relative z-10 flex h-full min-h-[inherit] items-end justify-center px-4 pb-24 pt-24 sm:pb-16">
          <div className="mx-auto w-full max-w-3xl text-center text-white">
            {children}
          </div>
        </div>
      )}
    </section>
  )
}
