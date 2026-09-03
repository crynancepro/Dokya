import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Wand2, 
  CreditCard, 
  Crown, 
  UserCircle2, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  FileCheck, 
  Receipt, 
  BookOpen, 
  Mail, 
  Wallet, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  LogOut, 
  ExternalLink,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';
import { CandidateProfile, SavedUserDocument, isUserVipActive } from '../types';
import { auth } from '../lib/firebase';
import { isAdminEmail } from '../lib/adminAuth';

export type SidebarTab = 
  | 'dashboard_home'
  | 'gallery'
  | 'documents'
  | 'entretiens'
  | 'gen_cv'
  | 'gen_letter'
  | 'gen_business'
  | 'gen_ebook'
  | 'tarifs'
  | 'subscription'
  | 'profile'
  | 'wallet'
  | 'transactions';

interface DokyaSidebarProps {
  activeTab: SidebarTab | string;
  onSelectTab: (tab: SidebarTab | string) => void;
  profile: CandidateProfile;
  documentsCount?: number;
  userBalance: number;
  onOpenRecharge: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function calculateProfileCompletion(profile: CandidateProfile): number {
  if (!profile) return 20;
  let score = 0;

  // Personal Info (max 35)
  if (profile.personalInfo?.firstName) score += 5;
  if (profile.personalInfo?.lastName) score += 5;
  if (profile.personalInfo?.email || profile.email) score += 5;
  if (profile.personalInfo?.phone) score += 5;
  if (profile.personalInfo?.city) score += 5;
  if (profile.personalInfo?.targetJob) score += 5;
  if (profile.personalInfo?.photoUrl) score += 5;

  // Experiences (max 25)
  if (profile.experiences && profile.experiences.length > 0) {
    score += Math.min(25, profile.experiences.length * 12.5);
  }

  // Education (max 20)
  if (profile.education && profile.education.length > 0) {
    score += Math.min(20, profile.education.length * 10);
  }

  // Skills (max 10)
  if (profile.skills && profile.skills.length > 0 && profile.skills[0].skills?.length > 0) {
    score += 10;
  }

  // Languages (max 10)
  if (profile.languages && profile.languages.length > 0) {
    score += 10;
  }

  return Math.min(100, Math.max(15, Math.round(score)));
}

export const DokyaSidebar: React.FC<DokyaSidebarProps> = ({
  activeTab,
  onSelectTab,
  profile,
  documentsCount = 0,
  userBalance,
  onOpenRecharge,
  onOpenAdmin,
  onSignOut,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(true);
  const completionPercentage = calculateProfileCompletion(profile);

  const currentUser = auth.currentUser;
  const isUserAdmin = isAdminEmail(currentUser?.email || profile?.email);

  const displayName = [profile?.personalInfo?.firstName, profile?.personalInfo?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || profile?.email?.split('@')[0] || currentUser?.email?.split('@')[0] || 'Utilisateur Dokya';

  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  const isSubscriptionActive = isUserVipActive(profile?.subscription) || profile?.subscriptionStatus === 'unlimited';

  const isGenTabActive = ['gen_cv', 'gen_letter', 'gen_business', 'gen_ebook'].includes(activeTab);

  const handleNavClick = (tab: SidebarTab | string) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside 
        id="dokya-native-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 text-slate-100 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP SECTION: BRAND & USER PROFILE HEADER                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Brand Logo Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white font-sans">
                    Dokya<span className="text-indigo-400">AI</span>
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Pro
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Suite Bureautique & Recrutement</p>
              </div>
            </div>

            {/* Close Button on Mobile */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
                title="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Profile Card (Photo, Name, Profile Completion Level) */}
          <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner space-y-3">
            <div className="flex items-center gap-3">
              {profile?.personalInfo?.photoUrl ? (
                <img 
                  src={profile.personalInfo.photoUrl} 
                  alt={displayName}
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                  {userInitial}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white truncate" title={displayName}>
                  {displayName}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {profile?.personalInfo?.targetJob || profile?.email || 'Candidat Pro'}
                </p>
              </div>
            </div>

            {/* VIP Status Badge */}
            {isSubscriptionActive ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border border-amber-400/40 text-amber-300 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">👑</span>
                  <span className="text-[11px] font-black tracking-wide bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                    Membre Pass VIP
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black uppercase">
                  Actif
                </span>
              </div>
            ) : (
              /* Profile Completion Indicator */
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Complétion du profil</span>
                  <span className={`font-bold ${completionPercentage >= 80 ? 'text-emerald-400' : completionPercentage >= 50 ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      completionPercentage >= 80 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                        : completionPercentage >= 50 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400' 
                        : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* NAVIGATION LINKS                                                          */}
          {/* ========================================================================= */}
          <nav className="px-3 py-2 space-y-1">
            
            {/* 1. Tableau de bord */}
            <button
              id="nav-dashboard"
              type="button"
              onClick={() => handleNavClick('dashboard_home')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard_home' || activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-300" />
                <span>Tableau de bord</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono">
                Vue globale
              </span>
            </button>

            {/* 2. Mes Documents */}
            <button
              id="nav-documents"
              type="button"
              onClick={() => handleNavClick('documents')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0 text-indigo-300" />
                <span>Mes Documents</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-black text-indigo-300">
                {documentsCount}
              </span>
            </button>

            {/* 2.1 Entretiens RH */}
            <button
              id="nav-entretiens"
              type="button"
              onClick={() => handleNavClick('entretiens')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'entretiens' || activeTab === 'interview_prep'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Préparation Entretiens</span>
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Coaching RH
              </span>
            </button>

            {/* 2.2 Mes Commandes & Suivi Paiements */}
            <button
              id="nav-orders-tracking"
              type="button"
              onClick={() => handleNavClick('transactions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transactions' || activeTab === 'orders'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Mes Commandes & Paiements</span>
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Suivi</span>
              </span>
            </button>

            {/* 3. Générateur AI (Dropdown / Accordion) */}
            <div className="space-y-1 pt-1">
              <button
                id="nav-generators-toggle"
                type="button"
                onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isGenTabActive
                    ? 'bg-slate-800 text-white border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Générateur AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    4 Outils
                  </span>
                  {isGeneratorOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 transition-transform" />
                  )}
                </div>
              </button>

              {/* Sub-menu Generator Items */}
              {isGeneratorOpen && (
                <div className="pl-4 pr-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {/* CV ATS */}
                  <button
                    id="nav-gen-cv"
                    type="button"
                    onClick={() => handleNavClick('gen_cv')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'gen_cv' || activeTab === 'cv' || activeTab === 'cv_gallery' || activeTab === 'cv_preview'
                        ? 'bg-indigo-600/90 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>CV ATS Professionnel</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">1 000 F</span>
                  </button>

                  {/* Lettre de Motivation */}
                  <button
                    id="nav-gen-letter"
                    type="button"
                    onClick={() => handleNavClick('gen_letter')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'gen_letter' || activeTab === 'letter' || activeTab === 'letter_gallery' || activeTab === 'letter_preview'
                        ? 'bg-indigo-600/90 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Lettre de Motivation</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">1 000 F</span>
                  </button>

                  {/* Facture & Devis UEMOA */}
                  <button
                    id="nav-gen-business"
                    type="button"
                    onClick={() => handleNavClick('gen_business')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'gen_business' || activeTab === 'devis' || activeTab === 'facture' || activeTab === 'pack_business' || activeTab.includes('devis_') || activeTab.includes('facture_')
                        ? 'bg-indigo-600/90 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Facture & Devis UEMOA</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">1 000 F</span>
                  </button>

                  {/* Ebook & Rapport AI */}
                  <button
                    id="nav-gen-ebook"
                    type="button"
                    onClick={() => handleNavClick('gen_ebook')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'gen_ebook' || activeTab === 'ebook' || activeTab === 'ebook_preview'
                        ? 'bg-indigo-600/90 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Ebook & Rapport AI</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">3 000 F</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Tarifs & Offres */}
            <button
              id="nav-tarifs"
              type="button"
              onClick={() => handleNavClick('tarifs')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tarifs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Tarifs & Offres</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Grille FCFA
              </span>
            </button>

            {/* 5. Mon Abonnement */}
            <button
              id="nav-subscription"
              type="button"
              onClick={() => handleNavClick('subscription')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subscription'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown className={`w-4 h-4 shrink-0 ${isSubscriptionActive ? 'text-amber-300' : 'text-amber-400'}`} />
                <span>Mon Abonnement</span>
              </div>
              {isSubscriptionActive ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black animate-pulse">
                  ACTIF 🟢
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-extrabold border border-amber-500/30">
                  Pass VIP
                </span>
              )}
            </button>

            {/* 6. Mon Profil & Paramètres */}
            <button
              id="nav-profile"
              type="button"
              onClick={() => handleNavClick('profile')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCircle2 className="w-4 h-4 shrink-0 text-indigo-300" />
                <span>Mon Profil & Paramètres</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Éditer
              </span>
            </button>

          </nav>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: WALLET WIDGET + ADMIN SHORTCUT                           */}
        {/* ========================================================================= */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-950/80 space-y-2.5">
          
          {/* User Wallet Balance Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-inner">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Solde Dokya</span>
              </div>
              <p className="text-sm font-black text-emerald-400">
                {(userBalance ?? 0).toLocaleString('fr-FR')} <span className="text-[11px] text-emerald-300 font-normal">FCFA</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenRecharge}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Recharger mon solde"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Recharger</span>
            </button>
          </div>

          {/* Admin Dashboard Shortcut if user is Admin */}
          {isUserAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Accès Dashboard Admin</span>
            </button>
          )}

          {/* Sign out if logged in */}
          {onSignOut && currentUser && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-1.5 px-3 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          )}
        </div>

      </aside>
    </>
  );
};
