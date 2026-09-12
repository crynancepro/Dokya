import React from 'react';
import { ShieldCheck, Lock, Zap } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  country: string;
  badgeColor: string;
  logo: React.ReactNode;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'wave',
    name: 'Wave',
    country: 'Sénégal, Côte d\'Ivoire, UEMOA',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#1DC3E4" />
          {/* Wave Penguin silhouette vector */}
          <path
            d="M24 10C20.686 10 18 12.686 18 16V23.5C18 26.814 20.686 29.5 24 29.5C27.314 29.5 30 26.814 30 23.5V16C30 12.686 27.314 10 24 10Z"
            fill="white"
          />
          <path
            d="M21 21C21 19.343 22.343 18 24 18C25.657 18 27 19.343 27 21V28C27 29.657 25.657 31 24 31C22.343 31 21 29.657 21 28V21Z"
            fill="#0F172A"
          />
          <circle cx="22.5" cy="15.5" r="1.5" fill="#0F172A" />
          <circle cx="25.5" cy="15.5" r="1.5" fill="#0F172A" />
          <path d="M23 17L24 18.5L25 17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19 33C21 35 27 35 29 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-base tracking-tight leading-none block">wave</span>
          <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">Mobile Money</span>
        </div>
      </div>
    ),
  },
  {
    id: 'orange-money',
    name: 'Orange Money',
    country: 'Panafricain (18 pays)',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#FF7900" />
          <circle cx="24" cy="24" r="14" fill="white" />
          <circle cx="24" cy="24" r="10" fill="#FF7900" />
          <circle cx="24" cy="24" r="6" fill="white" />
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-sm tracking-tight leading-none block">orange</span>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">MONEY</span>
        </div>
      </div>
    ),
  },
  {
    id: 'mtn',
    name: 'MTN MoMo',
    country: 'Afrique de l\'Ouest & Centrale',
    badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#FFCC00" />
          <ellipse cx="24" cy="24" rx="18" ry="12" stroke="#000000" strokeWidth="2.5" fill="none" />
          <text x="24" y="27" textAnchor="middle" fill="#000000" fontWeight="900" fontSize="11" fontFamily="sans-serif">MTN</text>
        </svg>
        <div className="text-left">
          <span className="font-black text-yellow-400 text-sm tracking-tight leading-none block">MTN</span>
          <span className="text-[10px] font-black text-slate-200 tracking-wider">MoMo</span>
        </div>
      </div>
    ),
  },
  {
    id: 'moov',
    name: 'Moov Money',
    country: 'Côte d\'Ivoire, Bénin, Togo, Mali',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#0066B3" />
          <path d="M12 28C14 18 20 16 26 22C32 28 36 22 36 18" stroke="#F37021" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="34" cy="18" r="3" fill="#F37021" />
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-sm tracking-tight leading-none block">moov</span>
          <span className="text-[10px] font-black text-orange-400 tracking-wider">money</span>
        </div>
      </div>
    ),
  },
  {
    id: 'visa',
    name: 'Visa',
    country: 'International (Tous pays)',
    badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-10 h-7 shrink-0" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="36" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <path d="M21.5 8.5L16.2 26H11.5L7.2 12.3C7.0 11.4 6.8 11.0 6.0 10.6C4.6 9.8 2.2 9.1 0 8.6L0.2 7.7H9.2C10.4 7.7 11.4 8.5 11.7 9.8L13.8 20.3L19.0 8.5H21.5Z" fill="#2563EB" />
          <path d="M27.2 17.5C27.2 14.2 32.0 14.0 32.0 12.1C32.0 11.4 31.4 10.7 30.0 10.5C29.3 10.4 27.4 10.3 25.5 11.2L24.6 7.4C26.0 6.9 28.0 6.5 30.5 6.5C35.8 6.5 39.5 9.3 39.5 13.4C39.5 20.2 30.4 20.6 30.4 23.3C30.4 24.3 31.3 25.0 33.1 25.0C34.6 25.0 36.8 24.3 38.3 23.5L39.2 27.2C37.8 27.9 35.5 28.5 32.6 28.5C27.0 28.5 27.2 24.1 27.2 17.5Z" fill="#F8FAFC" />
          <path d="M49.8 8.5L46.2 26H41.8L45.4 8.5H49.8ZM43.3 6.5C44.7 6.5 45.8 7.3 46.1 8.5L42.2 27.2C41.9 26.0 40.8 25.2 39.4 25.2L43.3 6.5Z" fill="#F8FAFC" />
          <path d="M60.2 8.5H56.5C55.4 8.5 54.5 9.0 54.0 10.0L46.0 26H51.0L52.0 23.2H58.2L58.8 26H63.2L60.2 8.5ZM53.4 19.5L56.0 12.4L57.5 19.5H53.4Z" fill="#F8FAFC" />
          <path d="M7.2 12.3C7.0 11.4 6.8 11.0 6.0 10.6C4.6 9.8 2.2 9.1 0 8.6L0.2 7.7H9.2C10.4 7.7 11.4 8.5 11.7 9.8L13.8 20.3L7.2 12.3Z" fill="#F59E0B" />
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-sm tracking-wider block">VISA</span>
          <span className="text-[9px] font-bold text-sky-400">Cartes Bancaires</span>
        </div>
      </div>
    ),
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    country: 'International (Tous pays)',
    badgeColor: 'text-red-400 border-red-500/30 bg-red-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-10 h-7 shrink-0" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="36" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <circle cx="26" cy="18" r="11" fill="#EB001B" />
          <circle cx="38" cy="18" r="11" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-xs tracking-tight block">mastercard</span>
          <span className="text-[9px] font-bold text-amber-400">International</span>
        </div>
      </div>
    ),
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    country: 'iPhone, Mac, Global',
    badgeColor: 'text-slate-300 border-slate-700 bg-slate-900/60',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-10 h-7 shrink-0" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="36" rx="6" fill="#000000" stroke="#334155" strokeWidth="1" />
          {/* Apple Logo */}
          <path d="M21.5 12.3C22.1 11.6 22.5 10.6 22.4 9.6C21.5 9.7 20.4 10.3 19.8 11.0C19.3 11.6 18.9 12.6 19.0 13.6C20.0 13.7 21.0 13.0 21.5 12.3ZM22.4 13.9C20.9 13.8 19.7 14.8 19.0 14.8C18.2 14.8 17.2 14.0 16.0 14.0C14.4 14.0 13.0 14.9 12.2 16.3C10.5 19.1 11.8 23.3 13.5 25.7C14.3 26.8 15.2 28.0 16.4 28.0C17.6 27.9 18.0 27.2 19.4 27.2C20.8 27.2 21.2 28.0 22.4 27.9C23.7 27.9 24.5 26.8 25.3 25.7C26.3 24.4 26.7 23.2 26.8 23.1C26.7 23.0 24.5 22.2 24.5 19.7C24.5 17.6 26.2 16.5 26.3 16.4C25.3 15.0 23.8 14.0 22.4 13.9Z" fill="white" />
          <text x="31" y="22" fill="white" fontWeight="700" fontSize="13" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Pay</text>
        </svg>
        <div className="text-left">
          <span className="font-black text-white text-xs tracking-tight block">Apple Pay</span>
          <span className="text-[9px] font-bold text-slate-400">1-Clic Biométrique</span>
        </div>
      </div>
    ),
  },
  {
    id: 'stripe',
    name: 'Stripe',
    country: 'International (135+ devises)',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/40',
    logo: (
      <div className="flex items-center gap-2">
        <svg className="w-10 h-7 shrink-0" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="36" rx="6" fill="#635BFF" />
          <path d="M25.8 15.6C25.8 14.1 27.1 13.4 29.2 13.4C30.8 13.4 32.8 13.8 34.3 14.6V10.7C32.7 10.1 30.9 9.8 29.1 9.8C24.1 9.8 20.8 12.4 20.8 16.0C20.8 21.6 28.4 20.7 28.4 23.4C28.4 25.1 26.9 25.7 25.1 25.7C23.1 25.7 20.8 24.9 19.1 23.9V27.9C21.0 28.7 23.1 29.1 25.1 29.1C30.3 29.1 33.6 26.6 33.6 22.8C33.6 16.9 25.8 17.9 25.8 15.6Z" fill="white" />
        </svg>
        <div className="text-left">
          <span className="font-black text-indigo-300 text-sm tracking-tight block">stripe</span>
          <span className="text-[9px] font-bold text-slate-300">Paiement Sécurisé</span>
        </div>
      </div>
    ),
  },
];

export const LandingPaymentMarquee: React.FC = () => {
  // Duplique la liste pour assurer une boucle infinie continue sans à-coups
  const marqueeItems = [...PAYMENT_METHODS, ...PAYMENT_METHODS];

  return (
    <div className="w-full py-10 relative overflow-hidden">
      {/* En-tête officiel requis */}
      <div className="text-center space-y-2 mb-8 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-black uppercase tracking-wider text-cyan-300 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Passerelle Certifiée GeniusPay &amp; Stripe</span>
        </div>
        
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
          Accepté dans toute l'Afrique et à l'international
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Wave, Orange Money, MTN, Moov, Visa, Mastercard, Apple Pay et Stripe. 
          Règlements instantanés avec validation automatisée en temps réel.
        </p>
      </div>

      {/* Bande de défilement continu infini avec masques latéraux transparents */}
      <div className="relative w-full overflow-hidden">
        {/* Masque dégradé gauche */}
        <div className="absolute top-0 left-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        {/* Masque dégradé droite */}
        <div className="absolute top-0 right-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent" />

        <div className="animate-marquee-left flex items-center gap-4 sm:gap-6 py-2">
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="shrink-0 px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 backdrop-blur-md shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer flex items-center gap-3.5 select-none group"
            >
              {item.logo}
              <div className="hidden sm:block border-l border-slate-800 pl-3">
                <span className="text-[10px] font-bold text-slate-400 block">{item.country}</span>
                <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Instantané
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ligne de réassurance discrète */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400 px-4">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Lock className="w-3.5 h-3.5" /> Chiffrement Bancaire SSL 256-Bit
        </span>
        <span className="text-slate-600">•</span>
        <span>Aucun frais caché</span>
        <span className="text-slate-600">•</span>
        <span>Reçu de paiement officiel délivré par SMS &amp; Email</span>
      </div>
    </div>
  );
};
