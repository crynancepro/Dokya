import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Wallet, 
  Crown, 
  Sparkles, 
  ArrowRight, 
  Download, 
  Phone, 
  RefreshCw, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  Eye, 
  FileCheck,
  RotateCcw,
  Zap,
  Tag,
  CreditCard,
  ChevronRight,
  Info
} from 'lucide-react';
import { TransactionRecord, SavedUserDocument, CandidateProfile, InterviewPrepData } from '../types';
import { BENEFICIARY_PHONE, BENEFICIARY_NAME } from './DokyaPaymentModal';

interface OrdersTrackingViewProps {
  transactions: TransactionRecord[];
  documents: SavedUserDocument[];
  profile: CandidateProfile;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenDocumentPreview?: (doc: SavedUserDocument) => void;
  onOpenInterviewPrep?: (prepData: InterviewPrepData) => void;
  onOpenRechargeModal?: () => void;
  onSelectService?: (service: 'cv' | 'letter' | 'devis' | 'facture' | 'ebook') => void;
  onDirectExportPDF?: (doc: SavedUserDocument) => void;
  onDirectExportDocx?: (doc: SavedUserDocument) => void;
}

export const OrdersTrackingView: React.FC<OrdersTrackingViewProps> = ({
  transactions,
  documents,
  profile,
  onRefresh,
  isLoading = false,
  onOpenDocumentPreview,
  onOpenInterviewPrep,
  onOpenRechargeModal,
  onSelectService,
  onDirectExportPDF,
  onDirectExportDocx
}) => {
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'recharge' | 'subscription'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize status helper
  const getNormalizedStatus = (tx: TransactionRecord): 'completed' | 'pending' | 'rejected' => {
    const s = (tx.status || '').toUpperCase();
    const aiS = (tx.aiStatus || '').toUpperCase();

    if (
      s === 'COMPLETED' || 
      s === 'APPROVED' || 
      s === 'SUCCESS' || 
      s === 'MANUALLY_VALIDATED' || 
      s === 'VALIDATED_BY_AI' || 
      s === 'ACTIVE' ||
      aiS === 'MANUALLY_VALIDATED' || 
      aiS === 'VALIDATED_BY_AI' || 
      aiS === 'COMPLETED'
    ) {
      return 'completed';
    }

    if (
      s === 'REJECTED' || 
      s === 'REJECTED_BY_ADMIN' || 
      s === 'REJECTED_BY_AI' || 
      s === 'FAILED' || 
      s === 'CANCEL' || 
      s === 'CANCELLED' ||
      aiS === 'REJECTED_BY_ADMIN' || 
      aiS === 'REJECTED_BY_AI'
    ) {
      return 'rejected';
    }

    return 'pending';
  };

  // Helper to determine transaction category
  const getTransactionCategory = (tx: TransactionRecord): 'direct' | 'recharge' | 'subscription' => {
    const t = (tx.type || '').toUpperCase();
    if (t === 'WALLET_RECHARGE' || t === 'RECHARGE') return 'recharge';
    if (t === 'SUBSCRIPTION_PURCHASE' || (tx.purpose && tx.purpose.includes('subscription')) || (tx.documentTitle && tx.documentTitle.toLowerCase().includes('pass vip'))) {
      return 'subscription';
    }
    return 'direct';
  };

  // Match corresponding saved document if available
  const findMatchingDocument = (tx: TransactionRecord): SavedUserDocument | undefined => {
    if (tx.targetDocId) {
      const match = documents.find(d => d.id === tx.targetDocId);
      if (match) return match;
    }
    if (tx.unlockedDocId) {
      const match = documents.find(d => d.id === tx.unlockedDocId);
      if (match) return match;
    }
    if (tx.documentTitle) {
      const match = documents.find(d => d.title?.toLowerCase() === tx.documentTitle?.toLowerCase());
      if (match) return match;
    }
    return undefined;
  };

  // Filtered & Searched transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const normStatus = getNormalizedStatus(tx);
      const cat = getTransactionCategory(tx);

      // Filter by type
      if (filterType !== 'all' && cat !== filterType) return false;

      // Filter by status
      if (filterStatus !== 'all' && normStatus !== filterStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (tx.documentTitle || tx.description || '').toLowerCase();
        const ref = (tx.transactionReference || tx.transactionId || tx.id || '').toLowerCase();
        const method = (tx.paymentMethod || '').toLowerCase();
        if (!title.includes(query) && !ref.includes(query) && !method.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filterType, filterStatus, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let pendingCount = 0;
    let completedDocsCount = 0;
    let totalRechargeSum = 0;

    transactions.forEach(tx => {
      const status = getNormalizedStatus(tx);
      const cat = getTransactionCategory(tx);

      if (status === 'pending') {
        pendingCount += 1;
      } else if (status === 'completed') {
        if (cat === 'direct') completedDocsCount += 1;
        if (cat === 'recharge') totalRechargeSum += Math.abs(tx.amount || tx.expectedAmount || 0);
      }
    });

    return {
      total: transactions.length,
      pendingCount,
      completedDocsCount,
      totalRechargeSum
    };
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. HEADER & REASSURANCE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Receipt className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Synchronisation en Temps Réel</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Mes Commandes & Suivi des Paiements
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Consultez l'historique complet de vos achats, suivez la validation de vos reçus en direct et accédez instantanément à vos documents débloqués.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>Actualiser</span>
              </button>
            )}

            {onOpenRechargeModal && (
              <button
                type="button"
                onClick={onOpenRechargeModal}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Recharger Solde</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative Note */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-300 font-semibold">Conseil pratique :</strong> Si vous avez fermé le guichet de paiement pendant le compte à rebours, votre reçu est bien enregistré. Dès validation par l'équipe ou l'IA, le bouton <span className="text-emerald-400 font-bold">« Télécharger / Ouvrir »</span> apparaîtra automatiquement ici !
          </p>
        </div>
      </div>

      {/* 2. STATS KPI OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Orders */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Opérations</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white font-mono">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-400">Toutes catégories confondues</p>
        </div>

        {/* Validated Documents */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Docs Achetés & Débloqués</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {stats.completedDocsCount}
          </p>
          <p className="text-[11px] text-slate-400">Téléchargeables à vie</p>
        </div>

        {/* Pending Validations */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md relative overflow-hidden">
          {stats.pendingCount > 0 && (
            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 animate-ping m-3" />
          )}
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>En attente de validation</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
            {stats.pendingCount}
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.pendingCount > 0 ? 'Traitement en cours...' : 'Aucun reçu en attente'}
          </p>
        </div>

        {/* Available Wallet Balance */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Solde Dokya Wallet</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
            {(profile.balance ?? 0).toLocaleString('fr-FR')} <span className="text-xs text-emerald-400 font-normal">FCFA</span>
          </p>
          <p className="text-[11px] text-slate-400">Prêt pour génération 1-Clic</p>
        </div>

      </div>

      {/* 3. SEARCH & FILTER TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        
        {/* Type Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Toutes les opérations ({transactions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('direct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'direct'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Achats Documents</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('recharge')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'recharge'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recharges Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('subscription')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'subscription'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Pass VIP</span>
            </button>
          </div>

          {/* Status Sub-Filters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>En attente</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Validés</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Rejetés</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre de document, référence de transaction, moyen de paiement..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
            >
              Effacer
            </button>
          )}
        </div>

      </div>

      {/* 4. TRANSACTION LIST */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Receipt className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Aucune commande trouvée</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? "Aucune opération ne correspond à vos critères de recherche actuels."
                  : "Vous n'avez pas encore effectué d'achat ou de recharge sur la plateforme Dokya."}
              </p>
            </div>
            {onSelectService && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onSelectService('cv')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Créer un CV ATS Professionnel →
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const status = getNormalizedStatus(tx);
            const category = getTransactionCategory(tx);
            const matchingDoc = findMatchingDocument(tx);
            const amountVal = Math.abs(tx.amount || tx.expectedAmount || 0);

            return (
              <div 
                key={tx.id || tx.transactionReference || Math.random().toString()}
                className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all shadow-xl space-y-4 ${
                  status === 'pending'
                    ? 'border-amber-500/40 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 shadow-amber-500/5'
                    : status === 'completed'
                      ? 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850'
                      : 'border-rose-500/30 bg-rose-950/10'
                }`}
              >
                {/* Top Row: Category Pill, Date & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Category Badge */}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                      category === 'direct'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : category === 'subscription'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {category === 'direct' ? <FileText className="w-3 h-3 text-blue-400" /> : category === 'subscription' ? <Crown className="w-3 h-3 text-amber-400" /> : <Wallet className="w-3 h-3 text-emerald-400" />}
                      <span>
                        {category === 'direct' ? 'Achat Document Direct' : category === 'subscription' ? 'Abonnement Pass VIP' : 'Recharge Dokya Wallet'}
                      </span>
                    </span>

                    {/* Payment Method Badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {tx.paymentMethod === 'wave' ? 'Wave Mobile' : tx.paymentMethod === 'orange_money' ? 'Orange Money' : tx.paymentMethod === 'card' ? 'Carte Bancaire' : 'Solde Wallet'}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {status === 'pending' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>En attente de validation</span>
                      </div>
                    )}

                    {status === 'completed' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Validé & Débloqué</span>
                      </div>
                    )}

                    {status === 'rejected' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Paiement Non Validé</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Row: Title, Description, Reference, Price */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>{tx.documentTitle || tx.description || 'Commande Dokya'}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500">Réf :</span>
                        <strong className="font-mono text-slate-300">{tx.transactionReference || tx.transactionId || tx.id}</strong>
                      </span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {tx.senderPhone && (
                        <>
                          <span>•</span>
                          <span>Tél : {tx.senderPhone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-white font-mono">
                      {amountVal.toLocaleString('fr-FR')} <span className="text-xs text-emerald-400 font-sans">FCFA</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {category === 'recharge' ? 'Crédit Solde' : 'Tarif Net'}
                    </p>
                  </div>
                </div>

                {/* Rejection Note if Rejected */}
                {status === 'rejected' && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-rose-300">Motif du refus :</strong>{' '}
                      {tx.rejectionReason || "Le reçu n'a pas pu être certifié ou les informations de transfert ne correspondent pas."}
                    </div>
                  </div>
                )}

                {/* Pending Reassurance while waiting */}
                {status === 'pending' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div>
                      <p>
                        <strong className="text-amber-300">Traitement en cours :</strong> Notre système IA et notre équipe contrôlent actuellement votre reçu. Ce statut passera automatiquement à <span className="text-emerald-400 font-bold">« Validé »</span> sous 2 minutes !
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Row: Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Left Action Indicators */}
                  <div className="text-xs text-slate-400">
                    {status === 'completed' && category === 'direct' && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Document débloqué et prêt pour téléchargement</span>
                      </span>
                    )}
                    {status === 'completed' && category === 'recharge' && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solde Dokya Wallet crédité</span>
                      </span>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* WhatsApp Support Assistance (Always available, especially useful when pending or rejected) */}
                    <a
                      href={`https://wa.me/221789619088?text=${encodeURIComponent(`Bonjour Dokya, concernant ma commande ${tx.transactionReference || tx.transactionId || tx.id} de ${amountVal} FCFA pour ${tx.documentTitle || tx.description || 'mon document'}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Contacter le support client Dokya"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Support WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>

                    {/* COMPLETED DIRECT PURCHASE ACTIONS */}
                    {status === 'completed' && category === 'direct' && (
                      <>
                        {matchingDoc ? (
                          <>
                            {onOpenDocumentPreview && (
                              <button
                                type="button"
                                onClick={() => onOpenDocumentPreview(matchingDoc)}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Aperçu</span>
                              </button>
                            )}

                            {onDirectExportPDF && (
                              <button
                                type="button"
                                onClick={() => onDirectExportPDF(matchingDoc)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Télécharger PDF</span>
                              </button>
                            )}

                            {onDirectExportDocx && (
                              <button
                                type="button"
                                onClick={() => onDirectExportDocx(matchingDoc)}
                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Word (.docx)</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Déblocage actif dans votre espace</span>
                          </div>
                        )}

                        {/* Interview Prep button if applicable */}
                        {onOpenInterviewPrep && matchingDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              const prepData: InterviewPrepData = matchingDoc.interviewPrepData || {
                                id: `PREP-${matchingDoc.id}`,
                                candidateName: `${matchingDoc.formData?.personalInfo?.firstName || ''} ${matchingDoc.formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat Pro',
                                targetJob: matchingDoc.formData?.personalInfo?.targetJob || 'Poste Cible',
                                targetCompany: matchingDoc.formData?.targetCompany || '',
                                createdAt: matchingDoc.createdAt,
                                pitch2Min: {
                                  hook: `Madame, Monsieur, fort d'un parcours dynamique en tant que ${matchingDoc.formData?.personalInfo?.targetJob || 'professionnel'}, j'ai développé une solide expertise technique.`,
                                  careerHighlights: `Au fil de mes expériences, j'ai piloté des missions stratégiques et optimisé des processus clés.`,
                                  valueProposition: `Aujourd'hui, je souhaite mettre ma rigueur et mes compétences au service de votre croissance.`,
                                  fullText: `Bonjour, je suis ${matchingDoc.formData?.personalInfo?.firstName || 'Candidat'} ${matchingDoc.formData?.personalInfo?.lastName || ''}. Passionné par le domaine de ${matchingDoc.formData?.personalInfo?.targetJob || 'mon secteur'}, j'ai consolidé une expertise reconnue.`
                                },
                                questions: [],
                                behavioralTips: [],
                                suggestedQuestionsToAskRecruiter: []
                              };
                              onOpenInterviewPrep(prepData);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Préparer Entretien RH</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* REJECTED RETRY BUTTON */}
                    {status === 'rejected' && onOpenRechargeModal && (
                      <button
                        type="button"
                        onClick={onOpenRechargeModal}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Soumettre un nouveau reçu</span>
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
