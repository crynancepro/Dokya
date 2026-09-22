import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle2, ShieldCheck, 
  Loader2, Sparkles, AlertCircle, Lock,
  Unlock, Wallet, ArrowUpRight, Tag, Gift, Trash2, FileText
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

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  documentTypeLabel?: string;
  targetDocId?: string;
  targetFormat?: 'pdf' | 'docx';
  documentPrice?: number;
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
  documentPrice,
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
  const { validatePromoCode, appliedGlobalPromo, setAppliedGlobalPromo, pricing } = usePricing();

  // Resolve base price for the document
  const resolveBasePrice = () => {
    if (documentPrice && documentPrice > 0) return documentPrice;
    const labelLower = (documentTypeLabel || '').toLowerCase();
    if (labelLower.includes('ebook') || labelLower.includes('livre')) return pricing?.ebookPrice ?? 3000;
    if (labelLower.includes('business') || labelLower.includes('pack')) return pricing?.businessPackPrice ?? 1499;
    if (labelLower.includes('lettre')) return pricing?.letterOnlyPrice ?? 1000;
    if (labelLower.includes('devis')) return pricing?.devisPrice ?? 1000;
    if (labelLower.includes('facture')) return pricing?.facturePrice ?? 1000;
    return pricing?.cvOnlyPrice ?? 1000;
  };

  const basePrice = resolveBasePrice();

  // States
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // Promo code
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
  const hasSufficientBalance = userBalance >= payablePrice || isFreeWithPromo;

  const userProfileUnsubRef = useRef<(() => void) | null>(null);

  // Reset states on opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsApproved(false);
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

  // Trigger unlock when approved
  const triggerUnlockSuccess = () => {
    setIsApproved(true);
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((module) => {
        const confetti = module.default;
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#fbbf24', '#f43f5e', '#3b82f6']
        });
      }).catch(() => {});
    }

    // 1. Débloque instantanément l'affichage du document et active le bouton de téléchargement HD
    onUnlocked();

    // 2. Ferme la modale de paiement et déclenche l'export HD si demandé
    setTimeout(() => {
      onClose();
      if (onDownloadAction && targetFormat) {
        onDownloadAction(targetFormat);
      }
    }, 350);
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

  // Execute unlock with wallet balance via /api/wallet/pay
  const handlePayWithWallet = async () => {
    if (!hasSufficientBalance) {
      setErrorMessage(`Votre solde (${userBalance.toLocaleString('fr-FR')} FCFA) est insuffisant pour débloquer ce document (Requis : ${payablePrice.toLocaleString('fr-FR')} FCFA).`);
      return;
    }

    setIsPayingWithWallet(true);
    setErrorMessage(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const effectiveDocId = targetDocId || `DOC-${Date.now()}`;
    const txId = `TX-WALLET-${Date.now()}`;

    try {
      // 1. Pre-save document to Firestore user_documents if not already existing
      try {
        const fullContent = contentData || documentData || {};
        const docRef = doc(db, 'user_documents', effectiveDocId);
        await setDoc(docRef, {
          id: effectiveDocId,
          docId: effectiveDocId,
          userId: currentUid,
          title: documentTitle || "Document Professionnel",
          content: fullContent,
          formData: fullContent?.formData || null,
          aiData: fullContent?.aiData || null,
          businessDocData: fullContent?.businessDocData || null,
          ebookData: fullContent?.ebookData || null,
          generationMode: fullContent?.generationMode || 'cv_only',
          isUnlocked: false,
          status: "PENDING",
          isPaid: false,
          updatedAt: nowIso
        }, { merge: true });
      } catch (dbErr) {
        console.warn('[PaywallModal pre-save document warn]:', dbErr);
      }

      // 2. Call server-side consolidated /api/payment with action: 'wallet_pay'
      const payRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wallet_pay',
          userId: currentUid,
          itemType: 'document',
          documentId: effectiveDocId,
          itemId: effectiveDocId,
          docId: effectiveDocId,
          price: payablePrice,
          amount: payablePrice,
          userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
          userName: userName || auth.currentUser?.displayName || 'Client Dokya'
        })
      });

      const payData = await payRes.json().catch(() => ({}));
      if (!payRes.ok || !payData.success) {
        if (payData.reason === 'INSUFFICIENT_FUNDS' || payData.error === 'Solde insuffisant') {
          setErrorMessage(payData.message || `Solde insuffisant. Votre solde est inférieur au montant requis (${payablePrice.toLocaleString('fr-FR')} FCFA). Veuillez recharger votre solde.`);
          return;
        }
        throw new Error(payData.error || payData.message || 'Erreur lors du paiement par solde.');
      }

      // 3. Record transaction in client Firestore for instant reactivity
      const tx: TransactionRecord = {
        id: payData.transactionId || txId,
        transactionId: payData.transactionId || txId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: 'DIRECT_PURCHASE',
        amount: -payablePrice,
        expectedAmount: payablePrice,
        currency: 'FCFA',
        promoCode: appliedPromo?.code || undefined,
        description: `Déblocage document "${documentTitle}" (Débit solde interne)`,
        status: 'SUCCESS',
        aiStatus: 'COMPLETED',
        paymentMethod: 'WALLET',
        targetDocId: effectiveDocId,
        unlockedDocId: effectiveDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      // Redeem promo if any
      if (appliedPromo?.code) {
        fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
            finalAmount: payablePrice,
            documentTitle
          })
        }).catch(() => {});
      }

      // Update balance locally
      const newBal = payData.newBalance ?? Math.max(0, userBalance - payablePrice);
      if (onBalanceUpdated) {
        onBalanceUpdated(newBal);
      }

      triggerUnlockSuccess();
    } catch (err: any) {
      console.error('[Wallet Pay Error]:', err);
      setErrorMessage(err?.message || "Une erreur est survenue lors du débit du solde. Veuillez réessayer.");
    } finally {
      setIsPayingWithWallet(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Débloquer mon Document
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Solde 100% Interne
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-sm">
                {documentTitle} ({documentTypeLabel})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-all cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Document Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Export PDF & Word (.docx) Haute Définition
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sans filigrane, prêt à l'emploi et conservé à vie
                </p>
              </div>
            </div>
            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
              HD Vectoriel
            </span>
          </div>

          {/* Balance & Price Indicators */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* 1. Solde Actuel */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasSufficientBalance 
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  <span>Votre Solde</span>
                </span>
                {hasSufficientBalance ? (
                  <span className="text-[10px] font-bold text-emerald-400">Suffisant</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400">Insuffisant</span>
                )}
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                {userBalance.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-bold">FCFA</span>
              </div>
            </div>

            {/* 2. Prix Déblocage */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  <span>Prix Document</span>
                </span>
                {appliedPromo && (
                  <span className="text-[10px] font-black text-emerald-400">{appliedPromo.discountLabel}</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                {appliedPromo && promoDiscount > 0 && (
                  <span className="text-xs font-semibold text-slate-500 line-through">
                    {basePrice.toLocaleString('fr-FR')}
                  </span>
                )}
                <span className="text-lg sm:text-xl font-black text-white">
                  {payablePrice === 0 ? '0' : payablePrice.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-bold">FCFA</span>
                </span>
              </div>
            </div>

          </div>

          {/* Promo Code Accordion/Box */}
          <div className="pt-1">
            {!appliedPromo ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Code Promo (ex: PETER, VIP100)"
                    disabled={isCheckingPromo}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 uppercase font-mono tracking-wider"
                  />
                  <Tag className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyPromo()}
                  disabled={isCheckingPromo || !promoInput.trim()}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  {isCheckingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Gift className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Code <strong>{appliedPromo.code}</strong> activé ({appliedPromo.discountLabel})</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Retirer le code"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {promoError && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">{promoError}</p>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button Section */}
          <div className="space-y-2.5 pt-2">
            
            {hasSufficientBalance ? (
              /* SI SOLDE SUFFISANT : Bouton unique de déblocage par solde */
              <button
                type="button"
                onClick={handlePayWithWallet}
                disabled={isPayingWithWallet || isApproved}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isPayingWithWallet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Déblocage en cours...</span>
                  </>
                ) : isApproved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Document débloqué avec succès !</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-amber-300" />
                    <span>Débloquer avec mon solde ({payablePrice === 0 ? 'Gratuit' : `${payablePrice.toLocaleString('fr-FR')} FCFA`})</span>
                  </>
                )}
              </button>
            ) : (
              /* SI SOLDE INSUFFISANT : Bouton unique de recharge Money Fusion */
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                  <span>Montant manquant pour ce document :</span>
                  <strong className="text-amber-300 font-black">
                    {(payablePrice - userBalance).toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenRechargeModal) {
                      onOpenRechargeModal();
                    }
                  }}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Solde insuffisant : Recharger mon solde</span>
                </button>
              </div>
            )}

            {/* Note de sécurité */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Paiement sécurisé via votre solde interne Dokya. Aucun frais caché.</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
