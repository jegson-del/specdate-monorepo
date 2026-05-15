import { LegalArticle } from '../components/legal/LegalArticle'
import { Seo } from '../components/Seo'
import type { LegalPageContent } from '../types/legal'

interface LegalArticlePageProps {
  page: LegalPageContent
}

export default function LegalArticlePage({ page }: LegalArticlePageProps) {
  return (
    <>
      <Seo title={`${page.title} - DateUsher`} description={page.summary} path={`/${page.slug}`} />
      <LegalArticle page={page} />
    </>
  )
}
