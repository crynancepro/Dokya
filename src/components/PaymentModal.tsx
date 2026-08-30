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
  Download, 
  FileText,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Clock,
  HelpCircle,
  QrCode,
  Lock,
  BadgePercent,
  CheckCircle
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { TransactionRecord } from '../types';
import { usePricing } from '../contexts/PricingContext';

// Supported West & Central African Countries + International
interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  example: string;
}

const AFRICAN_COUNTRIES: CountryOption[] = [
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', example: '77 123 45 67' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', example: '07 12 34 56 78' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', example: '70 12 34 56' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', example: '70 12 34 56' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳', example: '620 12 34 56' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', example: '6 70 12 34 56' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬', example: '06 123 45 67' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', example: '074 12 34 56' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', example: '90 12 34 56' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯', example: '97 12 34 56' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', example: '90 12 34 56' },
  { code: 'OTHER', name: 'Autre / International', dialCode: '+', flag: '🌍', example: 'Numéro complet' }
];

// Official Wave Payment Link
const WAVE_OFFICIAL_URL = 'https://pay.wave.com/m/M_sn_wXlszdyVZOIV/c/sn/';
const BENEFICIARY_PHONE = '+221 78 961 90 88';
const BENEFICIARY_NAME = 'NGOUALA LAVOISIER FORTUNÉ PETER';

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
  onDownloadPDF?: () => void;
  onDownloadDocx?: () => void;
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
  onOpenRechargeModal,
  onDownloadPDF,
  onDownloadDocx
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

  // Tunnel in 3 Steps: 1 = Mode, 2 = Paiement & Reçu, 3 = Scan IA & Validation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'wallet'>('wave');
  
  // Country and Phone
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(AFRICAN_COUNTRIES[0]);
  const [senderPhoneNumber, setSenderPhoneNumber] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // UI state
  const [copiedField, setCopiedField] = useState<'phone' | 'name' | 'amount' | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Scanner & Processing States
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [scanPhase, setScanPhase] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationOutcome, setValidationOutcome] = useState<'success' | 'pending' | 'failed' | null>(null);
  const [validationDetails, setValidationDetails] = useState<{
    txId?: string;
    message?: string;
    senderPhone?: string;
    unlockedTitle?: string;
    amount?: number;
  }>({});

  // Promo code states
  const [showPromoBox, setShowPromoBox] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Clean object URL on unmount or replace
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Reset modal state when closed or opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage(null);
      setValidationOutcome(null);
      setScanPhase(0);
      setIsAiScanning(false);
      setAppliedPromo(null);
      setPromoInput('');
      setPromoError(null);
      setPromoSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const originalPrice = price && price > 0 ? price : getInitialPrice();
  const safeBalance = Number(userBalance) || 0;
  const payablePrice = appliedPromo ? appliedPromo.finalAmount : originalPrice;
  const isFreeWithPromo = appliedPromo !== null && appliedPromo.isFree;
  const hasEnoughBalance = safeBalance >= payablePrice;

  // Copy helper
  const handleCopy = (text: string, field: 'phone' | 'name' | 'amount') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // File selection
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

      // Hardcoded fallback promos
      const knownPromoDict: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
        'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Admin PETER (Gratuit)' },
        'VIP100': { type: 'percentage', val: 100, desc: 'Code VIP (-100%)' },
        'ADMIN100': { type: 'percentage', val: 100, desc: 'Code Admin (-100%)' },
        'GRATUIT100': { type: 'percentage', val: 100, desc: 'Déblocage Gratuit (-100%)' },
        'LIL': { type: 'percentage', val: 90, desc: 'Code spécial LIL (-90%)' },
        'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction' },
        'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise' },
        'TERANGA20': { type: 'percentage', val: 20, desc: '20% de réduction' }
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
            ? `Code "${cleanCode}" appliqué : Déblocage 100% Gratuit !` 
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

  // Wallet Instant Payment
  const handlePayWithWallet = async () => {
    if (!hasEnoughBalance) {
      setErrorMessage(`Solde insuffisant (${safeBalance.toLocaleString('fr-FR')} FCFA).`);
      return;
    }

    setCurrentStep(3);
    setIsAiScanning(true);
    setScanPhase(1);
    setErrorMessage(null);

    const fullPhone = senderPhoneNumber ? `${selectedCountry.dialCode} ${senderPhoneNumber}` : undefined;
    const rawTxId = `TX-WAL-${Date.now().toString().slice(-6)}`;

    // Animate phase
    setTimeout(() => setScanPhase(2), 300);
    setTimeout(() => setScanPhase(3), 600);

    try {
      const newComputedBalance = Math.max(0, safeBalance - payablePrice);

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
        description: `Achat ${documentTypeLabel} : ${documentTitle}`,
        status: 'COMPLETED',
        aiStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: newComputedBalance,
        documentTitle,
        senderPhone: fullPhone
      };

      setTimeout(() => {
        setIsAiScanning(false);
        setValidationOutcome('success');
        setValidationDetails({
          txId: rawTxId,
          amount: payablePrice,
          message: `Débit de ${payablePrice.toLocaleString('fr-FR')} FCFA effectué sur votre solde Dokya Wallet.`,
          unlockedTitle: documentTitle,
          senderPhone: fullPhone
        });
        onPaymentSuccess('wallet', tx);
      }, 900);
    } catch (e: any) {
      setIsAiScanning(false);
      setValidationOutcome('failed');
      setErrorMessage(e.message || "Erreur lors du débit de votre solde.");
    }
  };

  // Free Promo Unlock
  const handleFreePromoUnlock = () => {
    setCurrentStep(3);
    setIsAiScanning(true);
    setScanPhase(3);

    const freeTx: TransactionRecord = {
      id: `TX-PROMO-${Date.now().toString().slice(-6)}`,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: 'document_purchase',
      amount: 0,
      currency: 'XOF',
      description: `Déblocage gratuit (${appliedPromo?.code}) : ${documentTitle}`,
      status: 'COMPLETED',
      aiStatus: 'COMPLETED',
      createdAt: new Date().toISOString(),
      paymentMethod: 'free',
      newBalance: safeBalance,
      documentTitle
    };

    setTimeout(() => {
      setIsAiScanning(false);
      setValidationOutcome('success');
      setValidationDetails({
        txId: freeTx.id,
        amount: 0,
        message: `Document débloqué gratuitement grâce au code promo "${appliedPromo?.code}".`,
        unlockedTitle: documentTitle
      });
      onPaymentSuccess('free', freeTx);
    }, 600);
  };

  // Execute Step 3: Real-Time AI Receipt OCR Scanner
  const handleStartAiScan = async () => {
    if (!selectedFile) {
      setErrorMessage("Veuillez sélectionner ou déposer la capture d'écran de votre reçu.");
      return;
    }

    setCurrentStep(3);
    setIsAiScanning(true);
    setScanPhase(1);
    setErrorMessage(null);
    setValidationOutcome(null);

    const fullPhone = senderPhoneNumber 
      ? `${selectedCountry.dialCode} ${senderPhoneNumber}`.trim() 
      : undefined;

    // Sequential scanner phase animation
    const timer1 = setTimeout(() => setScanPhase(2), 1200);
    const timer2 = setTimeout(() => setScanPhase(3), 2600);

    try {
      const result = await verifyReceiptImage({
        file: selectedFile,
        expectedAmount: payablePrice,
        documentTitle: `${documentTypeLabel} : ${documentTitle}`,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        senderPhone: fullPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        transactionRef: transactionRef.trim() || undefined,
        purpose: 'document_unlock'
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (result.success && result.status === 'COMPLETED') {
        setScanPhase(4);
        const txId = result.transactionId || `TX-${Date.now().toString().slice(-6)}`;

        const tx: TransactionRecord = {
          id: txId,
          transactionId: txId,
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          type: 'document_purchase',
          amount: -payablePrice,
          currency: 'XOF',
          description: `Achat ${documentTypeLabel} : ${documentTitle} (Validé par Scan IA)`,
          status: 'COMPLETED',
          aiStatus: 'VALIDATED_BY_AI',
          paymentMethod: result.method === 'orange_money' ? 'orange_money' : 'wave',
          createdAt: new Date().toISOString(),
          documentTitle,
          senderPhone: result.senderPhone || fullPhone,
          countryCode: selectedCountry.dialCode,
          countryName: selectedCountry.name,
          receiptImage: previewUrl || undefined
        };

        setTimeout(() => {
          setIsAiScanning(false);
          setValidationOutcome('success');
          setValidationDetails({
            txId: result.transactionId,
            amount: payablePrice,
            message: result.message || "Reçu officiel validé avec succès par le scanner IA !",
            senderPhone: result.senderPhone || fullPhone,
            unlockedTitle: documentTitle
          });
          onPaymentSuccess('mobile_money', tx);
        }, 800);
      } else {
        setIsAiScanning(false);
        setValidationOutcome('failed');
        setErrorMessage(
          result.error || 
          "L'IA n'a pas pu certifier automatiquement ce reçu. Vérifiez que la capture est nette et récente (moins de 30 min)."
        );
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAiScanning(false);
      setValidationOutcome('failed');
      setErrorMessage(err.message || "Erreur lors de l'analyse du reçu.");
    }
  };

  // Fallback: Submit for Immediate Manual Admin Validation
  const handleManualValidationFallback = async () => {
    setIsAiScanning(true);
    setErrorMessage(null);

    const fullPhone = senderPhoneNumber ? `${selectedCountry.dialCode} ${senderPhoneNumber}`.trim() : '';

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
          senderPhone: fullPhone,
          countryCode: selectedCountry.dialCode,
          countryName: selectedCountry.name,
          transactionReference: transactionRef.trim(),
          receiptImage: receiptBase64.slice(0, 300000)
        })
      });

      const data = await res.json();
      const generatedTxId = data.transactionId || `REF-${Date.now().toString().slice(-6)}`;

      const pendingTx: TransactionRecord = {
        id: generatedTxId,
        transactionId: transactionRef.trim() || generatedTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        type: 'document_purchase',
        amount: -payablePrice,
        currency: 'XOF',
        description: `Achat ${documentTypeLabel} : ${documentTitle} (En attente de validation manuelle)`,
        status: 'pending',
        aiStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        documentTitle,
        senderPhone: fullPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        transactionReference: transactionRef.trim() || generatedTxId,
        receiptImage: previewUrl || undefined
      };

      setIsAiScanning(false);
      setValidationOutcome('pending');
      setValidationDetails({
        txId: generatedTxId,
        amount: payablePrice,
        message: "Votre reçu a été transmis à l'équipe Dokya. Validation en cours sous 5 à 15 minutes.",
        senderPhone: fullPhone,
        unlockedTitle: documentTitle
      });

      onPaymentSuccess('mobile_money', pendingTx);
    } catch (e: any) {
      setIsAiScanning(false);
      setErrorMessage(e.message || "Erreur lors de la transmission de la demande.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Modal Compact Container (max-width: 480px) */}
      <div 
        id="dokya-payment-modal" 
        className="bg-slate-950/95 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col relative my-auto animate-in zoom-in-95 duration-200"
      >
        
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ------------------------------------------------------------- */}
        {/* MODAL HEADER WITH 3-STEP PROGRESS INDICATOR */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>Guichet Dokya AI</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    PRO
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              id="close-payment-modal-btn"
              className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Trust Badge under Header */}
          <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-300 mb-3">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>🔒 Paiement 100% Sécurisé & Validation Immédiate</span>
          </div>

          {/* Stepper Progression: [ Étape 1 : Mode ] -> [ Étape 2 : Paiement ] -> [ Étape 3 : Scan IA & Validation ] */}
          <div className="grid grid-cols-3 gap-1.5 relative">
            {/* Step 1 */}
            <div className={`flex flex-col items-center text-center p-1.5 rounded-xl transition-all ${
              currentStep === 1 
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-white font-bold' 
                : currentStep > 1 
                ? 'bg-slate-900/60 border border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-900/40 border border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center gap-1 text-[11px]">
                {currentStep > 1 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-bold">1</span>
                )}
                <span className="truncate">Mode</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex flex-col items-center text-center p-1.5 rounded-xl transition-all ${
              currentStep === 2 
                ? 'bg-sky-500/15 border border-sky-500/40 text-white font-bold' 
                : currentStep > 2 
                ? 'bg-slate-900/60 border border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-900/40 border border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center gap-1 text-[11px]">
                {currentStep > 2 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    currentStep === 2 ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-800 text-slate-500'
                  }`}>2</span>
                )}
                <span className="truncate">Paiement</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex flex-col items-center text-center p-1.5 rounded-xl transition-all ${
              currentStep === 3 
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold shadow-sm' 
                : 'bg-slate-900/40 border border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center gap-1 text-[11px]">
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  currentStep === 3 ? 'bg-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'
                }`}>3</span>
                <span className="truncate">Scan IA</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL BODY (STEP VIEWS) */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ========================================================= */}
          {/* ÉTAPE 1 : CHOIX DU MODE DE PAIEMENT */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Document Summary & Net Amount Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                    {documentTypeLabel}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[240px]">
                    {documentTitle}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  {appliedPromo && appliedPromo.discountAmount > 0 && (
                    <span className="text-[10px] text-slate-500 line-through block font-mono">
                      {originalPrice.toLocaleString('fr-FR')} F
                    </span>
                  )}
                  <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    {isFreeWithPromo ? (
                      <span className="text-emerald-400 font-black">0 FCFA (Gratuit)</span>
                    ) : (
                      <span>{payablePrice.toLocaleString('fr-FR')} <span className="text-xs text-slate-400">FCFA</span></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Methods Cards */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sélectionnez votre moyen de règlement :
                </label>

                {/* 1. WAVE */}
                <button
                  type="button"
                  id="select-method-wave"
                  onClick={() => setSelectedMethod('wave')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedMethod === 'wave'
                      ? 'bg-sky-500/10 border-sky-500/50 shadow-md shadow-sky-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1DA1F2]/20 border border-[#1DA1F2]/40 flex items-center justify-center text-sky-400 font-black text-base shrink-0">
                      🌊
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Wave Sénégal & UEMOA</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-black uppercase">
                          1-Clic
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Transfert sans frais avec lien officiel ou QR Code
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMethod === 'wave' ? 'border-sky-400 bg-sky-500 text-white' : 'border-slate-700'
                  }`}>
                    {selectedMethod === 'wave' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* 2. ORANGE MONEY */}
                <button
                  type="button"
                  id="select-method-orange"
                  onClick={() => setSelectedMethod('orange_money')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedMethod === 'orange_money'
                      ? 'bg-orange-500/10 border-orange-500/50 shadow-md shadow-orange-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-black text-sm shrink-0">
                      OM
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Orange Money</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                          SN / CI
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Transfert direct au +221 78 961 90 88
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMethod === 'orange_money' ? 'border-orange-400 bg-orange-500 text-white' : 'border-slate-700'
                  }`}>
                    {selectedMethod === 'orange_money' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* 3. SOLDE DOKYA WALLET */}
                <button
                  type="button"
                  id="select-method-wallet"
                  onClick={() => setSelectedMethod('wallet')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedMethod === 'wallet'
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Solde Dokya Wallet</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                          hasEnoughBalance ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {hasEnoughBalance ? 'Disponible' : 'Solde bas'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Solde actuel : <strong className="text-white font-mono">{safeBalance.toLocaleString('fr-FR')} FCFA</strong>
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMethod === 'wallet' ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-700'
                  }`}>
                    {selectedMethod === 'wallet' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              </div>

              {/* Promo Code Expandable Section */}
              <div className="pt-1">
                {!showPromoBox ? (
                  <button
                    type="button"
                    onClick={() => setShowPromoBox(true)}
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BadgePercent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Vous avez un code promo ou un pass cadeau ?</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Appliquer un code promo</span>
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowPromoBox(false)}
                        className="text-slate-500 hover:text-slate-300 text-[11px]"
                      >
                        Fermer
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ex: PROMO50, VIP100..."
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={isCheckingPromo || !promoInput.trim()}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        {isCheckingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{promoError}</span>
                      </p>
                    )}
                    {promoSuccess && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                        <Check className="w-3 h-3" />
                        <span>{promoSuccess}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button Step 1 */}
              <div className="pt-2">
                {isFreeWithPromo ? (
                  <button
                    type="button"
                    id="btn-unlock-free-promo"
                    onClick={handleFreePromoUnlock}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Débloquer Gratuitement (Code Promo 100%)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : selectedMethod === 'wallet' && hasEnoughBalance ? (
                  <button
                    type="button"
                    id="btn-pay-wallet-direct"
                    onClick={handlePayWithWallet}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Payer 1-Clic ({payablePrice.toLocaleString('fr-FR')} FCFA) avec mon Solde</span>
                  </button>
                ) : selectedMethod === 'wallet' && !hasEnoughBalance ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={onOpenRechargeModal}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Recharger mon Solde Portefeuille</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('wave')}
                      className="w-full text-center text-xs text-slate-400 hover:text-white py-1"
                    >
                      Ou payer directement par Wave / Orange Money →
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="btn-continue-to-step2"
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <span>Continuer vers le paiement ({payablePrice.toLocaleString('fr-FR')} FCFA)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ÉTAPE 2 : EXÉCUTION DU TRANSFERT & SOUMISSION DU REÇU */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Back to Step 1 & Method Switcher */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Changer de mode</span>
                </button>

                <div className="text-right">
                  <span className="text-slate-400 text-[11px]">Montant net : </span>
                  <strong className="text-emerald-400 font-mono font-black">{payablePrice.toLocaleString('fr-FR')} FCFA</strong>
                </div>
              </div>

              {/* --- CAS 1: WAVE PAYMENT --- */}
              {selectedMethod === 'wave' && (
                <div className="space-y-3">
                  {/* Wave Big Action Button */}
                  <a
                    href={WAVE_OFFICIAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="btn-wave-1clic-pay"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#1DA1F2] to-sky-600 hover:from-[#1a90d9] hover:to-sky-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                  >
                    <span className="text-base">🌊</span>
                    <span>Payer 1-Clic avec Wave</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* QR Code toggle */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>{showQrCode ? 'Masquer le QR Code' : 'Scanner le QR Code (depuis un autre téléphone)'}</span>
                    </button>

                    {showQrCode && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-white/5 border border-sky-500/30 flex flex-col items-center justify-center animate-in zoom-in-95 duration-150">
                        <div className="bg-white p-2 rounded-xl">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fpay.wave.com%2Fm%2FM_sn_wXlszdyVZOIV%2Fc%2Fsn%2F" 
                            alt="QR Code Wave"
                            className="w-28 h-28"
                          />
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1.5 font-medium">
                          Ouvrez votre application Wave et scannez ce code
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- CAS 2: ORANGE MONEY / AUTRES COORDONNÉES --- */}
              {selectedMethod === 'orange_money' && (
                <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-300 flex items-center gap-1.5">
                      <span>Coordonnées Destinataire Certifié :</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-black">
                      Sénégal (+221)
                    </span>
                  </div>

                  {/* Phone number */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Numéro Orange Money</span>
                      <strong className="text-white font-mono text-xs sm:text-sm">{BENEFICIARY_PHONE}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(BENEFICIARY_PHONE, 'phone')}
                      className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'phone' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  {/* Name */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-slate-400 block font-medium">Bénéficiaire</span>
                      <strong className="text-slate-200 text-xs truncate block">{BENEFICIARY_NAME}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(BENEFICIARY_NAME, 'name')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      {copiedField === 'name' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'name' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --- FORMULAIRE DE PREUVE & IDENTIFICATION CLIENT --- */}
              <div className="space-y-3 pt-1">
                
                {/* 1. Country & Phone Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    1. Votre Pays & Numéro de téléphone expéditeur :
                  </label>
                  
                  <div className="grid grid-cols-12 gap-2">
                    {/* Country Selector */}
                    <div className="col-span-5 relative">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const found = AFRICAN_COUNTRIES.find(c => c.code === e.target.value);
                          if (found) setSelectedCountry(found);
                        }}
                        className="w-full pl-2.5 pr-6 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                      >
                        {AFRICAN_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                            {c.flag} {c.name} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Phone Input */}
                    <div className="col-span-7 relative">
                      <input
                        type="tel"
                        placeholder={`Ex: ${selectedCountry.example}`}
                        value={senderPhoneNumber}
                        onChange={(e) => setSenderPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Drag & Drop Upload Zone for Receipt Screenshot */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>2. Capture d'écran du reçu de paiement :</span>
                    <span className="text-[10px] text-emerald-400 font-normal">JPG, PNG, WEBP</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isDragging 
                          ? 'border-emerald-400 bg-emerald-500/10' 
                          : 'border-slate-700 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        Glissez votre reçu ici ou <span className="text-emerald-400 underline">parcourir</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Capture nette affichant le montant ({payablePrice.toLocaleString('fr-FR')} FCFA) et l'ID de transaction
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {previewUrl && (
                          <img 
                            src={previewUrl} 
                            alt="Aperçu Reçu" 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" 
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-[200px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            {(selectedFile.size / 1024).toFixed(0)} Ko • Prêt pour le scan IA
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Optional Transaction Ref Input */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Référence ou ID de transaction <span className="text-slate-500">(optionnel)</span> :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: WW240825ABCD, CI2408..."
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Primary Action Button Step 2 */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-start-ai-receipt-scan"
                  onClick={handleStartAiScan}
                  disabled={!selectedFile || isAiScanning}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ Analyser mon reçu par l'IA</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ÉTAPE 3 : ANALYSE SCANNER IA EN TEMPS RÉEL & DÉBLOCAGE */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* --- 1. SCANNING STATE (ACTIVE) --- */}
              {isAiScanning && (
                <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-4">
                  
                  {/* Receipt Preview with Dynamic Laser Scanner Animation */}
                  {previewUrl && (
                    <div className="relative w-44 h-44 rounded-2xl overflow-hidden border border-emerald-500/50 shadow-xl shadow-emerald-500/10">
                      <img 
                        src={previewUrl} 
                        alt="Scanner IA" 
                        className="w-full h-full object-cover filter brightness-90"
                      />
                      
                      {/* Laser Bar Animation */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce duration-1000" />
                      <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h4 className="text-sm sm:text-base font-black text-white flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Scanner OCR IA en cours...</span>
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Notre intelligence artificielle analyse le montant, la date et l'ID de transaction.
                    </p>
                  </div>

                  {/* Progressive Step Checkpoints */}
                  <div className="w-full max-w-xs space-y-2 text-left pt-2">
                    <div className={`flex items-center gap-2 text-xs transition-all ${
                      scanPhase >= 1 ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                    }`}>
                      {scanPhase >= 2 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                      )}
                      <span>Lecture de l'image du reçu par l'IA...</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-all ${
                      scanPhase >= 2 ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                    }`}>
                      {scanPhase >= 3 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : scanPhase === 2 ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span>Vérification du montant et conformité...</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-all ${
                      scanPhase >= 3 ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                    }`}>
                      {scanPhase >= 4 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : scanPhase === 3 ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span>Contrôle d'authenticité et d'unicité...</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-all ${
                      scanPhase >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-600'
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                        scanPhase >= 4 ? 'bg-emerald-500 text-slate-950' : 'border border-slate-800'
                      }`}>
                        {scanPhase >= 4 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>Validation certifiée !</span>
                    </div>
                  </div>

                </div>
              )}

              {/* --- 2. VALIDATION OUTCOME: SUCCESS --- */}
              {!isAiScanning && validationOutcome === 'success' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-emerald-950/80 to-slate-950 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  
                  {/* Success Icon */}
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base sm:text-lg font-black text-white">
                      Paiement Validé avec Succès !
                    </h4>
                    <p className="text-xs text-emerald-300 font-medium">
                      Votre document est débloqué et accessible immédiatement.
                    </p>
                  </div>

                  {/* Transaction Details Box */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Document :</span>
                      <strong className="text-white truncate max-w-[200px]">{documentTitle}</strong>
                    </div>
                    {validationDetails.txId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Réf. Transaction :</span>
                        <strong className="text-amber-300 font-mono">{validationDetails.txId}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Statut :</span>
                      <strong className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3" />
                        <span>Débloqué à vie</span>
                      </strong>
                    </div>
                  </div>

                  {/* Info Notice about Customer Space */}
                  <p className="text-[11px] text-slate-400">
                    💾 Ce document est automatiquement sauvegardé dans votre Espace Client (<strong>Mes Documents</strong>).
                  </p>

                  {/* Action Buttons for Download / Done */}
                  <div className="space-y-2 pt-1">
                    {onDownloadPDF && (
                      <button
                        type="button"
                        id="btn-download-pdf-success"
                        onClick={() => {
                          onDownloadPDF();
                          onClose();
                        }}
                        className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>📥 Télécharger mon document PDF / Word</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="btn-finish-payment-modal"
                      onClick={onClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      Terminer & Fermer
                    </button>
                  </div>

                </div>
              )}

              {/* --- 3. VALIDATION OUTCOME: PENDING (MANUAL REVIEW) --- */}
              {!isAiScanning && validationOutcome === 'pending' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-sky-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <Clock className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Reçu transmis à l'équipe Dokya
                    </h4>
                    <p className="text-xs text-slate-300">
                      Votre preuve a bien été enregistrée. Validation administrative sous 5 à 15 minutes.
                    </p>
                  </div>

                  {validationDetails.txId && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300">
                      Réf: {validationDetails.txId}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Fermer le guichet
                  </button>
                </div>
              )}

              {/* --- 4. VALIDATION OUTCOME: FAILED / REJECTED --- */}
              {!isAiScanning && validationOutcome === 'failed' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-rose-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Analyse du reçu non concluante
                    </h4>
                    <p className="text-xs text-rose-300">
                      {errorMessage || "Le scanner IA n'a pas pu valider automatiquement ce reçu."}
                    </p>
                  </div>

                  {/* Actions to Retry or Submit for Manual Review */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réessayer avec une autre capture</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleManualValidationFallback}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Transmettre pour validation manuelle par l'équipe</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL FOOTER WITH INSTANT ASSISTANCE */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3 px-5 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Cryptage SSL 256-bit</span>
          </span>
          <span className="text-slate-400">
            Support : <strong className="text-emerald-400">+221 78 961 90 88</strong>
          </span>
        </div>

      </div>

    </div>
  );
};

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
