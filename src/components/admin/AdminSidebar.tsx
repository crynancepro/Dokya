import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Users,
  CreditCard,
  MessageSquare,
  Building2,
  UserCheck,
  Sparkles,
  ChevronDown,
  Crown,
  Tag,
  Sliders,
  ExternalLink,
  LogOut,
  X,
  Zap,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export type AdminTabType =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'pricing'
  | 'promo'
  | 'transactions'
  | 'affiliations'
  | 'support'
  | 'business';

export interface AdminSidebarProps {
  activeTab: AdminTabType;
  setActiveTab: (tab: AdminTabType) => void;
  usersCount?: number;
  pendingTransactionsCount?: number;
  urgentSupportCount?: number;
  promoCodesCount?: number;
  activeVipCount?: number;
  adminEmail?: string;
  onBackHome?: () => void;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  usersCount = 0,
  pendingTransactionsCount = 0,
  urgentSupportCount = 0,
  promoCodesCount = 0,
  activeVipCount = 0,
  adminEmail,
  onBackHome,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Dropdown state for Tarifs & Offres
  const isPricingTab = activeTab === 'pricing' || activeTab === 'subscriptions' || activeTab === 'promo';
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState<boolean>(isPricingTab);

  // Automatically keep dropdown open when a sub-menu tab is active
  useEffect(() => {
    if (isPricingTab) {
      setIsPricingDropdownOpen(true);
    }
  }, [isPricingTab]);

  const handleNavClick = (tab: AdminTabType) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#090D16] text-slate-200 select-none border-r border-slate-800/80 overflow-x-hidden">
      
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/25 border border-indigo-400/30">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090D16]" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-white font-mono">DOKYA</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">Panneau Super Admin</p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button on Desktop */}
        {!isOpenMobile && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-700/60 shrink-0"
            title={isCollapsed ? 'Agrandir la barre latérale' : 'Réduire pour gagner de l’espace'}
            aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        {/* Mobile Close Button */}
        {isOpenMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* Section Label (Expanded only) */}
        {!isCollapsed && (
          <div className="px-2 pt-1 pb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
            Navigation
          </div>
        )}

        {/* Item 1: Vue D'ensemble */}
        <button
          type="button"
          onClick={() => handleNavClick('overview')}
          title="Vue d'ensemble — Résumé des revenus, utilisateurs et transactions"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              activeTab === 'overview'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/10 group-hover:bg-indigo-500/20'
            }`}>
              <LayoutGrid className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate text-xs">Vue d'ensemble</span>}
          </div>
          {!isCollapsed && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              activeTab === 'overview'
                ? 'bg-white/20 text-white'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              GLOBAL
            </span>
          )}
        </button>

        {/* Item 2: Candidats & Utilisateurs */}
        <button
          type="button"
          onClick={() => handleNavClick('users')}
          title={`Candidats & Utilisateurs (${usersListCount(usersCount)} comptes enregistrés)`}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5 relative' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all relative ${
              activeTab === 'users'
                ? 'bg-white/20 text-white'
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm shadow-sky-500/10 group-hover:bg-sky-500/20'
            }`}>
              <Users className="w-4 h-4" />
              {isCollapsed && usersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center border border-[#090D16]">
                  {usersCount > 99 ? '99+' : usersCount}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="truncate text-xs">Utilisateurs</span>}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                activeTab === 'users'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {usersCount > 0 ? `${usersCount} COMPTES` : 'COMPTES'}
              </span>
            </div>
          )}
        </button>

        {/* Item 3: Suivi des Transactions GeniusPay */}
        <button
          type="button"
          onClick={() => handleNavClick('transactions')}
          title="Suivi des Transactions GeniusPay en Temps Réel"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5 relative' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all relative ${
              activeTab === 'transactions'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10 group-hover:bg-emerald-500/20'
            }`}>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-xs">Transactions</span>
                <span className="text-[9px] text-emerald-400 font-semibold truncate">
                  GeniusPay Direct
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              activeTab === 'transactions'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              AUTO
            </span>
          )}
        </button>

        {/* Item 4: Centre d'Aide & Tchat */}
        <button
          type="button"
          onClick={() => handleNavClick('support')}
          title={`Centre d'Aide & Tchat ${urgentSupportCount > 0 ? `(${urgentSupportCount} urgences)` : ''}`}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5 relative' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'support'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : urgentSupportCount > 0
              ? 'bg-rose-500/15 text-rose-200 border border-rose-500/40 hover:bg-rose-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all relative ${
              activeTab === 'support'
                ? 'bg-white/20 text-white'
                : urgentSupportCount > 0
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/10 group-hover:bg-amber-500/20'
            }`}>
              <MessageSquare className="w-4 h-4" />
              {isCollapsed && urgentSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border border-[#090D16] animate-ping" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-xs">Centre d'Aide</span>
                {urgentSupportCount > 0 && (
                  <span className="text-[9px] text-rose-300 font-bold truncate">
                    {urgentSupportCount} intervention{urgentSupportCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              activeTab === 'support'
                ? 'bg-white/20 text-white'
                : urgentSupportCount > 0
                ? 'bg-rose-500 text-white font-black animate-pulse shadow-sm'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {urgentSupportCount > 0 ? `🚨 ${urgentSupportCount}` : 'URGENT'}
            </span>
          )}
        </button>

        {/* Item 5: Dokya Business & B2B */}
        <button
          type="button"
          onClick={() => handleNavClick('business')}
          title="Dokya Business & B2B — Espace Entreprises, Devis & Factures UEMOA"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'business'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              activeTab === 'business'
                ? 'bg-white/20 text-white'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/10 group-hover:bg-cyan-500/20'
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate text-xs">Business & B2B</span>}
          </div>

          {!isCollapsed && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              activeTab === 'business'
                ? 'bg-white/20 text-white'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              PRO
            </span>
          )}
        </button>

        {/* Item 6: Parrainage & Affiliation */}
        <button
          type="button"
          onClick={() => handleNavClick('affiliations')}
          title="Parrainage & Affiliation — Commissions 20% et réseau d'affiliés"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
            activeTab === 'affiliations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              activeTab === 'affiliations'
                ? 'bg-white/20 text-white'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm shadow-purple-500/10 group-hover:bg-purple-500/20'
            }`}>
              <UserCheck className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate text-xs">Affiliation</span>}
          </div>

          {!isCollapsed && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              activeTab === 'affiliations'
                ? 'bg-white/20 text-white'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              20% COMM.
            </span>
          )}
        </button>

        {/* Item 7: Tarifs & Offres (Menu Déroulant Dropdown) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              if (isCollapsed) {
                handleNavClick('pricing');
              } else {
                setIsPricingDropdownOpen(!isPricingDropdownOpen);
              }
            }}
            title="Tarifs & Offres (Pass VIP, Pass Business, Codes Promo)"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
              isPricingTab
                ? 'bg-slate-800/90 text-white border border-amber-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                isPricingTab
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/10 group-hover:bg-amber-500/20'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              {!isCollapsed && <span className="truncate text-xs">Tarifs & Offres</span>}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  CONFIG
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isPricingDropdownOpen ? 'rotate-180 text-amber-400' : ''
                }`} />
              </div>
            )}
          </button>

          {/* Sub-menu Dropdown List (Expanded Only) */}
          {!isCollapsed && isPricingDropdownOpen && (
            <div className="mt-1 ml-3 pl-2.5 border-l-2 border-slate-800/80 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
              
              {/* Sub-menu 1: Pass VIP Carrière (2 500 F) */}
              <button
                type="button"
                onClick={() => handleNavClick('subscriptions')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'subscriptions'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Pass VIP Carrière</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 shrink-0">
                  2 500 F
                </span>
              </button>

              {/* Sub-menu 2: Pass Business (5 000 F) */}
              <button
                type="button"
                onClick={() => handleNavClick('pricing')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'pricing'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Pass Business</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shrink-0">
                  5 000 F
                </span>
              </button>

              {/* Sub-menu 3: Codes Promo & Réductions */}
              <button
                type="button"
                onClick={() => handleNavClick('promo')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'promo'
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">Codes Promo</span>
                </div>
                {promoCodesCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0">
                    {promoCodesCount}
                  </span>
                )}
              </button>

            </div>
          )}
        </div>

      </div>

      {/* Footer Profile & Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5 shrink-0">
        {/* Admin Info */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div
            className="w-7.5 h-7.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-xs shrink-0"
            title={adminEmail || 'Super Admin'}
          >
            {adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{adminEmail || 'Super Admin'}</p>
              <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Session Sécurisée
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`grid ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 pt-0.5`}>
          {onBackHome && (
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-all cursor-pointer"
              title="Retourner à l'éditeur Dokya"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {!isCollapsed && <span>Voir Site</span>}
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-semibold border border-rose-800/40 transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              {!isCollapsed && <span>Quitter</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left with Dynamic Width) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 min-h-screen sticky top-0 h-screen z-30 transition-all duration-200 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Modal Backdrop + Sliding Sidebar) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="relative w-64 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

function usersListCount(count: number): string {
  return String(count || 0);
}

export default AdminSidebar;
