import { useEffect } from 'react'

type SeoProps = {
  title: string
  description: string
  path?: string
  image?: string
  noIndex?: boolean
}

const SITE_NAME = 'DateUsher'
const SITE_URL = 'https://dateusher.com'
const DEFAULT_IMAGE = `${SITE_URL}/dateusher_logo.png`

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function setJsonLd(path: string, title: string, description: string) {
  let script = document.head.querySelector<HTMLScriptElement>('script[data-dateusher-seo="jsonld"]')
  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-dateusher-seo', 'jsonld')
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': path === '/' ? 'WebSite' : 'WebPage',
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_IMAGE,
    },
  })
}

export function Seo({ title, description, path = '/', image = DEFAULT_IMAGE, noIndex = false }: SeoProps) {
  useEffect(() => {
    const absoluteUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

    document.title = fullTitle
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow')
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME)
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', absoluteUrl)
    setMeta('meta[property="og:image"]', 'property', 'og:image', absoluteImage)
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteImage)
    setCanonical(absoluteUrl)
    setJsonLd(path.startsWith('/') ? path : `/${path}`, fullTitle, description)
  }, [description, image, noIndex, path, title])

  return null
}
