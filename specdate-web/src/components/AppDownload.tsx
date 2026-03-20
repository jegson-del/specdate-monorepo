/** Local badge images in /public. */
const PLAY_STORE_BADGE = '/google_play.png'
const APP_STORE_BADGE = '/app_store.png'

export interface AppDownloadProps {
  /** Play Store app URL (e.g. https://play.google.com/store/apps/details?id=...) */
  playStoreUrl?: string
  /** App Store app URL (e.g. https://apps.apple.com/app/...) */
  appStoreUrl?: string
  /** Optional heading, e.g. "Download the app" */
  title?: string
  /** Layout: inline (side by side) or stack (vertical on small screens) */
  variant?: 'inline' | 'stack'
  /** Badge size */
  size?: 'default' | 'lg'
  className?: string
}

export function AppDownload({
  playStoreUrl = '#',
  appStoreUrl = '#',
  title,
  variant = 'inline',
  size = 'default',
  className = '',
}: AppDownloadProps) {
  const linkClass =
    'inline-block focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded overflow-hidden transition opacity-90 hover:opacity-100'
  const imgClass =
    size === 'lg'
      ? 'h-14 w-auto object-contain sm:h-16 md:h-[4.5rem]'
      : 'h-10 w-auto object-contain sm:h-11'

  return (
    <div className={`${variant === 'stack' ? 'flex flex-col items-center gap-3' : 'flex flex-wrap items-center justify-center gap-3'} ${className}`}>
      {title != null && title !== '' && (
        <p className="w-full text-center text-sm font-medium text-white/80">{title}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Get it on Google Play"
        >
          <img
            src={PLAY_STORE_BADGE}
            alt="Get it on Google Play"
            className={imgClass}
            width="135"
            height="40"
          />
        </a>
        <a
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Download on the App Store"
        >
          <img
            src={APP_STORE_BADGE}
            alt="Download on the App Store"
            className={imgClass}
            width="120"
            height="40"
          />
        </a>
      </div>
    </div>
  )
}
