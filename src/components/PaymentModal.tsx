import React, { useState } from 'react';
import { 
  X, Wallet, CreditCard, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, Loader2, RefreshCw, Zap, Sparkles,
  Tag, Gift, Check, Trash2
} from 'lucide-react';
import { SenePayCheckoutButton } from './SenePayCheckoutButton';
import { TransactionRecord } from '../types';
import { safeParseJsonResponse } from '../utils/apiHelpers';

interface AppliedPromoInfo {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  isFree: boolean;
  message: string;
  discountLabel: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string;
  price: number;
  userBalance: number;
  isAlreadyPaid?: boolean;
  onPaymentSuccess: (method: 'wallet' | 'mobile_money' | 'free', transaction?: TransactionRecord) => void;
  onOpenRechargeModal: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  price = 1000,
  userBalance = 0,
  isAlreadyPaid = false,
  onPaymentSuccess,
  onOpenRechargeModal
}) => {
  const [isProcessingDebit, setIsProcessingDebit] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isRedeemingFree, setIsRedeemingFree] = useState<boolean>(false);

  if (!isOpen) return null;

  const originalPrice = Number(price) || 1000;
  const safeBalance = Number(userBalance) || 0;

  // Calculate actual payable price after promo
  const payablePrice = appliedPromo ? appliedPromo.finalAmount : originalPrice;
  const isFreeWithPromo = appliedPromo !== null && appliedPromo.isFree;
  const hasEnoughBalance = safeBalance >= payablePrice;

  // Handle promo validation
  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError('Veuillez saisir un code promo.');
      return;
    }

    setIsCheckingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          amount: originalPrice,
          documentTitle
        })
      });

      const data = await safeParseJsonResponse(response);

      if (response.ok && data.success && data.valid) {
        const promoInfo: AppliedPromoInfo = {
          code: data.code || cleanCode,
          discountType: data.discountType || 'percentage',
          discountValue: data.discountValue || 0,
          discountAmount: data.discountAmount ?? (originalPrice - (data.finalAmount ?? 0)),
          originalAmount: data.originalAmount || originalPrice,
          finalAmount: data.finalAmount ?? Math.max(0, originalPrice - (data.discountAmount || 0)),
          isFree: Boolean(data.isFree || data.finalAmount === 0),
          message: data.message || `Code promo ${data.code} appliqué avec succès !`,
          discountLabel: data.discountLabel || (data.discountType === 'percentage' ? `-${data.discountValue}%` : `-${data.discountValue} FCFA`)
        };

        setAppliedPromo(promoInfo);
        setPromoSuccess(promoInfo.message);
        setPromoError(null);
        return;
      }

      // Fallback local dictionary for known promo codes
      const knownPromoDict: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
        'LIL': { type: 'percentage', val: 90, desc: 'Code spécial LIL (-90%)' },
        'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Admin PETER (Gratuit)' },
        'VIP100': { type: 'percentage', val: 100, desc: 'Code Privilège VIP (-100%)' },
        'ADMIN100': { type: 'percentage', val: 100, desc: 'Code Administrateur (-100%)' },
        'GRATUIT100': { type: 'percentage', val: 100, desc: 'Déblocage Gratuit (-100%)' },
        'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction' },
        'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise spéciale' },
        'TERANGA20': { type: 'percentage', val: 20, desc: '20% de réduction' },
        'BIENVENUE500': { type: 'fixed', val: 500, desc: '500 FCFA offerts' }
      };

      if (knownPromoDict[cleanCode]) {
        const item = knownPromoDict[cleanCode];
        let discountAmount = 0;
        if (item.type === 'percentage') {
          discountAmount = item.val >= 100 ? originalPrice : Math.round((originalPrice * item.val) / 100);
        } else {
          discountAmount = Math.min(originalPrice, item.val);
        }
        const finalAmount = Math.max(0, originalPrice - discountAmount);
        const isFree = finalAmount === 0;
        const discountLabel = item.type === 'percentage' ? `-${item.val}%` : `-${item.val} FCFA`;

        const promoInfo: AppliedPromoInfo = {
          code: cleanCode,
          discountType: item.type,
          discountValue: item.val,
          discountAmount,
          originalAmount: originalPrice,
          finalAmount,
          isFree,
          message: isFree 
            ? `Code "${cleanCode}" appliqué : 100% de réduction (Gratuit) !` 
            : `Code "${cleanCode}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`,
          discountLabel
        };

        setAppliedPromo(promoInfo);
        setPromoSuccess(promoInfo.message);
        setPromoError(null);
        return;
      }

      throw new Error(data?.error || `Le code promo "${cleanCode}" est invalide ou inexistant.`);
    } catch (err: any) {
      console.error('Validate promo error:', err);
      setPromoError(err.message || 'Code promo non reconnu ou expiré.');
      setAppliedPromo(null);
      setPromoSuccess(null);
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoSuccess(null);
    setPromoError(null);
  };

  // Handle 100% Free Promo Unlock
  const handleFreePromoUnlock = async () => {
    setIsRedeemingFree(true);
    try {
      // Background redemption tracker
      if (appliedPromo) {
        fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            documentTitle,
            finalAmount: 0
          })
        }).catch(() => {});
      }

      const freeTx: TransactionRecord = {
        id: `TX-PROMO-FREE-${Date.now()}`,
        userId: 'guest',
        type: 'document_purchase',
        amount: 0,
        currency: 'XOF',
        description: `Déblocage Gratuit (Code Promo: ${appliedPromo?.code}) : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: safeBalance,
        documentTitle
      };

      onPaymentSuccess('free', freeTx);
      onClose();
    } catch (err) {
      console.error('Free promo unlock error:', err);
      onPaymentSuccess('free');
      onClose();
    } finally {
      setIsRedeemingFree(false);
    }
  };

  // Handle direct wallet debit
  const handleDebitWallet = async () => {
    setIsProcessingDebit(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/wallet/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest',
          amount: payablePrice,
          currentBalance: safeBalance,
          documentTitle,
          promoCode: appliedPromo?.code
        })
      });

      const data = await safeParseJsonResponse(response);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du débit du solde.');
      }

      // Background redemption tracker
      if (appliedPromo) {
        fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            documentTitle,
            finalAmount: payablePrice
          })
        }).catch(() => {});
      }

      // Success transaction from server
      const tx: TransactionRecord = data.transaction || {
        id: `TX-DEBIT-${Date.now()}`,
        userId: 'guest',
        type: 'document_purchase',
        amount: -payablePrice,
        currency: 'XOF',
        description: `Achat document${appliedPromo ? ` (Code: ${appliedPromo.code})` : ''} : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: data.newBalance,
        documentTitle
      };

      onPaymentSuccess('wallet', tx);
      onClose();
    } catch (err: any) {
      console.error('Wallet debit error:', err);
      setErrorMessage(err.message || 'Impossible de régler avec votre solde.');
    } finally {
      setIsProcessingDebit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden relative animate-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold mb-3 text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Déblocage & Téléchargement Immédiat</span>
          </div>

          <h3 className="text-xl font-black tracking-tight leading-snug">
            Paiement Sécurisé du Document
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-1 truncate">
            {documentTitle} • <span className="font-bold text-white">{documentTypeLabel}</span>
          </p>

          {/* Dynamic Price Block */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 font-medium block">Montant à régler</span>
              {appliedPromo && (
                <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                  <Tag className="w-3 h-3" />
                  <span>Coupon {appliedPromo.code} ({appliedPromo.discountLabel})</span>
                </span>
              )}
            </div>

            <div className="text-right">
              {appliedPromo ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-slate-400 font-bold">
                    {(originalPrice || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className={`text-2xl font-black tracking-tight px-3.5 py-1 rounded-xl shadow-inner border ${
                    isFreeWithPromo 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black animate-pulse'
                      : 'bg-indigo-600/70 border-indigo-400/40 text-white'
                  }`}>
                    {isFreeWithPromo ? 'GRATUIT (0 F)' : `${(payablePrice || 0).toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-black tracking-tight text-white bg-indigo-600/60 border border-indigo-400/40 px-3.5 py-1 rounded-xl shadow-inner">
                  {(originalPrice || 0).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isAlreadyPaid ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Document Déjà Débloqué !</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Ce document a déjà été réglé. Vous pouvez le télécharger immédiatement aux formats PDF et Word sans frais supplémentaires.
              </p>
              <button
                type="button"
                onClick={() => {
                  onPaymentSuccess('free');
                  onClose();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Accéder au Téléchargement (Word & PDF)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* ========================================================================= */}
              {/* SECTION: CHAMP DE CODE PROMO (Avez-vous un code promo ?)                   */}
              {/* ========================================================================= */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="promoCodeInput" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Avez-vous un code promo ?</span>
                  </label>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-all hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Retirer le code</span>
                    </button>
                  )}
                </div>

                {!appliedPromo ? (
                  <form onSubmit={handleApplyPromo} className="flex items-center gap-2">
                    <input
                      id="promoCodeInput"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Ex: DAKAR2026, PROMO50, GRATUIT100"
                      className="flex-1 px-3.5 py-2 text-xs font-bold font-mono uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 placeholder:text-slate-400 placeholder:font-sans placeholder:normal-case shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={isCheckingPromo || !promoInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      {isCheckingPromo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Vérification...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Appliquer</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                        ✓
                      </div>
                      <div>
                        <p className="font-extrabold text-emerald-950">
                          Code <span className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-300">{appliedPromo.code}</span> actif
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Réduction : <strong>{appliedPromo.discountLabel}</strong> (-{(appliedPromo.discountAmount || 0).toLocaleString('fr-FR')} FCFA)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message for promo */}
                {promoError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold">{promoError}</span>
                  </div>
                )}

                {/* Success message for promo */}
                {promoSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{promoSuccess}</span>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* CAS SPÉCIAL : CODE PROMO 100% GRATUIT (Déblocage Immédiat sans guichet)   */}
              {/* ========================================================================= */}
              {isFreeWithPromo ? (
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl space-y-3.5 shadow-sm animate-in zoom-in-95">
                  <div className="flex items-center gap-2.5 text-emerald-900">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                        🎉 Réduction de 100% Appliquée !
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium">
                        Votre coupon offre un déblocage 100% gratuit de ce document.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFreePromoUnlock}
                    disabled={isRedeemingFree}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    {isRedeemingFree ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Déblocage gratuit en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Télécharger Mon Document Gratuitement (Word & PDF)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* ========================================================================= */}
                  {/* OPTION 1: SOLDE DU PORTEFEUILLE                                           */}
                  {/* ========================================================================= */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    hasEnoughBalance 
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          hasEnoughBalance ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Option 1 : Payer avec mon Portefeuille
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">Déblocage direct et instantané</p>
                        </div>
                      </div>

                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                        hasEnoughBalance 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-100 text-amber-900 border-amber-200'
                      }`}>
                        Solde : {(safeBalance || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {hasEnoughBalance ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-emerald-800 font-medium">
                          Votre solde est suffisant. {(payablePrice || 0).toLocaleString('fr-FR')} FCFA seront déduits de vos {(safeBalance || 0).toLocaleString('fr-FR')} FCFA.
                        </p>
                        <button
                          type="button"
                          onClick={handleDebitWallet}
                          disabled={isProcessingDebit}
                          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isProcessingDebit ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Validation du débit en cours...</span>
                            </>
                          ) : (
                            <>
                              <Wallet className="w-4 h-4" />
                              <span>Payer avec mon Portefeuille ({(payablePrice || 0).toLocaleString('fr-FR')} FCFA)</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Solde insuffisant ({(safeBalance || 0).toLocaleString('fr-FR')} FCFA dispos, {(payablePrice || 0).toLocaleString('fr-FR')} FCFA requis).</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenRechargeModal();
                          }}
                          className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Recharger mon Portefeuille (+ Bonus)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DIVIDER */}
                  <div className="relative flex items-center justify-center my-2">
                    <div className="border-t border-slate-200 w-full"></div>
                    <span className="bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest relative">
                      OU
                    </span>
                  </div>

                  {/* ========================================================================= */}
                  {/* OPTION 2: PAIEMENT MOBILE MONEY & CARTE BANCAIRE (WAVE, OM, FREE, CARTE) */}
                  {/* ========================================================================= */}
                  <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Option 2 : Mobile Money & Carte Bancaire
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">Wave, Orange Money, Free Money, Visa/Mastercard</p>
                        </div>
                      </div>
                    </div>

                    {/* Accepted payment methods badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="px-2 py-1 bg-sky-100 border border-sky-300 text-sky-800 font-extrabold text-[10px] rounded-lg">
                        🌊 Wave
                      </span>
                      <span className="px-2 py-1 bg-orange-100 border border-orange-300 text-orange-800 font-extrabold text-[10px] rounded-lg">
                        🍊 Orange Money
                      </span>
                      <span className="px-2 py-1 bg-red-100 border border-red-300 text-red-800 font-extrabold text-[10px] rounded-lg">
                        🔴 Free Money
                      </span>
                      <span className="px-2 py-1 bg-indigo-100 border border-indigo-300 text-indigo-800 font-extrabold text-[10px] rounded-lg">
                        💳 Carte Visa / Mastercard
                      </span>
                    </div>

                    {/* Pay button */}
                    <div className="pt-2">
                      <SenePayCheckoutButton
                        amount={payablePrice}
                        description={`Paiement : ${documentTitle}${appliedPromo ? ` (Code: ${appliedPromo.code})` : ''}`}
                        orderReference={`DOC-${Date.now()}`}
                        buttonText={`Payer par Mobile Money ou Carte (${(payablePrice || 0).toLocaleString('fr-FR')} FCFA)`}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        onError={(err) => setErrorMessage(err)}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* Footer Security Badge */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Paiement 100% Sécurisé & Crypté SSL</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-slate-500">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Téléchargement Word & PDF instantané</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
