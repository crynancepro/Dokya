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
    const currentUid = (userId && !userId.startsWith('guest')) ? userId : auth.currentUser?.uid;
    if (!isOpen || !currentUid || currentUid.startsWith('guest')) return;

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

  // 2. SOUMISSION DU PAIEMENT EN LIGNE (Money Fusion Exclusif)
  const handleCheckoutSubmit = async () => {
    setIsPaymentLoading(true);
    setErrorMessage(null);

    try {
      const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
      const currentUserName = (userName || auth.currentUser?.displayName || 'Client Dokya').trim();
      const user = auth.currentUser;

      // Requête POST vers le backend local /api/moneyfusion/checkout
      const isSubFormula = selectedFormula.id === 'vip_career' || selectedFormula.id === 'business';
      const checkoutType = isSubFormula ? 'subscription' : 'document';
      const checkoutPlanId = selectedFormula.id === 'vip_career' ? 'PASS_VIP' : (selectedFormula.id === 'business' ? 'PASS_BUSINESS' : '');
      const checkoutDocId = selectedFormula.id === 'single' ? (targetDocId || '') : '';

      const response = await fetch('/api/moneyfusion/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedFormula.price || 3000,
          docId: checkoutDocId,
          planId: checkoutPlanId,
          type: checkoutType,
          userId: user?.uid || currentUid,
          userPhone: (user as any)?.phoneNumber || '',
          userName: user?.displayName || currentUserName
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
    } catch (err: any) {
      console.error('[Money Fusion Checkout Error]:', err);
      setErrorMessage(err.message || 'Impossible de se connecter à la passerelle Money Fusion.');
    } finally {
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Paiement Sécurisé Money Fusion</span>
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
                      Solde insuffisant • Utilisez le paiement instantané Money Fusion ci-dessous
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

                {/* PASSERELLE UNIQUE : Money Fusion */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Passerelle de paiement sécurisée</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-bold">100% Sécurisé & Automatisé</span>
                  </div>

                  <div className="p-4 rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-white">Money Fusion • Mobile Money & QR Code</span>
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Paiement rapide et déblocage instantané via votre compte Mobile Money ou par scan direct de code QR.
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-medium">🌊 Wave</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/60 font-medium">🍊 Orange Money</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800/60 font-medium">🟡 MTN / Moov</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-medium">📱 QR Code Express</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Action Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/30 border border-slate-800 space-y-4 shadow-xl">
                  
                  {/* Récapitulatif dynamique de la sélection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400">Formule : </span>
                      <strong className="text-white font-bold">{selectedFormula.title}</strong>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span className="text-slate-400">Passerelle : </span>
                      <strong className="text-blue-400 font-bold">
                        Money Fusion (Mobile & QR)
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Total à régler :</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {selectedFormula.priceFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Bouton d'action principal dynamique Money Fusion */}
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    disabled={isPaymentLoading}
                    className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-blue-600/25"
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span>Redirection vers Money Fusion en cours...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5 text-white" />
                        <span>Payer via Money Fusion ({selectedFormula.priceFormatted})</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-white" />
                      </>
                    )}
                  </button>

                  {/* Badges & Description Money Fusion */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                      Paiement instantané 100% automatisé via la passerelle certifiée <strong>Money Fusion</strong> (Mobile Money & QR Code). Votre document est débloqué automatiquement dès validation sans envoi de capture.
                    </p>
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
              Passerelle Agréée Money Fusion • Chiffrement SSL 256-bit
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

