export interface LegalSection {
  title: string
  body?: string[]
  items?: string[]
}

export interface LegalPageContent {
  slug: string
  title: string
  kicker: string
  lastUpdated: string
  summary: string
  sections: LegalSection[]
}
