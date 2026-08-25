import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Wallet, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, ArrowLeft, Loader2, RefreshCw, Zap, Sparkles,
  Tag, Gift, Check, Trash2, Copy, Upload, Smartphone, ScanLine, FileCheck
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { TransactionRecord, ReceiptVerificationResult } from '../types';
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
  // Stepper: 1 = Opérateur & Numéro, 2 = Instructions & Sélection Reçu, 3 = Scanner Laser IA
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected Operator: 'wave' | 'orange_money'
  const [selectedOperator, setSelectedOperator] = useState<'wave' | 'orange_money'>('wave');
  const [userPhoneNumber, setUserPhoneNumber] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Beneficiary Info & Copy states
  const BENEFICIARY_PHONE = '+221 78 961 90 88';
  const BENEFICIARY_NAME = 'NGOUALA LAVOISIER FORTUNE PETER';
  const [copiedField, setCopiedField] = useState<'phone' | 'name' | null>(null);

  // Receipt File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 Laser AI Scan States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [scanCheckRecipient, setScanCheckRecipient] = useState<'pending' | 'success' | 'failed'>('pending');
  const [scanCheckAmount, setScanCheckAmount] = useState<'pending' | 'success' | 'failed'>('pending');
  const [scanCheckTimestamp, setScanCheckTimestamp] = useState<'pending' | 'success' | 'failed'>('pending');
  const [scanCheckUniqueness, setScanCheckUniqueness] = useState<'pending' | 'success' | 'failed'>('pending');

  // Processing debit & Promo states
  const [isProcessingDebit, setIsProcessingDebit] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPromoBox, setShowPromoBox] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isRedeemingFree, setIsRedeemingFree] = useState<boolean>(false);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const originalPrice = Number(price) || 1000;
  const safeBalance = Number(userBalance) || 0;
  const payablePrice = appliedPromo ? appliedPromo.finalAmount : originalPrice;
  const isFreeWithPromo = appliedPromo !== null && appliedPromo.isFree;
  const hasEnoughBalance = safeBalance >= payablePrice;

  // Copy to clipboard helper
  const handleCopy = (text: string, field: 'phone' | 'name') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (_e) {}
  };

  // Move from Step 1 to Step 2
  const handleProceedToStep2 = () => {
    const cleanPhone = userPhoneNumber.trim().replace(/[^0-9+]/g, '');
    if (cleanPhone && cleanPhone.length < 9) {
      setPhoneError('Veuillez saisir un numéro de téléphone valide (ex: 77 123 45 67).');
      return;
    }
    setPhoneError(null);
    setStep(2);
  };

  // File selection in Step 2
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setReceiptError('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptError("L'image est trop volumineuse (maximum 10 Mo).");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setReceiptError(null);
    setOcrSuccess(false);
  };

  // Move from Step 2 to Step 3 and launch the Laser AI OCR Scan
  const handleLaunchStep3LaserScan = async () => {
    if (!selectedFile) {
      setReceiptError("Veuillez d'abord sélectionner une capture d'écran du reçu.");
      return;
    }

    setStep(3);
    setIsAnalyzing(true);
    setOcrSuccess(false);
    setReceiptError(null);

    // Initialise progressive visual checkpoints
    setScanCheckRecipient('pending');
    setScanCheckAmount('pending');
    setScanCheckTimestamp('pending');
    setScanCheckUniqueness('pending');

    // Dynamic progressive indicators animation
    const t1 = setTimeout(() => setScanCheckRecipient('pending'), 400);
    const t2 = setTimeout(() => setScanCheckAmount('pending'), 1000);
    const t3 = setTimeout(() => setScanCheckTimestamp('pending'), 1600);
    const t4 = setTimeout(() => setScanCheckUniqueness('pending'), 2200);

    try {
      const res = await verifyReceiptImage({
        file: selectedFile,
        expectedAmount: payablePrice,
        documentTitle,
        userId: 'current-user',
        userEmail: 'candidat@dokya.sn',
        purpose: 'document_unlock'
      });

      if (res.success && res.status === 'COMPLETED') {
        // Complete all indicators to success
        setScanCheckRecipient('success');
        setScanCheckAmount('success');
        setScanCheckTimestamp('success');
        setScanCheckUniqueness('success');
        setOcrSuccess(true);

        const tx: TransactionRecord = {
          id: res.transactionId || `TX-${Date.now()}`,
          userId: 'current-user',
          type: 'document_purchase',
          amount: -payablePrice,
          currency: 'XOF',
          description: `Achat : ${documentTitle} (Scanner IA Laser - Ref: ${res.transactionId})`,
          status: 'COMPLETED',
          paymentMethod: res.method === 'wave' ? 'wave' : 'orange_money',
          createdAt: new Date().toISOString(),
          documentTitle
        };

        // Confirmation delay for the user to see the green laser & success badge
        setTimeout(() => {
          onPaymentSuccess('mobile_money', tx);
          onClose();
        }, 1500);
      } else {
        const err = res.error || 'Reçu non valide ou transaction expirée.';
        setReceiptError(err);
        
        // Target specifically the failed indicator
        if (res.errorCode === 'EXPIRED_RECEIPT' || err.toLowerCase().includes('expiré') || err.toLowerCase().includes('30 minutes')) {
          setScanCheckRecipient('success');
          setScanCheckAmount('success');
          setScanCheckTimestamp('failed');
          setScanCheckUniqueness('pending');
        } else if (res.errorCode === 'INVALID_RECIPIENT') {
          setScanCheckRecipient('failed');
          setScanCheckAmount('pending');
          setScanCheckTimestamp('pending');
          setScanCheckUniqueness('pending');
        } else if (res.errorCode === 'INSUFFICIENT_AMOUNT') {
          setScanCheckRecipient('success');
          setScanCheckAmount('failed');
          setScanCheckTimestamp('pending');
          setScanCheckUniqueness('pending');
        } else if (res.errorCode === 'ALREADY_USED') {
          setScanCheckRecipient('success');
          setScanCheckAmount('success');
          setScanCheckTimestamp('success');
          setScanCheckUniqueness('failed');
        } else {
          setScanCheckRecipient('failed');
          setScanCheckAmount('failed');
          setScanCheckTimestamp('failed');
          setScanCheckUniqueness('failed');
        }
      }
    } catch (err: any) {
      const errStr = err?.message || 'Reçu non valide ou déjà utilisé.';
      setReceiptError(errStr);
      if (errStr.toLowerCase().includes('expiré') || errStr.toLowerCase().includes('30 minutes')) {
        setScanCheckTimestamp('failed');
      } else {
        setScanCheckUniqueness('failed');
      }
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetReceipt = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setReceiptError(null);
    setOcrSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStep(2);
  };

  // Promo code validation
  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError('Veuillez saisir un code.');
      return;
    }

    setIsCheckingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const knownPromoDict: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
        'LIL': { type: 'percentage', val: 90, desc: 'Code spécial LIL (-90%)' },
        'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Admin PETER (Gratuit)' },
        'VIP100': { type: 'percentage', val: 100, desc: 'Code VIP (-100%)' },
        'ADMIN100': { type: 'percentage', val: 100, desc: 'Code Admin (-100%)' },
        'GRATUIT100': { type: 'percentage', val: 100, desc: 'Déblocage Gratuit (-100%)' },
        'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction' },
        'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise' },
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
            ? `Code "${cleanCode}" appliqué : 100% de réduction !` 
            : `Code "${cleanCode}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`,
          discountLabel
        };

        setAppliedPromo(promoInfo);
        setPromoSuccess(promoInfo.message);
        setPromoError(null);
        return;
      }

      try {
        const response = await fetch('/api/promo/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanCode, amount: originalPrice, documentTitle })
        });

        if (response.ok && response.status !== 405) {
          const data = await safeParseJsonResponse(response);
          if (data.success && data.valid) {
            const promoInfo: AppliedPromoInfo = {
              code: data.code || cleanCode,
              discountType: data.discountType || 'percentage',
              discountValue: data.discountValue || 0,
              discountAmount: data.discountAmount ?? (originalPrice - (data.finalAmount ?? 0)),
              originalAmount: data.originalAmount || originalPrice,
              finalAmount: data.finalAmount ?? Math.max(0, originalPrice - (data.discountAmount || 0)),
              isFree: Boolean(data.isFree || data.finalAmount === 0),
              message: data.message || `Code promo ${data.code} appliqué !`,
              discountLabel: data.discountLabel || (data.discountType === 'percentage' ? `-${data.discountValue}%` : `-${data.discountValue} FCFA`)
            };
            setAppliedPromo(promoInfo);
            setPromoSuccess(promoInfo.message);
            setPromoError(null);
            return;
          }
        }
      } catch (_e) {}

      throw new Error(`Code promo "${cleanCode}" invalide.`);
    } catch (err: any) {
      setPromoError(err.message || 'Code promo non reconnu.');
      setAppliedPromo(null);
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // 100% Free Promo Unlock
  const handleFreePromoUnlock = async () => {
    setIsRedeemingFree(true);
    try {
      const freeTx: TransactionRecord = {
        id: `TX-PROMO-FREE-${Date.now()}`,
        userId: 'guest',
        type: 'document_purchase',
        amount: 0,
        currency: 'XOF',
        description: `Déblocage Gratuit (${appliedPromo?.code}) : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: safeBalance,
        documentTitle
      };
      onPaymentSuccess('free', freeTx);
      onClose();
    } finally {
      setIsRedeemingFree(false);
    }
  };

  // Direct wallet debit
  const handleDebitWallet = async () => {
    setIsProcessingDebit(true);
    setErrorMessage(null);
    const newComputedBalance = Math.max(0, safeBalance - payablePrice);

    try {
      fetch('/api/wallet/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest',
          amount: payablePrice,
          currentBalance: safeBalance,
          documentTitle,
          promoCode: appliedPromo?.code
        })
      }).catch(() => {});

      const tx: TransactionRecord = {
        id: `TX-DEBIT-${Date.now()}`,
        userId: 'guest',
        type: 'document_purchase',
        amount: -payablePrice,
        currency: 'XOF',
        description: `Achat document : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: newComputedBalance,
        documentTitle
      };

      onPaymentSuccess('wallet', tx);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors du débit.');
    } finally {
      setIsProcessingDebit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      {/* Container compact (max-width: 490px) */}
      <div 
        id="compact-payment-wizard-modal"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[490px] border border-slate-200/90 overflow-hidden relative animate-in zoom-in-95 my-auto"
      >
        
        {/* ========================================================================= */}
        {/* HEADER COMPACT & STEPPER (Palette Nuit / Indigo / Laser)                  */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Guichet de Règlement Sécurisé</span>
            </div>

            {/* Stepper à 3 étapes */}
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-300">
              <span className={step === 1 ? 'text-amber-400 font-extrabold' : 'text-slate-400'}>1. Opérateur</span>
              <span className="text-slate-600">›</span>
              <span className={step === 2 ? 'text-sky-400 font-extrabold' : 'text-slate-400'}>2. Reçu</span>
              <span className="text-slate-600">›</span>
              <span className={step === 3 ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                {step === 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-0.5"></span>}
                3. Scanner IA
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div className="truncate pr-2">
              <h3 className="text-base font-black tracking-tight text-white truncate">
                {documentTitle}
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                {documentTypeLabel} • Déblocage immédiat
              </p>
            </div>

            <div className="shrink-0 text-right">
              {appliedPromo && appliedPromo.discountAmount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs line-through text-slate-400 font-semibold">
                    {(originalPrice || 0).toLocaleString('fr-FR')} F
                  </span>
                  <span className="text-lg font-black text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                    {isFreeWithPromo ? 'GRATUIT' : `${(payablePrice || 0).toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-black text-white bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/15">
                  {(originalPrice || 0).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPTION SOLDE PORTEFEUILLE EN HAUT (Si disponible)                         */}
        {/* ========================================================================= */}
        {safeBalance > 0 && !isAlreadyPaid && step !== 3 && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-700 font-medium text-[11px]">
                Solde : <strong className="text-slate-900 font-extrabold">{(safeBalance || 0).toLocaleString('fr-FR')} FCFA</strong>
              </span>
            </div>

            {hasEnoughBalance ? (
              <button
                type="button"
                onClick={handleDebitWallet}
                disabled={isProcessingDebit}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isProcessingDebit ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-300" />
                )}
                <span>Payer avec le solde</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRechargeModal();
                }}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
              >
                + Recharger
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CORPS DE LA MODALE                                                        */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 space-y-3.5">
          
          {/* Messages d'erreur globaux */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isAlreadyPaid ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-700 mb-1">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-emerald-900">Document déjà débloqué !</h4>
              <p className="text-xs text-emerald-700">Vous pouvez télécharger votre document directement.</p>
              <button
                type="button"
                onClick={() => {
                  onPaymentSuccess('free');
                  onClose();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Télécharger Immédiatement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : isFreeWithPromo ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-3 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-500 text-white">
                <Gift className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-emerald-950">Accès 100% Gratuit Offert !</h4>
              <p className="text-xs text-emerald-800">Votre coupon valide le déblocage sans aucun frais.</p>
              <button
                type="button"
                onClick={handleFreePromoUnlock}
                disabled={isRedeemingFree}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {isRedeemingFree ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Télécharger Gratuitement</span>
              </button>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* ÉTAPE 1 : CHOIX DU MOYEN DE PAIEMENT & NUMÉRO                            */}
              {/* ========================================================================= */}
              {step === 1 && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                      1. Sélectionnez votre opérateur
                    </label>

                    {/* 2 Cartes : Wave & Orange Money */}
                    <div className="grid grid-cols-2 gap-2.5">
                      
                      {/* WAVE */}
                      <button
                        type="button"
                        onClick={() => setSelectedOperator('wave')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer flex flex-col justify-between min-h-[96px] ${
                          selectedOperator === 'wave'
                            ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black shadow-xs">
                            <span className="text-xs tracking-tighter">🌊</span>
                          </div>
                          {selectedOperator === 'wave' && (
                            <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-black text-slate-900">Wave Sénégal</h4>
                          <p className="text-[10px] font-semibold text-sky-700">0% de frais</p>
                        </div>
                      </button>

                      {/* ORANGE MONEY */}
                      <button
                        type="button"
                        onClick={() => setSelectedOperator('orange_money')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer flex flex-col justify-between min-h-[96px] ${
                          selectedOperator === 'orange_money'
                            ? 'border-orange-500 bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-xs">
                            <span className="text-xs tracking-tighter">🍊</span>
                          </div>
                          {selectedOperator === 'orange_money' && (
                            <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-black text-slate-900">Orange Money</h4>
                          <p className="text-[10px] font-semibold text-orange-700">Sénégal & Maxit</p>
                        </div>
                      </button>

                    </div>
                  </div>

                  {/* Saisie Numéro de téléphone */}
                  <div className="space-y-1.5">
                    <label htmlFor="userPhoneInput" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Votre numéro de téléphone émetteur</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        🇸🇳 +221
                      </div>
                      <input
                        id="userPhoneInput"
                        type="tel"
                        value={userPhoneNumber}
                        onChange={(e) => {
                          setUserPhoneNumber(e.target.value);
                          if (phoneError) setPhoneError(null);
                        }}
                        placeholder="77 XXX XX XX"
                        className="w-full pl-18 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all shadow-2xs"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] font-semibold text-rose-600">{phoneError}</p>
                    )}
                  </div>

                  {/* Code Promo accordéon discret */}
                  <div className="pt-1">
                    {!showPromoBox && !appliedPromo ? (
                      <button
                        type="button"
                        onClick={() => setShowPromoBox(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer transition-all hover:underline"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Avez-vous un code promo ?</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Tag className="w-3 h-3 text-indigo-600" />
                            Code promo
                          </span>
                          {appliedPromo && (
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedPromo(null);
                                setPromoInput('');
                              }}
                              className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Retirer</span>
                            </button>
                          )}
                        </div>

                        {!appliedPromo ? (
                          <form onSubmit={handleApplyPromo} className="flex gap-1.5">
                            <input
                              type="text"
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                              placeholder="Ex: DAKAR2026, PROMO50"
                              className="flex-1 px-2.5 py-1.5 text-xs font-bold uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 font-mono"
                            />
                            <button
                              type="submit"
                              disabled={isCheckingPromo || !promoInput.trim()}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              {isCheckingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Appliquer'}
                            </button>
                          </form>
                        ) : (
                          <div className="text-[11px] text-emerald-800 font-bold">
                            ✓ {appliedPromo.message}
                          </div>
                        )}

                        {promoError && <p className="text-[10px] text-rose-600 font-semibold">{promoError}</p>}
                        {promoSuccess && <p className="text-[10px] text-emerald-700 font-bold">{promoSuccess}</p>}
                      </div>
                    )}
                  </div>

                  {/* Bouton d'action Étape 1 */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-700 hover:to-slate-950 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Suivant : Instructions & Reçu</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ÉTAPE 2 : INSTRUCTIONS DE TRANSFERT & SÉLECTION DU REÇU                   */}
              {/* ========================================================================= */}
              {step === 2 && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {/* Coordonnées Dokya avec copie rapide 1-clic */}
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <span>Coordonnées du bénéficiaire Dokya</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedOperator === 'wave' ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedOperator === 'wave' ? '🌊 Wave' : '🍊 Orange Money'}
                      </span>
                    </div>

                    {/* Ligne Numéro */}
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Numéro à créditer</span>
                        <strong className="text-xs font-black text-slate-900 font-mono tracking-wide">
                          {BENEFICIARY_PHONE}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(BENEFICIARY_PHONE, 'phone')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          copiedField === 'phone'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {copiedField === 'phone' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Ligne Nom du destinataire */}
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                      <div className="truncate pr-2">
                        <span className="text-[10px] text-slate-400 block font-semibold">Nom du destinataire</span>
                        <strong className="text-[11px] font-black text-slate-900 uppercase truncate block">
                          {BENEFICIARY_NAME}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(BENEFICIARY_NAME, 'name')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                          copiedField === 'name'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {copiedField === 'name' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      Envoyez <strong className="text-slate-900 font-black">{(payablePrice || 0).toLocaleString('fr-FR')} FCFA</strong> puis importez la capture du reçu ci-dessous.
                    </p>
                  </div>

                  {/* ZONE D'IMPORTATION DU REÇU */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      2. Capture d'écran du reçu
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={handleInputChange}
                    />

                    {!selectedFile ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-indigo-600 bg-indigo-50/80 scale-[0.99]'
                            : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Déposez la capture d'écran du reçu ici
                          </p>
                          <p className="text-[10px] text-slate-400">
                            ou <span className="text-indigo-600 underline font-semibold">parcourez vos photos</span> (PNG, JPG)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 truncate">
                            {previewUrl && (
                              <img
                                src={previewUrl}
                                alt="Reçu"
                                className="w-11 h-11 object-cover rounded-lg border border-slate-200 shadow-xs"
                              />
                            )}
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <FileCheck className="w-3 h-3" />
                                <span>Reçu prêt pour le scan IA ({(selectedFile.size / 1024).toFixed(1)} Ko)</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={resetReceipt}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] text-indigo-600 hover:underline font-bold block"
                        >
                          Changer d'image
                        </button>
                      </div>
                    )}

                    {receiptError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{receiptError}</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons de navigation Étape 2 */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={!selectedFile}
                      onClick={handleLaunchStep3LaserScan}
                      className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ScanLine className="w-4 h-4" />
                      <span>Lancer la vérification IA →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer py-1 w-full"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Modifier opérateur / numéro</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ÉTAPE 3 : EXAMEN DU REÇU PAR L'IA (SCANNER LASER HIGH-TECH)               */}
              {/* ========================================================================= */}
              {step === 3 && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {/* Cadre HUD Scanner Laser */}
                  <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-3 overflow-hidden shadow-2xl">
                    
                    {/* Grille d'arrière-plan cybernétique */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    {/* En-tête du Scanner */}
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 relative z-10">
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                        <ScanLine className="w-3.5 h-3.5 animate-pulse text-sky-400" />
                        <span>VISION OCR IA • SCAN EN DIRECT</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        ocrSuccess 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-sky-950 text-sky-300 border border-sky-500/40'
                      }`}>
                        {ocrSuccess ? 'CONFORME ✓' : 'ANALYSE ACTIVE'}
                      </span>
                    </div>

                    {/* Zone de l'image avec LIGNE LASER ANIMÉE */}
                    <div className="relative w-full h-48 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                      
                      {/* Coins HUD haute technologie */}
                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-sky-400 z-20" />
                      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-sky-400 z-20" />
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-sky-400 z-20" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-sky-400 z-20" />

                      {/* Image du Reçu */}
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Reçu sous analyse"
                          className="w-full h-full object-contain filter contrast-105 brightness-95"
                        />
                      ) : (
                        <div className="text-slate-500 text-xs">Reçu en cours d'analyse...</div>
                      )}

                      {/* Voile de balayage laser */}
                      {!ocrSuccess && (
                        <div className="absolute inset-0 bg-sky-500/10 pointer-events-none animate-laser-pulse" />
                      )}

                      {/* LIGNE HORIZONTALE LASER (Balayage continu 2s loop) */}
                      {!receiptError && (
                        <div 
                          className={`absolute left-0 right-0 h-0.5 z-30 transition-all duration-300 ${
                            ocrSuccess 
                              ? 'bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_35px_#059669]' 
                              : 'bg-sky-400 shadow-[0_0_18px_#38bdf8,0_0_30px_#0284c7] animate-laser-scan'
                          }`}
                          style={ocrSuccess ? { top: '50%' } : {}}
                        />
                      )}

                      {/* Badge flottant "Paiement Confirmé !" lors de la validation */}
                      {ocrSuccess && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-40 animate-in zoom-in-95">
                          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-[0_0_30px_#10b981]">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <span className="text-sm font-black text-emerald-300 tracking-wide uppercase">
                            Paiement Confirmé !
                          </span>
                          <span className="text-[11px] text-slate-300 font-medium mt-0.5">
                            Déblocage immédiat de votre document...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* VOYANTS DYNAMIQUES DE DÉTECTION PROGRESSIVE */}
                    <div className="mt-3 space-y-1.5 font-mono text-[11px]">
                      
                      {/* 1. Voyant Destinataire */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2 truncate pr-1">
                          <span className="text-sky-400">🔍</span>
                          <span className="text-slate-300 truncate">
                            Destinataire : <strong className="text-white">NGOUALA LAVOISIER...</strong>
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${
                          scanCheckRecipient === 'success' ? 'text-emerald-400' : 'text-sky-400 flex items-center gap-1'
                        }`}>
                          {scanCheckRecipient === 'success' ? '✓ Reconnu' : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </span>
                      </div>

                      {/* 2. Voyant Montant */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">💰</span>
                          <span className="text-slate-300">
                            Montant requis : <strong className="text-white">{(payablePrice || 0).toLocaleString('fr-FR')} FCFA</strong>
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${
                          scanCheckAmount === 'success' ? 'text-emerald-400' : 'text-amber-400 flex items-center gap-1'
                        }`}>
                          {scanCheckAmount === 'success' ? '✓ Conforme' : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </span>
                      </div>

                      {/* 3. Voyant Horodatage Récent (< 30 min) */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">⏱️</span>
                          <span className="text-slate-300">Horodatage (&lt; 30 min)</span>
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${
                          scanCheckTimestamp === 'success'
                            ? 'text-emerald-400'
                            : scanCheckTimestamp === 'failed'
                              ? 'text-rose-400'
                              : 'text-purple-400 flex items-center gap-1'
                        }`}>
                          {scanCheckTimestamp === 'success'
                            ? '✓ Récent (< 30 min)'
                            : scanCheckTimestamp === 'failed'
                              ? '✕ Expiré (> 30 min)'
                              : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </span>
                      </div>

                      {/* 4. Voyant Unicité */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400">🛡️</span>
                          <span className="text-slate-300">Contrôle d'unicité (Anti-Rejeu)</span>
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${
                          scanCheckUniqueness === 'success' 
                            ? 'text-emerald-400' 
                            : scanCheckUniqueness === 'failed'
                              ? 'text-rose-400'
                              : 'text-indigo-400 flex items-center gap-1'
                        }`}>
                          {scanCheckUniqueness === 'success' 
                            ? '✓ TxID Unique' 
                            : scanCheckUniqueness === 'failed'
                              ? '✕ Déjà utilisé'
                              : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* Gestion d'erreur & Réessai */}
                  {receiptError && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">{receiptError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={resetReceipt}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Importer un autre reçu</span>
                      </button>
                    </div>
                  )}

                  {!receiptError && !ocrSuccess && (
                    <p className="text-[11px] text-center text-slate-500 font-medium">
                      Examen automatique du reçu par l'IA en cours (-10s)...
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* FOOTER SÉCURITÉ COMPACT                                                   */}
          {/* ========================================================================= */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contrôle IA Anti-Fraude</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-slate-500">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Activation instantanée</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
