import { LegalArticle } from '../components/legal/LegalArticle'
import type { LegalPageContent } from '../types/legal'

interface LegalArticlePageProps {
  page: LegalPageContent
}

export default function LegalArticlePage({ page }: LegalArticlePageProps) {
  return <LegalArticle page={page} />
}
