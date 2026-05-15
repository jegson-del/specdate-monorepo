export function flagEmoji(countryCode?: string | null) {
  const code = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';

  return Array.from(code)
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function countryCodeFromName(country?: string | null) {
  const key = (country || '').trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();

  return ({
    australia: 'AU',
    belgium: 'BE',
    canada: 'CA',
    denmark: 'DK',
    france: 'FR',
    germany: 'DE',
    ghana: 'GH',
    india: 'IN',
    ireland: 'IE',
    italy: 'IT',
    kenya: 'KE',
    netherlands: 'NL',
    'new zealand': 'NZ',
    nigeria: 'NG',
    norway: 'NO',
    portugal: 'PT',
    'south africa': 'ZA',
    spain: 'ES',
    sweden: 'SE',
    'united kingdom': 'GB',
    uk: 'GB',
    'great britain': 'GB',
    england: 'GB',
    'united states': 'US',
    'united states of america': 'US',
    usa: 'US',
    us: 'US',
  } as Record<string, string>)[key] || '';
}

export function flagForCountry(country?: string | null, countryCode?: string | null) {
  return flagEmoji(countryCode || countryCodeFromName(country));
}
