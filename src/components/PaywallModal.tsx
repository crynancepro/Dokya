import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, Crown, Briefcase, Zap, CheckCircle2, ShieldCheck, 
  Check, Loader2, Sparkles, AlertCircle, Star, Lock,
  CreditCard, ArrowRight, Smartphone, QrCode, Tag, Gift, Trash2
} from 'lucide-react';
import { 
  recordTransactionEverywhere, 
  subscribeToUserProfile,
  auth,
  db,
  doc,
  setDoc
} from '../lib/firebase';
import { TransactionRecord } from '../types';
import { usePricing } from '../contexts/PricingContext';

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
  onOpenRechargeModal?: () => void;
  onDownloadAction?: (format: 'pdf' | 'docx') => void;
  onBalanceUpdated?: (newBalance: number) => void;
  documentData?: any;
  contentData?: any;
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
  onOpenRechargeModal,
  onDownloadAction,
  onBalanceUpdated,
  documentData,
  contentData
}) => {
  // Selected formula (1 000 F, 2 500 F, or 5 000 F XOF)
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallFormulaId>('single');
  const selectedFormula = PAYWALL_FORMULAS.find(f => f.id === selectedPlanId) || PAYWALL_FORMULAS[0];

  // Loading & error states
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // Promo code integration
  const { validatePromoCode, appliedGlobalPromo, setAppliedGlobalPromo } = usePricing();
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    message: string;
    discountLabel: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Price calculations with promo
  const basePrice = selectedFormula.price;
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      promoDiscount = appliedPromo.discountValue >= 100 
        ? basePrice 
        : Math.round((basePrice * appliedPromo.discountValue) / 100);
    } else {
      promoDiscount = Math.min(basePrice, appliedPromo.discountValue);
    }
  }
  const payablePrice = Math.max(0, basePrice - promoDiscount);
  const isFreeWithPromo = Boolean(appliedPromo && payablePrice === 0);

  const userProfileUnsubRef = useRef<(() => void) | null>(null);

  // Reset states on opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsApproved(false);
      setIsPaymentLoading(false);
      setIsPayingWithWallet(false);
      if (appliedGlobalPromo && !appliedPromo) {
        handleApplyPromo(appliedGlobalPromo.code);
      }
    } else {
      if (userProfileUnsubRef.current) {
        userProfileUnsubRef.current();
        userProfileUnsubRef.current = null;
      }
    }
  }, [isOpen]);

  const handleApplyPromo = async (codeToUse?: string) => {
    const cleanCode = (codeToUse || promoInput).trim().toUpperCase();
    if (!cleanCode) return;
    setIsCheckingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await validatePromoCode(cleanCode, basePrice, documentTitle);
      if (res.valid) {
        let discAmount = 0;
        if (res.discountType === 'percentage') {
          discAmount = res.discountValue >= 100 ? basePrice : Math.round((basePrice * res.discountValue) / 100);
        } else {
          discAmount = Math.min(basePrice, res.discountValue);
        }
        const finalAmt = Math.max(0, basePrice - discAmount);
        const promoData = {
          code: res.code || cleanCode,
          discountType: res.discountType,
          discountValue: res.discountValue,
          discountAmount: discAmount,
          finalAmount: finalAmt,
          isFree: finalAmt === 0,
          message: res.message || `Code promo "${cleanCode}" appliqué avec succès !`,
          discountLabel: res.discountLabel
        };
        setAppliedPromo(promoData);
        setPromoSuccess(promoData.message);
        setAppliedGlobalPromo(res);
        return;
      }

      // Known fallback promos
      const knownDict: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
        'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Admin (-100%)' },
        'VIP100': { type: 'percentage', val: 100, desc: 'Code VIP (-100%)' },
        'GRATUIT100': { type: 'percentage', val: 100, desc: 'Accès 100% Gratuit' },
        'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction' },
        'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise' },
        'TERANGA20': { type: 'percentage', val: 20, desc: '20% de remise' }
      };

      if (knownDict[cleanCode]) {
        const item = knownDict[cleanCode];
        const discAmount = item.type === 'percentage' 
          ? (item.val >= 100 ? basePrice : Math.round((basePrice * item.val) / 100))
          : Math.min(basePrice, item.val);
        const finalAmt = Math.max(0, basePrice - discAmount);
        const discountLabel = item.type === 'percentage' ? `-${item.val}%` : `-${item.val} FCFA`;
        const promoData = {
          code: cleanCode,
          discountType: item.type,
          discountValue: item.val,
          discountAmount: discAmount,
          finalAmount: finalAmt,
          isFree: finalAmt === 0,
          message: finalAmt === 0 ? `Code "${cleanCode}" appliqué : Déblocage 100% Gratuit !` : `Code "${cleanCode}" appliqué (${discountLabel})`,
          discountLabel
        };
        setAppliedPromo(promoData);
        setPromoSuccess(promoData.message);
        return;
      }

      setPromoError(res.message || `Code promo "${cleanCode}" non valide.`);
      setAppliedPromo(null);
    } catch (err: any) {
      setPromoError(err?.message || "Erreur lors de la vérification du code.");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoSuccess(null);
    setPromoError(null);
  };

  // Free promo unlock handler
  const handleFreePromoUnlock = async () => {
    setIsPaymentLoading(true);
    setErrorMessage(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const txId = `TX-FREE-PROMO-${Date.now()}`;

    try {
      const tx: TransactionRecord = {
        id: txId,
        transactionId: txId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: selectedFormula.id === 'single' ? 'DIRECT_PURCHASE' : 'PASS_VIP',
        amount: 0,
        expectedAmount: 0,
        currency: 'FCFA',
        description: `Déblocage gratuit avec code ${appliedPromo?.code} (${selectedFormula.title})`,
        status: 'APPROVED',
        aiStatus: 'COMPLETED',
        paymentMethod: 'free',
        targetDocId: targetDocId,
        unlockedDocId: targetDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      if (appliedPromo?.code) {
        fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
            finalAmount: 0,
            documentTitle: selectedFormula.title
          })
        }).catch(() => {});
      }

      triggerUnlockSuccess();
    } catch (err: any) {
      console.error('[Free Promo Unlock Error]:', err);
      setErrorMessage("Erreur lors de l'application du déblocage gratuit.");
    } finally {
      setIsPaymentLoading(false);
    }
  };

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
    if (userBalance < payablePrice) {
      setErrorMessage(`Votre solde (${userBalance.toLocaleString('fr-FR')} F CFA) est insuffisant pour cette formule (Requis : ${payablePrice.toLocaleString('fr-FR')} F CFA).`);
      return;
    }

    setIsPayingWithWallet(true);
    setErrorMessage(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const txId = `TX-WALLET-${Date.now()}`;

    try {
      const isDoc = selectedFormula.id === 'single';
      const itemType = isDoc ? 'document' : 'subscription';
      const itemId = isDoc ? (targetDocId || `doc-${Date.now()}`) : selectedFormula.id;

      const payRes = await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUid,
          itemType,
          itemId,
          price: payablePrice,
          userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
          userName: userName || auth.currentUser?.displayName || 'Client Dokya'
        })
      });

      const payData = await payRes.json();
      if (!payData.success) {
        if (payData.reason === 'INSUFFICIENT_FUNDS') {
          setErrorMessage(payData.message || `Solde insuffisant. Veuillez recharger votre solde.`);
          return;
        }
        throw new Error(payData.error || 'Erreur lors du paiement par solde.');
      }

      const tx: TransactionRecord = {
        id: payData.transactionId || txId,
        transactionId: payData.transactionId || txId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: selectedFormula.id === 'single' ? 'DIRECT_PURCHASE' : 'PASS_VIP',
        amount: -payablePrice,
        expectedAmount: payablePrice,
        currency: 'FCFA',
        promoCode: appliedPromo?.code || undefined,
        description: `Règlement ${selectedFormula.title}${appliedPromo ? ` [Code: ${appliedPromo.code}]` : ''} (Débit solde)`,
        status: 'SUCCESS',
        aiStatus: 'COMPLETED',
        paymentMethod: 'wallet',
        targetDocId: targetDocId,
        unlockedDocId: targetDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      if (appliedPromo?.code) {
        fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
            finalAmount: payablePrice,
            documentTitle: selectedFormula.title
          })
        }).catch(() => {});
      }

      const newBal = payData.newBalance ?? Math.max(0, userBalance - payablePrice);
      if (onBalanceUpdated) {
        onBalanceUpdated(newBal);
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_cErr) {}

      triggerUnlockSuccess();
    } catch (err: any) {
      console.error('[Wallet Pay Error]:', err);
      setErrorMessage(err?.message || "Une erreur est survenue lors du débit du solde. Veuillez réessayer.");
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
      const checkoutDocId = selectedFormula.id === 'single' ? (targetDocId || `DOC-${Date.now()}`) : (targetDocId || '');

      const cleanAmount = Math.max(100, Math.round(Number(payablePrice) || 1000));
      const fullContent = contentData || documentData || {};

      // 1. SAUVEGARDE DU DOCUMENT AVANT LE PAIEMENT (Résolution NOT_FOUND) :
      // Dès que l'utilisateur clique sur "Payer" ou "Débloquer", crée IMPÉRATIVEMENT le document
      // dans la collection Firestore 'user_documents' AVANT d'ouvrir le lien Money Fusion
      if (checkoutType === 'document' && checkoutDocId) {
        try {
          const docRef = doc(db, 'user_documents', checkoutDocId);
          await setDoc(docRef, {
            id: checkoutDocId,
            docId: checkoutDocId,
            userId: user?.uid || currentUid,
            title: documentTitle || "Document sans titre",
            content: fullContent,
            formData: fullContent?.formData || null,
            aiData: fullContent?.aiData || null,
            businessDocData: fullContent?.businessDocData || null,
            ebookData: fullContent?.ebookData || null,
            generationMode: fullContent?.generationMode || 'cv_only',
            isUnlocked: false,
            status: "PENDING",
            isPaid: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log(`[PaywallModal] Document sauvegardé dans user_documents/${checkoutDocId} (status: PENDING) avant redirection Money Fusion.`);
        } catch (dbDocErr) {
          console.warn('[PaywallModal] Erreur pré-sauvegarde document Firestore:', dbDocErr);
        }
      }

      // 2. TRANSMISSION DU MONTANT ET DES MÉTADONNÉES DANS /api/moneyfusion/checkout
      const response = await fetch('/api/moneyfusion/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cleanAmount,
          totalPrice: cleanAmount,
          docId: checkoutDocId,
          planId: checkoutPlanId,
          plan: checkoutPlanId,
          type: checkoutType,
          promoCode: appliedPromo?.code || '',
          userId: user?.uid || currentUid,
          userEmail: user?.email || userEmail || '',
          userPhone: (user as any)?.phoneNumber || '',
          userName: user?.displayName || currentUserName,
          title: documentTitle || "Document sans titre",
          content: fullContent,
          personal_Info: [{
            userId: user?.uid || currentUid,
            docId: checkoutDocId || "",
            type: checkoutType,
            plan: checkoutPlanId || "",
            amount: cleanAmount
          }]
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
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-300 font-medium">
                        Solde insuffisant
                      </span>
                      {onOpenRechargeModal && (
                        <button
                          type="button"
                          onClick={onOpenRechargeModal}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95"
                        >
                          Recharger mon solde
                        </button>
                      )}
                    </div>
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

                {/* CODE PROMO & RÉDUCTIONS */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Code Promo / Coupon de Réduction</span>
                    </label>
                    {appliedPromo && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {appliedPromo.discountLabel} ACTIF
                      </span>
                    )}
                  </div>

                  {appliedPromo ? (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            Code <span className="font-mono text-emerald-300">{appliedPromo.code}</span> appliqué !
                          </p>
                          <p className="text-[11px] text-emerald-400/90 truncate">
                            {appliedPromo.message}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Retirer</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                          placeholder="Ex: PROMO50, VIP100..."
                          className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-xs px-3 py-2.5 rounded-xl uppercase font-mono tracking-wider transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyPromo()}
                          disabled={isCheckingPromo || !promoInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                        >
                          {isCheckingPromo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Appliquer</span>
                        </button>
                      </div>

                      {/* Suggestions rapides */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-400">Suggestions :</span>
                        {['PROMO50', 'DAKAR2026', 'TERANGA20', 'VIP100'].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleApplyPromo(sug)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700 transition-colors cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>

                      {promoError && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1 animate-in fade-in">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{promoError}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

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
                      {appliedPromo && (
                        <>
                          <span className="text-slate-500 mx-1.5">•</span>
                          <span className="text-emerald-400 font-bold">Code {appliedPromo.code} ({appliedPromo.discountLabel})</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {promoDiscount > 0 && (
                        <span className="text-xs text-slate-400 line-through font-mono">
                          {basePrice.toLocaleString('fr-FR')} F
                        </span>
                      )}
                      <span className="text-slate-400">Total :</span>
                      <span className={`text-base font-black font-mono ${isFreeWithPromo ? 'text-emerald-400 font-extrabold' : 'text-emerald-400'}`}>
                        {isFreeWithPromo ? '0 FCFA (GRATUIT)' : `${payablePrice.toLocaleString('fr-FR')} F CFA`}
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  {isFreeWithPromo ? (
                    <button
                      type="button"
                      onClick={handleFreePromoUnlock}
                      disabled={isPaymentLoading}
                      className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
                    >
                      {isPaymentLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                          <span>Validation du déblocage en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                          <span>Débloquer Gratuitement avec {appliedPromo?.code} (0 FCFA)</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-white" />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2.5">
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
                            <span>Payer via Money Fusion ({payablePrice.toLocaleString('fr-FR')} F CFA)</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-white" />
                          </>
                        )}
                      </button>

                      {userBalance >= payablePrice && (
                        <button
                          type="button"
                          onClick={handlePayWithWallet}
                          disabled={isPayingWithWallet || isPaymentLoading}
                          className="w-full py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isPayingWithWallet ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                          )}
                          <span>Régler avec mon Solde Dokya ({payablePrice.toLocaleString('fr-FR')} F CFA débités)</span>
                        </button>
                      )}
                    </div>
                  )}

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

