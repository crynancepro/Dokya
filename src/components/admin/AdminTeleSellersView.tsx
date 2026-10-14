import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Sparkles,
  Wallet,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Edit3,
  Phone,
  Mail,
  RefreshCw,
  ArrowUpRight,
  Shield,
  UserX,
  UserCheck,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { AdminUserRecord, StoreOrder } from '../../types';
import { db, doc, setDoc, updateDoc, recordTransactionEverywhere, createNotification } from '../../lib/firebase';
import { useLocale } from '../../contexts/LocaleContext';

interface AdminTeleSellersViewProps {
  usersList: AdminUserRecord[];
  allOrders?: StoreOrder[];
  onRefreshUsers?: () => void;
  adminEmail?: string;
  onNavigateToOrders?: (telemarketerId?: string) => void;
}

export const AdminTeleSellersView: React.FC<AdminTeleSellersViewProps> = ({
  usersList,
  allOrders = [],
  onRefreshUsers,
  adminEmail = 'admin@dokya.site',
  onNavigateToOrders
}) => {
  const { formatPrice } = useLocale();

  // Local state for instant optimistic updates
  const [localUsers, setLocalUsers] = useState<AdminUserRecord[]>(usersList);

  // Sync with prop when parent updates
  React.useEffect(() => {
    setLocalUsers(usersList);
  }, [usersList]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'certified' | 'uncertified'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'vip' | 'standard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Loading & Action states
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Wallet Adjustment Modal State
  const [walletTargetUser, setWalletTargetUser] = useState<AdminUserRecord | null>(null);
  const [walletOpType, setWalletOpType] = useState<'credit' | 'debit'>('credit');
  const [walletAmount, setWalletAmount] = useState<string>('');
  const [walletReason, setWalletReason] = useState<string>('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  // Suspend Modal State
  const [suspendTargetUser, setSuspendTargetUser] = useState<AdminUserRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('Violation des conditions générales de vente');

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Map orders stats per telemarketer
  const telemarketerStats = useMemo(() => {
    const stats: Record<string, { totalSales: number; ordersCount: number; deliveredCount: number }> = {};
    allOrders.forEach(order => {
      const telId = order.telemarketerId;
      if (!telId) return;
      if (!stats[telId]) {
        stats[telId] = { totalSales: 0, ordersCount: 0, deliveredCount: 0 };
      }
      stats[telId].ordersCount += 1;
      stats[telId].totalSales += Number(order.totalAmount || 0);
      if (order.status === 'delivered') {
        stats[telId].deliveredCount += 1;
      }
    });
    return stats;
  }, [allOrders]);

  // Filter telemarketers list
  // Un utilisateur est télévendeur s'il a le rôle telemarketer, un badge télévendeur, un mode VIP/Standard télévendeur, ou s'il a passé des commandes de télévente
  const teleSellersList = useMemo(() => {
    return localUsers.filter(u => {
      const isRoleTel = u.role === 'telemarketer' || (u as any).userRole === 'telemarketer';
      const hasBadge = !!(u.teleSellerBadge || u.telemarketerBadge || u.isTelemarketerCertified);
      const hasPlan = !!((u as any).telemarketerPlan || (u as any).telemarketerMode);
      const hasOrders = !!telemarketerStats[u.uid];
      return isRoleTel || hasBadge || hasPlan || hasOrders;
    });
  }, [localUsers, telemarketerStats]);

  // Filtered & Searched telemarketers
  const filteredTeleSellers = useMemo(() => {
    return teleSellersList.filter(u => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const matchesSearch = !search || fullName.includes(search) || email.includes(search) || phone.includes(search) || u.uid.includes(search);

      // Badge Filter
      const isCert = !!(u.teleSellerBadge || u.telemarketerBadge || u.isTelemarketerCertified);
      const matchesBadge = badgeFilter === 'all' || (badgeFilter === 'certified' ? isCert : !isCert);

      // Mode Filter
      const isVip = (u as any).telemarketerPlan === 'vip' || (u as any).telemarketerMode === 'vip';
      const matchesMode = modeFilter === 'all' || (modeFilter === 'vip' ? isVip : !isVip);

      // Status Filter
      const isSuspended = u.status === 'suspended';
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'suspended' ? isSuspended : !isSuspended);

      return matchesSearch && matchesBadge && matchesMode && matchesStatus;
    });
  }, [teleSellersList, searchTerm, badgeFilter, modeFilter, statusFilter]);

  // KPIs
  const kpiTotal = teleSellersList.length;
  const kpiCertified = teleSellersList.filter(u => u.teleSellerBadge || u.telemarketerBadge || u.isTelemarketerCertified).length;
  const kpiVip = teleSellersList.filter(u => (u as any).telemarketerPlan === 'vip' || (u as any).telemarketerMode === 'vip').length;
  const kpiTotalSales = useMemo(() => {
    return Object.values(telemarketerStats).reduce((acc, curr) => acc + curr.totalSales, 0);
  }, [telemarketerStats]);
  const kpiTotalBalance = useMemo(() => {
    return teleSellersList.reduce((acc, u) => acc + (Number(u.balance || (u as any).walletBalance || 0)), 0);
  }, [teleSellersList]);

  // ACTION 1: TOGGLE CERTIFIED BADGE
  const handleToggleBadge = async (targetUser: AdminUserRecord) => {
    const currentCertified = !!(targetUser.teleSellerBadge || targetUser.telemarketerBadge || targetUser.isTelemarketerCertified);
    const newCertified = !currentCertified;
    setIsProcessing(targetUser.uid);

    try {
      // 1. Optimistic update
      setLocalUsers(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            teleSellerBadge: newCertified,
            telemarketerBadge: newCertified,
            isTelemarketerCertified: newCertified,
            role: 'telemarketer'
          };
        }
        return u;
      }));

      // 2. Direct Firestore update
      const updatePayload = {
        teleSellerBadge: newCertified,
        telemarketerBadge: newCertified,
        isTelemarketerCertified: newCertified,
        role: 'telemarketer',
        userRole: 'telemarketer',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', targetUser.uid), updatePayload, { merge: true });
      try {
        await setDoc(doc(db, 'candidates', targetUser.uid), updatePayload, { merge: true });
      } catch (_e) {}

      // 3. Notification to user
      await createNotification(targetUser.uid, {
        title: newCertified ? 'Badge Télévendeur Certifié Accordé !' : 'Badge Télévendeur Certifié Révoqué',
        message: newCertified 
          ? 'Félicitations ! L\'administrateur a validé votre Badge Télévendeur Certifié. Votre profil bénéficie désormais de la visibilité prioritaire.'
          : 'Votre Badge Télévendeur Certifié a été désactivé par l\'administrateur.',
        type: newCertified ? 'success' : 'warning',
        tabTarget: 'badge'
      });

      showSuccess(`Badge ${newCertified ? 'accordé' : 'révoqué'} pour ${targetUser.firstName || targetUser.email} !`);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la modification du badge.');
    } finally {
      setIsProcessing(null);
    }
  };

  // ACTION 2: TOGGLE VIP MODE (100% vs 20%)
  const handleToggleVipMode = async (targetUser: AdminUserRecord) => {
    const isCurrentlyVip = (targetUser as any).telemarketerPlan === 'vip' || (targetUser as any).telemarketerMode === 'vip';
    const newMode: 'standard' | 'vip' = isCurrentlyVip ? 'standard' : 'vip';
    setIsProcessing(targetUser.uid);

    try {
      setLocalUsers(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            telemarketerPlan: newMode,
            telemarketerMode: newMode,
            role: 'telemarketer'
          };
        }
        return u;
      }));

      const updatePayload = {
        telemarketerPlan: newMode,
        telemarketerMode: newMode,
        role: 'telemarketer',
        userRole: 'telemarketer',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', targetUser.uid), updatePayload, { merge: true });
      try {
        await setDoc(doc(db, 'candidates', targetUser.uid), updatePayload, { merge: true });
      } catch (_e) {}

      await createNotification(targetUser.uid, {
        title: newMode === 'vip' ? 'Mode VIP Télévendeur Activé !' : 'Passage en Mode Standard (20% Dokya)',
        message: newMode === 'vip'
          ? 'L\'administrateur a activé votre Mode VIP Télévendeur. Vous conservez désormais 100% de toutes vos commissions !'
          : 'Votre compte a été basculé en Mode Standard Télévendeur (prélèvement plateforme 20%).',
        type: newMode === 'vip' ? 'success' : 'info',
        tabTarget: 'wallet'
      });

      showSuccess(`Mode passé en ${newMode.toUpperCase()} (100% commissions) pour ${targetUser.firstName || targetUser.email} !`);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du changement de mode VIP.');
    } finally {
      setIsProcessing(null);
    }
  };

  // ACTION 3: WALLET ADJUSTMENT (CREDIT / DEBIT WITH REASON)
  const handleConfirmWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTargetUser) return;
    const amountNum = Math.abs(Number(walletAmount));
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      showError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (!walletReason.trim()) {
      showError('Le motif de l\'ajustement est obligatoire pour la traçabilité comptable.');
      return;
    }

    setIsSubmittingWallet(true);
    const targetUserId = walletTargetUser.uid;
    const curBalance = Number(walletTargetUser.balance || (walletTargetUser as any).walletBalance || 0);
    const diff = walletOpType === 'credit' ? amountNum : -amountNum;
    const newBalance = Math.max(0, curBalance + diff);

    try {
      // 1. Optimistic update
      setLocalUsers(prev => prev.map(u => {
        if (u.uid === targetUserId) {
          return {
            ...u,
            balance: newBalance,
            walletBalance: newBalance
          };
        }
        return u;
      }));

      // 2. Firestore update
      const updatePayload = {
        balance: newBalance,
        walletBalance: newBalance,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', targetUserId), updatePayload, { merge: true });
      try {
        await setDoc(doc(db, 'candidates', targetUserId), updatePayload, { merge: true });
      } catch (_e) {}

      // 3. Record transaction
      const txId = `TX-ADJUST-${Date.now()}`;
      await recordTransactionEverywhere({
        id: txId,
        transactionId: txId,
        userId: targetUserId,
        userEmail: walletTargetUser.email,
        userName: `${walletTargetUser.firstName || ''} ${walletTargetUser.lastName || ''}`.trim() || 'Télévendeur',
        type: walletOpType === 'credit' ? 'admin_credit' : 'admin_debit',
        amount: diff,
        expectedAmount: amountNum,
        currency: 'FCFA',
        description: `Ajustement Admin (${walletOpType === 'credit' ? '+' : '-'}${amountNum.toLocaleString('fr-FR')} FCFA) : ${walletReason.trim()} (par ${adminEmail})`,
        status: 'SUCCESS',
        aiStatus: 'COMPLETED',
        paymentMethod: 'admin_adjustment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Send notification
      await createNotification(targetUserId, {
        title: walletOpType === 'credit' ? 'Solde Crédité par l\'Administration' : 'Solde Débité par l\'Administration',
        message: `${walletOpType === 'credit' ? 'Votre solde a été crédité de +' : 'Votre solde a été ajusté de -'}${amountNum.toLocaleString('fr-FR')} FCFA. Motif : ${walletReason.trim()}`,
        type: walletOpType === 'credit' ? 'success' : 'warning',
        tabTarget: 'wallet'
      });

      showSuccess(`Solde de ${walletTargetUser.firstName || walletTargetUser.email} ajusté à ${newBalance.toLocaleString('fr-FR')} FCFA !`);
      setWalletTargetUser(null);
      setWalletAmount('');
      setWalletReason('');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de l\'ajustement du solde.');
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  // ACTION 4: SUSPEND / UNSUSPEND TELEMARKETER
  const handleToggleSuspend = async (targetUser: AdminUserRecord) => {
    const isCurrentlySuspended = targetUser.status === 'suspended';
    const newStatus: 'active' | 'suspended' = isCurrentlySuspended ? 'active' : 'suspended';
    setIsProcessing(targetUser.uid);

    try {
      setLocalUsers(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            status: newStatus,
            suspendedReason: newStatus === 'suspended' ? suspendReason : undefined
          };
        }
        return u;
      }));

      const updatePayload = {
        status: newStatus,
        suspendedReason: newStatus === 'suspended' ? suspendReason : null,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', targetUser.uid), updatePayload, { merge: true });
      try {
        await setDoc(doc(db, 'candidates', targetUser.uid), updatePayload, { merge: true });
      } catch (_e) {}

      await createNotification(targetUser.uid, {
        title: newStatus === 'suspended' ? 'Compte Télévendeur Suspendu' : 'Compte Télévendeur Réactivé',
        message: newStatus === 'suspended'
          ? `Votre accès à la plateforme a été suspendu par l'administration. Motif : ${suspendReason}`
          : `Votre compte télévendeur a été réactivé par l'administration. Vous pouvez reprendre vos activités.`,
        type: newStatus === 'suspended' ? 'error' : 'success'
      });

      showSuccess(`Compte ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'} pour ${targetUser.firstName || targetUser.email} !`);
      setSuspendTargetUser(null);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du changement de statut du compte.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Messages */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{errorToast}</p>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Gestion Complète des Télévendeurs</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  {kpiTotal} Télévendeur{kpiTotal > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Contrôle total des comptes : Badges certifiés, Offres VIP, Ajustements de soldes et Modération.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToOrders && (
            <button
              type="button"
              onClick={() => onNavigateToOrders()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Voir Commandes Téléventes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onRefreshUsers && (
            <button
              type="button"
              onClick={onRefreshUsers}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Télévendeurs</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white">{kpiTotal}</div>
          <p className="text-[10px] text-slate-500">Comptes enregistrés</p>
        </div>

        {/* KPI 2: Certifiés */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Badges Certifiés</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{kpiCertified}</div>
          <p className="text-[10px] text-amber-400/70">{kpiTotal > 0 ? Math.round((kpiCertified / kpiTotal) * 100) : 0}% du réseau</p>
        </div>

        {/* KPI 3: VIP Mode */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Mode VIP (100%)</span>
            <Crown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400">{kpiVip}</div>
          <p className="text-[10px] text-purple-400/70">0% prélevé par Dokya</p>
        </div>

        {/* KPI 4: Volume Ventes */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ventes Générées</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400 truncate">
            {formatPrice(kpiTotalSales)}
          </div>
          <p className="text-[10px] text-slate-500">Toutes commandes</p>
        </div>

        {/* KPI 5: Solde Total */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Soldes en cours</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-black text-sky-400 truncate">
            {formatPrice(kpiTotalBalance)}
          </div>
          <p className="text-[10px] text-slate-500">Portefeuilles cumulés</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, tél..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Badge Filter */}
          <select
            value={badgeFilter}
            onChange={(e) => setBadgeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les Badges</option>
            <option value="certified">Badge Certifié uniquement</option>
            <option value="uncertified">Non Certifié</option>
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Toutes les Offres</option>
            <option value="vip">Mode VIP (100% Commissions)</option>
            <option value="standard">Mode Standard (20% Dokya)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les Statuts</option>
            <option value="active">Actifs uniquement</option>
            <option value="suspended">Suspendus uniquement</option>
          </select>
        </div>
      </div>

      {/* TABLE DES TÉLÉVENDEURS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Télévendeur</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-center">Badge Certifié</th>
                <th className="py-3 px-3 text-center">Offre / Mode</th>
                <th className="py-3 px-3 text-right">Solde Portefeuille</th>
                <th className="py-3 px-3 text-right">Volume Ventes</th>
                <th className="py-3 px-3 text-center">Statut Compte</th>
                <th className="py-3 px-4 text-center">Actions Modération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredTeleSellers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                    <p className="font-semibold text-slate-400">Aucun télévendeur trouvé</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Modifiez vos filtres ou activez le rôle télévendeur sur un compte candidat.</p>
                  </td>
                </tr>
              ) : (
                filteredTeleSellers.map(seller => {
                  const isCertified = !!(seller.teleSellerBadge || seller.telemarketerBadge || seller.isTelemarketerCertified);
                  const isVip = (seller as any).telemarketerPlan === 'vip' || (seller as any).telemarketerMode === 'vip';
                  const isSuspended = seller.status === 'suspended';
                  const curBal = Number(seller.balance || (seller as any).walletBalance || 0);
                  const stats = telemarketerStats[seller.uid] || { totalSales: 0, ordersCount: 0, deliveredCount: 0 };
                  const busy = isProcessing === seller.uid;

                  return (
                    <tr key={seller.uid} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isCertified 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {(seller.firstName?.[0] || seller.email?.[0] || 'T').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{`${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Télévendeur Dokya'}</span>
                              {isCertified && (
                                <span title="Badge Certifié Actif">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{seller.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3">
                        {seller.phone ? (
                          <a
                            href={`https://wa.me/${seller.phone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{seller.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Non renseigné</span>
                        )}
                      </td>

                      {/* Badge Certifié Status */}
                      <td className="py-3.5 px-3 text-center">
                        {isCertified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Certifié</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                            <span>Standard</span>
                          </span>
                        )}
                      </td>

                      {/* Mode VIP / Standard */}
                      <td className="py-3.5 px-3 text-center">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase tracking-wider">
                            <Crown className="w-3 h-3 text-purple-400" />
                            <span>VIP (100%)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                            <span>Standard (20%)</span>
                          </span>
                        )}
                      </td>

                      {/* Solde Portefeuille */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-black text-white text-xs">
                          {formatPrice(curBal)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ≈ ${(curBal / 600).toFixed(2)} USD
                        </div>
                      </td>

                      {/* Volume Ventes */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-emerald-400 text-xs">
                          {formatPrice(stats.totalSales)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {stats.ordersCount} cmd{stats.ordersCount > 1 ? 's' : ''} ({stats.deliveredCount} livrée{stats.deliveredCount > 1 ? 's' : ''})
                        </div>
                      </td>

                      {/* Statut Compte */}
                      <td className="py-3.5 px-3 text-center">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase">
                            <XCircle className="w-3 h-3" />
                            <span>Suspendu</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Actif</span>
                          </span>
                        )}
                      </td>

                      {/* ACTIONS DE MODÉRATION */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* 1. Toggle Badge */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleBadge(seller)}
                            title={isCertified ? 'Révoquer le Badge Certifié' : 'Accorder le Badge Certifié'}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                              isCertified
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Toggle Mode VIP */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleVipMode(seller)}
                            title={isVip ? 'Rétrograder en Mode Standard (20% Dokya)' : 'Passer en Mode VIP (100% Commissions)'}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                              isVip
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-slate-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/40'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Adjust Wallet Balance */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setWalletTargetUser(seller);
                              setWalletOpType('credit');
                              setWalletAmount('');
                              setWalletReason('Ajustement commission télévente');
                            }}
                            title="Ajuster le solde portefeuille (Créditer / Débiter)"
                            className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all cursor-pointer"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Suspend / Unsuspend */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (isSuspended) {
                                handleToggleSuspend(seller);
                              } else {
                                setSuspendTargetUser(seller);
                              }
                            }}
                            title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte télévendeur'}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                          >
                            {isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          {/* 5. View Orders */}
                          {onNavigateToOrders && (
                            <button
                              type="button"
                              onClick={() => onNavigateToOrders(seller.uid)}
                              title="Voir les commandes de ce télévendeur"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: AJUSTER LE SOLDE DU WALLET (CRÉDIT / DÉBIT)                 */}
      {/* ===================================================================== */}
      {walletTargetUser && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setWalletTargetUser(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ajuster le Solde Wallet</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                    {walletTargetUser.firstName || walletTargetUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalletTargetUser(null)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Balance info */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Solde actuel disponible :</span>
              <span className="font-mono font-black text-sm text-sky-400">
                {formatPrice(Number(walletTargetUser.balance || (walletTargetUser as any).walletBalance || 0))}
              </span>
            </div>

            <form onSubmit={handleConfirmWalletAdjustment} className="space-y-4">
              {/* Type d'opération */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Type d'opération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletOpType('credit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      walletOpType === 'credit'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créditer (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletOpType('debit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      walletOpType === 'debit'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Déduire (-)</span>
                  </button>
                </div>
              </div>

              {/* Montant */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Montant en FCFA</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="100"
                    required
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Ex: 10000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Motif obligatoire */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Motif de l'ajustement <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={walletReason}
                  onChange={(e) => setWalletReason(e.target.value)}
                  placeholder="Ex: Prime de performance, régularisation commission n°123..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletTargetUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWallet}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    walletOpType === 'credit'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {isSubmittingWallet ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : walletOpType === 'credit' ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Confirmer le Crédit</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-3.5 h-3.5" />
                      <span>Confirmer le Débit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SUSPENDRE / BANNIR LE COMPTE                                */}
      {/* ===================================================================== */}
      {suspendTargetUser && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSuspendTargetUser(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Suspendre le compte télévendeur</h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  {suspendTargetUser.firstName || suspendTargetUser.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              La suspension désactivera immédiatement l'accès du télévendeur à son espace, bloquera ses retraits et masquera son profil auprès des vendeurs partenaires.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Motif de la suspension</label>
              <textarea
                rows={3}
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Ex: Fraude sur commandes, faux numéros de téléphone..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSuspendTargetUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(suspendTargetUser)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Confirmer la suspension</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
