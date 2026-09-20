import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, Crown, CheckCircle2, ShieldCheck, 
  Loader2, AlertCircle, Wallet, Tag, ArrowUpRight, Sparkles 
} from 'lucide-react';
import { UserSubscription, TransactionRecord } from '../types';
import { recordTransactionEverywhere } from '../lib/firebase';

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'weekly' | 'monthly' | 'annual';
  planTitle: string;
  price: number;
  userBalance: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isUserVip?: boolean;
  onSuccess: (sub: UserSubscription, method: 'wallet') => void;
  onOpenRecharge: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  planId,
  planTitle,
  price,
  userBalance = 0,
  userId,
  userEmail,
  userName,
  isUserVip,
  onSuccess,
  onOpenRecharge
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasSufficientBalance = userBalance >= price;
  const missingAmount = Math.max(0, price - userBalance);

  const handlePaySubscription = async () => {
    if (!hasSufficientBalance) {
      setErrorMessage(`Votre solde (${userBalance.toLocaleString('fr-FR')} FCFA) est insuffisant (Requis : ${price.toLocaleString('fr-FR')} FCFA).`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const effectiveUid = userId && userId !== 'guest' ? userId : 'candidat';
    const effectiveEmail = userEmail || 'candidat@dokya.sn';
    const effectiveName = userName || 'Client Dokya';
    const nowIso = new Date().toISOString();
    const durationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
    const expiresDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      // 1. Call server-side /api/wallet/pay
      const res = await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUid,
          itemType: 'subscription',
          itemId: planId,
          price,
          userEmail: effectiveEmail,
          userName: effectiveName
        })
      });

      const data = await res.json();

      if (!data.success) {
        if (data.reason === 'INSUFFICIENT_FUNDS') {
          setErrorMessage(data.message || 'Solde insuffisant pour souscrire.');
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'activation de l\'abonnement.');
      }

      // 2. Confetti animation
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_e) {}

      // 3. Build subscription object
      const sub: UserSubscription = {
        planId,
        status: 'ACTIVE',
        activatedAt: nowIso,
        expiresAt: expiresDate,
        pricePaid: price,
        paymentMethod: 'wallet',
        unlimitedDownloads: true
      };

      // 4. Record transaction in Firestore
      const txId = data.transactionId || `WAL-SUB-${Date.now()}`;
      const tx: TransactionRecord = {
        id: txId,
        transactionId: txId,
        userId: effectiveUid,
        userEmail: effectiveEmail,
        userName: effectiveName,
        type: 'subscription_purchase',
        amount: -price,
        expectedAmount: price,
        currency: 'FCFA',
        description: `Souscription ${planTitle} (Débit solde interne)`,
        status: 'SUCCESS',
        aiStatus: 'COMPLETED',
        paymentMethod: 'wallet',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      // 5. Notify parent
      onSuccess(sub, 'wallet');
      onClose();
    } catch (err: any) {
      console.error('[SubscriptionModal Error]:', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de la souscription.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Activer le Pass VIP
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Accès Illimité
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {planTitle} • Règlement par solde Dokya
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
          
          {/* Plan Highlights */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avantages débloqués immédiatement :</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Téléchargements Word (.docx) & PDF <strong>100% ILLIMITÉS</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Accès sans limite à tous les modèles CV ATS, Lettres & Factures</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Générations IA complètes avec simulateur d'entretien RH</span>
              </li>
            </ul>
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

            {/* 2. Tarif Abonnement */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  <span>Tarif Pass</span>
                </span>
                <span className="text-[10px] font-black text-amber-400">Forfaitaire</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                {price.toLocaleString('fr-FR')} <span className="text-xs text-slate-400 font-bold">FCFA</span>
              </div>
            </div>

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
              /* SI SOLDE SUFFISANT : Bouton unique de souscription par solde */
              <button
                type="button"
                onClick={handlePaySubscription}
                disabled={isLoading || isUserVip}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Activation du Pass VIP en cours...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-slate-950" />
                    <span>S'abonner avec mon solde ({price.toLocaleString('fr-FR')} FCFA)</span>
                  </>
                )}
              </button>
            ) : (
              /* SI SOLDE INSUFFISANT : Bouton unique de recharge Money Fusion */
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                  <span>Montant manquant pour activer ce pass :</span>
                  <strong className="text-amber-300 font-black">
                    {missingAmount.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecharge();
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
              <span>Débit direct de votre solde Dokya interne. Aucun prélèvement bancaire automatique.</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
