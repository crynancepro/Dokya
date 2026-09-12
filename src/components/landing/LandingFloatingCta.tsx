import React, { useState, useEffect } from 'react';
import { Briefcase, Receipt, X, Sparkles, ArrowRight } from 'lucide-react';

interface LandingFloatingCtaProps {
  onSelectService: (service: 'cv' | 'facture') => void;
}

export const LandingFloatingCta: React.FC<LandingFloatingCtaProps> = ({ onSelectService }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Afficher après 450px de scroll
      if (window.scrollY > 450 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <aside aria-label="Actions rapides" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl shadow-slate-950/80 flex items-center justify-between gap-3">
        
        {/* Info gauche */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              Prêt à commencer ?
            </div>
            <div className="text-[10px] text-emerald-400 font-bold truncate">
              Exports PDF &amp; Word • Dès 1 000 FCFA
            </div>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectService('cv')}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            title="Créer un CV ATS"
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xs:inline sm:inline">CV ATS</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectService('facture')}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            title="Créer une Facture OHADA"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden xs:inline sm:inline">Facture</span>
          </button>

          {/* Fermer */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            title="Masquer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </aside>
  );
};
