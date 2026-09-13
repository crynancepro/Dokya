'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLocale, SupportedCurrency } from '../contexts/LocaleContext';
import { COUNTRIES, CountryOption } from '../constants/countries';
import { ChevronDown, Globe, Check, Search, Sparkles } from 'lucide-react';

interface CurrencyCountrySelectorProps {
  variant?: 'header' | 'modal' | 'pill' | 'compact';
  className?: string;
  showSnippet?: boolean;
}

export const CurrencyCountrySelector: React.FC<CurrencyCountrySelectorProps> = ({
  variant = 'header',
  className = '',
  showSnippet = false
}) => {
  const { 
    userCountry, 
    setUserCountry, 
    userCurrency, 
    setUserCurrency, 
    currencies, 
    getConversionRateSnippet 
  } = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'currency' | 'country'>('currency');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et touche Échap
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeCurrencyConfig = currencies[userCurrency] || currencies.XOF;

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dialCode.includes(searchQuery)
  );

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={`Changer de devise ou pays (Actuel : ${userCountry.flag} ${userCountry.name} • ${userCurrency})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
          variant === 'header'
            ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-white shadow-xs'
            : variant === 'pill'
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white shadow-sm'
              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        <span className="text-sm leading-none" role="img" aria-label={userCountry.name}>
          {userCountry.flag}
        </span>
        <span className="font-mono text-[11px] font-black tracking-tight text-slate-200">
          {userCurrency}
        </span>
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          ({activeCurrencyConfig.symbol})
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} 
        />
      </button>

      {/* Conversion snippet sous-jacent optionnel */}
      {showSnippet && (
        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
          <span>{getConversionRateSnippet()}</span>
        </p>
      )}

      {/* Dropdown Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150 text-slate-100">
          
          {/* Header */}
          <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <div>
                <h4 className="text-xs font-black text-white">Devise & Pays</h4>
                <p className="text-[10px] text-slate-400">Conversion visuelle en direct</p>
              </div>
            </div>
            
            {/* Tab switch */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setTab('currency')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  tab === 'currency' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Devise
              </button>
              <button
                type="button"
                onClick={() => setTab('country')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  tab === 'country' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pays
              </button>
            </div>
          </div>

          {/* TAB 1: CURRENCIES (XOF, XAF, EUR, USD) */}
          {tab === 'currency' && (
            <div className="p-2 space-y-1">
              {(Object.keys(currencies) as SupportedCurrency[]).map((curKey) => {
                const cur = currencies[curKey];
                const isSelected = userCurrency === curKey;
                
                let exampleText = '';
                if (curKey === 'XOF') exampleText = '1 000 FCFA (UEMOA)';
                else if (curKey === 'XAF') exampleText = '1 000 FCFA (CEMAC)';
                else if (curKey === 'EUR') exampleText = '≈ 1,50 € pour 1 000 F';
                else if (curKey === 'USD') exampleText = '≈ $1.60 USD pour 1 000 F';

                return (
                  <button
                    key={curKey}
                    type="button"
                    onClick={() => {
                      setUserCurrency(curKey);
                      // Ajuster pays par défaut si pas déjà dans la zone
                      if (curKey === 'EUR' && userCountry.region !== 'international') {
                        const fr = COUNTRIES.find(c => c.code === 'FR');
                        if (fr) setUserCountry(fr);
                      } else if (curKey === 'XAF' && userCountry.region !== 'cemac') {
                        const cm = COUNTRIES.find(c => c.code === 'CM');
                        if (cm) setUserCountry(cm);
                      } else if (curKey === 'XOF' && userCountry.region !== 'uemoa') {
                        const sn = COUNTRIES.find(c => c.code === 'SN');
                        if (sn) setUserCountry(sn);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-xs'
                        : 'bg-slate-900/50 hover:bg-slate-800 border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{cur.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black font-mono text-white">{cur.code}</span>
                          <span className="text-[11px] text-slate-400 truncate">({cur.name})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {exampleText}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {/* Indicatif conversion footer */}
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Taux indicatif :</span>
                <span className="font-mono text-indigo-300 font-bold">
                  1 000 FCFA ≈ 1.50 € / $1.60 USD
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: COUNTRY SELECTOR */}
          {tab === 'country' && (
            <div className="p-2 space-y-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Countries scrollable list */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {filteredCountries.map((c) => {
                  const isSelected = userCountry.code === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setUserCountry(c);
                        // Auto switch currency to country default
                        if (c.currency) {
                          setUserCurrency(c.currency);
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                          : 'bg-slate-900/50 hover:bg-slate-800 border-transparent text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{c.flag}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Indicatif {c.dialCode} • {c.currency}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}

                {filteredCountries.length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400">
                    Aucun pays trouvé.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
