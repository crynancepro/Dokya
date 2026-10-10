'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CountryOption, COUNTRIES, DEFAULT_COUNTRY, detectUserCountry } from '../constants/countries';

export type SupportedCurrency = 'XOF' | 'XAF' | 'EUR' | 'USD';

export interface CurrencyConfig {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  flag: string;
  /** Multiplicateur depuis le montant en Franc CFA (XOF) */
  rateFromXOF: number;
  decimals: number;
}

/**
 * Dictionnaire centralisé des tarifs Dokya (Price Map) selon la devise sélectionnée :
 * - FCFA (XOF / XAF) :
 *   * Mensuel : 5 000 FCFA
 *   * 6 Mois : 25 000 FCFA
 *   * Annuel : 40 000 FCFA
 *   * Badge Télévendeur : 10 000 FCFA
 *   * Acte (CV / Lettre / Facture) : 1 000 FCFA / Pack : 1 500 FCFA
 * - USD ($) :
 *   * Mensuel : 8.50 $
 *   * 6 Mois : 42 $
 *   * Annuel : 67 $
 *   * Badge Télévendeur : 17 $
 *   * Acte : 1.70 $ / Pack : 2.50 $
 * - EUR (€) :
 *   * Mensuel : 7.60 €
 *   * 6 Mois : 38 €
 *   * Annuel : 61 €
 *   * Badge Télévendeur : 15.20 €
 *   * Acte : 1.50 € / Pack : 2.30 €
 */
export const CENTRALIZED_PRICE_MAP: Record<SupportedCurrency, {
  monthly: { value: number; formatted: string };
  semester: { value: number; formatted: string };
  annual: { value: number; formatted: string };
  teleSellerBadge: { value: number; formatted: string };
  singleDoc: { value: number; formatted: string };
  packDuo: { value: number; formatted: string };
}> = {
  XOF: {
    monthly: { value: 5000, formatted: '5 000 FCFA' },
    semester: { value: 25000, formatted: '25 000 FCFA' },
    annual: { value: 40000, formatted: '40 000 FCFA' },
    teleSellerBadge: { value: 10000, formatted: '10 000 FCFA' },
    singleDoc: { value: 1000, formatted: '1 000 FCFA' },
    packDuo: { value: 1500, formatted: '1 500 FCFA' }
  },
  XAF: {
    monthly: { value: 5000, formatted: '5 000 FCFA' },
    semester: { value: 25000, formatted: '25 000 FCFA' },
    annual: { value: 40000, formatted: '40 000 FCFA' },
    teleSellerBadge: { value: 10000, formatted: '10 000 FCFA' },
    singleDoc: { value: 1000, formatted: '1 000 FCFA' },
    packDuo: { value: 1500, formatted: '1 500 FCFA' }
  },
  USD: {
    monthly: { value: 8.50, formatted: '8.50 $' },
    semester: { value: 42, formatted: '42 $' },
    annual: { value: 67, formatted: '67 $' },
    teleSellerBadge: { value: 17, formatted: '17 $' },
    singleDoc: { value: 1.70, formatted: '1.70 $' },
    packDuo: { value: 2.50, formatted: '2.50 $' }
  },
  EUR: {
    monthly: { value: 7.60, formatted: '7.60 €' },
    semester: { value: 38, formatted: '38 €' },
    annual: { value: 61, formatted: '61 €' },
    teleSellerBadge: { value: 15.20, formatted: '15.20 €' },
    singleDoc: { value: 1.50, formatted: '1.50 €' },
    packDuo: { value: 2.30, formatted: '2.30 €' }
  }
};

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  XOF: {
    code: 'XOF',
    name: 'Franc CFA (UEMOA)',
    symbol: 'FCFA',
    flag: '🇸🇳 🇨🇮',
    rateFromXOF: 1,
    decimals: 0
  },
  XAF: {
    code: 'XAF',
    name: 'Franc CFA (CEMAC)',
    symbol: 'FCFA',
    flag: '🇨🇲 🇬🇦',
    rateFromXOF: 1,
    decimals: 0
  },
  EUR: {
    code: 'EUR',
    name: 'Euro (€)',
    symbol: '€',
    flag: '🇫🇷 🇪🇺',
    // 1 EUR ≈ 655.95 XOF (taux officiel zone euro / CFA)
    rateFromXOF: 1 / 655.95,
    decimals: 2
  },
  USD: {
    code: 'USD',
    name: 'Dollar US ($)',
    symbol: '$',
    flag: '🇺🇸 🌐',
    // 1 USD ≈ 600 XOF
    rateFromXOF: 1 / 600,
    decimals: 2
  }
};

/**
 * Fonction helper universelle : convertit dynamiquement le montant et applique le bon symbole
 * (FCFA, $, €) sans décimales inutiles pour le FCFA.
 */
export function formatPrice(
  amountInXOF: number, 
  targetCurrency: SupportedCurrency = 'XOF',
  options: { showEquivalent?: boolean } = {}
): string {
  const raw = Number(amountInXOF) || 0;
  const curr = (targetCurrency || 'XOF').toUpperCase() as SupportedCurrency;

  // Si le montant correspond à un forfait standard du dictionnaire centralisé
  const priceMap = CENTRALIZED_PRICE_MAP[curr] || CENTRALIZED_PRICE_MAP.XOF;
  if (Math.abs(raw - 5000) < 1) return priceMap.monthly.formatted;
  if (Math.abs(raw - 25000) < 1) return priceMap.semester.formatted;
  if (Math.abs(raw - 40000) < 1) return priceMap.annual.formatted;
  if (Math.abs(raw - 10000) < 1) return priceMap.teleSellerBadge.formatted;
  if (Math.abs(raw - 1000) < 1) return priceMap.singleDoc.formatted;
  if (Math.abs(raw - 1500) < 1) return priceMap.packDuo.formatted;
  if (raw === 0) {
    if (curr === 'USD') return '0 $';
    if (curr === 'EUR') return '0 €';
    return '0 FCFA';
  }

  // Conversion dynamique proportionnelle
  if (curr === 'EUR') {
    const converted = raw / 655.95;
    const isRound = converted % 1 === 0;
    const formattedNum = isRound ? converted.toFixed(0) : converted.toFixed(2).replace('.', ',');
    const formatted = `${formattedNum} €`;
    return options.showEquivalent ? `${formatted} (~${Math.round(raw).toLocaleString('fr-FR')} FCFA)` : formatted;
  }

  if (curr === 'USD') {
    const converted = raw / 600;
    const isRound = converted % 1 === 0;
    const formattedNum = isRound ? converted.toFixed(0) : converted.toFixed(2);
    const formatted = `${formattedNum} $`;
    return options.showEquivalent ? `${formatted} (~${Math.round(raw).toLocaleString('fr-FR')} FCFA)` : formatted;
  }

  // FCFA (XOF ou XAF) sans décimales
  const formatted = `${Math.round(raw).toLocaleString('fr-FR')} FCFA`;
  if (options.showEquivalent) {
    const eurVal = (raw / 655.95).toFixed(2).replace('.', ',');
    const usdVal = (raw / 600).toFixed(2);
    return `${formatted} (≈ ${eurVal} € / ${usdVal} $)`;
  }
  return formatted;
}

interface LocaleContextType {
  userCountry: CountryOption;
  setUserCountry: (country: CountryOption) => void;
  userCurrency: SupportedCurrency;
  setUserCurrency: (currency: SupportedCurrency) => void;
  currencies: Record<SupportedCurrency, CurrencyConfig>;
  /** Convertit un montant XOF dans la devise cible */
  convertAmount: (amountXOF: number, targetCurrency?: SupportedCurrency) => number;
  /** Formate un montant dans la devise active */
  formatPrice: (amountXOF: number, targetCurrency?: SupportedCurrency, options?: { showEquivalent?: boolean }) => string;
  /** Renvoie la ligne de conversion indicative (ex: "1 000 FCFA ≈ 1.50 € / $1.60 USD") */
  getConversionRateSnippet: (amountXOF?: number) => string;
  /** Détermine si l'utilisateur est international (Europe, Amérique, devise EUR ou USD) */
  isInternational: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY_CURRENCY = 'dokya_user_currency';
const STORAGE_KEY_COUNTRY = 'dokya_user_country_code';

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userCountry, setUserCountryState] = useState<CountryOption>(() => {
    return detectUserCountry();
  });

  const [userCurrency, setUserCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENCY) as SupportedCurrency;
      if (saved && CURRENCIES[saved]) {
        return saved;
      }
    }
    const detected = detectUserCountry();
    return detected.currency || 'XOF';
  });

  // Sauvegarder les préférences lors des changements
  const setUserCountry = (country: CountryOption) => {
    setUserCountryState(country);
    try {
      localStorage.setItem(STORAGE_KEY_COUNTRY, country.code);
    } catch (_e) {}
  };

  const setUserCurrency = (currency: SupportedCurrency) => {
    setUserCurrencyState(currency);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
    } catch (_e) {}
  };

  // Convertit le montant
  const convertAmount = (amountXOF: number, targetCurrency: SupportedCurrency = userCurrency): number => {
    const raw = Number(amountXOF) || 0;
    const config = CURRENCIES[targetCurrency] || CURRENCIES.XOF;
    const converted = raw * config.rateFromXOF;
    if (config.decimals === 0) {
      return Math.round(converted);
    }
    return Math.round(converted * 100) / 100;
  };

  // Formate le montant selon la devise
  const formatPriceState = (
    amountXOF: number, 
    targetCurrency: SupportedCurrency = userCurrency,
    options: { showEquivalent?: boolean } = {}
  ): string => {
    return formatPrice(amountXOF, targetCurrency, options);
  };

  // Ligne de conversion indicative instantanée
  const getConversionRateSnippet = (amountXOF: number = 1000): string => {
    const eur = (amountXOF * CURRENCIES.EUR.rateFromXOF).toFixed(2).replace('.', ',');
    const usd = (amountXOF * CURRENCIES.USD.rateFromXOF).toFixed(2);
    return `${amountXOF.toLocaleString('fr-FR')} FCFA ≈ ${eur} € / $${usd} USD`;
  };

  const isInternational = userCurrency === 'EUR' || userCurrency === 'USD' || userCountry.region === 'international';

  return (
    <LocaleContext.Provider
      value={{
        userCountry,
        setUserCountry,
        userCurrency,
        setUserCurrency,
        currencies: CURRENCIES,
        convertAmount,
        formatPrice: formatPriceState,
        getConversionRateSnippet,
        isInternational
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
};
