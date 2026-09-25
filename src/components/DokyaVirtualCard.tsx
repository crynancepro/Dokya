import React from 'react';
import { Plus, Radio, Crown, Sparkles, ShieldCheck } from 'lucide-react';

interface DokyaVirtualCardProps {
  userName?: string;
  userEmail?: string;
  balance: number;
  currency?: string;
  onRecharge: () => void;
  variant?: 'sidebar' | 'dashboard' | 'compact';
  isVip?: boolean;
  cardNumber?: string;
}

export const DokyaVirtualCard: React.FC<DokyaVirtualCardProps> = ({
  userName = 'PETER NGOUALA',
  userEmail = '',
  balance = 0,
  currency = 'FCFA',
  onRecharge,
  variant = 'sidebar',
  isVip = false,
  cardNumber
}) => {
  // Format cardholder name in uppercase
  const rawName = (userName && userName !== 'Utilisateur Dokya' && userName !== 'Candidat Pro')
    ? userName
    : (userEmail ? userEmail.split('@')[0] : 'PETER NGOUALA');

  const cleanName = rawName.toUpperCase();

  // Format a realistic masked card number
  const maskedCard = cardNumber || '••••  ••••  ••••  8429';

  // =========================================================================
  // 1. SIDEBAR VARIANT (COMPACT & SLEEK)
  // =========================================================================
  if (variant === 'sidebar') {
    return (
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-slate-700/60 p-3.5 shadow-xl transition-all duration-300 hover:border-indigo-500/50">
        {/* Ambient subtle glow & reflection */}
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-gradient-to-bl from-indigo-500/20 via-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-amber-500/10 rounded-full blur-lg pointer-events-none" />

        {/* Dokya Filigrane Watermark */}
        <div className="absolute right-2 -bottom-1 text-3xl font-black text-white/[0.04] select-none pointer-events-none font-mono tracking-tighter">
          DOKYA
        </div>

        {/* Line 1: EMV Microchip, Contactless & Title */}
        <div className="relative z-10 flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            {/* EMV Microchip */}
            <div className="w-6 h-5 rounded-[4px] bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-200 border border-amber-600/40 relative overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
              <div className="w-full h-[1px] bg-amber-700/40 absolute top-1/2 -translate-y-1/2" />
              <div className="h-full w-[1px] bg-amber-700/40 absolute left-1/2 -translate-x-1/2" />
              <div className="w-2.5 h-2 rounded-[2px] border border-amber-700/40" />
            </div>

            {/* Contactless symbol */}
            <Radio className="w-3.5 h-3.5 text-slate-400 rotate-90" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black tracking-wider text-slate-100 uppercase font-mono">
              DOKYA WALLET
            </span>
            {isVip && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Crown className="w-2.5 h-2.5" />
                VIP
              </span>
            )}
          </div>
        </div>

        {/* Line 2: Big Balance & Recharge Button */}
        <div className="relative z-10 flex items-end justify-between gap-2 mb-2">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Solde disponible
            </span>
            <div className="text-lg font-black text-white tracking-tight flex items-baseline gap-1">
              <span className="text-emerald-400">{(balance ?? 0).toLocaleString('fr-FR')}</span>
              <span className="text-[11px] font-bold text-emerald-300">{currency}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRecharge}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-[11px] font-black shadow-md shadow-emerald-950/40 flex items-center gap-1 transition-all cursor-pointer shrink-0"
            title="Recharger le portefeuille Dokya"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Recharger</span>
          </button>
        </div>

        {/* Line 3: Titulaire Full Name & Masked digits */}
        <div className="relative z-10 pt-1 border-t border-white/5 flex items-center justify-between text-[10px]">
          <span className="font-mono text-slate-300 font-semibold truncate max-w-[130px] tracking-wider" title={cleanName}>
            {cleanName}
          </span>
          <span className="font-mono text-[9px] text-slate-500 tracking-wider">
            •••• 8429
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD VARIANT (LUXURY VIRTUAL BANK CARD)
  // =========================================================================
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-zinc-900/95 to-indigo-950/90 border border-slate-700/70 p-5 sm:p-6 shadow-2xl transition-all duration-300 hover:border-indigo-500/40 hover:shadow-indigo-500/10 backdrop-blur-md">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-56 h-56 bg-gradient-to-bl from-indigo-500/25 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Dokya Filigrane Watermark */}
      <div className="absolute right-4 bottom-1 text-6xl sm:text-7xl font-black text-white/[0.04] select-none pointer-events-none font-mono tracking-tighter">
        DOKYA
      </div>

      {/* Top row: Brand / Title & EMV Chip */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Microchip EMV */}
          <div className="w-10 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-200 border border-amber-600/50 relative overflow-hidden shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-[1px] bg-amber-800/40 absolute top-1/2 -translate-y-1/2" />
            <div className="h-full w-[1px] bg-amber-800/40 absolute left-1/2 -translate-x-1/2" />
            <div className="w-4 h-3 rounded-[3px] border border-amber-800/40" />
          </div>

          {/* Contactless waves icon */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className="w-4 h-4 rotate-90" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase hidden sm:inline font-bold">
              CONTACTLESS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVip && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
              <span>VIP Pass</span>
            </span>
          )}
          <span className="text-xs sm:text-sm font-black text-white tracking-widest uppercase font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            DOKYA WALLET
          </span>
        </div>
      </div>

      {/* Middle row: Card Number */}
      <div className="relative z-10 mb-4 sm:mb-6">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">
          Numéro Virtuel Sécurisé
        </span>
        <div className="font-mono text-base sm:text-lg text-slate-200 tracking-[0.25em] font-semibold">
          {maskedCard}
        </div>
      </div>

      {/* Bottom row: Solde en grand, Cardholder Name, & Action Recharger */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-3.5 border-t border-white/10">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Solde Disponible
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1.5">
            <span className="text-emerald-400">{(balance ?? 0).toLocaleString('fr-FR')}</span>
            <span className="text-sm font-bold text-emerald-300">{currency}</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
              Titulaire de la carte
            </span>
            <span className="font-mono text-xs font-extrabold text-slate-200 uppercase tracking-wider">
              {cleanName}
            </span>
          </div>

          <button
            type="button"
            onClick={onRecharge}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Recharger mon solde Dokya"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3] text-slate-950" />
            <span>+ Recharger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
