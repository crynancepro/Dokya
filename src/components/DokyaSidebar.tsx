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
  X,
  Building2,
  Users,
  MessageSquare,
  Boxes
} from 'lucide-react';
import { CandidateProfile, SavedUserDocument, isUserVipActive } from '../types';
import { auth } from '../lib/firebase';
import { isAdminEmail } from '../lib/adminAuth';
import { DokyaLogo } from './DokyaLogo';
import { DokyaVirtualCard } from './DokyaVirtualCard';

export type SidebarTab = 
  | 'dashboard_home'
  | 'gallery'
  | 'documents'
  | 'entretiens'
  | 'business'
  | 'inventory'
  | 'affiliation'
  | 'help'
  | 'support'
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
            <DokyaLogo 
              size="md" 
              subtitle="Suite Bureautique & Recrutement" 
            />

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

            {/* VIP Status Badge - Discreet & Professional */}
            {isSubscriptionActive ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-white tracking-wide">
                    Pass VIP Actif
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Actif" />
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
          {/* NAVIGATION LINKS (STRIPE / VERCEL STYLE : CLEAN & PROFESSIONAL)           */}
          {/* ========================================================================= */}
          <nav className="px-3 py-2 space-y-1">
            
            {/* 1. Tableau de bord */}
            <button
              id="nav-dashboard"
              type="button"
              onClick={() => handleNavClick('dashboard_home')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'dashboard_home' || activeTab === 'dashboard'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'dashboard_home' || activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Tableau de bord</span>
              </div>
            </button>

            {/* 2. Mes Documents */}
            <button
              id="nav-documents"
              type="button"
              onClick={() => handleNavClick('documents')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'documents'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'documents' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Mes Documents</span>
              </div>
              {documentsCount > 0 && (
                <span className="text-[11px] font-mono text-slate-400">
                  {documentsCount}
                </span>
              )}
            </button>

            {/* 2.1 Entretiens RH */}
            <button
              id="nav-entretiens"
              type="button"
              onClick={() => handleNavClick('entretiens')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'entretiens' || activeTab === 'interview_prep'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'entretiens' || activeTab === 'interview_prep' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Préparation Entretiens</span>
              </div>
            </button>

            {/* 2.3 Dokya Business : Mes Clients & Ventes */}
            <button
              id="nav-dokya-business"
              type="button"
              onClick={() => handleNavClick('business')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'business' || activeTab === 'clients'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'business' || activeTab === 'clients' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Mes Clients & Ventes</span>
              </div>
            </button>

            {/* 2.3b Dokya Business : Stock & Inventaire */}
            <button
              id="nav-dokya-inventory"
              type="button"
              onClick={() => handleNavClick('inventory')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'inventory'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Boxes className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'inventory' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Stock & Inventaire</span>
              </div>
            </button>

            {/* 2.4 Parrainage & Affiliation */}
            <button
              id="nav-affiliation"
              type="button"
              onClick={() => handleNavClick('affiliation')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'affiliation'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'affiliation' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Parrainage & Affiliation</span>
              </div>
            </button>

            {/* 3. Générateur AI (Accordion propre sans prix ni badges agressifs) */}
            <div className="space-y-0.5 pt-1">
              <button
                id="nav-generators-toggle"
                type="button"
                onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                  isGenTabActive
                    ? 'text-white font-semibold bg-white/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wand2 className={`w-4 h-4 shrink-0 transition-colors ${
                    isGenTabActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  <span>Générateur AI</span>
                </div>
                {isGeneratorOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                )}
              </button>

              {/* Sub-menu Generator Items (Épurés, sans prix) */}
              {isGeneratorOpen && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150 border-l border-slate-800 ml-3.5 my-0.5">
                  {/* CV ATS */}
                  <button
                    id="nav-gen-cv"
                    type="button"
                    onClick={() => handleNavClick('gen_cv')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      activeTab === 'gen_cv' || activeTab === 'cv' || activeTab === 'cv_gallery' || activeTab === 'cv_preview'
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>CV ATS Professionnel</span>
                  </button>

                  {/* Lettre de Motivation */}
                  <button
                    id="nav-gen-letter"
                    type="button"
                    onClick={() => handleNavClick('gen_letter')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      activeTab === 'gen_letter' || activeTab === 'letter' || activeTab === 'letter_gallery' || activeTab === 'letter_preview'
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>Lettre de Motivation</span>
                  </button>

                  {/* Facture & Devis UEMOA */}
                  <button
                    id="nav-gen-business"
                    type="button"
                    onClick={() => handleNavClick('gen_business')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      activeTab === 'gen_business' || activeTab === 'devis' || activeTab === 'facture' || activeTab === 'pack_business' || activeTab.includes('devis_') || activeTab.includes('facture_')
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>Facture & Devis UEMOA</span>
                  </button>

                  {/* Ebook & Rapport AI */}
                  <button
                    id="nav-gen-ebook"
                    type="button"
                    onClick={() => handleNavClick('gen_ebook')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      activeTab === 'gen_ebook' || activeTab === 'ebook' || activeTab === 'ebook_preview'
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>Ebook & Rapport AI</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Tarifs & Offres */}
            <button
              id="nav-tarifs"
              type="button"
              onClick={() => handleNavClick('tarifs')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'tarifs'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'tarifs' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Tarifs & Offres</span>
              </div>
            </button>

            {/* 5. Mon Abonnement */}
            <button
              id="nav-subscription"
              type="button"
              onClick={() => handleNavClick('subscription')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'subscription'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'subscription' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Mon Abonnement</span>
              </div>
              {isSubscriptionActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Abonnement Actif" />
              )}
            </button>

            {/* 6. Mon Profil & Paramètres */}
            <button
              id="nav-profile"
              type="button"
              onClick={() => handleNavClick('profile')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'profile'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCircle2 className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'profile' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Mon Profil & Paramètres</span>
              </div>
            </button>

            {/* 7. Centre d'Aide & Support */}
            <button
              id="nav-support-help"
              type="button"
              onClick={() => handleNavClick('help')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                activeTab === 'help' || activeTab === 'support'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${
                  activeTab === 'help' || activeTab === 'support' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>Centre d'Aide & Support</span>
              </div>
            </button>

          </nav>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: CARTE BANCAIRE VIRTUELLE DOKYA + ADMIN SHORTCUT           */}
        {/* ========================================================================= */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/95 space-y-2">
          
          {/* Carte Bancaire Virtuelle Dokya (Affichage du Solde élégant) */}
          <DokyaVirtualCard
            userName={displayName}
            userEmail={currentUser?.email || profile?.email}
            balance={userBalance ?? 0}
            currency="FCFA"
            onRecharge={onOpenRecharge}
            variant="sidebar"
            isVip={isSubscriptionActive}
          />

          {/* Admin Dashboard Shortcut if user is Admin */}
          {isUserAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dashboard Admin</span>
            </button>
          )}

          {/* Sign out if logged in */}
          {onSignOut && currentUser && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
