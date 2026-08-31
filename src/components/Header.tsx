import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RotateCcw, Zap, User, ShieldCheck, LogIn, LogOut,
  ArrowLeft, FileText, Mail, FileCheck, Receipt, Package, Wallet, Check, BookOpen, Crown, CreditCard,
  Layers, LayoutDashboard
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail } from '../lib/adminAuth';

interface HeaderProps {
  currentView?: string;
  userBalance?: number;
  onLoadSample: () => void;
  onReset: () => void;
  hasData: boolean;
  onOpenDashboard?: () => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onBackToTemplates?: () => void;
  onGoServices?: () => void;
  onSelectService?: (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'dashboard' | 'tarifs' | 'subscription' | 'gallery') => void;
  onOpenAdmin?: () => void;
  onOpenRecharge?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView = 'cv',
  userBalance = 0,
  onLoadSample, 
  onReset, 
  hasData,
  onOpenDashboard,
  onOpenAuth,
  onSignOut,
  onBackToTemplates,
  onOpenAdmin,
  onOpenRecharge
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const isUserAdmin = isAdminEmail(user?.email);

  const getServiceBadge = () => {
    switch (currentView) {
      case 'cv':
      case 'cv_gallery':
      case 'cv_preview':
        return {
          title: currentView === 'cv_preview' ? "Aperçu Final : CV Pro ATS" : "Éditeur Dédié : CV Pro ATS",
          price: "1 000 FCFA",
          icon: FileText,
          color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
        };
      case 'letter':
      case 'letter_gallery':
      case 'letter_preview':
        return {
          title: currentView === 'letter_preview' ? "Aperçu Final : Lettre IA" : "Éditeur Dédié : Lettre IA",
          price: "1 000 FCFA",
          icon: Mail,
          color: "text-blue-400 border-blue-500/30 bg-blue-500/10"
        };
      case 'devis':
      case 'devis_gallery':
      case 'devis_preview':
        return {
          title: currentView === 'devis_preview' ? "Aperçu Final : Devis Pro" : "Éditeur Dédié : Devis OHADA",
          price: "1 000 FCFA",
          icon: FileCheck,
          color: "text-teal-400 border-teal-500/30 bg-teal-500/10"
        };
      case 'facture':
      case 'facture_gallery':
      case 'facture_preview':
        return {
          title: currentView === 'facture_preview' ? "Aperçu Final : Facture Client" : "Éditeur Dédié : Facture OHADA",
          price: "1 000 FCFA",
          icon: Receipt,
          color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
        };
      case 'pack_business':
      case 'pack_business_gallery':
      case 'pack_business_preview':
        return {
          title: "Éditeur : Pack Business (Devis + Facture)",
          price: "1 499 FCFA",
          icon: Package,
          color: "text-purple-400 border-purple-500/30 bg-purple-500/10"
        };
      case 'ebook':
      case 'ebook_preview':
        return {
          title: "Assistant : Ebook & Rapport KDP",
          price: "3 000 FCFA",
          icon: BookOpen,
          color: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10"
        };
      default:
        return {
          title: "Studio Documentaire Dokya AI",
          price: "1 000 FCFA",
          icon: Sparkles,
          color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
        };
    }
  };

  const activeBadge = getServiceBadge();

  return (
    <header className="bg-slate-950/95 backdrop-blur-md text-slate-100 border-b border-slate-800/90 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        
        {/* Clean Dedicated Editor Header Bar */}
        <div className="flex items-center justify-between gap-3">
          
          {/* ZONE 1 (LEFT): BRAND LOGO + BACK TO TEMPLATES / DASHBOARD ACTION */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              onClick={onOpenDashboard}
              title="Dokya AI - Retour au Tableau de Bord"
            >
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform shrink-0">
                <span>D</span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-sm sm:text-base font-black tracking-tight text-white leading-none">
                  Dokya <span className="text-indigo-400">AI</span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium tracking-wide">
                  Éditeur Dédié
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Back to Templates Button */}
            {onBackToTemplates && (
              <button
                type="button"
                onClick={onBackToTemplates}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Changer de modèle visuel pour ce document"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">← Changer de modèle</span>
                <span className="sm:hidden">← Modèles</span>
              </button>
            )}

            {/* Back to Dashboard Button */}
            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all cursor-pointer"
                title="Quitter et revenir au Tableau de Bord"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Tableau de Bord</span>
              </button>
            )}
          </div>

          {/* ZONE 2 (CENTER): ACTIVE SERVICE & DOCUMENT BADGE (Clean, single-purpose) */}
          {activeBadge && (
            <div className="hidden md:flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700/80 bg-slate-900/90 text-xs font-semibold shadow-inner">
                <activeBadge.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-none text-slate-200 font-bold">{activeBadge.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                  {activeBadge.price}
                </span>
              </div>
            </div>
          )}

          {/* ZONE 3 (RIGHT): FORM ACTIONS & WALLET BALANCE */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Quick Sample Filler */}
            <button
              onClick={onLoadSample}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-indigo-300 hover:text-white hover:bg-slate-800 border border-indigo-500/30 transition-all cursor-pointer active:scale-95"
              title="Remplir le formulaire avec un exemple pro"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Exemple</span>
            </button>

            {/* Reset Form Button */}
            {hasData && (
              <button
                onClick={onReset}
                type="button"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/40 transition-all cursor-pointer active:scale-95"
                title="Effacer le contenu actif"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Effacer</span>
              </button>
            )}

            {/* Espace Candidat Button with Balance */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                title="Accéder à mon Espace Candidat et mon Solde Wallet"
              >
                <User className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden md:inline">Mon Espace</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold">
                  {(userBalance || 0) > 0 ? `${(userBalance || 0).toLocaleString('fr-FR')} F` : '0 F'}
                </span>
              </button>
            )}

            {/* Admin Button if Admin */}
            {isUserAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                type="button"
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                title="Dashboard Administrateur"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </button>
            )}

            {user && onSignOut && (
              <button
                onClick={onSignOut}
                type="button"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-800 transition-all cursor-pointer"
                title="Se déconnecter de mon compte"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Déconnexion</span>
              </button>
            )}

            {!user && onOpenAuth && (
              <button
                onClick={onOpenAuth}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

          </div>

        </div>

      </div>
    </header>
  );
};

