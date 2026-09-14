import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Crown, Briefcase, Zap, CheckCircle2, ShieldCheck, 
  Check, Loader2, Sparkles, AlertCircle, Star, Lock,
  CreditCard, ArrowRight, Smartphone, QrCode
} from 'lucide-react';
import { 
  recordTransactionEverywhere, 
  subscribeToUserProfile,
  auth
} from '../lib/firebase';
import { TransactionRecord } from '../types';

export type PaywallFormulaId = 'single' | 'vip_career' | 'business';

export interface PaywallFormula {
  id: PaywallFormulaId;
  title: string;
  subtitle: string;
  price: number;
  priceFormatted: string;
  badge?: string;
  badgeColor?: string;
  icon: any;
  popular?: boolean;
  features: string[];
  ctaLabel: string;
}

export const PAYWALL_FORMULAS: PaywallFormula[] = [
  {
    id: 'single',
    title: "Paiement à l'acte",
    subtitle: "Déblocage immédiat de votre document actif",
    price: 1000,
    priceFormatted: "1 000 F CFA",
    icon: Zap,
    features: [
      "Téléchargement immédiat du document en cours",
      "Formats haute résolution PDF & Word (.docx) éditables",
      "Sans filigrane, mise en page vectorielle A4",
      "Conservation & archivage permanent dans votre espace"
    ],
    ctaLabel: "Paiement à l'acte (1 000 F)"
  },
  {
    id: 'vip_career',
    title: "Pass VIP Carrière",
    subtitle: "Accès illimité pour booster vos recrutements",
    price: 2500,
    priceFormatted: "2 500 F CFA",
    badge: "Populaire Candidats 🔥",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    popular: true,
    icon: Crown,
    features: [
      "Tous les modèles de CV professionnels certifiés ATS",
      "Génération illimitée de lettres de motivation",
      "Simulateur & Coaching d'Entretien RH par IA",
      "Téléchargements illimités PDF & Word pendant 30 jours",
      "Assistance prioritaire Dokya Carrière"
    ],
    ctaLabel: "Pass VIP Carrière (2 500 F)"
  },
  {
    id: 'business',
    title: "Pass Business",
    subtitle: "Facturation pro & gestion commerciale complète",
    price: 5000,
    priceFormatted: "5 000 F CFA",
    badge: "Entreprises & Freelances 💼",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: Briefcase,
    features: [
      "Factures & Devis illimités conformes normes OHADA / UEMOA",
      "Partage direct WhatsApp 1-Clic et relances clients",
      "Suivi des encaissements, créances et états de compte",
      "Comprend tout le Pass VIP Carrière (CV + Lettres)",
      "Multi-entreprises & mentions légales professionnelles"
    ],
    ctaLabel: "Pass Business (5 000 F)"
  }
];

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  documentTypeLabel?: string;
  targetDocId?: string;
  targetFormat?: 'pdf' | 'docx';
  userBalance?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  onUnlocked: () => void;
  onDownloadAction?: (format: 'pdf' | 'docx') => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  documentTitle = 'Document Professionnel',
  documentTypeLabel = 'Document',
  targetDocId,
  targetFormat = 'pdf',
  userBalance = 0,
  userId,
  userEmail,
  userName,
  onUnlocked,
  onDownloadAction,
  onBalanceUpdated
}) => {
  // Selected formula (1 000 F, 2 500 F, or 5 000 F XOF)
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallFormulaId>('single');
  const selectedFormula = PAYWALL_FORMULAS.find(f => f.id === selectedPlanId) || PAYWALL_FORMULAS[0];

  // Selected payment gateway : GeniusPay ou Money Fusion
  const [selectedGateway, setSelectedGateway] = useState<'geniuspay' | 'moneyfusion'>('geniuspay');

  // Loading & error states
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  const userProfileUnsubRef = useRef<(() => void) | null>(null);

  // Reset states on opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsApproved(false);
      setIsPaymentLoading(false);
      setIsPayingWithWallet(false);
    } else {
      if (userProfileUnsubRef.current) {
        userProfileUnsubRef.current();
        userProfileUnsubRef.current = null;
      }
    }
  }, [isOpen]);

  // Listen to profile updates (e.g. if user is credited or unlocked in background)
  useEffect(() => {
    const currentUid = (userId && userId !== 'guest') ? userId : auth.currentUser?.uid;
    if (!isOpen || !currentUid || currentUid === 'guest') return;

    userProfileUnsubRef.current = subscribeToUserProfile(currentUid, (profileData) => {
      const subStatus = (profileData.subscription?.status || (profileData as any).subscriptionStatus || '').toUpperCase();
      const isVip = subStatus === 'ACTIVE' || subStatus === 'APPROVED' || (profileData as any).subscriptionStatus === 'unlimited';
      const isDocPurchased = targetDocId && Array.isArray((profileData as any).purchasedDocIds) && (profileData as any).purchasedDocIds.includes(targetDocId);

      if (isVip || isDocPurchased) {
        triggerUnlockSuccess();
      }
    });

    return () => {
      if (userProfileUnsubRef.current) {
        userProfileUnsubRef.current();
        userProfileUnsubRef.current = null;
      }
    };
  }, [isOpen, userId, targetDocId]);

  // Trigger unlock when approved
  const triggerUnlockSuccess = () => {
    setIsApproved(true);
    setTimeout(() => {
      onUnlocked();
      if (onDownloadAction && targetFormat) {
        onDownloadAction(targetFormat);
      }
      onClose();
    }, 1800);
  };

  // 1. Pay with wallet balance if sufficient
  const handlePayWithWallet = async () => {
    if (userBalance < selectedFormula.price) {
      setErrorMessage(`Votre solde (${userBalance.toLocaleString('fr-FR')} F CFA) est insuffisant pour cette formule.`);
      return;
    }

    setIsPayingWithWallet(true);
    setErrorMessage(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const txId = `TX-WALLET-${Date.now()}`;

    try {
      const tx: TransactionRecord = {
        id: txId,
        transactionId: txId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: selectedFormula.id === 'single' ? 'DIRECT_PURCHASE' : 'PASS_VIP',
        amount: -selectedFormula.price,
        expectedAmount: selectedFormula.price,
        currency: 'FCFA',
        description: `Règlement ${selectedFormula.title} (Débit solde)`,
        status: 'APPROVED',
        aiStatus: 'COMPLETED',
        paymentMethod: 'wallet',
        targetDocId: targetDocId,
        unlockedDocId: targetDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      const newBal = Math.max(0, userBalance - selectedFormula.price);
      if (onBalanceUpdated) {
        onBalanceUpdated(newBal);
      }

      triggerUnlockSuccess();
    } catch (err: any) {
      console.error('[Wallet Pay Error]:', err);
      setErrorMessage("Une erreur est survenue lors du débit du solde. Veuillez réessayer.");
    } finally {
      setIsPayingWithWallet(false);
    }
  };

  // 2. SOUMISSION DU PAIEMENT EN LIGNE (GeniusPay ou Money Fusion)
  const handleCheckoutSubmit = async () => {
    setIsPaymentLoading(true);
    setErrorMessage(null);

    try {
      const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'anonymous');
      const currentUserEmail = (userEmail || auth.currentUser?.email || 'client@dokya.com').trim();
      const currentUserName = (userName || auth.currentUser?.displayName || 'Client Dokya').trim();

      // Description adaptée dynamiquement à la formule
      let description = `Paiement à l'acte - ${documentTitle || 'Déblocage de document'}`;
      if (selectedFormula.id === 'vip_career') {
        description = `Pass VIP Carrière (30 jours) - Dokya Carrière`;
      } else if (selectedFormula.id === 'business') {
        description = `Pass Business (30 jours) - Facturation & Gestion Pro`;
      }

      let checkoutUrl: string | null = null;

      if (selectedGateway === 'moneyfusion') {
        const user = auth.currentUser;
        // Requête POST vers le backend local /api/moneyfusion/checkout
        const response = await fetch('/api/moneyfusion/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedFormula.price || 3000,
            docId: targetDocId || '',
            userId: user?.uid || currentUid || '',
            userPhone: (user as any)?.phoneNumber || '',
            userName: user?.displayName || currentUserName || ''
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Erreur lors de la création de la session de paiement Money Fusion.');
        }

        // Redirection vers la propriété 'url' renvoyée par le backend
        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error("L'URL de paiement retournée par Money Fusion est indisponible.");
        }
      } else {
        // Appelle /api/geniuspay/checkout
        const response = await fetch('/api/geniuspay/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedFormula.price,
            currency: 'XOF',
            description,
            customer: {
              name: currentUserName,
              email: currentUserEmail,
              phone: '+221770000000'
            },
            redirect_url: `${window.location.origin}/dashboard?payment=success`,
            cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
            success_url: `${window.location.origin}/dashboard?payment=success`,
            error_url: `${window.location.origin}/dashboard?payment=cancelled`,
            return_url: `${window.location.origin}/dashboard?payment=success`,
            metadata: {
              userId: currentUid,
              planType: selectedFormula.id,
              targetDocId: targetDocId || '',
              documentTitle: documentTitle || '',
              source: 'paywall_modal'
            }
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la création de la session de paiement GeniusPay.');
        }

        // Redirige l'utilisateur vers la propriété 'url' renvoyée par l'API choisie
        checkoutUrl = data.url || data.checkout_url || data.checkoutUrl;
      }

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("L'URL de paiement retournée par la passerelle est indisponible.");
      }
    } catch (err: any) {
      console.error('[Payment Checkout Error]:', err);
      setErrorMessage(err.message || 'Impossible de joindre la passerelle choisie. Veuillez réessayer.');
      setIsPaymentLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Débloquer mon Document
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {selectedGateway === 'geniuspay' ? 'Paiement Sécurisé GeniusPay' : 'Paiement Sécurisé Money Fusion'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md sm:max-w-lg">
                {documentTitle} ({documentTypeLabel}) • Export HD sans filigrane
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* APPROVED STATE SUCCESS BANNER */}
          {isApproved ? (
            <div className="p-8 text-center space-y-4 bg-emerald-950/40 border border-emerald-500/40 rounded-3xl animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-black text-white">Paiement Validé & Approuvé !</h4>
                <p className="text-sm text-emerald-200 mt-1">
                  Votre document est débloqué. Le téléchargement {targetFormat.toUpperCase()} démarre automatiquement...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Génération du fichier haute définition en cours...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Solde Portefeuille Information Bar (si le candidat dispose de crédits) */}
              {userBalance > 0 && (
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Votre Solde Portefeuille :</span>
                      <p className="text-sm font-black text-white font-mono">{userBalance.toLocaleString('fr-FR')} F CFA</p>
                    </div>
                  </div>

                  {userBalance >= selectedFormula.price ? (
                    <button
                      type="button"
                      onClick={handlePayWithWallet}
                      disabled={isPayingWithWallet}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isPayingWithWallet ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Débit du solde...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Payer avec mon solde ({selectedFormula.priceFormatted})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 sm:text-right">
                      Solde insuffisant • Utilisez le paiement instantané GeniusPay ci-dessous
                    </span>
                  )}
                </div>
              )}

              {/* LES 3 FORMULES : SÉLECTION DYNAMIQUE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Choisissez votre formule</span>
                  </label>
                  <span className="text-[11px] text-slate-400">3 options sans engagement</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {PAYWALL_FORMULAS.map((formula) => {
                    const isSelected = selectedPlanId === formula.id;
                    const Icon = formula.icon;

                    return (
                      <div
                        key={formula.id}
                        onClick={() => setSelectedPlanId(formula.id)}
                        className={`relative rounded-2xl p-4 transition-all cursor-pointer border flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {formula.badge && (
                          <span className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-sm ${formula.badgeColor}`}>
                            {formula.badge}
                          </span>
                        )}

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-white">{formula.title}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{formula.subtitle}</p>
                          </div>

                          <div className="pt-1">
                            <span className="text-lg font-black text-white font-mono">{formula.priceFormatted}</span>
                            {formula.id !== 'single' && (
                              <span className="text-[10px] text-slate-400 ml-1">/ 30 jours</span>
                            )}
                          </div>

                          <ul className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                            {formula.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHOIX DU MOYEN DE PAIEMENT DANS LE MODAL : Passerelle 1 vs Passerelle 2 */}
              <div className="pt-2 space-y-4">
                
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* SÉLECTEUR D'ONGLETS / BOUTONS : PASSERELLE 1 (GeniusPay) & PASSERELLE 2 (Money Fusion) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Choisissez votre passerelle de paiement</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-bold">100% Sécurisé & Automatisé</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Passerelle 1 : GeniusPay (Mobile Money & Carte) */}
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('geniuspay')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                        selectedGateway === 'geniuspay'
                          ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedGateway === 'geniuspay' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-white">Passerelle 1 : GeniusPay</span>
                          {selectedGateway === 'geniuspay' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                          Mobile Money & Carte
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">🌊 Wave</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/60">🍊 Orange</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800/60">🟡 MTN/Moov</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">💳 Carte</span>
                        </div>
                      </div>
                    </button>

                    {/* Passerelle 2 : Money Fusion (Mobile Money & QR Code) */}
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('moneyfusion')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                        selectedGateway === 'moneyfusion'
                          ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedGateway === 'moneyfusion' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-white">Passerelle 2 : Money Fusion</span>
                          {selectedGateway === 'moneyfusion' && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                          Mobile Money & QR Code
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">📷 QR Code</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">🌊 Wave</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/60">🍊 Orange</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">🟣 Moov</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main Action Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 space-y-4 shadow-xl">
                  
                  {/* Récapitulatif dynamique de la sélection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400">Formule : </span>
                      <strong className="text-white font-bold">{selectedFormula.title}</strong>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span className="text-slate-400">Passerelle : </span>
                      <strong className={selectedGateway === 'geniuspay' ? 'text-emerald-400 font-bold' : 'text-indigo-400 font-bold'}>
                        {selectedGateway === 'geniuspay' ? 'GeniusPay (Mobile & Carte)' : 'Money Fusion (Mobile & QR)'}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Total à régler :</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {selectedFormula.priceFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Bouton d'action principal dynamique (GeniusPay ou Money Fusion) */}
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    disabled={isPaymentLoading}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group ${
                      selectedGateway === 'geniuspay'
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25'
                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-indigo-500/25'
                    }`}
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className={`w-5 h-5 animate-spin ${selectedGateway === 'geniuspay' ? 'text-slate-950' : 'text-white'}`} />
                        <span>
                          {selectedGateway === 'geniuspay' 
                            ? 'Redirection vers GeniusPay en cours...' 
                            : 'Redirection vers Money Fusion en cours...'
                          }
                        </span>
                      </>
                    ) : (
                      <>
                        {selectedGateway === 'geniuspay' ? (
                          <ShieldCheck className="w-5 h-5 text-slate-950" />
                        ) : (
                          <QrCode className="w-5 h-5 text-white" />
                        )}
                        <span>
                          {selectedGateway === 'geniuspay'
                            ? `Payer via GeniusPay (${selectedFormula.priceFormatted})`
                            : `Payer via Money Fusion (${selectedFormula.priceFormatted})`
                          }
                        </span>
                        <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${selectedGateway === 'geniuspay' ? 'text-slate-950' : 'text-white'}`} />
                      </>
                    )}
                  </button>

                  {/* Badges & Description dynamique de la passerelle sélectionnée */}
                  <div className="space-y-2 pt-1">
                    {selectedGateway === 'geniuspay' ? (
                      <>
                        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 font-medium text-[11px]">
                            🌊 Wave
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-orange-300 font-medium text-[11px]">
                            📱 Orange Money
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-yellow-300 font-medium text-[11px]">
                            🟡 MTN / Moov
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-medium text-[11px]">
                            💳 Carte Bancaire
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                          Paiement instantané 100% automatisé via la passerelle certifiée <strong>GeniusPay</strong>. Votre document est débloqué automatiquement sans envoi de capture.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300 font-medium text-[11px]">
                            📷 QR Code Express
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 font-medium text-[11px]">
                            🌊 Wave Mobile
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-orange-300 font-medium text-[11px]">
                            📱 Orange Money
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 font-medium text-[11px]">
                            🟣 Moov Money
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                          Paiement alternatif instantané via la passerelle certifiée <strong>Money Fusion</strong> (Mobile Money & QR Code). Déblocage automatisé dès validation.
                        </p>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">
              {selectedGateway === 'geniuspay'
                ? 'Passerelle Agréée GeniusPay • Chiffrement SSL 256-bit'
                : 'Passerelle Agréée Money Fusion • Chiffrement SSL 256-bit'
              }
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
};

