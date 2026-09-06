import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, ArrowUpRight, CheckCircle2, XCircle, Clock, 
  Search, RefreshCw, AlertCircle, Check, X, Smartphone, 
  Coins, Filter, ShieldCheck, ChevronRight, Copy, ExternalLink, HelpCircle
} from 'lucide-react';
import { AffiliateCommission, AffiliatePayoutRequest } from '../types';
import { 
  subscribeToAffiliateCommissions, 
  subscribeToAffiliatePayoutRequests,
  approveAffiliateCommission,
  rejectAffiliateCommission,
  markAffiliatePayoutPaid,
  rejectAffiliatePayout
} from '../lib/firebase';

interface AdminAffiliationViewProps {
  adminEmail: string;
}

export const AdminAffiliationView: React.FC<AdminAffiliationViewProps> = ({ adminEmail }) => {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<AffiliatePayoutRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active sub-tab inside affiliations
  const [activeSubTab, setActiveSubTab] = useState<'commissions' | 'payouts'>('commissions');

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

  // Subscriptions
  useEffect(() => {
    setLoading(true);
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

  // KPIs Calculations
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

    return {
      grossSales,
      totalAffiliatePaid,
      totalAdminNetGain,
      pendingCommsCount,
      pendingCommsAmount,
      pendingPayoutsCount,
      pendingPayoutsAmount
    };
  }, [commissions, payoutRequests]);

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
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la validation du paiement.' });
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
  const handleRejectPayout = async (reqId: string) => {
    setActionLoadingId(reqId);
    setFeedback(null);
    try {
      const res = await rejectAffiliatePayout(reqId, adminEmail, actionNote || 'Demande rejetée');
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* BANNER HEADER ADMIN                                                       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Contrôle Financier & Affiliation</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-amber-300">Marge 80% Admin / 20% Affilié</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Gestion des Affiliations & Retraits Mobiles
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Supervisez les ventes apportées par les affiliés, approuvez les commissions générées et validez les virements Wave / Orange Money après envoi des fonds.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('commissions')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'commissions'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Commissions ({commissions.filter(c => c.status === 'PENDING').length} en attente)
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('payouts')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'payouts'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Retraits ({payoutRequests.filter(p => p.status === 'PENDING').length} en attente)
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 GLOBAL KPIS                                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Chiffre d'Affaires Brut Apporté */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">CA Brut Apporté</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {stats.grossSales.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-400">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Ventes totales validées via parrainage
          </p>
        </div>

        {/* KPI 2: Commissions Affiliés Validées (20%) */}
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
            Commissions nettes allouées aux parrains
          </p>
        </div>

        {/* KPI 3: Marge Nette Dokya (80%) */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Marge Nette Dokya (80%)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            {stats.totalAdminNetGain.toLocaleString('fr-FR')} <span className="text-sm font-normal text-emerald-300">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Bénéfice net conservé par la plateforme
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
            {stats.pendingPayoutsCount} demande(s) de virement Wave/OM
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: VALIDATION DES COMMISSIONS                                      */}
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
                    <th className="py-3.5 px-4">Client Apporté</th>
                    <th className="py-3.5 px-4">Parrain (Affilié)</th>
                    <th className="py-3.5 px-4">Montant Payé</th>
                    <th className="py-3.5 px-4">Part Affilié (20%)</th>
                    <th className="py-3.5 px-4">Marge Dokya (80%)</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCommissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Tx ID & Date */}
                      <td className="py-3.5 px-4">
                        <p className="font-mono text-white font-bold text-[11px]">
                          {comm.transactionId}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(comm.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {comm.serviceTitle || 'Dokya AI'}
                        </p>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">
                          {comm.referredUserName || 'Client'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          UID: {comm.referredUserId?.slice(0, 8)}...
                        </p>
                      </td>

                      {/* Parrain */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-purple-300">
                            {comm.referrerName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-bold">
                              {comm.referrerCode || 'CODE'}
                            </span>
                            {comm.referrerPhone && <span>{comm.referrerPhone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        {comm.totalAmount.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Part Affilié 20% */}
                      <td className="py-3.5 px-4 font-black text-purple-400">
                        +{comm.affiliateCommission.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Marge Dokya 80% */}
                      <td className="py-3.5 px-4 font-black text-emerald-400">
                        +{comm.adminNetGain.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Status */}
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
                            <span>En attente</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {comm.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoadingId === comm.id}
                              onClick={() => setConfirmAction({
                                type: 'approve_comm',
                                id: comm.id,
                                title: 'Approuver la commission d\'affiliation',
                                details: `Voulez-vous valider cette commission de ${comm.affiliateCommission.toLocaleString('fr-FR')} FCFA ? Le solde de ${comm.referrerName} sera immédiatement crédité.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              <Check className="w-3 h-3" />
                              <span>Valider</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoadingId === comm.id}
                              onClick={() => setConfirmAction({
                                type: 'reject_comm',
                                id: comm.id,
                                title: 'Rejeter la commission',
                                details: `Êtes-vous sûr de vouloir rejeter cette commission pour ${comm.referrerName} ?`
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
      {/* SUBTAB 2: TRAITEMENT DES DEMANDES DE RETRAIT                              */}
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

          {/* Table */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-500 text-xs">
              Aucune demande de retrait trouvée pour ces critères.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Affilié Bénéficiaire</th>
                    <th className="py-3.5 px-4">Date Demande</th>
                    <th className="py-3.5 px-4">Réseau</th>
                    <th className="py-3.5 px-4">Numéro de Téléphone</th>
                    <th className="py-3.5 px-4">Montant Demandé</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Action Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPayouts.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Affilié */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{req.affiliateName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{req.affiliateEmail || req.affiliateId}</p>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(req.requestedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Réseau */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          req.network === 'wave'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${req.network === 'wave' ? 'bg-cyan-400' : 'bg-orange-500'}`} />
                          <span>{req.network === 'wave' ? 'Wave' : 'Orange Money'}</span>
                        </span>
                      </td>

                      {/* Numéro avec bouton Copier */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="font-mono font-bold text-white">{req.phoneNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(req.id, req.phoneNumber)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                      <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                        {req.amount.toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        {req.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Payé</span>
                          </span>
                        ) : req.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>Rejeté</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => setConfirmAction({
                                type: 'pay_payout',
                                id: req.id,
                                title: 'Confirmer le virement mobile',
                                details: `Avez-vous effectué le virement de ${req.amount.toLocaleString('fr-FR')} FCFA via ${req.network === 'wave' ? 'Wave' : 'Orange Money'} au numéro ${req.phoneNumber} ? Cette action débitera le solde de l'affilié.`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              <Check className="w-3 h-3" />
                              <span>Marquer Payé</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => setConfirmAction({
                                type: 'reject_payout',
                                id: req.id,
                                title: 'Rejeter la demande de retrait',
                                details: `Êtes-vous sûr de vouloir rejeter cette demande de retrait de ${req.amount.toLocaleString('fr-FR')} FCFA pour ${req.affiliateName} ?`
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeter</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            {req.adminNote || (req.paidAt ? `Payé le ${new Date(req.paidAt).toLocaleDateString('fr-FR')}` : 'Traité')}
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
      {/* CONFIRMATION MODAL                                                        */}
      {/* ========================================================================= */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-black text-white">{confirmAction.title}</h4>
              <button onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-white p-1">
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
