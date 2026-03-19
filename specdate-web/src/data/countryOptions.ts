import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(enLocale as typeof enLocale)

export interface CountryOption {
  code: string
  name: string
}

/** All ISO 3166-1 alpha-2 countries, sorted by English name */
export function getCountryOptions(): CountryOption[] {
  const map = countries.getNames('en', { select: 'official' }) as Record<string, string>
  return Object.entries(map)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/** Set of valid alpha-2 codes for validation */
export function getValidCountryCodes(): Set<string> {
  return new Set(Object.keys(countries.getAlpha2Codes()))
}
