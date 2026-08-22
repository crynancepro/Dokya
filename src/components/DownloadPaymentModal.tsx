import React, { useState } from 'react';
import { 
  Download, Wallet, CreditCard, Sparkles, CheckCircle2, 
  AlertCircle, ShieldCheck, ArrowRight, Loader2, RefreshCw, X, Zap 
} from 'lucide-react';
import { SenePayCheckoutButton } from './SenePayCheckoutButton';
import { TransactionRecord } from '../types';
import { safeParseJsonResponse } from '../utils/apiHelpers';

interface DownloadPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel?: string;
  price?: number; // e.g. 1000 FCFA
  userBalance?: number;
  isAlreadyPaid?: boolean;
  onConfirmDownload: (paymentMethod: 'wallet' | 'senepay' | 'free', transaction?: TransactionRecord) => void;
  onOpenRechargeModal: () => void;
}

export const DownloadPaymentModal: React.FC<DownloadPaymentModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel = "Document Premium Dokya",
  price = 1000,
  userBalance = 0,
  isAlreadyPaid = false,
  onConfirmDownload,
  onOpenRechargeModal
}) => {
  const [isProcessingDebit, setIsProcessingDebit] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const safePrice = Number(price) || 1000;
  const safeBalance = Number(userBalance) || 0;
  const hasEnoughBalance = safeBalance >= safePrice;

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
          amount: safePrice,
          currentBalance: safeBalance,
          documentTitle
        })
      });

      const data = await safeParseJsonResponse(response);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du débit du solde.');
      }

      // Success transaction from server
      const tx: TransactionRecord = data.transaction || {
        id: `TX-DEBIT-${Date.now()}`,
        userId: 'guest',
        type: 'document_purchase',
        amount: -safePrice,
        currency: 'XOF',
        description: `Achat document : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: data.newBalance,
        documentTitle
      };

      onConfirmDownload('wallet', tx);
      onClose();
    } catch (err: any) {
      console.error('Wallet debit error:', err);
      setErrorMessage(err.message || 'Impossible de régler avec votre solde.');
    } finally {
      setIsProcessingDebit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden relative animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-emerald-600 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-extrabold mb-3 text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Options de Règlement Dokya</span>
          </div>

          <h3 className="text-xl font-black tracking-tight leading-snug">
            Télécharger votre Document
          </h3>
          <p className="text-xs text-indigo-100 font-medium mt-1 truncate">
            {documentTitle} • <span className="font-bold text-white">{documentTypeLabel}</span>
          </p>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs text-white/80 font-medium">Prix du document</span>
            <span className="text-2xl font-black tracking-tight text-white bg-white/20 px-3.5 py-1 rounded-xl backdrop-blur-xs">
              {(safePrice || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isAlreadyPaid ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Document Déjà Débloqué !</span>
              </div>
              <p className="text-xs text-emerald-700">
                Vous avez déjà réglé ce document. Vous pouvez le télécharger gratuitement immédiatement.
              </p>
              <button
                type="button"
                onClick={() => {
                  onConfirmDownload('free');
                  onClose();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Lancer le Téléchargement Immédiat</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* OPTION 1: SOLDE USER WALLET */}
              <div className={`p-4 rounded-2xl border transition-all ${
                hasEnoughBalance 
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-sm' 
                  : 'bg-amber-50/40 border-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Option 1 : Utiliser mon Solde
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">Débit direct sans redirection</p>
                    </div>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                    hasEnoughBalance 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    Solde : {(safeBalance || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {hasEnoughBalance ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-emerald-800 font-medium">
                      Votre solde est suffisant ! {(safePrice || 0).toLocaleString('fr-FR')} FCFA seront déduits de vos {(safeBalance || 0).toLocaleString('fr-FR')} FCFA.
                    </p>
                    <button
                      type="button"
                      onClick={handleDebitWallet}
                      disabled={isProcessingDebit}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isProcessingDebit ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Débit en cours...</span>
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4" />
                          <span>Débiter {(safePrice || 0).toLocaleString('fr-FR')} FCFA & Télécharger</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Solde insuffisant ({(safeBalance || 0).toLocaleString('fr-FR')} FCFA disponibles, {(safePrice || 0).toLocaleString('fr-FR')} FCFA requis).</span>
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
                      <span>Recharger mon Solde maintenant</span>
                    </button>
                  </div>
                )}
              </div>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest relative">
                  OU
                </span>
              </div>

              {/* OPTION 2: SENEPAY DIRECT CHECKOUT */}
              <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Option 2 : Guichet SenePay Direct
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">Wave, Orange Money, Free Money, Carte</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                    Paiement exact
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Réglez le montant exact de <strong className="text-indigo-900">{(safePrice || 0).toLocaleString('fr-FR')} FCFA</strong> via le guichet SenePay sans recharger votre solde.
                </p>

                <div className="w-full pt-1">
                  <SenePayCheckoutButton
                    amount={safePrice}
                    description={`Achat document Dokya (${safePrice} FCFA)`}
                    orderReference={`DOC-${Date.now()}`}
                    buttonText={`Payer ${(safePrice || 0).toLocaleString('fr-FR')} FCFA avec Wave / Orange Money`}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onSuccessRedirect={() => {
                      // Save transaction & launch download callback
                      const tx: TransactionRecord = {
                        id: `TX-SENEPAY-${Date.now()}`,
                        userId: 'guest',
                        type: 'document_purchase',
                        amount: -price,
                        currency: 'XOF',
                        description: `Achat SenePay Direct : ${documentTitle}`,
                        status: 'success',
                        createdAt: new Date().toISOString(),
                        paymentMethod: 'senepay',
                        documentTitle
                      };
                      onConfirmDownload('senepay', tx);
                    }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Footer security badge */}
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Paiement sécurisé crypté SSL • Support Dokya 24/7</span>
          </div>

        </div>
      </div>
    </div>
  );
};
