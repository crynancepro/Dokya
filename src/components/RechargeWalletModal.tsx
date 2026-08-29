import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Zap, 
  Sparkles,
  Copy, 
  Upload, 
  Smartphone, 
  ScanLine, 
  FileCheck,
  CreditCard,
  MessageCircle,
  Clock,
  Check
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { TransactionRecord } from '../types';

interface RechargeWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  userBalance?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  onRechargeSuccess?: (addedAmount: number, transaction: TransactionRecord) => void;
  onSuccess?: (addedAmount: number, transaction?: TransactionRecord) => void;
}

export const RechargeWalletModal: React.FC<RechargeWalletModalProps> = ({
  isOpen,
  onClose,
  currentBalance: propCurrentBalance,
  userBalance: propUserBalance,
  userId,
  userEmail,
  userName,
  onRechargeSuccess,
  onSuccess
}) => {
  const currentBalance = propCurrentBalance ?? propUserBalance ?? 0;

  // Stepper: 1 = Montant & Opérateur, 2 = Coordonnées & Preuve, 3 = Résultat (Active / Pending)
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAmount, setSelectedAmount] = useState<number>(3000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'card'>('wave');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // Official Beneficiary Info
  const BENEFICIARY_PHONE = '+221 78 961 90 88';
  const BENEFICIARY_NAME = 'NGOUALA LAVOISIER FORTUNE PETER';
  const [copiedField, setCopiedField] = useState<'phone' | 'amount' | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing & AI Verification States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationOutcome, setValidationOutcome] = useState<'active' | 'pending' | null>(null);
  const [validationDetails, setValidationDetails] = useState<{
    txId?: string;
    message?: string;
    senderPhone?: string;
    addedAmount?: number;
    newBalance?: number;
  }>({});

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const presetAmounts = [1000, 2000, 3000, 5000, 10000];
  const parsedCustom = Number(customAmount);
  const validCustom = !isNaN(parsedCustom) && parsedCustom > 0 ? parsedCustom : 0;
  const effectiveAmount = isCustom ? validCustom : selectedAmount;
  const projectedBalance = currentBalance + effectiveAmount;

  const handleCopy = (text: string, field: 'phone' | 'amount') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage("Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("L'image est trop volumineuse (max 8 Mo).");
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  // Move from Step 1 to Step 2
  const handleProceedToStep2 = () => {
    if (effectiveAmount < 500) {
      setErrorMessage("Le montant minimum de recharge est de 500 FCFA.");
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // 1. Instant AI Receipt OCR Validation (Gemini Vision)
  const handleAiScanValidation = async () => {
    if (!selectedFile) {
      setErrorMessage("Veuillez téléverser la capture d'écran du reçu de votre recharge.");
      return;
    }

    setIsAiScanning(true);
    setErrorMessage(null);

    try {
      const result = await verifyReceiptImage({
        file: selectedFile,
        expectedAmount: effectiveAmount,
        documentTitle: `Recharge Solde (${effectiveAmount.toLocaleString('fr-FR')} FCFA)`,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        purpose: 'wallet_recharge'
      });

      if (result.success && result.status === 'COMPLETED') {
        const added = result.amount || effectiveAmount;
        const newBalance = (result.newBalance !== undefined) ? result.newBalance : (currentBalance + added);

        const newTx: TransactionRecord = {
          id: result.transactionId || `TX-REC-${Date.now()}`,
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          type: 'recharge',
          amount: added,
          currency: 'XOF',
          description: `Recharge Solde Wallet (+${added.toLocaleString('fr-FR')} FCFA via Scanner IA)`,
          status: 'COMPLETED',
          aiStatus: 'VALIDATED_BY_AI',
          paymentMethod: result.method === 'wave' ? 'wave' : 'orange_money',
          createdAt: new Date().toISOString(),
          newBalance,
          senderPhone: result.senderPhone || senderPhone,
          receiptImage: previewUrl || undefined
        };

        setValidationOutcome('active');
        setValidationDetails({
          txId: result.transactionId,
          message: result.message || `Votre solde Dokya a été crédité de ${added.toLocaleString('fr-FR')} FCFA avec succès !`,
          senderPhone: result.senderPhone || senderPhone,
          addedAmount: added,
          newBalance
        });

        if (onRechargeSuccess) onRechargeSuccess(added, newTx);
        if (onSuccess) onSuccess(added, newTx);
      } else {
        setErrorMessage(
          result.error || 
          "L'IA n'a pas pu certifier automatiquement ce reçu de recharge. Vous pouvez transmettre la preuve pour validation manuelle par l'équipe en 1 clic."
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'analyse du reçu. Vous pouvez soumettre pour validation manuelle.");
    } finally {
      setIsAiScanning(false);
    }
  };

  // 2. Submit for Manual Validation (Pending)
  const handleSubmitForManualValidation = async () => {
    if (!senderPhone && !transactionRef && !selectedFile) {
      setErrorMessage("Veuillez fournir au moins une capture d'écran, une référence ou votre numéro expéditeur.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let receiptBase64 = '';
      if (selectedFile) {
        const reader = new FileReader();
        receiptBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const res = await fetch('/api/recharge/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          amount: effectiveAmount,
          paymentMethod: selectedMethod,
          senderPhone,
          transactionReference: transactionRef,
          receiptImage: receiptBase64.slice(0, 300000)
        })
      });

      const data = await res.json();
      const generatedTxId = data.transactionId || `REF-REC-${Date.now().toString().slice(-6)}`;

      const pendingTx: TransactionRecord = {
        id: generatedTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        type: 'recharge',
        amount: effectiveAmount,
        currency: 'XOF',
        description: `Recharge Solde Wallet (+${effectiveAmount.toLocaleString('fr-FR')} FCFA - En attente)`,
        status: 'pending',
        aiStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        senderPhone: senderPhone || undefined,
        transactionReference: transactionRef || generatedTxId,
        receiptImage: previewUrl || undefined
      };

      setValidationOutcome('pending');
      setValidationDetails({
        txId: generatedTxId,
        message: data.message || "Votre demande de recharge a été transmise avec succès.",
        senderPhone,
        addedAmount: effectiveAmount
      });

      if (onRechargeSuccess) onRechargeSuccess(0, pendingTx);
      if (onSuccess) onSuccess(0, pendingTx);
    } catch (e: any) {
      setErrorMessage(e.message || "Erreur lors de la transmission de la demande.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsAppSupport = () => {
    const message = encodeURIComponent(
      `Bonjour Dokya AI, je viens d'effectuer un rechargement de ${effectiveAmount.toLocaleString('fr-FR')} FCFA par ${selectedMethod.toUpperCase()}.\nNuméro émetteur: ${senderPhone || 'Non précisé'}\nRéférence: ${transactionRef || 'Reçu en pièce jointe'}\nMerci de créditer mon compte sans délai !`
    );
    window.open(`https://wa.me/221789619088?text=${message}`, '_blank');
  };

  return (
    <div id="wallet-recharge-guichet-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* OUTCOME SCREENS (ACTIVE OR PENDING)                                       */}
        {/* ========================================================================= */}
        {validationOutcome === 'active' && (
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🟢 Solde Crédité Immédiatement
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Recharge Effectuée avec Succès !</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre compte a été crédité de <strong className="text-amber-400 font-black">+{(validationDetails.addedAmount || effectiveAmount).toLocaleString('fr-FR')} FCFA</strong>. Votre nouveau solde est disponible immédiatement.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Montant crédité :</span>
                <span className="text-amber-400 font-bold">+{(validationDetails.addedAmount || effectiveAmount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Nouveau solde total :</span>
                <span className="text-emerald-400 font-black text-sm">{(validationDetails.newBalance ?? projectedBalance).toLocaleString('fr-FR')} FCFA</span>
              </div>
              {validationDetails.txId && (
                <div className="flex justify-between text-slate-400">
                  <span>Réf. Transaction :</span>
                  <span className="text-indigo-300 font-mono">{validationDetails.txId}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <span>Utiliser mon Solde Immédiatement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {validationOutcome === 'pending' && (
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⏳ Recharge en Attente de Validation Administrative
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Demande de Recharge Enregistrée !</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre preuve de paiement pour une recharge de <strong className="text-amber-400 font-black">{effectiveAmount.toLocaleString('fr-FR')} FCFA</strong> a été transmise. Notre équipe valide et crédite votre solde sous <strong>5 à 15 minutes</strong>.
              </p>
            </div>

            {/* Validation Progress Stepper */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Montant à créditer :</span>
                <span className="text-amber-400 font-bold">{effectiveAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {validationDetails.txId && (
                <div className="flex justify-between text-slate-400">
                  <span>Numéro de dossier :</span>
                  <span className="text-amber-400 font-mono font-bold">{validationDetails.txId}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Délai de traitement :</span>
                <span className="text-emerald-400 font-bold">5 à 15 minutes</span>
              </div>
            </div>

            {/* WhatsApp Quick Notification */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-left text-emerald-200 flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">Besoin d'un rechargement express en 2 minutes ?</p>
                <p className="text-[11px] text-slate-300">
                  Envoyez votre capture d'écran directement sur notre WhatsApp officiel pour un crédit immédiat.
                </p>
                <button
                  type="button"
                  onClick={openWhatsAppSupport}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 hover:text-emerald-300 underline cursor-pointer mt-1"
                >
                  Ouvrir WhatsApp (+221 78 961 90 88) →
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Fermer et suivre l'état sur mon Tableau de Bord</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1 : CHOIX DU MONTANT & OPÉRATEUR                                     */}
        {/* ========================================================================= */}
        {validationOutcome === null && step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Étape 1/2 • Guichet de Rechargement Solde Wallet
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">Créditer mon Solde Dokya</h3>
              </div>
            </div>

            {/* Current Balance Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Solde actuel disponible</p>
                <p className="text-base font-black text-emerald-400 mt-0.5">
                  {currentBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Solde après recharge</p>
                <p className="text-xl font-black text-amber-400">
                  {projectedBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Sélectionnez le montant de la recharge :
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {presetAmounts.map((amt) => {
                  const isSelected = !isCustom && selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setIsCustom(false);
                        setCustomAmount('');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-[1.02]'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {amt.toLocaleString('fr-FR')} F
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Field */}
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Ou saisissez un autre montant (FCFA)..."
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setIsCustom(true);
                    }}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs text-white placeholder-slate-600 focus:outline-hidden ${
                      isCustom && validCustom > 0 ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-slate-800'
                    }`}
                  />
                  {isCustom && validCustom > 0 && (
                    <span className="text-xs font-bold text-amber-400 shrink-0">
                      = {validCustom.toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Select Payment Operator */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Choisissez votre moyen de paiement :
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Wave */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('wave')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedMethod === 'wave'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Wave Sénégal</p>
                    <p className="text-[10px] text-slate-400">Sans frais • 0%</p>
                  </div>
                </button>

                {/* Orange Money */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('orange_money')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedMethod === 'orange_money'
                      ? 'bg-orange-600/20 border-orange-500 text-white shadow-md ring-1 ring-orange-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Orange Money</p>
                    <p className="text-[10px] text-slate-400">#144# / Max It</p>
                  </div>
                </button>

                {/* Carte Bancaire */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedMethod === 'card'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Carte Bancaire</p>
                    <p className="text-[10px] text-slate-400">Visa, Mastercard</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1 Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <span>Recharger {effectiveAmount.toLocaleString('fr-FR')} FCFA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2 : PROCÉDURE DE RECHARGE & ENVOI DU REÇU                            */}
        {/* ========================================================================= */}
        {validationOutcome === null && step === 2 && (
          <div className="space-y-5 animate-in fade-in">
            {/* Step 2 Header & Back */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier le montant</span>
              </button>

              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Étape 2/2 • Procédure & Preuve de Recharge
              </span>
            </div>

            {/* Official Beneficiary Details Card */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 border-2 border-indigo-500/50 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Coordonnées Officielles Dokya AI
                </span>
                <span className="text-xs font-bold text-amber-300">
                  {selectedMethod === 'wave' ? 'Wave Direct' : selectedMethod === 'orange_money' ? 'Orange Money' : 'Mobile Money'}
                </span>
              </div>

              {/* Number to Transfer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Numéro Mobile Money agréé</p>
                    <p className="text-sm font-black text-white font-mono">{BENEFICIARY_PHONE}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('789619088', 'phone')}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'phone' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Montant exact de recharge</p>
                    <p className="text-sm font-black text-amber-400 font-mono">{effectiveAmount.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(effectiveAmount), 'amount')}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedField === 'amount' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'amount' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Destinataire officiel : <strong>{BENEFICIARY_NAME}</strong></span>
                <span className="text-emerald-400 text-[10px] font-bold">Compte certifié ✓</span>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider text-slate-400">
                Procédure de recharge de votre Solde :
              </p>
              <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300">
                <li>Ouvrez votre application <strong>{selectedMethod === 'wave' ? 'Wave' : 'Orange Money (#144# / Max It)'}</strong>.</li>
                <li>Transférez le montant de <strong>{effectiveAmount.toLocaleString('fr-FR')} FCFA</strong> vers le <strong>{BENEFICIARY_PHONE}</strong>.</li>
                <li>Faites une <strong>capture d'écran</strong> nette du reçu de confirmation.</li>
                <li>Téléversez l'image ci-dessous pour une <strong>créditation instantanée par scanner IA (3 sec)</strong> ou transmettez votre référence.</li>
              </ol>
            </div>

            {/* Receipt Upload & Inputs Form */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Preuve de recharge (Reçu ou capture) :</span>
                <span className="text-[10px] text-amber-400 font-normal">Recommandé pour crédit en 3 sec</span>
              </label>

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-emerald-400 bg-emerald-500/10' 
                    : previewUrl 
                    ? 'border-emerald-500/60 bg-emerald-500/5' 
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Reçu"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-700 shadow-md"
                    />
                    <div className="text-left text-xs">
                      <p className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reçu sélectionné : {selectedFile?.name.slice(0, 20)}...
                      </p>
                      <p className="text-[10px] text-slate-400">Cliquez pour changer d'image</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-white">Cliquez ou glissez la capture de votre reçu</p>
                    <p className="text-[10px] text-slate-500">Formats supportés : JPG, PNG, WEBP (Max 8 Mo)</p>
                  </div>
                )}
              </div>

              {/* Optional Phone & Ref Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">Votre numéro expéditeur :</label>
                  <input
                    type="tel"
                    placeholder="Ex: 77 123 45 67"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">Réf. transaction (si visible) :</label>
                  <input
                    type="text"
                    placeholder="Ex: TX-98214-SN"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Dual Action Buttons : Instant AI Scan OR Manual Submit */}
            <div className="space-y-2.5 pt-1">
              {/* Button A: Instant AI Scan */}
              <button
                type="button"
                disabled={isAiScanning || isProcessing || !selectedFile}
                onClick={handleAiScanValidation}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isAiScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyse Scanner IA en cours (3 sec)...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    <span>Valider & Créditer Instantanément par Scanner IA (3 sec)</span>
                  </>
                )}
              </button>

              {/* Button B: Submit for Manual Validation (Pending) */}
              <button
                type="button"
                disabled={isProcessing || isAiScanning}
                onClick={handleSubmitForManualValidation}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmission de la recharge...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Transmettre pour Validation Manuelle (5-15 min)</span>
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Quick Help */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={openWhatsAppSupport}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Assistance WhatsApp & Validation Express Directe (+221 78 961 90 88)</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
