export const currencyOptions = [
  { label: 'USD - US dollar', value: 'USD' },
  { label: 'GBP - British pound', value: 'GBP' },
  { label: 'EUR - Euro', value: 'EUR' },
  { label: 'NGN - Nigerian naira', value: 'NGN' },
  { label: 'CAD - Canadian dollar', value: 'CAD' },
  { label: 'AUD - Australian dollar', value: 'AUD' },
  { label: 'GHS - Ghanaian cedi', value: 'GHS' },
  { label: 'KES - Kenyan shilling', value: 'KES' },
  { label: 'ZAR - South African rand', value: 'ZAR' },
  { label: 'INR - Indian rupee', value: 'INR' },
  { label: 'AED - UAE dirham', value: 'AED' },
  { label: 'NZD - New Zealand dollar', value: 'NZD' },
];

const countryCurrency: Record<string, string> = {
  'united kingdom': 'GBP',
  uk: 'GBP',
  'great britain': 'GBP',
  england: 'GBP',
  scotland: 'GBP',
  wales: 'GBP',
  'northern ireland': 'GBP',
  'united states': 'USD',
  usa: 'USD',
  us: 'USD',
  canada: 'CAD',
  nigeria: 'NGN',
  ghana: 'GHS',
  kenya: 'KES',
  'south africa': 'ZAR',
  france: 'EUR',
  germany: 'EUR',
  spain: 'EUR',
  italy: 'EUR',
  ireland: 'EUR',
  netherlands: 'EUR',
  belgium: 'EUR',
  portugal: 'EUR',
  australia: 'AUD',
  'new zealand': 'NZD',
  india: 'INR',
  'united arab emirates': 'AED',
  uae: 'AED',
};

export function getDefaultCurrencyForCountry(country?: string | null) {
  return countryCurrency[(country || '').trim().toLowerCase()] || 'USD';
}

export function normalizeCurrency(currency?: string | null, country?: string | null) {
  const value = (currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : getDefaultCurrencyForCountry(country);
}

export function currencySymbol(currency?: string | null, country?: string | null) {
  const code = normalizeCurrency(currency, country);
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

export function formatMoney(value?: number | string | null, currency?: string | null, country?: string | null) {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '';
  const code = normalizeCurrency(currency, country);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}
