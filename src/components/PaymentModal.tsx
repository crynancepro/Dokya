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
  Tag, 
  Gift, 
  Check, 
  Copy, 
  Upload, 
  Smartphone, 
  ScanLine, 
  FileCheck,
  CreditCard,
  MessageCircle,
  Clock,
  Download,
  FileText
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { TransactionRecord } from '../types';
import { usePricing } from '../contexts/PricingContext';

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
  price?: number;
  userBalance: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isAlreadyPaid?: boolean;
  onPaymentSuccess: (method: 'wallet' | 'mobile_money' | 'free', transaction?: TransactionRecord) => void;
  onOpenRechargeModal: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  price,
  userBalance = 0,
  userId,
  userEmail,
  userName,
  isAlreadyPaid = false,
  onPaymentSuccess,
  onOpenRechargeModal
}) => {
  const { pricing, validatePromoCode } = usePricing();

  // Determine base price
  const getInitialPrice = () => {
    if (price && price > 0) return price;
    const labelLower = (documentTypeLabel || '').toLowerCase();
    if (labelLower.includes('full') || labelLower.includes('pack duo') || labelLower.includes('pack emploi') || labelLower.includes('cv + lettre')) {
      return pricing.fullPackPrice;
    }
    if (labelLower.includes('business') || labelLower.includes('devis + facture')) {
      return pricing.businessPackPrice;
    }
    if (labelLower.includes('lettre')) {
      return pricing.letterOnlyPrice;
    }
    if (labelLower.includes('devis')) {
      return pricing.devisPrice;
    }
    if (labelLower.includes('facture')) {
      return pricing.facturePrice;
    }
    if (labelLower.includes('ebook') || labelLower.includes('livre')) {
      return pricing.ebookPrice ?? 1500;
    }
    return pricing.cvOnlyPrice;
  };

  // Stepper: 1 = Choix Mode & Promo, 2 = Coordonnées & Preuve, 3 = Résultat (Active / Pending)
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'wallet' | 'card'>('wave');
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
    unlockedTitle?: string;
  }>({});

  // Promo code states
  const [showPromoBox, setShowPromoBox] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const originalPrice = price && price > 0 ? price : getInitialPrice();
  const safeBalance = Number(userBalance) || 0;
  const payablePrice = appliedPromo ? appliedPromo.finalAmount : originalPrice;
  const isFreeWithPromo = appliedPromo !== null && appliedPromo.isFree;
  const hasEnoughBalance = safeBalance >= payablePrice;

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

  // Promo Code Validation
  const handleApplyPromo = async () => {
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Veuillez saisir un code promo.");
      return;
    }

    setIsCheckingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const contextResult = await validatePromoCode(cleanCode, originalPrice);
      if (contextResult.valid && contextResult.promo) {
        const promoItem = contextResult.promo;
        const discountAmount = contextResult.discountAmount;
        const finalAmount = Math.max(0, originalPrice - discountAmount);
        const isFree = finalAmount === 0;
        const discountLabel = promoItem.discountType === 'percentage' ? `-${promoItem.discountValue}%` : `-${promoItem.discountValue} FCFA`;

        const promoInfo: AppliedPromoInfo = {
          code: cleanCode,
          discountType: promoItem.discountType,
          discountValue: promoItem.discountValue,
          discountAmount,
          originalAmount: originalPrice,
          finalAmount,
          isFree,
          message: isFree 
            ? `Code "${cleanCode}" appliqué : Déblocage 100% Gratuit !` 
            : `Code "${cleanCode}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`,
          discountLabel
        };

        setAppliedPromo(promoInfo);
        setPromoSuccess(promoInfo.message);
        return;
      }

      // Hardcoded quick fallback promos
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
        const discountAmount = item.type === 'percentage' 
          ? (item.val >= 100 ? originalPrice : Math.round((originalPrice * item.val) / 100))
          : Math.min(originalPrice, item.val);
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
        return;
      }

      setPromoError(`Code promo "${cleanCode}" non valide.`);
      setAppliedPromo(null);
    } catch (err: any) {
      setPromoError(err.message || "Erreur de validation du code.");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // 1. Direct Instant Payment with Wallet Balance
  const handlePayWithWallet = async () => {
    if (!hasEnoughBalance) {
      setErrorMessage(`Solde insuffisant (${safeBalance.toLocaleString('fr-FR')} FCFA). Rechargez votre solde ou payez par Wave / Orange Money.`);
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const newComputedBalance = Math.max(0, safeBalance - payablePrice);
      const rawTxId = `TX-WAL-${Date.now().toString().slice(-6)}`;

      fetch('/api/wallet/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          amount: payablePrice,
          currentBalance: safeBalance,
          documentTitle,
          promoCode: appliedPromo?.code
        })
      }).catch(() => {});

      const tx: TransactionRecord = {
        id: rawTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        type: 'document_purchase',
        amount: -payablePrice,
        currency: 'XOF',
        description: `Achat document : ${documentTitle}`,
        status: 'success',
        aiStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: newComputedBalance,
        documentTitle
      };

      setTimeout(() => {
        setIsProcessing(false);
        setValidationOutcome('active');
        setValidationDetails({
          txId: rawTxId,
          message: `Débit de ${payablePrice.toLocaleString('fr-FR')} FCFA effectué sur votre solde Wallet.`,
          unlockedTitle: documentTitle
        });
        onPaymentSuccess('wallet', tx);
      }, 700);
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMessage(e.message || "Erreur lors du débit de votre solde.");
    }
  };

  // 2. Free promo redemption
  const handleFreePromoUnlock = () => {
    const freeTx: TransactionRecord = {
      id: `TX-PROMO-${Date.now().toString().slice(-6)}`,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: 'document_purchase',
      amount: 0,
      currency: 'XOF',
      description: `Déblocage gratuit (${appliedPromo?.code}) : ${documentTitle}`,
      status: 'success',
      aiStatus: 'COMPLETED',
      createdAt: new Date().toISOString(),
      paymentMethod: 'free',
      newBalance: safeBalance,
      documentTitle
    };

    setValidationOutcome('active');
    setValidationDetails({
      txId: freeTx.id,
      message: `Document débloqué gratuitement grâce au code promo "${appliedPromo?.code}".`,
      unlockedTitle: documentTitle
    });
    onPaymentSuccess('free', freeTx);
  };

  // 3. Instant AI Receipt OCR Validation (Gemini Vision)
  const handleAiScanValidation = async () => {
    if (!selectedFile) {
      setErrorMessage("Veuillez téléverser la capture d'écran ou le reçu de votre transfert.");
      return;
    }

    setIsAiScanning(true);
    setErrorMessage(null);

    try {
      const result = await verifyReceiptImage({
        file: selectedFile,
        expectedAmount: payablePrice,
        documentTitle: `${documentTypeLabel} : ${documentTitle}`,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        purpose: 'document_unlock'
      });

      if (result.success && result.status === 'COMPLETED') {
        const tx: TransactionRecord = {
          id: result.transactionId || `TX-${Date.now()}`,
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          type: 'document_purchase',
          amount: -payablePrice,
          currency: 'XOF',
          description: `Achat ${documentTypeLabel} : ${documentTitle} (Scanner IA)`,
          status: 'COMPLETED',
          aiStatus: 'VALIDATED_BY_AI',
          paymentMethod: result.method === 'wave' ? 'wave' : 'orange_money',
          createdAt: new Date().toISOString(),
          documentTitle,
          senderPhone: result.senderPhone || senderPhone,
          receiptImage: previewUrl || undefined
        };

        setValidationOutcome('active');
        setValidationDetails({
          txId: result.transactionId,
          message: result.message || "Reçu officiel validé par l'IA Dokya. Document débloqué !",
          senderPhone: result.senderPhone || senderPhone,
          unlockedTitle: documentTitle
        });
        onPaymentSuccess('mobile_money', tx);
      } else {
        setErrorMessage(
          result.error || 
          "L'IA n'a pas pu certifier automatiquement ce reçu. Vous pouvez transmettre la preuve pour validation manuelle par l'équipe en 1 clic."
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'analyse du reçu. Vous pouvez soumettre pour validation manuelle.");
    } finally {
      setIsAiScanning(false);
    }
  };

  // 4. Submit for Manual Validation (Status: 'pending')
  const handleSubmitForManualValidation = async () => {
    if (!senderPhone && !transactionRef && !selectedFile) {
      setErrorMessage("Veuillez fournir au moins une capture d'écran, une référence ou votre numéro de téléphone émetteur.");
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

      const res = await fetch('/api/documents/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          documentTitle,
          documentTypeLabel,
          amount: payablePrice,
          paymentMethod: selectedMethod,
          senderPhone,
          transactionReference: transactionRef,
          receiptImage: receiptBase64.slice(0, 300000)
        })
      });

      const data = await res.json();
      const generatedTxId = data.transactionId || `REF-DOC-${Date.now().toString().slice(-6)}`;

      const pendingTx: TransactionRecord = {
        id: generatedTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        type: 'document_purchase',
        amount: -payablePrice,
        currency: 'XOF',
        description: `Achat ${documentTypeLabel} : ${documentTitle} (En attente de validation)`,
        status: 'pending',
        aiStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        documentTitle,
        senderPhone: senderPhone || undefined,
        transactionReference: transactionRef || generatedTxId,
        receiptImage: previewUrl || undefined
      };

      setValidationOutcome('pending');
      setValidationDetails({
        txId: generatedTxId,
        message: data.message || "Votre preuve d'achat a été enregistrée avec succès.",
        senderPhone,
        unlockedTitle: documentTitle
      });

      onPaymentSuccess('mobile_money', pendingTx);
    } catch (e: any) {
      setErrorMessage(e.message || "Erreur lors de la transmission de la demande.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsAppSupport = () => {
    const message = encodeURIComponent(
      `Bonjour Dokya AI, je viens d'effectuer le paiement de ${payablePrice.toLocaleString('fr-FR')} FCFA pour mon document "${documentTitle}" par ${selectedMethod.toUpperCase()}.\nNuméro émetteur: ${senderPhone || 'Non précisé'}\nRéférence: ${transactionRef || 'Reçu en pièce jointe'}\nMerci de valider et débloquer mon document !`
    );
    window.open(`https://wa.me/221789619088?text=${message}`, '_blank');
  };

  return (
    <div id="document-payment-guichet-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
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
                🟢 Document Débloqué Immédiatement
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Paiement Validé avec Succès !</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre document <span className="font-bold text-amber-300">« {documentTitle} »</span> est désormais prêt au téléchargement complet sans filigrane en formats PDF et Word.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Document :</span>
                <span className="text-white font-bold truncate max-w-[220px]">{documentTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Montant réglé :</span>
                <span className="text-amber-400 font-bold">{payablePrice.toLocaleString('fr-FR')} FCFA</span>
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
                <Download className="w-4 h-4" />
                <span>Télécharger Mon Document Maintenant</span>
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
                ⏳ En Attente de Validation Administrative
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Preuve Transmise avec Succès !</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre demande de déblocage pour <span className="font-bold text-amber-300">« {documentTitle} »</span> a été enregistrée. Notre équipe effectue la validation sous <strong>5 à 15 minutes</strong>.
              </p>
            </div>

            {/* Validation Progress Stepper */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Document concerné :</span>
                <span className="text-white font-bold truncate max-w-[200px]">{documentTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Montant à valider :</span>
                <span className="text-amber-400 font-bold">{payablePrice.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {validationDetails.txId && (
                <div className="flex justify-between text-slate-400">
                  <span>Numéro de dossier :</span>
                  <span className="text-amber-400 font-mono font-bold">{validationDetails.txId}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Délai d'activation estimé :</span>
                <span className="text-emerald-400 font-bold">5 à 15 minutes</span>
              </div>
            </div>

            {/* WhatsApp Quick Notification */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-left text-emerald-200 flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">Besoin d'un déblocage express en 2 minutes ?</p>
                <p className="text-[11px] text-slate-300">
                  Envoyez un message rapide sur notre WhatsApp officiel avec votre capture.
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
        {/* STEP 1 : CHOIX DU MODE DE PAIEMENT & CODE PROMO                            */}
        {/* ========================================================================= */}
        {validationOutcome === null && step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">
                  Étape 1/2 • Guichet d'Achat Document Dokya
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white truncate">{documentTitle}</h3>
              </div>
            </div>

            {/* Document Info Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Type de document</p>
                <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>{documentTypeLabel || 'Document Professionnel'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Montant à régler</p>
                {appliedPromo && appliedPromo.discountAmount > 0 ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs line-through text-slate-500">{originalPrice.toLocaleString('fr-FR')} F</span>
                    <span className="text-xl font-black text-emerald-400">
                      {isFreeWithPromo ? 'GRATUIT' : `${payablePrice.toLocaleString('fr-FR')} FCFA`}
                    </span>
                  </div>
                ) : (
                  <p className="text-xl font-black text-amber-400">{originalPrice.toLocaleString('fr-FR')} FCFA</p>
                )}
              </div>
            </div>

            {/* Promo Code Accordion */}
            <div className="space-y-2">
              {!showPromoBox && !appliedPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromoBox(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Vous avez un code promo ou coupon ?</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      Code Réduction / Promo
                    </span>
                    {appliedPromo && (
                      <button
                        type="button"
                        onClick={() => { setAppliedPromo(null); setPromoSuccess(null); }}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Supprimer le code
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: PROMO50, PETER, DAKAR2026"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono uppercase focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={isCheckingPromo || !promoInput.trim()}
                      onClick={handleApplyPromo}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                    </button>
                  </div>

                  {promoSuccess && (
                    <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {promoSuccess}
                    </p>
                  )}
                  {promoError && (
                    <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {promoError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Free with Promo Action */}
            {isFreeWithPromo ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-300">Déblocage 100% Gratuit Validé !</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Votre coupon vous offre ce document sans aucun frais.</p>
                </div>
                <button
                  type="button"
                  onClick={handleFreePromoUnlock}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Débloquer et Télécharger Gratuitement</span>
                </button>
              </div>
            ) : (
              <>
                {/* Select Payment Method */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Choisissez votre moyen de paiement :
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Wave Mobile Money */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('wave')}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        selectedMethod === 'wave'
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>Wave Mobile Money</span>
                          <span className="text-[9px] bg-blue-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">Recommandé</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Sans frais • Validation instantanée</p>
                      </div>
                    </button>

                    {/* 2. Orange Money */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('orange_money')}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        selectedMethod === 'orange_money'
                          ? 'bg-orange-600/20 border-orange-500 text-white shadow-md ring-1 ring-orange-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-white">Orange Money Sénégal</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Transfert #144# ou App Max It</p>
                      </div>
                    </button>

                    {/* 3. Solde Dokya Wallet */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('wallet')}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        selectedMethod === 'wallet'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Wallet className={`w-5 h-5 mt-0.5 shrink-0 ${hasEnoughBalance ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white">Solde Dokya Wallet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Solde : <span className={hasEnoughBalance ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {safeBalance.toLocaleString('fr-FR')} F
                          </span>
                        </p>
                      </div>
                    </button>

                    {/* 4. Carte Bancaire */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('card')}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        selectedMethod === 'card'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-white">Carte Bancaire / Autres</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Visa, Mastercard, Free Money</p>
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

                {/* Wallet Insufficient Warning */}
                {selectedMethod === 'wallet' && !hasEnoughBalance && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
                    <span>Solde insuffisant ({safeBalance.toLocaleString('fr-FR')} F).</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRechargeModal();
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black cursor-pointer hover:bg-amber-400 text-[11px]"
                    >
                      Recharger +
                    </button>
                  </div>
                )}

                {/* Step 1 Action Button */}
                <div className="pt-2">
                  {selectedMethod === 'wallet' ? (
                    <button
                      type="button"
                      disabled={isProcessing || !hasEnoughBalance}
                      onClick={handlePayWithWallet}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Débit en cours...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Payer par Solde ({payablePrice.toLocaleString('fr-FR')} FCFA) & Débloquer</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setStep(2);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <span>Continuer vers la procédure de transfert</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2 : PROCÉDURE DE TRANSFERT & ENVOI DU REÇU                            */}
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
                <span>Changer de mode</span>
              </button>

              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                Étape 2/2 • Procédure & Preuve
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
                    <p className="text-[10px] text-slate-400">Montant exact à transférer</p>
                    <p className="text-sm font-black text-amber-400 font-mono">{payablePrice.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(payablePrice), 'amount')}
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
                Procédure à suivre pour débloquer « {documentTitle} » :
              </p>
              <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300">
                <li>Ouvrez votre application <strong>{selectedMethod === 'wave' ? 'Wave' : 'Orange Money (#144# / Max it)'}</strong>.</li>
                <li>Effectuez le transfert de <strong>{payablePrice.toLocaleString('fr-FR')} FCFA</strong> vers le <strong>{BENEFICIARY_PHONE}</strong>.</li>
                <li>Faites une <strong>capture d'écran</strong> nette du reçu de confirmation.</li>
                <li>Téléversez l'image ci-dessous pour une <strong>validation instantanée par scanner IA (3 sec)</strong> ou transmettez votre référence.</li>
              </ol>
            </div>

            {/* Receipt Upload & Inputs Form */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Preuve de paiement (Reçu ou capture) :</span>
                <span className="text-[10px] text-amber-400 font-normal">Recommandé pour validation en 3 sec</span>
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
                    ? 'border-indigo-400 bg-indigo-500/10' 
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">Réf. transaction (si visible) :</label>
                  <input
                    type="text"
                    placeholder="Ex: TX-98214-SN"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
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
                    <span>Valider Instantanément par Scanner IA (3 sec)</span>
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
                    <span>Transmission en cours...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
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
