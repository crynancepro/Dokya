import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Wallet, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Clock,
  Zap,
  CreditCard
} from 'lucide-react';
import { UserSubscription, CandidateProfile } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'weekly' | 'monthly' | 'annual';
  planTitle: string;
  price: number;
  userBalance: number;
  onSuccess: (sub: UserSubscription, method: 'wallet' | 'mobile_money') => void;
  onOpenRecharge: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  planId,
  planTitle,
  price,
  userBalance,
  onSuccess,
  onOpenRecharge
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'wave' | 'orange_money' | 'card'>('wallet');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const durationDays = planId === 'weekly' ? 7 : planId === 'monthly' ? 30 : 365;
  const hasEnoughBalance = userBalance >= price;

  const handleConfirmSubscription = () => {
    setErrorMessage(null);

    if (selectedMethod === 'wallet') {
      if (!hasEnoughBalance) {
        setErrorMessage(`Solde insuffisant (${userBalance.toLocaleString('fr-FR')} FCFA). Veuillez recharger votre compte ou choisir Mobile Money.`);
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        const newSub: UserSubscription = {
          planId,
          planName: planTitle,
          status: 'active',
          startedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          autoRenew: false,
          pricePaid: price,
          paymentMethod: 'wallet',
          documentsGeneratedCount: 0
        };

        setIsProcessing(false);
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess(newSub, 'wallet');
          onClose();
        }, 1500);
      }, 600);
    } else {
      // Mobile Money / Card simulation
      if ((selectedMethod === 'wave' || selectedMethod === 'orange_money') && !phoneNumber) {
        setErrorMessage('Veuillez renseigner votre numéro de téléphone Mobile Money.');
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        const newSub: UserSubscription = {
          planId,
          planName: planTitle,
          status: 'active',
          startedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          autoRenew: false,
          pricePaid: price,
          paymentMethod: selectedMethod,
          documentsGeneratedCount: 0
        };

        setIsProcessing(false);
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess(newSub, 'mobile_money');
          onClose();
        }, 1500);
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {paymentSuccess ? (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">Abonnement Activé avec Succès !</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Félicitations ! Votre <span className="font-bold text-amber-300">{planTitle}</span> est désormais actif pour <span className="font-bold text-emerald-400">{durationDays} jours</span>. Téléchargez et générez tous vos documents sans limite !
            </p>
          </div>
        ) : (
          <>
            {/* Header Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Activation du Pass VIP
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">{planTitle}</h3>
              </div>
            </div>

            {/* Price & Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Durée d'accès illimité</p>
                <p className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>{durationDays} Jours (Téléchargements illimités)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Montant total</p>
                <p className="text-xl font-black text-amber-400">{price.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Choisissez votre mode de règlement :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Solde Dokya Wallet */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('wallet')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    selectedMethod === 'wallet'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Wallet className={`w-5 h-5 mt-0.5 shrink-0 ${hasEnoughBalance ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">Solde Dokya Wallet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Solde : <span className={hasEnoughBalance ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {userBalance.toLocaleString('fr-FR')} F
                      </span>
                    </p>
                  </div>
                </button>

                {/* 2. Wave Senegal / UEMOA */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('wave')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    selectedMethod === 'wave'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Wave Mobile Money</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Paiement instantané sans frais</p>
                  </div>
                </button>

                {/* 3. Orange Money */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('orange_money')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    selectedMethod === 'orange_money'
                      ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Orange Money</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Code de retrait / QR</p>
                  </div>
                </button>

                {/* 4. Carte Bancaire */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    selectedMethod === 'card'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Carte Bancaire</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Visa / Mastercard</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile Money Phone Input if applicable */}
            {(selectedMethod === 'wave' || selectedMethod === 'orange_money') && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs text-slate-300 font-bold">
                  Numéro de téléphone pour la transaction :
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 77 123 45 67 ou 78 987 65 43"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            {/* Solde insuffisant message */}
            {selectedMethod === 'wallet' && !hasEnoughBalance && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
                <span>Votre solde est insuffisant ({userBalance.toLocaleString('fr-FR')} F).</span>
                <button
                  type="button"
                  onClick={onOpenRecharge}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black cursor-pointer hover:bg-amber-400"
                >
                  Recharger +
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Confirm CTA */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmSubscription}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    <span>Activation en cours...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Confirmer et Activer le Pass ({price.toLocaleString('fr-FR')} F)</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
