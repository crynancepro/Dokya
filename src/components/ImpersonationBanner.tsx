import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, UserCheck, Sparkles, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { getImpersonatedSession, stopImpersonationSession } from '../lib/impersonation';
import { ImpersonatedSession } from '../types';

interface ImpersonationBannerProps {
  onExitImpersonation: () => void;
  onNavigateToEditor?: () => void;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  onExitImpersonation,
  onNavigateToEditor
}) => {
  const [session, setSession] = useState<ImpersonatedSession | null>(getImpersonatedSession);

  useEffect(() => {
    const handleStorage = () => {
      setSession(getImpersonatedSession());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('impersonation-changed', handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('impersonation-changed', handleStorage as EventListener);
    };
  }, []);

  if (!session) return null;

  const target = session.targetUser;

  return (
    <aside 
      aria-label="Mode Impersonation Administrateur"
      className="sticky top-0 z-[9999] w-full bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white shadow-xl border-b border-amber-400/40 px-3 py-2 sm:px-5 sm:py-2.5 transition-all animate-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm">
        
        {/* User Identity Info */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/30 border border-white/20 text-amber-200 font-bold uppercase tracking-wider text-[10px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Mode Impersonation</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-white">
            <span>Connecté en tant que :</span>
            <strong className="underline underline-offset-2 font-bold text-amber-100 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 inline text-emerald-300" />
              {target.firstName} {target.lastName}
            </strong>
            <span className="text-amber-200/90 text-xs hidden sm:inline">({target.email})</span>
          </div>

          {/* Solde & statut badge */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/20 text-white/90 text-xs font-semibold border border-white/10">
            <Wallet className="w-3 h-3 text-emerald-300" />
            <span>{(target.balance || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>

          {target.hasForceUnlockedDocs && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 text-[11px] font-semibold border border-emerald-500/40">
              <CheckCircle2 className="w-3 h-3" />
              <span>Docs Débloqués</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {onNavigateToEditor && (
            <button
              onClick={onNavigateToEditor}
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer border border-white/20"
            >
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>Tester l'Éditeur</span>
            </button>
          )}

          <button
            onClick={() => {
              stopImpersonationSession();
              onExitImpersonation();
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-lg bg-slate-900 hover:bg-black text-amber-300 border border-amber-400/50 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
            <span>Quitter le mode Impersonation & Retourner à l'Admin</span>
            <ArrowRight className="w-3 h-3 ml-0.5 text-amber-300" />
          </button>
        </div>

      </div>
    </aside>
  );
};
