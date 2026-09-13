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
    // 1 000 FCFA ≈ 1.50 € (taux standard Dokya international)
    rateFromXOF: 0.0015,
    decimals: 2
  },
  USD: {
    code: 'USD',
    name: 'Dollar US ($)',
    symbol: '$',
    flag: '🇺🇸 🌐',
    // 1 000 FCFA ≈ $1.60 USD
    rateFromXOF: 0.0016,
    decimals: 2
  }
};

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
  const formatPrice = (
    amountXOF: number, 
    targetCurrency: SupportedCurrency = userCurrency,
    options: { showEquivalent?: boolean } = {}
  ): string => {
    const raw = Number(amountXOF) || 0;
    const curr = targetCurrency || userCurrency;
    const config = CURRENCIES[curr] || CURRENCIES.XOF;
    const val = convertAmount(raw, curr);

    let formatted = '';
    if (curr === 'EUR') {
      formatted = `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      if (options.showEquivalent) {
        formatted += ` (~${raw.toLocaleString('fr-FR')} FCFA)`;
      }
    } else if (curr === 'USD') {
      formatted = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
      if (options.showEquivalent) {
        formatted += ` (~${raw.toLocaleString('fr-FR')} FCFA)`;
      }
    } else if (curr === 'XAF') {
      formatted = `${raw.toLocaleString('fr-FR')} FCFA`;
      if (options.showEquivalent) {
        const eurVal = (raw * CURRENCIES.EUR.rateFromXOF).toFixed(2).replace('.', ',');
        const usdVal = (raw * CURRENCIES.USD.rateFromXOF).toFixed(2);
        formatted += ` (≈ ${eurVal} € / $${usdVal})`;
      }
    } else {
      // XOF par défaut
      formatted = `${raw.toLocaleString('fr-FR')} FCFA`;
      if (options.showEquivalent) {
        const eurVal = (raw * CURRENCIES.EUR.rateFromXOF).toFixed(2).replace('.', ',');
        const usdVal = (raw * CURRENCIES.USD.rateFromXOF).toFixed(2);
        formatted += ` (≈ ${eurVal} € / $${usdVal} USD)`;
      }
    }

    return formatted;
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
        formatPrice,
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
