import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, ArrowUpRight, CheckCircle2, XCircle, Clock, 
  Search, RefreshCw, AlertCircle, Check, X, Smartphone, 
  Coins, Filter, ShieldCheck, ChevronRight, Copy, ExternalLink, HelpCircle,
  Network, Eye, TrendingUp, UserPlus, ArrowRight
} from 'lucide-react';
import { AffiliateCommission, AffiliatePayoutRequest, AdminUserRecord } from '../types';
import { 
  subscribeToAffiliateCommissions, 
  subscribeToAffiliatePayoutRequests,
  approveAffiliateCommission,
  rejectAffiliateCommission,
  markAffiliatePayoutPaid,
  rejectAffiliatePayout,
  fetchAllAdminUsersWithSubscriptions
} from '../lib/firebase';

interface AdminAffiliationViewProps {
  adminEmail: string;
}

export const AdminAffiliationView: React.FC<AdminAffiliationViewProps> = ({ adminEmail }) => {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<AffiliatePayoutRequest[]>([]);
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingUsers, setRefreshingUsers] = useState<boolean>(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active sub-tab inside affiliations: 'network' | 'commissions' | 'payouts'
  const [activeSubTab, setActiveSubTab] = useState<'network' | 'commissions' | 'payouts'>('network');

  // Network sub-tab state
  const [networkSearch, setNetworkSearch] = useState<string>('');
  const [networkFilter, setNetworkFilter] = useState<'ALL' | 'ACTIVE_ONLY' | 'WITH_BALANCE'>('ACTIVE_ONLY');
  const [selectedReferrerDetail, setSelectedReferrerDetail] = useState<{
    referrer: AdminUserRecord;
    code: string;
    referredUsers: AdminUserRecord[];
    totalCommissions: number;
    availableBalance: number;
  } | null>(null);

  // Commissions filters
  const [commFilter, setCommFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [commSearch, setCommSearch] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Payouts filters
  const [payoutFilter, setPayoutFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'REJECTED'>('PENDING');
  const [payoutSearch, setPayoutSearch] = useState<string>('');

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve_comm' | 'reject_comm' | 'pay_payout' | 'reject_payout';
    id: string;
    title: string;
    details: string;
    note?: string;
  } | null>(null);
  const [actionNote, setActionNote] = useState<string>('');

  // Copy feedback
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Load all users for network view
  const loadUsers = async () => {
    setRefreshingUsers(true);
    try {
      const users = await fetchAllAdminUsersWithSubscriptions();
      setUsersList(users);
    } catch (err) {
      console.error('Error fetching admin users for affiliate network:', err);
    } finally {
      setRefreshingUsers(false);
    }
  };

  // Subscriptions & Initial Load
  useEffect(() => {
    setLoading(true);
    loadUsers();

    const unsubComms = subscribeToAffiliateCommissions(undefined, (list) => {
      setCommissions(list);
      setLoading(false);
    });

    const unsubPayouts = subscribeToAffiliatePayoutRequests(undefined, (list) => {
      setPayoutRequests(list);
    });

    return () => {
      unsubComms();
      unsubPayouts();
    };
  }, []);

  // Aggregated Network Data (Referrers & Filleuls)
  const networkData = useMemo(() => {
    const referralsByReferrerUid = new Map<string, AdminUserRecord[]>();
    const referralsByCode = new Map<string, AdminUserRecord[]>();

    usersList.forEach((u) => {
      if (u.referredBy) {
        const list = referralsByReferrerUid.get(u.referredBy) || [];
        list.push(u);
        referralsByReferrerUid.set(u.referredBy, list);
      }
      if (u.affiliateCodeUsed) {
        const codeKey = u.affiliateCodeUsed.toUpperCase();
        const list = referralsByCode.get(codeKey) || [];
        list.push(u);
        referralsByCode.set(codeKey, list);
      }
    });

    const commissionsByReferrer = new Map<string, AffiliateCommission[]>();
    commissions.forEach((c) => {
      if (c.referrerId) {
        const list = commissionsByReferrer.get(c.referrerId) || [];
        list.push(c);
        commissionsByReferrer.set(c.referrerId, list);
      }
    });

    const referrers = usersList.map((user) => {
      const isPeter = user.email?.toLowerCase().startsWith('peter25');
      const code = user.referralCode || (isPeter ? 'PETER25' : user.uid.slice(0, 8).toUpperCase());
      
      const directList = referralsByReferrerUid.get(user.uid) || [];
      const codeList = referralsByCode.get(code.toUpperCase()) || [];
      
      // Merge unique referred users
      const referredMap = new Map<string, AdminUserRecord>();
      directList.forEach((r) => referredMap.set(r.uid, r));
      codeList.forEach((r) => referredMap.set(r.uid, r));
      const referredUsers = Array.from(referredMap.values());

      const userComms = commissionsByReferrer.get(user.uid) || [];
      const approvedComms = userComms.filter((c) => c.status === 'APPROVED');
      const totalCommissionsEarned = approvedComms.reduce((acc, c) => acc + (c.affiliateCommission || 0), 0) || (user.totalAffiliateEarnings || 0);

      // Converted count: referred users who have made purchases
      const convertedCount = referredUsers.filter((refUser) => {
        const hasComm = commissions.some((c) => c.referredUserId === refUser.uid && c.status === 'APPROVED');
        return hasComm || (refUser.ordersCount && refUser.ordersCount > 0);
      }).length;

      const totalReferredCount = Math.max(referredUsers.length, user.totalReferred || 0);
      const availableBalance = user.affiliateBalance || 0;

      return {
        user,
        code,
        totalReferredCount,
        convertedCount,
        totalCommissionsEarned,
        availableBalance,
        referredUsers,
        commissions: userComms
      };
    });

    return referrers;
  }, [usersList, commissions]);

  // Filtered Referrers for Network Tab
  const filteredReferrers = useMemo(() => {
    return networkData.filter((item) => {
      // Filter tab
      if (networkFilter === 'ACTIVE_ONLY') {
        if (item.totalReferredCount === 0 && item.totalCommissionsEarned === 0 && item.availableBalance === 0) {
          return false;
        }
      } else if (networkFilter === 'WITH_BALANCE') {
        if (item.availableBalance <= 0) return false;
      }

      // Search
      if (!networkSearch.trim()) return true;
      const s = networkSearch.toLowerCase();
      const userName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.toLowerCase();
      const userEmail = (item.user.email || '').toLowerCase();
      const userCode = item.code.toLowerCase();
      const userPhone = (item.user.phone || '').toLowerCase();

      return userName.includes(s) || userEmail.includes(s) || userCode.includes(s) || userPhone.includes(s);
    });
  }, [networkData, networkFilter, networkSearch]);

  // Global Affiliation KPIs Calculations
  const stats = useMemo(() => {
    let grossSales = 0;
    let totalAffiliatePaid = 0;
    let totalAdminNetGain = 0;
    let pendingCommsCount = 0;
    let pendingCommsAmount = 0;

    commissions.forEach((c) => {
      if (c.status === 'APPROVED') {
        grossSales += (c.totalAmount || 0);
        totalAffiliatePaid += (c.affiliateCommission || 0);
        totalAdminNetGain += (c.adminNetGain || 0);
      } else if (c.status === 'PENDING') {
        pendingCommsCount += 1;
        pendingCommsAmount += (c.affiliateCommission || 0);
      }
    });

    const pendingPayouts = payoutRequests.filter((p) => p.status === 'PENDING');
    const pendingPayoutsCount = pendingPayouts.length;
    const pendingPayoutsAmount = pendingPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);

    const activeReferrersCount = networkData.filter(
      (r) => r.totalReferredCount > 0 || r.totalCommissionsEarned > 0 || r.availableBalance > 0
    ).length;

    const totalReferredAcrossApp = networkData.reduce((acc, r) => acc + r.totalReferredCount, 0);
    const totalConvertedAcrossApp = networkData.reduce((acc, r) => acc + r.convertedCount, 0);
    const globalConversionRate = totalReferredAcrossApp > 0 
      ? Math.round((totalConvertedAcrossApp / totalReferredAcrossApp) * 100) 
      : 0;

    return {
      grossSales,
      totalAffiliatePaid,
      totalAdminNetGain,
      pendingCommsCount,
      pendingCommsAmount,
      pendingPayoutsCount,
      pendingPayoutsAmount,
      activeReferrersCount,
      totalReferredAcrossApp,
      totalConvertedAcrossApp,
      globalConversionRate
    };
  }, [commissions, payoutRequests, networkData]);

  // Filtered Commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const matchFilter = commFilter === 'ALL' || c.status === commFilter;
      if (!matchFilter) return false;

      if (!commSearch.trim()) return true;
      const s = commSearch.toLowerCase();
      return (
        c.referrerName?.toLowerCase().includes(s) ||
        c.referrerEmail?.toLowerCase().includes(s) ||
        c.referrerCode?.toLowerCase().includes(s) ||
        c.referredUserName?.toLowerCase().includes(s) ||
        c.transactionId?.toLowerCase().includes(s) ||
        c.serviceTitle?.toLowerCase().includes(s)
      );
    });
  }, [commissions, commFilter, commSearch]);

  // Filtered Payout Requests
  const filteredPayouts = useMemo(() => {
    return payoutRequests.filter((p) => {
      const matchFilter = payoutFilter === 'ALL' || p.status === payoutFilter;
      if (!matchFilter) return false;

      if (!payoutSearch.trim()) return true;
      const s = payoutSearch.toLowerCase();
      return (
        p.affiliateName?.toLowerCase().includes(s) ||
        p.affiliateEmail?.toLowerCase().includes(s) ||
        p.phoneNumber?.toLowerCase().includes(s) ||
        p.network?.toLowerCase().includes(s) ||
        p.id?.toLowerCase().includes(s)
      );
    });
  }, [payoutRequests, payoutFilter, payoutSearch]);

  // Action: Approve Commission
  const handleApproveCommission = async (comm: AffiliateCommission) => {
    setActionLoadingId(comm.id);
    setFeedback(null);
    try {
      const res = await approveAffiliateCommission(comm.id, adminEmail, actionNote || 'Validée par l\'admin');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Commission de ${comm.affiliateCommission.toLocaleString('fr-FR')} FCFA approuvée avec succès ! Le solde du parrain ${comm.referrerName} a été crédité.`
        });
        loadUsers();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de l\'approbation.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Erreur inconnue.' });
    } finally {
      setActionLoadingId(null);
      setConfirmAction(null);
      setActionNote('');
    }
  };

  // Action: Reject Commission
  const handleRejectCommission = async (commId: string) => {
    setActionLoadingId(commId);
    setFeedback(null);
    try {
      const res = await rejectAffiliateCommission(commId, adminEmail, actionNote || 'Rejetée par l\'admin');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Commission rejetée. Aucun montant n\'a été alloué à l\'affilié.'
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors du rejet.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Erreur inconnue.' });
    } finally {
      setActionLoadingId(null);
      setConfirmAction(null);
      setActionNote('');
    }
  };

  // Action: Mark Payout Paid
  const handleMarkPayoutPaid = async (req: AffiliatePayoutRequest) => {
    setActionLoadingId(req.id);
    setFeedback(null);
    try {
      const res = await markAffiliatePayoutPaid(req.id, adminEmail, actionNote || 'Virement mobile envoyé par l\'admin');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Virement de ${req.amount.toLocaleString('fr-FR')} FCFA marqué comme PAYÉ. Le solde d'affiliation de ${req.affiliateName} a été débité.`
        });
        loadUsers();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la validation du virement.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Erreur inconnue.' });
    } finally {
      setActionLoadingId(null);
      setConfirmAction(null);
      setActionNote('');
    }
  };

  // Action: Reject Payout
  const handleRejectPayout = async (payoutId: string) => {
    setActionLoadingId(payoutId);
    setFeedback(null);
    try {
      const res = await rejectAffiliatePayout(payoutId, adminEmail, actionNote || 'Refusé par l\'administrateur');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Demande de retrait rejetée. Le solde de l\'affilié reste inchangé.'
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors du rejet.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Erreur inconnue.' });
    } finally {
      setActionLoadingId(null);
      setConfirmAction(null);
      setActionNote('');
    }
  };

  const handleCopyPhone = (id: string, phone: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedPhoneId(id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* BANNER HEADER ADMIN                                                       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Console d'Affiliation & Parrainage</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-amber-300">20% Réseau / 80% Dokya</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Webhook Actif 🟢</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black">
                <span>⚡ Money Fusion Direct</span>
              </div>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Gestion du Réseau d'Affiliés & Retraits Mobiles
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Supervision des parrains et filleuls. Les commissions sont créditées automatiquement via Money Fusion Direct (Webhook) et les demandes de retraits Wave / Orange Money sont traitées ci-dessous.
            </p>
          </div>

          {/* Subtabs Switcher */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('network')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'network'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Réseau Parrains ({stats.activeReferrersCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('commissions')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'commissions'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Commissions ({stats.pendingCommsCount} en attente)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('payouts')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'payouts'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Retraits Wave/OM ({stats.pendingPayoutsCount} en attente)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-lg ${
          feedback.type === 'success'
            ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 GLOBAL KPIS                                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Parrains Actifs & Filleuls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Parrains & Filleuls</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {stats.activeReferrersCount} <span className="text-sm font-normal text-slate-400">parrains</span>
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.totalReferredAcrossApp} filleul(s) inscrits • {stats.totalConvertedAcrossApp} converti(s) ({stats.globalConversionRate}%)
          </p>
        </div>

        {/* KPI 2: Commissions Totales Versées (20%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Commissions Versées (20%)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-300">
            {stats.totalAffiliatePaid.toLocaleString('fr-FR')} <span className="text-sm font-normal text-purple-200">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Commissions nettes distribuées aux apporteurs d'affaires
          </p>
        </div>

        {/* KPI 3: Chiffre d'Affaires Brut Apporté */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">CA Ventes Filleuls</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            {stats.grossSales.toLocaleString('fr-FR')} <span className="text-sm font-normal text-emerald-300">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Marge nette Dokya : {stats.totalAdminNetGain.toLocaleString('fr-FR')} FCFA (80%)
          </p>
        </div>

        {/* KPI 4: Retraits en attente */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Retraits en Attente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">
            {stats.pendingPayoutsAmount.toLocaleString('fr-FR')} <span className="text-sm font-normal text-amber-300">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.pendingPayoutsCount} demande(s) de virement Wave / OM
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: RÉSEAU DE PARRAINS & FILLEULS (NETWORK VIEW)                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'network' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">Réseau d'Affiliés & Arbre de Parrainage</h3>
              </div>
              <p className="text-xs text-slate-400">
                Liste complète des parrains actifs, suivi des inscriptions apportées, conversions d'achat et soldes disponibles.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={networkSearch}
                  onChange={(e) => setNetworkSearch(e.target.value)}
                  placeholder="Rechercher parrain, code, email..."
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 sm:w-64"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNetworkFilter('ACTIVE_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    networkFilter === 'ACTIVE_ONLY'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parrains Actifs ({stats.activeReferrersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkFilter('WITH_BALANCE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    networkFilter === 'WITH_BALANCE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Avec Solde &gt; 0
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    networkFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tous ({usersList.length})
                </button>
              </div>

              <button
                type="button"
                onClick={loadUsers}
                disabled={refreshingUsers}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Actualiser le réseau d'utilisateurs"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingUsers ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Network Table */}
          {loading || refreshingUsers ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Chargement du réseau d'affiliation...</p>
            </div>
          ) : filteredReferrers.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Aucun parrain trouvé avec ces critères.</p>
              <p className="text-xs text-slate-500">
                Passez le filtre sur « Tous » ou modifiez votre recherche pour afficher l'ensemble des utilisateurs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Parrain / Affilié</th>
                    <th className="py-3.5 px-4">Code Affilié</th>
                    <th className="py-3.5 px-4">Filleuls Inscrits</th>
                    <th className="py-3.5 px-4">Conversions</th>
                    <th className="py-3.5 px-4">Total Commissions</th>
                    <th className="py-3.5 px-4">Solde Disponible</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredReferrers.map((item) => {
                    const convRate = item.totalReferredCount > 0 
                      ? Math.round((item.convertedCount / item.totalReferredCount) * 100) 
                      : 0;
                    const fullName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.email?.split('@')[0] || 'Utilisateur';

                    return (
                      <tr key={item.user.uid} className="hover:bg-slate-800/40 transition-colors">
                        
                        {/* Parrain Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/30">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <span>{fullName}</span>
                                {item.user.email?.toLowerCase().startsWith('peter25') && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                                    ADMIN
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">{item.user.email}</p>
                              {item.user.phone && (
                                <p className="text-[10px] text-slate-500">{item.user.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code Affilié */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.user.uid, item.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-bold text-xs hover:bg-purple-500/25 transition-all cursor-pointer"
                            title="Cliquer pour copier le code"
                          >
                            <span>{item.code}</span>
                            {copiedCodeId === item.user.uid ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-purple-400" />
                            )}
                          </button>
                        </td>

                        {/* Filleuls Inscrits */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                            <Users className="w-3 h-3" />
                            <span>{item.totalReferredCount} client{item.totalReferredCount > 1 ? 's' : ''}</span>
                          </span>
                        </td>

                        {/* Conversions */}
                        <td className="py-3.5 px-4">
                          {item.convertedCount > 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{item.convertedCount} converti{item.convertedCount > 1 ? 's' : ''}</span>
                              </span>
                              <p className="text-[10px] text-slate-400 font-medium">Taux : {convRate}%</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">0 achat</span>
                          )}
                        </td>

                        {/* Total Commissions */}
                        <td className="py-3.5 px-4">
                          <span className="font-black text-purple-300 text-xs">
                            {item.totalCommissionsEarned.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>

                        {/* Solde Disponible */}
                        <td className="py-3.5 px-4">
                          <span className={`font-black text-xs ${item.availableBalance > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {item.availableBalance.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReferrerDetail({
                                referrer: item.user,
                                code: item.code,
                                referredUsers: item.referredUsers,
                                totalCommissions: item.totalCommissionsEarned,
                                availableBalance: item.availableBalance
                              })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm shadow-indigo-950"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Voir Filleuls ({item.referredUsers.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCommSearch(item.code);
                                setActiveSubTab('commissions');
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all cursor-pointer"
                              title="Voir les commissions de ce parrain"
                            >
                              <Coins className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: VALIDATION DES COMMISSIONS                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'commissions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-400" />
                <span>Validation des Commissions d'Affiliation</span>
              </h3>
              <p className="text-xs text-slate-400">
                Chaque achat réalisé par un client parrainé génère 20% pour le parrain et 80% de marge nette Dokya.
              </p>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={commSearch}
                  onChange={(e) => setCommSearch(e.target.value)}
                  placeholder="Rechercher parrain, client..."
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCommFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      commFilter === st
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Toutes' : st === 'PENDING' ? `En attente (${stats.pendingCommsCount})` : st === 'APPROVED' ? 'Approuvées' : 'Rejetées'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Chargement des commissions...</p>
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-500 text-xs">
              Aucune commission trouvée pour ces critères de recherche.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Transaction & Date</th>
                    <th className="py-3.5 px-4">Parrain / Affilié</th>
                    <th className="py-3.5 px-4">Client Apporté</th>
                    <th className="py-3.5 px-4">Service</th>
                    <th className="py-3.5 px-4">Montant Total</th>
                    <th className="py-3.5 px-4">Commission (20%)</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCommissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Date & Ref */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <p className="text-slate-300 font-bold">
                          {new Date(comm.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-slate-500 text-[10px] truncate max-w-[120px]">
                          {comm.id.slice(0, 12)}...
                        </p>
                      </td>

                      {/* Parrain */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{comm.referrerName || 'Parrain'}</p>
                        <p className="text-[10px] text-slate-400">{comm.referrerEmail}</p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9px] font-mono font-bold">
                          Code: {comm.referrerCode || 'N/A'}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-200">{comm.referredUserName}</p>
                        <p className="text-[10px] text-slate-400">{comm.referredUserEmail || 'Email masqué'}</p>
                      </td>

                      {/* Service */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {comm.serviceTitle}
                      </td>

                      {/* Montant Payé */}
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {comm.totalAmount.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Commission */}
                      <td className="py-3.5 px-4 font-black text-purple-300">
                        +{comm.affiliateCommission.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        {comm.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approuvée</span>
                          </span>
                        ) : comm.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>Rejetée</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            <span>En attente validation</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {comm.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmAction({
                                type: 'approve_comm',
                                id: comm.id,
                                title: 'Approuver la commission d\'affiliation',
                                details: `Confirmez l'approbation de ${comm.affiliateCommission.toLocaleString('fr-FR')} FCFA pour ${comm.referrerName}. Ce montant sera immédiatement crédité sur son solde de parrainage.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-950"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approuver</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmAction({
                                type: 'reject_comm',
                                id: comm.id,
                                title: 'Rejeter la commission',
                                details: `Rejeter la commission d'affiliation de ${comm.affiliateCommission.toLocaleString('fr-FR')} FCFA pour ${comm.referrerName}.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeter</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            {comm.adminNote || 'Traité'}
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: TRAITEMENT DES DEMANDES DE RETRAIT                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'payouts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <span>Traitement des Demandes de Retrait Mobile (Wave / OM)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Effectuez le virement sur le numéro mobile du parrain, puis marquez la demande comme payée pour déduire son solde.
              </p>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                  placeholder="Rechercher bénéficiaire, numéro..."
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPayoutFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      payoutFilter === st
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Toutes' : st === 'PENDING' ? `En attente (${stats.pendingPayoutsCount})` : st === 'PAID' ? 'Payées' : 'Rejetées'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payouts Table */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-500 text-xs">
              Aucune demande de virement trouvée pour ces critères.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Date Demande</th>
                    <th className="py-3.5 px-4">Bénéficiaire (Affilié)</th>
                    <th className="py-3.5 px-4">Opérateur Mobile</th>
                    <th className="py-3.5 px-4">Numéro de Paiement</th>
                    <th className="py-3.5 px-4">Montant Net</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPayouts.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Beneficiaire */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{req.affiliateName}</p>
                        <p className="text-[10px] text-slate-400">{req.affiliateEmail}</p>
                      </td>

                      {/* Opérateur */}
                      <td className="py-3.5 px-4">
                        {req.network === 'wave' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black">
                            <span>WAVE SÉNÉGAL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-black">
                            <span>ORANGE MONEY</span>
                          </span>
                        )}
                      </td>

                      {/* Numéro avec bouton Copier */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span>{req.phoneNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(req.id, req.phoneNumber)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                            title="Copier le numéro"
                          >
                            {copiedPhoneId === req.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Montant */}
                      <td className="py-3.5 px-4 font-black text-amber-400 text-sm">
                        {req.amount.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        {req.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Virement Envoyé</span>
                          </span>
                        ) : req.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>Rejeté</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            <span>À Payer</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmAction({
                                type: 'pay_payout',
                                id: req.id,
                                title: 'Confirmer le virement mobile envoyé',
                                details: `Avez-vous bien envoyé ${req.amount.toLocaleString('fr-FR')} FCFA au numéro ${req.phoneNumber} via ${req.network.toUpperCase()} ? Cette action débitera immédiatement le solde d'affiliation de ${req.affiliateName}.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-950"
                            >
                              <Check className="w-3 h-3" />
                              <span>Marquer Payé</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmAction({
                                type: 'reject_payout',
                                id: req.id,
                                title: 'Rejeter la demande de retrait',
                                details: `Rejeter la demande de ${req.amount.toLocaleString('fr-FR')} FCFA de ${req.affiliateName}. Le solde ne sera pas débité.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeter</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            {req.adminNote || 'Terminé'}
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DÉTAILS DU RÉSEAU D'UN PARRAIN                                     */}
      {/* ========================================================================= */}
      {selectedReferrerDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-4xl w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-sm flex items-center justify-center border border-indigo-500/30">
                    {(selectedReferrerDetail.referrer.firstName || selectedReferrerDetail.referrer.email || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Réseau de {selectedReferrerDetail.referrer.firstName} {selectedReferrerDetail.referrer.lastName || ''}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Code Parrain : <strong className="text-purple-400 font-mono">{selectedReferrerDetail.code}</strong> • {selectedReferrerDetail.referrer.email}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReferrerDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referrer Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filleuls Inscrits</span>
                <p className="text-lg font-black text-white mt-0.5">{selectedReferrerDetail.referredUsers.length}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clients Convertis</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">
                  {selectedReferrerDetail.referredUsers.filter(u => (u.ordersCount || 0) > 0).length}
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Commissions</span>
                <p className="text-lg font-black text-purple-300 mt-0.5">
                  {selectedReferrerDetail.totalCommissions.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solde Disponible</span>
                <p className="text-lg font-black text-amber-400 mt-0.5">
                  {selectedReferrerDetail.availableBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {/* Filleuls Table */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Liste des Filleuls Enregistrés ({selectedReferrerDetail.referredUsers.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Données en direct</span>
              </h4>

              {selectedReferrerDetail.referredUsers.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-500 text-xs">
                  Aucun filleul direct enregistré pour ce parrain actuellement.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5">Filleul</th>
                        <th className="py-3 px-3.5">Contact</th>
                        <th className="py-3 px-3.5">Inscription</th>
                        <th className="py-3 px-3.5">Statut Achats</th>
                        <th className="py-3 px-3.5 text-right">Commandes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {selectedReferrerDetail.referredUsers.map((filleul) => {
                        const hasOrders = (filleul.ordersCount || 0) > 0;
                        const filleulName = `${filleul.firstName || ''} ${filleul.lastName || ''}`.trim() || 'Client';

                        return (
                          <tr key={filleul.uid} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3.5">
                              <p className="font-bold text-white">{filleulName}</p>
                              <p className="text-[11px] text-slate-400">{filleul.email}</p>
                            </td>

                            <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">
                              {filleul.phone || 'Non renseigné'}
                            </td>

                            <td className="py-3 px-3.5 text-slate-400 font-medium">
                              {filleul.referredAt ? new Date(filleul.referredAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : (filleul.createdAt ? new Date(filleul.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 'Récemment')}
                            </td>

                            <td className="py-3 px-3.5">
                              {hasOrders ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Client Converti</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black">
                                  <Clock className="w-3 h-3" />
                                  <span>Inscrit (Sans achat)</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 text-right font-bold text-slate-300">
                              {filleul.ordersCount || 0} commande(s)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCommSearch(selectedReferrerDetail.code);
                    setSelectedReferrerDetail(null);
                    setActiveSubTab('commissions');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Filtrer les commissions de ce parrain</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPayoutSearch(selectedReferrerDetail.referrer.email || '');
                    setSelectedReferrerDetail(null);
                    setActiveSubTab('payouts');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Voir ses demandes de retrait</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReferrerDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION ACTION MODAL (APPROVE/REJECT COMMISSION OR PAYOUT)           */}
      {/* ========================================================================= */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${confirmAction.type.startsWith('reject') ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>{confirmAction.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmAction.details}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">
                Note ou référence de virement (facultatif) :
              </label>
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Ex: Réf Wave TX-98472 / Validé"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'approve_comm') {
                    const comm = commissions.find(c => c.id === confirmAction.id);
                    if (comm) handleApproveCommission(comm);
                  } else if (confirmAction.type === 'reject_comm') {
                    handleRejectCommission(confirmAction.id);
                  } else if (confirmAction.type === 'pay_payout') {
                    const req = payoutRequests.find(p => p.id === confirmAction.id);
                    if (req) handleMarkPayoutPaid(req);
                  } else if (confirmAction.type === 'reject_payout') {
                    handleRejectPayout(confirmAction.id);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all cursor-pointer ${
                  confirmAction.type.startsWith('reject')
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                }`}
              >
                Confirmer l'opération
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
