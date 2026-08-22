import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RotateCcw, Zap, User, ShieldCheck, LogIn, 
  ArrowLeft, FileText, Mail, FileCheck, Receipt, Package, Wallet, Check
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
  onGoServices?: () => void;
  onOpenAdmin?: () => void;
  onOpenRecharge?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView = 'services',
  userBalance = 0,
  onLoadSample, 
  onReset, 
  hasData,
  onOpenDashboard,
  onOpenAuth,
  onGoServices,
  onOpenAdmin,
  onOpenRecharge
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const isUserAdmin = isAdminEmail(user?.email);
  const isDedicatedDocView = currentView !== 'services';

  // Service Badge configurations
  const getServiceBadge = () => {
    switch (currentView) {
      case 'cv':
      case 'cv_preview':
        return {
          title: currentView === 'cv_preview' ? "Aperçu : CV Pro ATS" : "Générateur de CV ATS",
          price: "1 000 FCFA",
          icon: FileText,
          bg: "bg-indigo-50 border-indigo-200/80 text-indigo-900",
          iconColor: "text-indigo-600"
        };
      case 'letter':
      case 'letter_preview':
        return {
          title: currentView === 'letter_preview' ? "Aperçu : Lettre de Motivation" : "Lettre de Motivation",
          price: "1 000 FCFA",
          icon: Mail,
          bg: "bg-blue-50 border-blue-200/80 text-blue-900",
          iconColor: "text-blue-600"
        };
      case 'devis':
      case 'devis_preview':
        return {
          title: currentView === 'devis_preview' ? "Aperçu : Devis Professionnel" : "Devis Professionnel",
          price: "1 000 FCFA",
          icon: FileCheck,
          bg: "bg-amber-50 border-amber-300 text-amber-950",
          iconColor: "text-amber-600"
        };
      case 'facture':
      case 'facture_preview':
        return {
          title: currentView === 'facture_preview' ? "Aperçu : Facture Client" : "Facture Client",
          price: "1 000 FCFA",
          icon: Receipt,
          bg: "bg-emerald-50 border-emerald-200/80 text-emerald-950",
          iconColor: "text-emerald-600"
        };
      case 'pack_business':
      case 'pack_business_preview':
        return {
          title: currentView === 'pack_business_preview' ? "Aperçu : Pack Business" : "Pack Business (Devis + Facture)",
          price: "1 499 FCFA",
          icon: Package,
          bg: "bg-amber-50 border-amber-300 text-amber-950",
          iconColor: "text-amber-700"
        };
      case 'dashboard':
        return {
          title: "Mon Espace Candidat & Documents",
          price: "Espace Sécurisé",
          icon: User,
          bg: "bg-slate-100 border-slate-200 text-slate-900",
          iconColor: "text-indigo-600"
        };
      default:
        return null;
    }
  };

  const activeBadge = getServiceBadge();

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        
        {/* ========================================================================= */}
        {/* CASE A: DEDICATED DOCUMENT EDITING VIEW (STRICT 3-ZONE MINIMALIST HEADER) */}
        {/* ========================================================================= */}
        {isDedicatedDocView ? (
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            
            {/* ZONE 1 (LEFT): LOGO + RETURN BUTTON "← Changer de service" */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Main Brand Logo Icon */}
              <button 
                type="button"
                onClick={onGoServices}
                className="flex items-center gap-2 cursor-pointer group"
                title="Retour au catalogue Dokya"
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <span>D</span>
                </div>
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 hidden md:inline">
                  Dokya <span className="text-indigo-600">AI</span>
                </span>
              </button>

              {/* Prominent Back Button "← Changer de service" */}
              {onGoServices && (
                <button
                  type="button"
                  onClick={onGoServices}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Revenir à la sélection des 4 services"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>← Changer de service</span>
                </button>
              )}
            </div>

            {/* ZONE 2 (CENTER): SERVICE BADGE + PRICE */}
            {activeBadge && (
              <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-2xs text-xs font-black ${activeBadge.bg}`}>
                  <activeBadge.icon className={`w-4 h-4 ${activeBadge.iconColor} shrink-0`} />
                  <span className="truncate max-w-[200px] sm:max-w-none">{activeBadge.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-900 border border-slate-200/80 text-[10px] font-extrabold shadow-2xs">
                    {activeBadge.price}
                  </span>
                </div>
              </div>
            )}

            {/* ZONE 3 (RIGHT): WALLET / CANDIDATE DASHBOARD + RESET FORM */}
            <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
              
              {/* Quick sample filler */}
              {currentView !== 'dashboard' && (
                <button
                  onClick={onLoadSample}
                  type="button"
                  className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Remplir le formulaire avec un exemple pro"
                >
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Exemple</span>
                </button>
              )}

              {/* Wallet / Espace Candidat Button */}
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Accéder à mon Espace Candidat et mon Solde Wallet"
                >
                  <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline">Espace Candidat</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[10px] font-mono font-bold">
                    {(userBalance || 0) > 0 ? `${(userBalance || 0).toLocaleString('fr-FR')} F` : '0 F'}
                  </span>
                </button>
              )}

              {/* Admin Button if Admin */}
              {isUserAdmin && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  type="button"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-100/70 text-amber-900 border border-amber-300 transition-all cursor-pointer"
                  title="Dashboard Administrateur"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Admin</span>
                </button>
              )}

              {/* Reset / Effacer Formulaire Button */}
              {currentView !== 'dashboard' && hasData && (
                <button
                  onClick={onReset}
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Effacer le contenu du formulaire actif"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Effacer formulaire</span>
                  <span className="sm:hidden">Effacer</span>
                </button>
              )}

            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* CASE B: MAIN PORTAL HEADER (VIEW 1: SERVICES CATALOG & HOME)               */
          /* ========================================================================= */
          <div className="flex items-center justify-between gap-3">
            
            {/* Logo & Main Title */}
            <div 
              className="flex items-center gap-2.5 cursor-pointer group" 
              onClick={onGoServices}
              title="Accueil Dokya AI"
            >
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-100 ring-2 ring-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span>D</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-black tracking-tight text-slate-900">
                    Dokya <span className="text-indigo-600">AI</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Suite 4 Services & Packs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5 hidden sm:flex items-center gap-1.5">
                  <span>1. CV Pro ATS</span>
                  <span className="text-slate-300">•</span>
                  <span>2. Lettres</span>
                  <span className="text-slate-300">•</span>
                  <span>3. Devis Pro</span>
                  <span className="text-slate-300">•</span>
                  <span>4. Factures UEMOA</span>
                </p>
              </div>
            </div>

            {/* Portal Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* Admin Dashboard Quick Access */}
              {isUserAdmin && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl bg-amber-500/10 text-amber-900 border border-amber-400/40 hover:bg-amber-500/20 shadow-sm transition-all cursor-pointer active:scale-95"
                  title="Accéder au Tableau de Bord Administrateur"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Dashboard Admin</span>
                </button>
              )}

              {/* Espace Candidat Button with Balance */}
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <User className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Espace Candidat</span>
                  {(userBalance || 0) > 0 && (
                    <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {(userBalance || 0).toLocaleString('fr-FR')} F
                    </span>
                  )}
                </button>
              )}

              {!user && onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Connexion</span>
                </button>
              )}

            </div>

          </div>
        )}

      </div>
    </header>
  );
};
