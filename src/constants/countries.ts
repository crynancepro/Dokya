export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  example: string;
  currency: 'XOF' | 'XAF' | 'EUR' | 'USD';
  region: 'uemoa' | 'cemac' | 'international';
}

export const COUNTRIES: CountryOption[] = [
  // Afrique de l'Ouest (Zone UEMOA - XOF)
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', example: '77 123 45 67', currency: 'XOF', region: 'uemoa' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', example: '07 12 34 56 78', currency: 'XOF', region: 'uemoa' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', example: '70 12 34 56', currency: 'XOF', region: 'uemoa' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', example: '70 12 34 56', currency: 'XOF', region: 'uemoa' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯', example: '97 12 34 56', currency: 'XOF', region: 'uemoa' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', example: '90 12 34 56', currency: 'XOF', region: 'uemoa' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', example: '90 12 34 56', currency: 'XOF', region: 'uemoa' },
  { code: 'GN', name: 'Guinée (Conakry)', dialCode: '+224', flag: '🇬🇳', example: '620 12 34 56', currency: 'XOF', region: 'uemoa' },

  // Afrique Centrale (Zone CEMAC - XAF)
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', example: '6 70 12 34 56', currency: 'XAF', region: 'cemac' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', example: '074 12 34 56', currency: 'XAF', region: 'cemac' },
  { code: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬', example: '06 123 45 67', currency: 'XAF', region: 'cemac' },
  { code: 'CD', name: 'RD Congo (RDC)', dialCode: '+243', flag: '🇨🇩', example: '81 123 45 67', currency: 'USD', region: 'cemac' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩', example: '66 12 34 56', currency: 'XAF', region: 'cemac' },
  { code: 'CF', name: 'Centrafrique', dialCode: '+236', flag: '🇨🇫', example: '70 12 34 56', currency: 'XAF', region: 'cemac' },
  { code: 'GQ', name: 'Guinée Équatoriale', dialCode: '+240', flag: '🇬🇶', example: '222 12 34 56', currency: 'XAF', region: 'cemac' },

  // International & Diaspora (Europe, Amérique, Monde)
  { code: 'FR', name: 'France / Diaspora', dialCode: '+33', flag: '🇫🇷', example: '6 12 34 56 78', currency: 'EUR', region: 'international' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪', example: '470 12 34 56', currency: 'EUR', region: 'international' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭', example: '78 123 45 67', currency: 'EUR', region: 'international' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', example: '514 123 4567', currency: 'USD', region: 'international' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸', example: '202 555 0123', currency: 'USD', region: 'international' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧', example: '7911 123456', currency: 'EUR', region: 'international' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪', example: '151 12345678', currency: 'EUR', region: 'international' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸', example: '612 34 56 78', currency: 'EUR', region: 'international' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹', example: '320 123 4567', currency: 'EUR', region: 'international' },
  { code: 'OTHER', name: 'Autre pays / International', dialCode: '+', flag: '🌍', example: 'Numéro complet', currency: 'USD', region: 'international' }
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Sénégal par défaut

/**
 * Détecte intelligemment le pays selon le fuseau horaire du navigateur
 */
export function detectUserCountry(): CountryOption {
  if (typeof window === 'undefined') return DEFAULT_COUNTRY;

  try {
    const savedCode = localStorage.getItem('dokya_user_country_code');
    if (savedCode) {
      const match = COUNTRIES.find(c => c.code === savedCode);
      if (match) return match;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzLower = tz.toLowerCase();

    if (tzLower.includes('dakar')) return COUNTRIES.find(c => c.code === 'SN') || DEFAULT_COUNTRY;
    if (tzLower.includes('abidjan')) return COUNTRIES.find(c => c.code === 'CI') || DEFAULT_COUNTRY;
    if (tzLower.includes('douala') || tzLower.includes('yaounde')) return COUNTRIES.find(c => c.code === 'CM') || DEFAULT_COUNTRY;
    if (tzLower.includes('libreville')) return COUNTRIES.find(c => c.code === 'GA') || DEFAULT_COUNTRY;
    if (tzLower.includes('brazzaville')) return COUNTRIES.find(c => c.code === 'CG') || DEFAULT_COUNTRY;
    if (tzLower.includes('kinshasa') || tzLower.includes('lubumbashi')) return COUNTRIES.find(c => c.code === 'CD') || DEFAULT_COUNTRY;
    if (tzLower.includes('bamako')) return COUNTRIES.find(c => c.code === 'ML') || DEFAULT_COUNTRY;
    if (tzLower.includes('ouagadougou')) return COUNTRIES.find(c => c.code === 'BF') || DEFAULT_COUNTRY;
    if (tzLower.includes('conakry')) return COUNTRIES.find(c => c.code === 'GN') || DEFAULT_COUNTRY;
    if (tzLower.includes('porto-novo') || tzLower.includes('cotonou')) return COUNTRIES.find(c => c.code === 'BJ') || DEFAULT_COUNTRY;
    if (tzLower.includes('lome')) return COUNTRIES.find(c => c.code === 'TG') || DEFAULT_COUNTRY;
    if (tzLower.includes('niamey')) return COUNTRIES.find(c => c.code === 'NE') || DEFAULT_COUNTRY;
    if (tzLower.includes('ndjamena')) return COUNTRIES.find(c => c.code === 'TD') || DEFAULT_COUNTRY;
    if (tzLower.includes('bangui')) return COUNTRIES.find(c => c.code === 'CF') || DEFAULT_COUNTRY;

    if (tzLower.includes('paris')) return COUNTRIES.find(c => c.code === 'FR') || DEFAULT_COUNTRY;
    if (tzLower.includes('brussels')) return COUNTRIES.find(c => c.code === 'BE') || DEFAULT_COUNTRY;
    if (tzLower.includes('zurich') || tzLower.includes('geneva')) return COUNTRIES.find(c => c.code === 'CH') || DEFAULT_COUNTRY;
    if (tzLower.includes('toronto') || tzLower.includes('montreal') || tzLower.includes('vancouver')) return COUNTRIES.find(c => c.code === 'CA') || DEFAULT_COUNTRY;
    if (tzLower.includes('new_york') || tzLower.includes('chicago') || tzLower.includes('los_angeles')) return COUNTRIES.find(c => c.code === 'US') || DEFAULT_COUNTRY;
    if (tzLower.includes('london')) return COUNTRIES.find(c => c.code === 'GB') || DEFAULT_COUNTRY;
    if (tzLower.includes('berlin')) return COUNTRIES.find(c => c.code === 'DE') || DEFAULT_COUNTRY;
    if (tzLower.includes('madrid')) return COUNTRIES.find(c => c.code === 'ES') || DEFAULT_COUNTRY;
    if (tzLower.includes('rome')) return COUNTRIES.find(c => c.code === 'IT') || DEFAULT_COUNTRY;

    // Check browser languages (e.g. fr-SN, fr-CI, fr-FR)
    const lang = (navigator.language || '').toUpperCase();
    if (lang.includes('SN')) return COUNTRIES.find(c => c.code === 'SN') || DEFAULT_COUNTRY;
    if (lang.includes('CI')) return COUNTRIES.find(c => c.code === 'CI') || DEFAULT_COUNTRY;
    if (lang.includes('CM')) return COUNTRIES.find(c => c.code === 'CM') || DEFAULT_COUNTRY;
    if (lang.includes('FR')) return COUNTRIES.find(c => c.code === 'FR') || DEFAULT_COUNTRY;
    if (lang.includes('US')) return COUNTRIES.find(c => c.code === 'US') || DEFAULT_COUNTRY;
    if (lang.includes('CA')) return COUNTRIES.find(c => c.code === 'CA') || DEFAULT_COUNTRY;
  } catch (_e) {
    // ignore
  }

  return DEFAULT_COUNTRY;
}

/**
 * Indique si un pays dispose d'un écosystème Mobile Money local (Wave, Orange Money, MTN, Moov...)
 */
export function isMobileMoneyCountry(code: string): boolean {
  const c = COUNTRIES.find(country => country.code === code);
  return c ? c.region === 'uemoa' || c.region === 'cemac' : false;
}
