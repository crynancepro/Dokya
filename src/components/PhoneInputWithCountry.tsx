'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CountryOption, COUNTRIES, DEFAULT_COUNTRY } from '../constants/countries';
import { useLocale } from '../contexts/LocaleContext';
import { ChevronDown, Search, Phone, Check } from 'lucide-react';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullNumber: string, details?: { country: CountryOption; dialCode: string; nationalNumber: string }) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  value,
  onChange,
  defaultCountryCode,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  id = 'phone-input-country'
}) => {
  const { userCountry } = useLocale();

  // Selected country
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(() => {
    if (defaultCountryCode) {
      const match = COUNTRIES.find(c => c.code === defaultCountryCode);
      if (match) return match;
    }
    return userCountry || DEFAULT_COUNTRY;
  });

  // National phone number digits without dial code
  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    if (!value) return '';
    // If value already starts with a dial code, extract national part
    for (const c of COUNTRIES) {
      if (value.startsWith(c.dialCode)) {
        return value.replace(c.dialCode, '').trim();
      }
    }
    return value.trim();
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if defaultCountryCode changes
  useEffect(() => {
    if (defaultCountryCode) {
      const match = COUNTRIES.find(c => c.code === defaultCountryCode);
      if (match && match.code !== selectedCountry.code) {
        setSelectedCountry(match);
      }
    }
  }, [defaultCountryCode]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Format and emit when national number or country changes
  const handleNumberChange = (raw: string) => {
    // Only allow digits, spaces, and hyphens
    const clean = raw.replace(/[^\d\s-]/g, '');
    setNationalNumber(clean);
    
    const digitsOnly = clean.replace(/\D/g, '');
    const full = digitsOnly ? `${selectedCountry.dialCode} ${clean.trim()}` : '';
    onChange(full, {
      country: selectedCountry,
      dialCode: selectedCountry.dialCode,
      nationalNumber: digitsOnly
    });
  };

  const handleCountrySelect = (country: CountryOption) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchFilter('');
    
    const digitsOnly = nationalNumber.replace(/\D/g, '');
    const full = digitsOnly ? `${country.dialCode} ${nationalNumber.trim()}` : '';
    onChange(full, {
      country,
      dialCode: country.dialCode,
      nationalNumber: digitsOnly
    });

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.dialCode.includes(searchFilter) ||
    c.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all overflow-hidden">
        
        {/* Country Picker Trigger */}
        <button
          type="button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          title={`Indicatif : ${selectedCountry.name} (${selectedCountry.dialCode})`}
          className="inline-flex items-center gap-1.5 px-3 py-3 bg-slate-950/60 hover:bg-slate-950 border-r border-slate-800 text-slate-200 transition-all cursor-pointer select-none shrink-0"
        >
          <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown 
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} 
          />
        </button>

        {/* Input Phone */}
        <div className="relative flex-1">
          <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            id={id}
            type="tel"
            required={required}
            disabled={disabled}
            placeholder={placeholder || selectedCountry.example || '77 123 45 67'}
            value={nationalNumber}
            onChange={(e) => handleNumberChange(e.target.value)}
            className="w-full pl-9 pr-3 py-3 bg-transparent text-xs font-medium text-white placeholder-slate-500 focus:outline-none caret-indigo-400"
          />
        </div>

      </div>

      {/* Indicatif hint */}
      <div className="flex items-center justify-between px-1 mt-1 text-[10px] text-slate-400 font-mono">
        <span>{selectedCountry.name}</span>
        <span>Ex : {selectedCountry.dialCode} {selectedCountry.example}</span>
      </div>

      {/* Country Dropdown */}
      {isDropdownOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden text-slate-100 animate-in fade-in duration-100">
          
          {/* Search bar */}
          <div className="p-2.5 bg-slate-950 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher indicatif ou pays..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* List of countries */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredCountries.map((c) => {
              const isSelected = selectedCountry.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/40' 
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{c.flag}</span>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {c.dialCode} • {c.currency}
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
                Aucun pays correspondant.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
