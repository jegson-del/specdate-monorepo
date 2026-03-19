import { type ReactNode } from 'react'

const LOGO_SRC = '/date_usher_landing_logo.png'

export interface NavbarLink {
  label: string
  href: string
}

export interface NavbarProps {
  logoAlt?: string
  links?: NavbarLink[]
  className?: string
  children?: ReactNode
}

export function Navbar({
  logoAlt = 'Date Usher',
  links = [],
  className = '',
  children,
}: NavbarProps) {
  return (
    <header
      className={`w-full ${className}`}
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <a
          href="/"
          className="flex shrink-0 items-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pink-500 rounded"
          aria-label="Go to home"
        >
          <img
            src={LOGO_SRC}
            alt={logoAlt}
            className="h-8 w-auto sm:h-9 md:h-10 object-contain"
            width={160}
            height={40}
            fetchPriority="high"
          />
        </a>

        {links.length > 0 && (
          <ul className="hidden sm:flex items-center gap-6">
            {links.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-sm font-medium text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 rounded px-2 py-1 drop-shadow-md"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {children != null && (
          <div className="flex items-center gap-3">{children}</div>
        )}
      </nav>
    </header>
  )
}
