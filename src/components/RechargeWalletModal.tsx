import React, { useState } from 'react';
import { Wallet, CreditCard, Sparkles, X, Check, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { SenePayCheckoutButton } from './SenePayCheckoutButton';
import { TransactionRecord } from '../types';

interface RechargeWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  userBalance?: number;
  onRechargeSuccess?: (addedAmount: number, transaction: TransactionRecord) => void;
  onSuccess?: (addedAmount: number, transaction?: TransactionRecord) => void;
}

export const RechargeWalletModal: React.FC<RechargeWalletModalProps> = ({
  isOpen,
  onClose,
  currentBalance: propCurrentBalance,
  userBalance: propUserBalance,
  onRechargeSuccess,
  onSuccess
}) => {
  const currentBalance = propCurrentBalance ?? propUserBalance ?? 0;
  const [selectedAmount, setSelectedAmount] = useState<number>(3000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isSimulatingDemo, setIsSimulatingDemo] = useState<boolean>(false);

  if (!isOpen) return null;

  const presetAmounts = [1000, 3000, 5000];

  const parsedCustomAmount = Number(customAmount);
  const validCustomAmount = !isNaN(parsedCustomAmount) && parsedCustomAmount > 0 ? parsedCustomAmount : 0;
  const finalAmount = isCustom ? validCustomAmount : selectedAmount;

  const handleSimulateRecharge = async () => {
    if (finalAmount <= 0) return;
    setIsSimulatingDemo(true);
    await new Promise((res) => setTimeout(res, 800));

    const newTx: TransactionRecord = {
      id: `TX-RECHARGE-${Date.now()}`,
      userId: 'guest',
      type: 'recharge',
      amount: finalAmount,
      currency: 'XOF',
      description: `Recharge de solde Wallet (+${(finalAmount || 0).toLocaleString('fr-FR')} FCFA)`,
      status: 'success',
      createdAt: new Date().toISOString(),
      paymentMethod: 'senepay',
      newBalance: currentBalance + finalAmount
    };

    if (onRechargeSuccess) {
      onRechargeSuccess(finalAmount, newTx);
    }
    if (onSuccess) {
      onSuccess(finalAmount, newTx);
    }
    setIsSimulatingDemo(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Recharger mon Solde</h3>
              <p className="text-xs text-emerald-100 font-medium">Dokya Wallet (FCFA)</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
            <span className="text-xs text-white/80 font-medium">Solde actuel disponible</span>
            <span className="text-xl font-extrabold tracking-tight bg-white/20 px-3 py-1 rounded-xl backdrop-blur-xs">
              {(currentBalance || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Preset amounts & Custom Input */}
          <div className="space-y-4">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              1. Choisissez le montant de la recharge
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              {presetAmounts.map((amt) => {
                const isSelected = !isCustom && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setIsCustom(false);
                    }}
                    className={`py-3 px-2 rounded-2xl font-black text-sm transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100 scale-102'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{(amt || 0).toLocaleString('fr-FR')}</span>
                    <span className="text-[10px] font-semibold opacity-80">FCFA</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Box directly visible */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Saisir un montant personnalisé :
                </label>
                {isCustom && (
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                    Montant personnalisé actif
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={customAmount}
                  onFocus={() => {
                    setIsCustom(true);
                  }}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setIsCustom(true);
                  }}
                  placeholder="Ex: 2 000, 10 000, 15 000 FCFA..."
                  className={`w-full pl-4 pr-16 py-3 rounded-2xl border-2 font-black text-sm text-slate-800 transition-all outline-none ${
                    isCustom
                      ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 focus:border-emerald-500'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                  FCFA
                </span>
              </div>
              {isCustom && parsedCustomAmount > 0 && parsedCustomAmount < 500 && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Le montant minimum conseillé est de 500 FCFA.
                </p>
              )}
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Montant sélectionné</span>
              <span className="font-extrabold text-slate-900">{(finalAmount || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Nouveau solde après recharge</span>
              <span className="font-black text-emerald-600 text-sm">
                {(currentBalance + finalAmount).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          {/* Payment Gateways Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              <span>2. Mode de Paiement Direct</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                Wave / Orange Money / Free
              </span>
            </div>

            {/* Checkout Button */}
            <div className="w-full">
              <SenePayCheckoutButton
                amount={finalAmount}
                description={`Recharge de Solde Dokya (${finalAmount} FCFA)`}
                orderReference={`RECHARGE-${Date.now()}`}
                buttonText={`Payer ${(finalAmount || 0).toLocaleString('fr-FR')} FCFA par Mobile Money / Carte`}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                onSuccessRedirect={() => {
                  // checkout initiated successfully
                }}
              />
            </div>

            {/* Simulation demo button for quick instant credit test */}
            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={handleSimulateRecharge}
                disabled={isSimulatingDemo}
                className="text-xs text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Simuler validation directe (+{(finalAmount || 0).toLocaleString('fr-FR')} FCFA)</span>
              </button>
            </div>
          </div>

          {/* Footer security badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Paiement 100% sécurisé et crypté SSL</span>
          </div>

        </div>
      </div>
    </div>
  );
};
