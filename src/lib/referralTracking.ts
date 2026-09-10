/**
 * Module de suivi des liens et codes d'affiliation Dokya AI
 * Capture, stocke et synchronise les codes de parrainage via URL (?ref=CODE)
 */

export const AFFILIATE_STORAGE_KEY = 'dokya_ref_code';
export const AFFILIATE_TIMESTAMP_KEY = 'dokya_ref_date';

/**
 * Initialise la détection et l'enregistrement immédiat du code d'affiliation
 * depuis l'URL (search query ou fragment hash).
 * Compatible avec les liens du type :
 * - https://dokya.ai?ref=PETER25
 * - https://dokya.ai/#/?ref=PETER25
 * - https://dokya.ai?r=PETER25
 */
export function initAffiliateTracking(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    let foundCode: string | null = null;

    // 1. Recherche dans window.location.search
    const searchParams = new URLSearchParams(window.location.search);
    foundCode = searchParams.get('ref') || searchParams.get('r') || searchParams.get('affiliate') || searchParams.get('parrain');

    // 2. Recherche dans window.location.hash si présent
    if (!foundCode && window.location.hash.includes('ref=')) {
      const hashQuery = window.location.hash.includes('?') 
        ? window.location.hash.substring(window.location.hash.indexOf('?') + 1)
        : window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashQuery);
      foundCode = hashParams.get('ref') || hashParams.get('r') || hashParams.get('affiliate');
    }

    if (foundCode) {
      const cleanCode = foundCode.trim().toUpperCase();
      if (cleanCode.length >= 3 && cleanCode.length <= 30) {
        setStoredReferralCode(cleanCode);
        return cleanCode;
      }
    }

    return getStoredReferralCode();
  } catch (e) {
    console.warn('[Affiliate Tracking Init Error]:', e);
    return null;
  }
}

/**
 * Enregistre le code d'affiliation dans le localStorage, sessionStorage et un cookie
 */
export function setStoredReferralCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const cleanCode = code.trim().toUpperCase();
  const nowIso = new Date().toISOString();

  try {
    localStorage.setItem(AFFILIATE_STORAGE_KEY, cleanCode);
    localStorage.setItem(AFFILIATE_TIMESTAMP_KEY, nowIso);
    sessionStorage.setItem(AFFILIATE_STORAGE_KEY, cleanCode);

    // Cookie de navigation valide pendant 90 jours
    const maxAgeSeconds = 90 * 24 * 60 * 60;
    document.cookie = `${AFFILIATE_STORAGE_KEY}=${encodeURIComponent(cleanCode)};path=/;max-age=${maxAgeSeconds};SameSite=Lax`;
  } catch (e) {
    console.warn('[Store Referral Code Error]:', e);
  }
}

/**
 * Récupère le code d'affiliation en attente de conversion (depuis localStorage, sessionStorage ou cookie)
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. localStorage
    const fromLocal = localStorage.getItem(AFFILIATE_STORAGE_KEY);
    if (fromLocal && fromLocal.trim()) return fromLocal.trim().toUpperCase();

    // 2. sessionStorage
    const fromSession = sessionStorage.getItem(AFFILIATE_STORAGE_KEY);
    if (fromSession && fromSession.trim()) return fromSession.trim().toUpperCase();

    // 3. Cookie de secours
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === AFFILIATE_STORAGE_KEY && v) {
        return decodeURIComponent(v).trim().toUpperCase();
      }
    }
  } catch (e) {
    console.warn('[Get Stored Referral Code Error]:', e);
  }

  return null;
}

/**
 * Nettoie le code d'affiliation stocké
 */
export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
    localStorage.removeItem(AFFILIATE_TIMESTAMP_KEY);
    sessionStorage.removeItem(AFFILIATE_STORAGE_KEY);
    document.cookie = `${AFFILIATE_STORAGE_KEY}=;path=/;max-age=0;SameSite=Lax`;
  } catch (e) {}
}

/**
 * Masque partiellement un email pour la confidentialité des données (Data Privacy)
 * Ex: moussa.diop@gmail.com -> mo*****p@gmail.com
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'Client Dokya';
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];

  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  if (user.length <= 4) {
    return `${user[0]}**${user[user.length - 1]}@${domain}`;
  }
  return `${user.slice(0, 2)}****${user.slice(-1)}@${domain}`;
}

/**
 * Masque partiellement le nom d'un client pour l'affichage public
 * Ex: "Mamadou Diop" -> "Mamadou D."
 */
export function maskName(fullName?: string): string {
  if (!fullName || !fullName.trim()) return 'Filleul Dokya';
  const tokens = fullName.trim().split(/\s+/);
  if (tokens.length === 1) {
    const t = tokens[0];
    return t.length <= 3 ? t : `${t.slice(0, 3)}...`;
  }
  const firstName = tokens[0];
  const lastInitial = tokens[1][0]?.toUpperCase() || '';
  return `${firstName} ${lastInitial}.`;
}
