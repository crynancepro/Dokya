import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Copy, Check, Share2, Wallet, ArrowDownToLine, 
  Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, 
  Send, Smartphone, Coins, RefreshCw, ExternalLink, HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { CandidateProfile, AffiliateCommission, AffiliatePayoutRequest, UserReferralItem } from '../types';
import { 
  subscribeToAffiliateCommissions, 
  subscribeToAffiliatePayoutRequests, 
  requestAffiliatePayout,
  getReferredUsersCount,
  subscribeToReferredUsers
} from '../lib/firebase';
import { maskEmail, maskName } from '../lib/referralTracking';

interface DokyaAffiliateViewProps {
  profile: CandidateProfile;
  onGoToTab?: (tab: string) => void;
}

export const DokyaAffiliateView: React.FC<DokyaAffiliateViewProps> = ({ profile }) => {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<AffiliatePayoutRequest[]>([]);
  const [referredUsers, setReferredUsers] = useState<UserReferralItem[]>([]);
  const [activeTableTab, setActiveTableTab] = useState<'referrals' | 'commissions'>('referrals');
  const [referredCount, setReferredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payout request form state
  const [payoutNetwork, setPayoutNetwork] = useState<'wave' | 'orange_money'>('wave');
  const [payoutPhone, setPayoutPhone] = useState(profile.phone || profile.personalInfo?.phone || '');
  const [payoutAmount, setPayoutAmount] = useState<string>('2000');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter state for commissions table
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Referral Code & Link derivation
  const referralCode = profile.referralCode || (profile.email?.toLowerCase().startsWith('peter25') ? 'PETER25' : 'DOKYA');
  
  const referralLink = useMemo(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}?ref=${encodeURIComponent(referralCode)}`;
    }
    return `https://dokya.ai?ref=${referralCode}`;
  }, [referralCode]);

  // Real-time subscriptions to commissions & payout requests
  useEffect(() => {
    if (!profile.uid) return;

    setIsLoading(true);
    const unsubCommissions = subscribeToAffiliateCommissions(profile.uid, (list) => {
      setCommissions(list);
      setIsLoading(false);
    });

    const unsubPayouts = subscribeToAffiliatePayoutRequests(profile.uid, (list) => {
      setPayoutRequests(list);
    });

    const unsubReferred = subscribeToReferredUsers(profile.uid, (list) => {
      setReferredUsers(list);
      if (list.length > 0) {
        setReferredCount(list.length);
      }
    });

    getReferredUsersCount(profile.uid).then((cnt) => {
      setReferredCount(prev => Math.max(prev, cnt));
    });

    return () => {
      unsubCommissions();
      unsubPayouts();
      unsubReferred();
    };
  }, [profile.uid]);

  // Calculations
  const availableBalance = typeof profile.affiliateBalance === 'number' ? profile.affiliateBalance : 0;
  
  const pendingCommissionsTotal = useMemo(() => {
    return commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((acc, curr) => acc + (curr.affiliateCommission || 0), 0);
  }, [commissions]);

  const approvedEarningsTotal = useMemo(() => {
    const fromCommissions = commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((acc, curr) => acc + (curr.affiliateCommission || 0), 0);
    return Math.max(fromCommissions, profile.totalAffiliateEarnings || 0);
  }, [commissions, profile.totalAffiliateEarnings]);

  const filteredCommissions = useMemo(() => {
    if (statusFilter === 'ALL') return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  // Handle Copy Link
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Handle Copy Code
  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚀 Salut ! Découvre Dokya AI pour rédiger ton CV professionnel au format canadien/européen, optimiser tes candidatures et préparer tes entretiens RH avec l'IA.\n\nInscris-toi dès maintenant via mon lien partenaire : ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Handle Submit Payout Request
  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutFeedback(null);

    const amountNum = Number(payoutAmount);
    if (!amountNum || amountNum < 2000) {
      setPayoutFeedback({
        type: 'error',
        message: 'Le montant minimum de retrait est de 2 000 FCFA.'
      });
      return;
    }

    if (amountNum > availableBalance) {
      setPayoutFeedback({
        type: 'error',
        message: `Solde insuffisant. Vous disposez actuellement de ${availableBalance.toLocaleString('fr-FR')} FCFA disponibles.`
      });
      return;
    }

    if (!payoutPhone.trim() || payoutPhone.trim().length < 8) {
      setPayoutFeedback({
        type: 'error',
        message: 'Veuillez renseigner un numéro de téléphone mobile valide.'
      });
      return;
    }

    setPayoutSubmitting(true);
    try {
      const res = await requestAffiliatePayout(profile.uid, {
        affiliateName: profile.personalInfo?.firstName 
          ? `${profile.personalInfo.firstName} ${profile.personalInfo.lastName || ''}`.trim()
          : profile.displayName || 'Affilié Dokya',
        affiliatePhone: payoutPhone.trim(),
        network: payoutNetwork,
        phoneNumber: payoutPhone.trim(),
        amount: amountNum
      });

      if (res.success) {
        setPayoutFeedback({
          type: 'success',
          message: `Votre demande de retrait de ${amountNum.toLocaleString('fr-FR')} FCFA via ${payoutNetwork === 'wave' ? 'Wave' : 'Orange Money'} a bien été transmise ! Notre équipe effectuera le transfert sous 24h.`
        });
        setPayoutAmount('2000');
      } else {
        setPayoutFeedback({
          type: 'error',
          message: res.error || 'Une erreur est survenue lors de la soumission.'
        });
      }
    } catch (err: any) {
      setPayoutFeedback({
        type: 'error',
        message: err?.message || 'Erreur de connexion. Veuillez réessayer.'
      });
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // Quick amount select helper
  const handleQuickAmount = (amt: number) => {
    if (amt <= availableBalance) {
      setPayoutAmount(amt.toString());
    } else {
      setPayoutAmount(availableBalance.toString());
    }
  };

  // Helper to anonymize client display for privacy
  const formatClientName = (name: string, email?: string) => {
    if (name && name !== 'Client' && name !== 'Candidat') {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
      }
      return name;
    }
    if (email) {
      const [userPart] = email.split('@');
      if (userPart.length > 3) {
        return `${userPart.slice(0, 3)}***`;
      }
      return 'Client Dokya';
    }
    return 'Client Dokya';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* HEADER HERO BANNER                                                        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 border border-violet-800/40 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Programme Partenaire & Affiliation</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="text-amber-300">20% de Commission à vie</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Recommandez Dokya AI & Gagnez <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-200 bg-clip-text text-transparent">20% sur chaque vente</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Partagez votre lien d’affiliation exclusif. Dès qu'un utilisateur s'inscrit via votre recommandation et commande un document, une recharge ou un abonnement, vous recevez automatiquement <strong className="text-white">20% de commission directe</strong> retirable par <strong className="text-cyan-300">Wave</strong> ou <strong className="text-orange-300">Orange Money</strong>.
            </p>
          </div>

          {/* Quick Balance Preview Card */}
          <div className="shrink-0 bg-slate-900/90 border border-violet-500/30 rounded-2xl p-5 shadow-inner flex flex-col justify-between min-w-[220px]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              <span>Solde Retirable</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">
              {availableBalance.toLocaleString('fr-FR')} <span className="text-sm font-normal text-emerald-300">FCFA</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Retrait disponible dès <strong className="text-slate-200">2 000 FCFA</strong>
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REFERRAL LINK & CODE SHARING BAR                                          */}
        {/* ========================================================================= */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Link Container */}
            <div className="lg:col-span-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                <span className="text-xs font-black uppercase text-violet-400 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 shrink-0">
                  Lien Unique
                </span>
                <span className="text-xs sm:text-sm font-mono text-slate-200 truncate select-all">
                  {referralLink}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    copiedLink 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier le lien'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                  title="Partager sur WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Referral Code Badge */}
            <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                  Votre Code Parrain
                </p>
                <p className="text-lg font-black text-amber-400 tracking-wider font-mono">
                  {referralCode}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copié' : 'Copier code'}</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 KEY INDICATOR CARDS (KPIS)                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Filleuls Apportés */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Filleuls Apportés</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {referredCount}
          </p>
          <p className="text-[11px] text-slate-400">
            Utilisateurs inscrits avec votre lien
          </p>
        </div>

        {/* KPI 2: Commissions en Attente */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">En Attente Validation</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">
            {pendingCommissionsTotal.toLocaleString('fr-FR')} <span className="text-sm font-normal text-amber-300">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            {commissions.filter(c => c.status === 'PENDING').length} commission(s) en cours de validation
          </p>
        </div>

        {/* KPI 3: Solde Disponible pour Retrait */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-2 hover:border-emerald-500/50 transition-all shadow-sm bg-gradient-to-br from-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Solde Disponible</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            {availableBalance.toLocaleString('fr-FR')} <span className="text-sm font-normal text-emerald-300">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Prêt à être retiré vers Wave ou OM
          </p>
        </div>

        {/* KPI 4: Gains Historiques Cumulés */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Cumul des Gains</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-300">
            {approvedEarningsTotal.toLocaleString('fr-FR')} <span className="text-sm font-normal text-purple-200">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Total des commissions approuvées
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2-COLUMN SECTION: RETRAIT FORM + INFORMATIONS                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT (7 COLS): FORMULAIRE DE DEMANDE DE RETRAIT */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Demande de Retrait Mobile</h3>
              </div>
              <p className="text-xs text-slate-400">
                Transférez vos commissions directement sur votre compte Wave ou Orange Money
              </p>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sans Frais
            </span>
          </div>

          <form onSubmit={handleSubmitPayout} className="space-y-5">
            
            {/* 1. Choix du réseau */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                1. Réseau de paiement mobile :
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutNetwork('wave')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    payoutNetwork === 'wave'
                      ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-400" />
                    <div>
                      <p className="text-xs font-black">Wave</p>
                      <p className="text-[10px] text-cyan-300 font-mono">Transfert instantané</p>
                    </div>
                  </div>
                  {payoutNetwork === 'wave' && <Check className="w-4 h-4 text-cyan-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutNetwork('orange_money')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    payoutNetwork === 'orange_money'
                      ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <div>
                      <p className="text-xs font-black">Orange Money</p>
                      <p className="text-[10px] text-orange-300 font-mono">OM Sénégal / CI</p>
                    </div>
                  </div>
                  {payoutNetwork === 'orange_money' && <Check className="w-4 h-4 text-orange-400" />}
                </button>
              </div>
            </div>

            {/* 2. Numéro de téléphone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>2. Numéro de téléphone bénéficiaire :</span>
                <span className="text-[11px] text-slate-500 font-normal">Ex: 77 123 45 67</span>
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="Numéro Wave ou Orange Money"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 3. Montant à retirer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  3. Montant du retrait (FCFA) :
                </label>
                <span className="text-[11px] text-slate-400">
                  Disponible : <strong className="text-emerald-400">{availableBalance.toLocaleString('fr-FR')} FCFA</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="2000"
                  max={availableBalance > 0 ? availableBalance : 2000}
                  step="500"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Min. 2 000 FCFA"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-black text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                  FCFA
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Raccourcis:</span>
                {[2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      payoutAmount === amt.toString()
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {amt.toLocaleString('fr-FR')} F
                  </button>
                ))}
                {availableBalance >= 2000 && (
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(availableBalance.toString())}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 border border-indigo-500/30 transition-all cursor-pointer"
                  >
                    Tout ({availableBalance.toLocaleString('fr-FR')} F)
                  </button>
                )}
              </div>
            </div>

            {/* Feedback notification */}
            {payoutFeedback && (
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                payoutFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              }`}>
                {payoutFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{payoutFeedback.message}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={payoutSubmitting || availableBalance < 2000}
              className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                availableBalance >= 2000
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              {payoutSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmission de la demande...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {availableBalance >= 2000 
                      ? `Demander mon retrait de ${(Number(payoutAmount) || 0).toLocaleString('fr-FR')} FCFA`
                      : 'Solde insuffisant (Min. 2 000 FCFA)'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT (5 COLS): GUIDE & MES DEMANDES DE RETRAIT */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* How it works card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-violet-400" />
              <span>Comment fonctionne le parrainage ?</span>
            </h4>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
                  1
                </span>
                <p>
                  <strong className="text-white">Partagez votre lien :</strong> Envoyez-le à vos proches, collègues, groupes WhatsApp et réseaux sociaux.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
                  2
                </span>
                <p>
                  <strong className="text-white">Inscription automatique :</strong> Toute personne qui crée son compte via votre lien est définitivement liée à votre profil parrain.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
                  3
                </span>
                <p>
                  <strong className="text-white">20% de commission nette :</strong> À chaque recharge ou achat validé, 20% du montant payé est alloué à votre solde d'affiliation.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
                  4
                </span>
                <p>
                  <strong className="text-white">Retrait mobile facile :</strong> Dès 2 000 FCFA, demandez votre paiement direct sur votre numéro Wave ou Orange Money.
                </p>
              </div>
            </div>
          </div>

          {/* Mes Dernières Demandes de Retrait */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Mes Demandes de Retrait</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                {payoutRequests.length}
              </span>
            </div>

            {payoutRequests.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs space-y-1">
                <ArrowDownToLine className="w-6 h-6 mx-auto text-slate-600 opacity-50" />
                <p>Aucune demande de retrait effectuée pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {payoutRequests.slice(0, 5).map((req) => (
                  <div 
                    key={req.id} 
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{req.amount.toLocaleString('fr-FR')} FCFA</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                          req.network === 'wave' ? 'bg-cyan-500/20 text-cyan-300' : 'orange-500/20 text-orange-300'
                        }`}>
                          {req.network === 'wave' ? 'Wave' : 'OM'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {req.phoneNumber} • {new Date(req.requestedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {req.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Payé</span>
                        </span>
                      ) : req.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black">
                          <XCircle className="w-3 h-3" />
                          <span>Rejeté</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                          <Clock className="w-3 h-3" />
                          <span>En attente</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* TABLEAU DE SUIVI DES COMMISSIONS & DES CLIENTS PARRAINÉS                  */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-black text-white">Réseau de Parrainage & Commissions</h3>
            </div>
            <p className="text-xs text-slate-400">
              Suivez en direct vos clients inscrits, les conversions d'achat et vos commissions de 20%
            </p>
          </div>

          {/* Navigation between Filleuls & Commissions */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTableTab('referrals')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTableTab === 'referrals'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clients Parrainés ({referredUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTableTab('commissions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTableTab === 'commissions'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Commissions ({commissions.length})</span>
            </button>
          </div>
        </div>

                {/* TAB 1: CLIENTS & FILLEULS PARRAINÉS */}
        {activeTableTab === 'referrals' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white">Confidentialité protégée (Data Privacy) :</strong> Les coordonnées directes de vos filleuls sont automatiquement masquées pour respecter leur vie privée.
                </span>
              </div>
              <div className="text-slate-300 shrink-0 font-medium">
                Taux de commission : <span className="font-black text-amber-400">20% sur Pass & Documents</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Chargement de vos clients filleuls...</p>
              </div>
            ) : referredUsers.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-black text-white">
                    Aucun client inscrit pour le moment
                  </p>
                  <p className="text-xs text-slate-400">
                    Partagez votre lien ou votre code parrain <strong className="text-amber-400">{referralCode}</strong> pour commencer à toucher 20% sur tous leurs achats de Pass et Documents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier mon lien de parrainage</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Client Apporté (Info Masquée)</th>
                      <th className="py-3.5 px-4">Code Utilisé</th>
                      <th className="py-3.5 px-4">Date d'Inscription</th>
                      <th className="py-3.5 px-4">Statut de Conversion</th>
                      <th className="py-3.5 px-4">Achats Cumulés</th>
                      <th className="py-3.5 px-4 text-right">Gains Générés (20%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {referredUsers.map((user) => {
                      const isConverted = user.conversionStatus === 'converted' || user.totalSpent > 0;
                      return (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Client anonymisé */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/30">
                                {user.referredName ? user.referredName.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div>
                                <p className="font-black text-white">
                                  {maskName(user.referredName)}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {maskEmail(user.referredEmail)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Code Parrain */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                              {user.affiliateCodeUsed || referralCode}
                            </span>
                          </td>

                          {/* Date d inscription */}
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'Récemment'}
                          </td>

                          {/* Statut de conversion */}
                          <td className="py-3.5 px-4">
                            {isConverted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Converti (Achat effectué)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black">
                                <Clock className="w-3 h-3" />
                                <span>Inscrit (En attente d'achat)</span>
                              </span>
                            )}
                          </td>

                          {/* Achats Cumulés */}
                          <td className="py-3.5 px-4 text-slate-300 font-bold">
                            {user.totalSpent > 0 ? (
                              <span>{user.totalSpent.toLocaleString('fr-FR')} FCFA</span>
                            ) : (
                              <span className="text-slate-500">0 FCFA</span>
                            )}
                          </td>

                          {/* Vos Gains */}
                          <td className="py-3.5 px-4 text-right">
                            {user.commissionEarned > 0 ? (
                              <span className="font-black text-emerald-400 text-sm">
                                +{user.commissionEarned.toLocaleString('fr-FR')} FCFA
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs italic">
                                0 FCFA
                              </span>
                            )}
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

        {/* TAB 2: HISTORIQUE DES COMMISSIONS */}
        {activeTableTab === 'commissions' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-slate-400">Filtrer par statut de commission :</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === 'ALL' ? 'Toutes' : st === 'PENDING' ? 'En attente' : st === 'APPROVED' ? 'Approuvées' : 'Rejetées'}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 space-y-2">
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Chargement de vos commissions...</p>
              </div>
            ) : filteredCommissions.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                  <Coins className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-black text-white">
                    {statusFilter === 'ALL' 
                      ? 'Aucune commission enregistrée pour le moment' 
                      : `Aucune commission avec le statut « ${statusFilter} »`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dès qu'un de vos filleuls achète un service sur Dokya AI, votre commission de 20% apparaîtra ici.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier mon lien de parrainage</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Client Apporté</th>
                      <th className="py-3.5 px-4">Service Acheté</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Montant Total</th>
                      <th className="py-3.5 px-4">Votre Commission (20%)</th>
                      <th className="py-3.5 px-4 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredCommissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-slate-800/40 transition-colors">
                        
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                              {comm.referredUserName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white">
                                {formatClientName(comm.referredUserName)}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ID: {comm.id.slice(0, 14)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {comm.serviceTitle || 'Achat Dokya AI'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(comm.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 font-bold">
                          {comm.totalAmount.toLocaleString('fr-FR')} FCFA
                        </td>

                        <td className="py-3.5 px-4 font-black text-emerald-400">
                          +{comm.affiliateCommission.toLocaleString('fr-FR')} FCFA
                        </td>

                        <td className="py-3.5 px-4 text-right">
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

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
