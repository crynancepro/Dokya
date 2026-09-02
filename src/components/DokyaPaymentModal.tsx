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
  CheckCircle,
  Globe,
  Phone,
  Crown,
  Layers,
  CheckCircle as CheckCircleIcon,
  Flame,
  Plus
} from 'lucide-react';
import { verifyReceiptImage } from '../services/receiptPaymentService';
import { TransactionRecord, UserSubscription } from '../types';
import { usePricing } from '../contexts/PricingContext';
import { recordTransactionEverywhere, saveTransactionRecord, subscribeToTransactionStatus, subscribeToVipWithWallet } from '../lib/firebase';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  example: string;
}

export const AFRICAN_COUNTRIES: CountryOption[] = [
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', example: '77 123 45 67' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', example: '07 12 34 56 78' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', example: '70 12 34 56' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', example: '70 12 34 56' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳', example: '620 12 34 56' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', example: '6 70 12 34 56' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬', example: '06 123 45 67' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', example: '074 12 34 56' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯', example: '97 12 34 56' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', example: '90 12 34 56' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', example: '90 12 34 56' },
  { code: 'CD', name: 'RDC', dialCode: '+243', flag: '🇨🇩', example: '81 123 45 67' },
  { code: 'FR', name: 'France / Diaspora', dialCode: '+33', flag: '🇫🇷', example: '6 12 34 56 78' },
  { code: 'OTHER', name: 'Autre / International', dialCode: '+', flag: '🌍', example: 'Numéro complet' }
];

// Official Wave Merchant Link
export const WAVE_OFFICIAL_URL = 'https://pay.wave.com/m/M_sn_wXlszdyVZOIV/c/sn/';
export const BENEFICIARY_PHONE = '+221 78 961 90 88';
export const BENEFICIARY_NAME = 'NGOUALA LAVOISIER FORTUNÉ PETER';

export type PaymentCounterMode = 'document' | 'recharge' | 'subscription';

export interface AppliedPromoInfo {
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

export interface DokyaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: PaymentCounterMode;
  // Document context
  documentTitle?: string;
  documentTypeLabel?: string;
  targetDocId?: string;
  price?: number;
  isAlreadyPaid?: boolean;
  onDownloadPDF?: () => void;
  onDownloadDocx?: () => void;
  onOpenInterviewPrep?: () => void;
  // Recharge context
  initialRechargeAmount?: number;
  onRechargeSuccess?: (addedAmount: number, transaction?: TransactionRecord) => void;
  // Subscription context
  planId?: 'weekly' | 'monthly' | 'annual';
  planTitle?: string;
  planPrice?: number;
  onSubscriptionSuccess?: (sub: UserSubscription, method: 'wallet' | 'mobile_money') => void;
  // User info
  userBalance?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  // General callbacks
  onPaymentSuccess?: (method: 'wallet' | 'mobile_money' | 'free', transaction?: TransactionRecord) => void;
  onOpenRechargeModal?: () => void;
}

export const DokyaPaymentModal: React.FC<DokyaPaymentModalProps> = ({
  isOpen,
  onClose,
  mode = 'document',
  documentTitle = 'Mon Document Professionnel',
  documentTypeLabel = 'Document',
  targetDocId,
  price,
  isAlreadyPaid = false,
  onDownloadPDF,
  onDownloadDocx,
  onOpenInterviewPrep,
  initialRechargeAmount = 3000,
  onRechargeSuccess,
  planId = 'monthly',
  planTitle = 'Pass VIP Mensuel',
  planPrice = 5000,
  onSubscriptionSuccess,
  userBalance = 0,
  userId,
  userEmail,
  userName,
  onPaymentSuccess,
  onOpenRechargeModal
}) => {
  const { pricing, validatePromoCode } = usePricing();

  // Mode resolution & pricing
  const [activeMode, setActiveMode] = useState<PaymentCounterMode>(mode);
  const [rechargeAmount, setRechargeAmount] = useState<number>(initialRechargeAmount || 3000);
  const [customRechargeInput, setCustomRechargeInput] = useState<string>('');
  const [isCustomRecharge, setIsCustomRecharge] = useState<boolean>(false);

  // Synchronize initial mode & recharge amount
  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode);
      if (initialRechargeAmount) {
        setRechargeAmount(initialRechargeAmount);
        setIsCustomRecharge(![1000, 2000, 3000, 5000, 10000].includes(initialRechargeAmount));
        if (![1000, 2000, 3000, 5000, 10000].includes(initialRechargeAmount)) {
          setCustomRechargeInput(initialRechargeAmount.toString());
        }
      }
    }
  }, [isOpen, mode, initialRechargeAmount]);

  // Compute base price for document
  const getDocumentBasePrice = () => {
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

  // Stepper state: 1 = Choix du mode & Récapitulatif, 2 = Transfert & Saisie, 3 = Scanner IA & Validation
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
    newBalance?: number;
  }>({});

  // 2-minute dynamic progressive scan timer & real-time listener state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(120); // 2 minutes countdown (120s)
  const [activePendingTxId, setActivePendingTxId] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const txUnsubscribeRef = useRef<(() => void) | null>(null);
  const isHandledSuccessRef = useRef<boolean>(false);

  // Helper to stop all background scanning timers and listeners
  const stopScanningProcesses = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (txUnsubscribeRef.current) {
      txUnsubscribeRef.current();
      txUnsubscribeRef.current = null;
    }
  };

  // Promo code states
  const [showPromoBox, setShowPromoBox] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Clean object URL and timers on unmount or replace
  useEffect(() => {
    return () => {
      stopScanningProcesses();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      stopScanningProcesses();
      setCurrentStep(1);
      setErrorMessage(null);
      setValidationOutcome(null);
      setScanPhase(0);
      setIsAiScanning(false);
      setTimerSecondsLeft(120);
      setActivePendingTxId(null);
      isHandledSuccessRef.current = false;
      setAppliedPromo(null);
      setPromoInput('');
      setPromoError(null);
      setPromoSuccess(null);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } else {
      stopScanningProcesses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Base raw price calculation
  const getRawPrice = () => {
    if (activeMode === 'recharge') {
      return isCustomRecharge ? (parseInt(customRechargeInput, 10) || 1000) : rechargeAmount;
    }
    if (activeMode === 'subscription') {
      return planPrice || (planId === 'annual' ? 25000 : (planId === 'weekly' ? 2000 : 5000));
    }
    return getDocumentBasePrice();
  };

  const rawPrice = getRawPrice();
  const safeBalance = Number(userBalance) || 0;
  const payablePrice = appliedPromo ? appliedPromo.finalAmount : rawPrice;
  const isFreeWithPromo = appliedPromo !== null && appliedPromo.isFree;
  const hasEnoughBalance = safeBalance >= payablePrice;

  // Purpose string for API calls
  const currentPurpose = activeMode === 'recharge' 
    ? 'wallet_recharge' 
    : activeMode === 'subscription' 
      ? 'subscription_purchase' 
      : 'document_unlock';

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
      const contextResult = await validatePromoCode(cleanCode, rawPrice);
      if (contextResult.valid && contextResult.promo) {
        const promoItem = contextResult.promo;
        const discountAmount = contextResult.discountAmount;
        const finalAmount = Math.max(0, rawPrice - discountAmount);
        const isFree = finalAmount === 0;
        const discountLabel = promoItem.discountType === 'percentage' ? `-${promoItem.discountValue}%` : `-${promoItem.discountValue} FCFA`;

        const promoInfo: AppliedPromoInfo = {
          code: cleanCode,
          discountType: promoItem.discountType,
          discountValue: promoItem.discountValue,
          discountAmount,
          originalAmount: rawPrice,
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
          ? (item.val >= 100 ? rawPrice : Math.round((rawPrice * item.val) / 100))
          : Math.min(rawPrice, item.val);
        const finalAmount = Math.max(0, rawPrice - discountAmount);
        const isFree = finalAmount === 0;
        const discountLabel = item.type === 'percentage' ? `-${item.val}%` : `-${item.val} FCFA`;

        const promoInfo: AppliedPromoInfo = {
          code: cleanCode,
          discountType: item.type,
          discountValue: item.val,
          discountAmount,
          originalAmount: rawPrice,
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

  // Wallet Instant Payment (For document or subscription)
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

      if (activeMode === 'subscription') {
        // Subscription via wallet with atomic Firestore transaction
        const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
        const subDurationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
        const subEndDate = new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString();

        if (userId && userId !== 'guest') {
          const vipRes = await subscribeToVipWithWallet(
            userId,
            effectivePlanId,
            payablePrice,
            userEmail,
            userName
          );
          if (!vipRes.success && vipRes.error === 'INSUFFICIENT_BALANCE') {
            setIsAiScanning(false);
            setValidationOutcome('failed');
            setErrorMessage(vipRes.message || "Solde insuffisant pour activer le Pass VIP.");
            return;
          }
        }

        const activeSub: UserSubscription = {
          status: 'active',
          planId: effectivePlanId,
          planName: planTitle || 'Pass VIP Mensuel',
          startedAt: new Date().toISOString(),
          expiresAt: subEndDate,
          pricePaid: payablePrice,
          paymentMethod: 'wallet',
          documentsGeneratedCount: 0
        };

        fetch('/api/subscription/submit-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'guest',
            userEmail: userEmail || 'candidat@dokya.sn',
            planId,
            planTitle,
            amount: payablePrice,
            paymentMethod: 'wallet'
          })
        }).catch(() => {});

        setTimeout(() => {
          setIsAiScanning(false);
          setValidationOutcome('success');
          setValidationDetails({
            txId: rawTxId,
            amount: payablePrice,
            message: `Abonnement "${planTitle}" activé avec succès ! Débit de ${payablePrice.toLocaleString('fr-FR')} FCFA sur votre solde Dokya Wallet.`,
            unlockedTitle: planTitle,
            senderPhone: fullPhone
          });
          try {
            if (onSubscriptionSuccess) onSubscriptionSuccess(activeSub, 'wallet');
            if (onPaymentSuccess) onPaymentSuccess('wallet');
          } catch (cbErr) {
            console.warn('[Wallet Sub Callback Warn]:', cbErr);
          }
        }, 800);

      } else {
        // Document purchase via wallet
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

        recordTransactionEverywhere(tx).catch(() => {});

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
          try {
            if (onPaymentSuccess) onPaymentSuccess('wallet', tx);
          } catch (cbErr) {
            console.warn('[Wallet Doc Callback Warn]:', cbErr);
          }
        }, 800);
      }
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

    recordTransactionEverywhere(freeTx).catch(() => {});

    setTimeout(() => {
      setIsAiScanning(false);
      setValidationOutcome('success');
      setValidationDetails({
        txId: freeTx.id,
        amount: 0,
        message: `Déblocage gratuit accordé grâce au code promo "${appliedPromo?.code}".`,
        unlockedTitle: activeMode === 'subscription' ? planTitle : documentTitle
      });
      try {
        if (activeMode === 'subscription' && onSubscriptionSuccess) {
          const subDurationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
          const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
          onSubscriptionSuccess({
            status: 'active',
            planId: effectivePlanId,
            planName: planTitle || 'Pass VIP Mensuel',
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString(),
            pricePaid: 0,
            paymentMethod: 'free',
            documentsGeneratedCount: 0
          }, 'wallet');
        }
        if (onPaymentSuccess) onPaymentSuccess('free', freeTx);
      } catch (cbErr) {
        console.warn('[Free Promo Callback Warn]:', cbErr);
      }
    }, 600);
  };

  // Handle Instant Certification Success (by Admin or OCR)
  const handleCertificationSuccess = (
    tx: TransactionRecord, 
    customMsg?: string, 
    customAmt?: number, 
    customBal?: number
  ) => {
    if (isHandledSuccessRef.current) return;
    isHandledSuccessRef.current = true;
    stopScanningProcesses();

    const effectiveAmt = customAmt !== undefined ? customAmt : (tx.extractedAmount || tx.expectedAmount || payablePrice);
    const finalBalance = customBal !== undefined ? customBal : (tx as any).newBalance;

    setIsAiScanning(false);
    setValidationOutcome('success');
    setValidationDetails({
      txId: tx.transactionId || tx.id,
      amount: effectiveAmt,
      message: customMsg || "Paiement certifié avec succès ! Votre document est débloqué.",
      senderPhone: tx.senderPhone,
      unlockedTitle: activeMode === 'subscription' ? planTitle : documentTitle,
      newBalance: finalBalance
    });

    // Fire domain callbacks safely
    try {
      if (activeMode === 'recharge' && onRechargeSuccess) {
        onRechargeSuccess(effectiveAmt, tx);
      } else if (activeMode === 'subscription' && onSubscriptionSuccess) {
        const subDurationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
        const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
        onSubscriptionSuccess({
          status: 'active',
          planId: effectivePlanId,
          planName: planTitle || 'Pass VIP Mensuel',
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString(),
          pricePaid: effectiveAmt,
          paymentMethod: tx.paymentMethod === 'orange_money' ? 'orange_money' : 'wave',
          documentsGeneratedCount: 0
        }, 'mobile_money');
      }
      if (onPaymentSuccess) onPaymentSuccess('mobile_money', tx);
    } catch (cbErr) {
      console.warn('[Certification Success Callback Warn]:', cbErr);
    }
  };

  // Handle Instant Certification Rejection (by Admin or OCR)
  const handleCertificationReject = (reason?: string) => {
    stopScanningProcesses();
    setIsAiScanning(false);
    setValidationOutcome('failed');
    setErrorMessage(reason || "Paiement non reconnu ou invalide. Veuillez contacter le support WhatsApp.");
  };

  // Execute Step 3: Real-Time AI Receipt OCR Scanner with Instant Admin Realtime Interruption
  const handleStartAiScan = async () => {
    if (!selectedFile) {
      setErrorMessage("Veuillez sélectionner ou déposer la capture d'écran de votre reçu.");
      return;
    }

    stopScanningProcesses();
    setCurrentStep(3);
    setIsAiScanning(true);
    setScanPhase(1);
    setErrorMessage(null);
    setValidationOutcome(null);
    setTimerSecondsLeft(120);
    isHandledSuccessRef.current = false;

    const fullPhone = senderPhoneNumber 
      ? `${selectedCountry.dialCode} ${senderPhoneNumber}`.trim() 
      : `${selectedCountry.dialCode} (Numéro non renseigné)`;

    const titleContext = activeMode === 'recharge' 
      ? `Recharge Solde (${payablePrice.toLocaleString('fr-FR')} FCFA)` 
      : activeMode === 'subscription' 
        ? `Abonnement ${planTitle}` 
        : `${documentTypeLabel} : ${documentTitle}`;

    // Unique generated tracking reference
    const generatedTxId = `TX-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txRefCode = transactionRef.trim() || `REF-${Date.now().toString().slice(-6)}`;
    setActivePendingTxId(generatedTxId);

    let receiptBase64 = '';
    try {
      const reader = new FileReader();
      receiptBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(selectedFile);
      });
    } catch (_e) {}

    // 1. Immediately register PENDING_APPROVAL transaction to DB & Firestore
    const currentTargetDocId = activeMode === 'document' ? (targetDocId || `DOC-${Date.now()}`) : undefined;
    const pendingTx: TransactionRecord = {
      id: generatedTxId,
      transactionId: txRefCode,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: activeMode === 'recharge' ? 'WALLET_RECHARGE' : (activeMode === 'subscription' ? 'subscription_purchase' : 'DIRECT_PURCHASE'),
      targetDocId: currentTargetDocId,
      amount: activeMode === 'recharge' ? payablePrice : -payablePrice,
      expectedAmount: payablePrice,
      extractedAmount: payablePrice,
      currency: 'XOF',
      description: `${titleContext} (${selectedMethod === 'wave' ? 'Wave' : 'Orange Money'} - En attente de validation)`,
      status: 'PENDING_APPROVAL',
      aiStatus: 'PENDING',
      paymentMethod: selectedMethod,
      senderPhone: fullPhone,
      countryCode: selectedCountry.dialCode,
      countryName: selectedCountry.name,
      transactionReference: txRefCode,
      receiptImage: receiptBase64 ? receiptBase64.slice(0, 300000) : (previewUrl || undefined),
      createdAt: new Date().toISOString(),
      documentTitle: activeMode === 'subscription' ? planTitle : documentTitle,
      purpose: currentPurpose
    };

    // Save to Firestore & Server DB immediately
    recordTransactionEverywhere(pendingTx).catch((e) => console.warn('[Pending Tx Record Warn]:', e));

    const submitEndpoint = activeMode === 'recharge' 
      ? '/api/recharge/submit-payment' 
      : activeMode === 'subscription' 
        ? '/api/subscription/submit-payment' 
        : '/api/documents/submit-payment';

    fetch(submitEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        documentTitle,
        documentTypeLabel,
        targetDocId: currentTargetDocId,
        type: pendingTx.type,
        planId,
        planTitle,
        amount: payablePrice,
        paymentMethod: selectedMethod,
        senderPhone: fullPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        transactionReference: txRefCode,
        receiptImage: receiptBase64.slice(0, 300000)
      })
    }).catch((e) => console.warn('[Submit API Warn]:', e));

    // 2. Start Fluid 2-Minute Countdown Timer
    timerIntervalRef.current = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Sequential visual scanner phase progress
    setTimeout(() => setScanPhase(2), 1500);
    setTimeout(() => setScanPhase(3), 3200);

    // 3. Real-Time Listener (Firestore onSnapshot + ultra-fast status polling)
    const unsub = subscribeToTransactionStatus(generatedTxId, (status, liveTx) => {
      const isApproved = status === 'APPROVED' ||
        status === 'MANUALLY_VALIDATED' || 
        status === 'VALIDATED_BY_AI' || 
        status === 'COMPLETED' || 
        status === 'success' || 
        status === 'active';

      const isRejected = status === 'REJECTED_BY_ADMIN' || 
        status === 'REJECTED_BY_AI' || 
        status === 'failed' || 
        status === 'cancelled' || 
        status === 'REJECTED';

      if (isApproved) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        setIsAiScanning(false);
        const validatedTx: TransactionRecord = {
          ...pendingTx,
          ...(liveTx || {}),
          status: 'COMPLETED',
          aiStatus: 'MANUALLY_VALIDATED'
        };
        handleCertificationSuccess(
          validatedTx,
          "Paiement certifié avec succès !",
          payablePrice,
          (liveTx as any)?.newBalance
        );
      } else if (isRejected) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        setIsAiScanning(false);
        handleCertificationReject(
          (liveTx as any)?.rejectionReason || "Paiement non reconnu ou invalide. Veuillez contacter le support WhatsApp."
        );
      }
    });
    txUnsubscribeRef.current = unsub;

    // 4. In parallel, run OCR analysis in background for instant automated match
    try {
      const result = await verifyReceiptImage({
        file: selectedFile,
        expectedAmount: payablePrice,
        documentTitle: titleContext,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@dokya.sn',
        userName: userName || 'Candidat Dokya',
        senderPhone: fullPhone,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        transactionRef: txRefCode,
        purpose: currentPurpose
      });

      if (result.success && result.status === 'COMPLETED') {
        const ocrTx: TransactionRecord = {
          ...pendingTx,
          id: result.transactionId || generatedTxId,
          transactionId: result.transactionId || txRefCode,
          status: 'COMPLETED',
          aiStatus: 'VALIDATED_BY_AI',
          extractedAmount: result.amount || payablePrice,
          paymentMethod: result.method === 'orange_money' ? 'orange_money' : 'wave',
          newBalance: result.newBalance
        };
        saveTransactionRecord(ocrTx).catch(() => {});
        handleCertificationSuccess(ocrTx, "Paiement certifié avec succès par le scanner IA !", payablePrice, result.newBalance);
      }
    } catch (err: any) {
      console.warn('[Background OCR Assist Warn]:', err);
    }
  };

  // Fallback: Submit for Manual Admin Validation
  const handleManualValidationFallback = async () => {
    handleStartAiScan();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto text-slate-100 relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Close Button */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-sm ${
              activeMode === 'subscription' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : activeMode === 'recharge'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeMode === 'subscription' ? <Crown className="w-5 h-5 text-amber-400" /> : activeMode === 'recharge' ? <Wallet className="w-5 h-5 text-indigo-400" /> : <Zap className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Guichet de Paiement Dokya</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Scan IA 1-Clic
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeMode === 'subscription' ? 'Activation Pass VIP Illimité' : activeMode === 'recharge' ? 'Recharger votre Dokya Wallet' : 'Déblocage et Téléchargement Sécurisé'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Progress Header */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold">
            {/* Step 1 Indicator */}
            <div className={`flex items-center gap-1.5 transition-colors ${
              currentStep === 1 ? 'text-emerald-400 font-bold' : currentStep > 1 ? 'text-emerald-500' : 'text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 1 
                  ? 'bg-emerald-500 text-slate-950' 
                  : currentStep > 1 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="hidden sm:inline">1. Mode & Montant</span>
              <span className="sm:hidden">1. Mode</span>
            </div>

            <div className={`h-[2px] flex-1 mx-2 rounded-full transition-colors ${currentStep >= 2 ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />

            {/* Step 2 Indicator */}
            <div className={`flex items-center gap-1.5 transition-colors ${
              currentStep === 2 ? 'text-emerald-400 font-bold' : currentStep > 2 ? 'text-emerald-500' : 'text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 2 
                  ? 'bg-emerald-500 text-slate-950' 
                  : currentStep > 2 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="hidden sm:inline">2. Transfert & Reçu</span>
              <span className="sm:hidden">2. Reçu</span>
            </div>

            <div className={`h-[2px] flex-1 mx-2 rounded-full transition-colors ${currentStep >= 3 ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />

            {/* Step 3 Indicator */}
            <div className={`flex items-center gap-1.5 transition-colors ${
              currentStep === 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 3 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                3
              </div>
              <span className="hidden sm:inline">3. Scanner IA</span>
              <span className="sm:hidden">3. IA</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* ========================================================================= */}
          {/* ÉTAPE 1 : CHOIX DU MODE & RÉCAPITULATIF DYNAMIQUE                        */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Dynamic Service Card */}
              {activeMode === 'recharge' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Recharger mon Solde Wallet</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Solde actuel : <strong className="text-emerald-400 font-mono">{safeBalance.toLocaleString('fr-FR')} F</strong>
                    </span>
                  </div>

                  {/* Preset Amount Badges */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1000, 2000, 3000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setRechargeAmount(amt);
                          setIsCustomRecharge(false);
                        }}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          !isCustomRecharge && rechargeAmount === amt
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {amt.toLocaleString('fr-FR')} F
                      </button>
                    ))}
                  </div>

                  {/* 10 000 F & Custom Amount */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRechargeAmount(10000);
                        setIsCustomRecharge(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        !isCustomRecharge && rechargeAmount === 10000
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      10 000 FCFA <span className="text-[10px] text-indigo-300">(+Bonus)</span>
                    </button>

                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Montant libre..."
                        value={customRechargeInput}
                        onChange={(e) => {
                          setCustomRechargeInput(e.target.value);
                          setIsCustomRecharge(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-950 border transition-all ${
                          isCustomRecharge
                            ? 'border-indigo-500 ring-1 ring-indigo-500 text-white'
                            : 'border-slate-800 text-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ) : activeMode === 'subscription' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h4 className="text-sm font-black text-white">{planTitle}</h4>
                        <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Accès Illimité
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Téléchargements illimités de tous vos CV, Lettres, Devis et Factures sans payer à l'acte.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-amber-400 font-mono">
                        {rawPrice.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {planId === 'annual' ? '/ an' : planId === 'weekly' ? '/ semaine' : '/ mois'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-black text-white">{documentTitle}</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Déblocage officiel haute définition (PDF vectoriel & Word .docx)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-emerald-400 font-mono">
                        {rawPrice.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-[10px] text-slate-400">Paiement unique</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo Code Section (If not a recharge) */}
              {activeMode !== 'recharge' && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                  {!showPromoBox && !appliedPromo ? (
                    <button
                      type="button"
                      onClick={() => setShowPromoBox(true)}
                      className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-emerald-400 transition-colors py-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <span>Vous avez un code promo ou coupon VIP ?</span>
                      </span>
                      <span className="font-bold underline text-emerald-400">Saisir</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          Code Promotionnel / Réduction
                        </span>
                        {!appliedPromo && (
                          <button
                            type="button"
                            onClick={() => setShowPromoBox(false)}
                            className="text-slate-500 hover:text-slate-300 text-[11px]"
                          >
                            Annuler
                          </button>
                        )}
                      </div>

                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-mono font-black text-emerald-300">{appliedPromo.code}</span>
                              <span className="text-slate-300 ml-2">({appliedPromo.discountLabel})</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedPromo(null);
                              setPromoSuccess(null);
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-bold underline"
                          >
                            Retirer
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            placeholder="Ex: PROMO50, VIP100, DAKAR2026..."
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs uppercase font-mono text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                          />
                          <button
                            type="button"
                            onClick={handleApplyPromo}
                            disabled={isCheckingPromo || !promoInput.trim()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {isCheckingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                          </button>
                        </div>
                      )}

                      {promoError && <p className="text-[11px] text-rose-400 font-semibold">{promoError}</p>}
                      {promoSuccess && <p className="text-[11px] text-emerald-400 font-semibold">{promoSuccess}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Free with Promo CTA Button */}
              {isFreeWithPromo ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFreePromoUnlock}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gift className="w-5 h-5" />
                    <span>Débloquer Gratuitement (0 FCFA)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Payment Methods Grid */
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Choisissez votre méthode de paiement :
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white">Wave Mobile</p>
                          <span className="text-[9px] bg-blue-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                            Recommandé
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">0% de frais • Validation IA instantanée</p>
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
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white">Orange Money</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Transfert #144# ou App Max It</p>
                      </div>
                    </button>

                    {/* 3. Solde Dokya Wallet (if not recharging) */}
                    {activeMode !== 'recharge' && (
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('wallet')}
                        className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer sm:col-span-2 ${
                          selectedMethod === 'wallet'
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Wallet className={`w-5 h-5 mt-0.5 shrink-0 ${hasEnoughBalance ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-white">Payer avec le Solde Wallet</p>
                            <span className={`text-xs font-mono font-bold ${hasEnoughBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {safeBalance.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {hasEnoughBalance ? 'Déblocage en 1 clic sans frais' : 'Solde insuffisant pour ce montant'}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Action Button: Next or Wallet Direct Pay */}
                  <div className="pt-2">
                    {selectedMethod === 'wallet' && activeMode !== 'recharge' ? (
                      <button
                        type="button"
                        disabled={!hasEnoughBalance}
                        onClick={handlePayWithWallet}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmer le paiement ({payablePrice.toLocaleString('fr-FR')} FCFA)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continuer vers le transfert ({payablePrice.toLocaleString('fr-FR')} FCFA)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 2 : TRANSFERT & SAISIE COORDONNÉES + UPLOAD DU REÇU                 */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Back to step 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modifier le mode de paiement</span>
              </button>

              {/* Instructions Box depending on selected method */}
              {selectedMethod === 'wave' ? (
                <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      Paiement Wave Direct 1-Clic
                    </span>
                    <span className="font-mono text-xs font-black text-white bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/30">
                      {payablePrice.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {/* 1-Click Official Merchant Wave Link */}
                  <a
                    href={WAVE_OFFICIAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-950" />
                    <span>Ouvrir l'App Wave pour Payer en 1-Clic</span>
                  </a>

                  {/* Secondary Details */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Numéro Marchand :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white">{BENEFICIARY_PHONE}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(BENEFICIARY_PHONE, 'phone')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'phone' ? 'Copié' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-400">Bénéficiaire :</span>
                      <span className="font-semibold text-slate-200 text-[11px]">{BENEFICIARY_NAME}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Orange Money Instructions */
                <div className="p-4 rounded-2xl bg-orange-950/40 border border-orange-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-orange-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-orange-400" />
                      Orange Money (#144# / Max It)
                    </span>
                    <span className="font-mono text-xs font-black text-white bg-orange-500/20 px-2 py-0.5 rounded-lg border border-orange-500/30">
                      {payablePrice.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Effectuez un transfert classique de <strong>{payablePrice.toLocaleString('fr-FR')} FCFA</strong> vers notre compte certifié :
                  </p>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Numéro Destinataire :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-orange-400 text-sm">{BENEFICIARY_PHONE}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(BENEFICIARY_PHONE, 'phone')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'phone' ? 'Copié' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-400">Nom du Compte :</span>
                      <span className="font-semibold text-slate-200 text-[11px]">{BENEFICIARY_NAME}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Country & Sender Phone Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Numéro de téléphone expéditeur :
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Pour certification IA</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Country Dial Select */}
                  <div className="relative">
                    <select
                      value={selectedCountry.code}
                      onChange={(e) => {
                        const c = AFRICAN_COUNTRIES.find(item => item.code === e.target.value);
                        if (c) setSelectedCountry(c);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-hidden focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      {AFRICAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                          {c.flag} {c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="sm:col-span-2">
                    <input
                      type="tel"
                      value={senderPhoneNumber}
                      onChange={(e) => setSenderPhoneNumber(e.target.value)}
                      placeholder={`Ex: ${selectedCountry.example}`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Reference ID */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>ID de Transaction / Réf (optionnel) :</span>
                  <span className="text-[10px] text-slate-500">Ex: WW2408..., CI24...</span>
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Si vous souhaitez renseigner la référence du SMS..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>

              {/* Receipt Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Capture d'écran du reçu de transfert :
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-slate-800 shrink-0">
                      <img src={previewUrl} alt="Reçu" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reçu chargé prêt pour le Scan IA</span>
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {selectedFile?.name} ({(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(0)} Ko)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                      isDragging
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                  >
                    <Upload className="w-7 h-7 mx-auto text-emerald-400 mb-2" />
                    <p className="text-xs font-bold text-slate-200">
                      Cliquez ici ou glissez votre capture d'écran de reçu
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Format JPG, PNG ou capture mobile Wave / OM
                    </p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Trigger AI Scan Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!selectedFile || isAiScanning}
                  onClick={handleStartAiScan}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Lancer l'Analyse Laser & Validation IA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 3 : SCANNER IA LASER, BARRE 2 MIN & CERTIFICATION EN TEMPS RÉEL     */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Active Dynamic Laser Scanner with 2-Minute Fluid Progress Bar */}
              {isAiScanning && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 relative overflow-hidden text-center space-y-5 shadow-2xl">
                  {/* Laser Beam Animation Effect */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_20px_#10b981]" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 rounded-3xl blur-sm pointer-events-none" />

                  {/* Pulsing Scanner Icon */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center relative shadow-lg shadow-emerald-500/20">
                    <ScanLine className="w-8 h-8 text-emerald-400 animate-bounce" />
                    <div className="absolute inset-0 rounded-2xl border border-emerald-400 animate-ping opacity-25" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Analyse Laser & Certification en Cours...</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Contrôle des signatures de sécurité, du montant et de la conformité du reçu.
                    </p>
                  </div>

                  {/* Fluid 2-Minute Progress Bar & Timer */}
                  <div className="space-y-2 max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Temps restant estimé :</span>
                      </span>
                      <span className="font-mono text-emerald-400">
                        {Math.floor(timerSecondsLeft / 60)} min {(timerSecondsLeft % 60).toString().padStart(2, '0')} s
                      </span>
                    </div>

                    {/* Fluid Progress Track */}
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 relative">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-1000 shadow-[0_0_10px_#10b981]"
                        style={{
                          width: `${Math.min(99, Math.max(8, Math.round(((120 - timerSecondsLeft) / 120) * 100)))}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Reassurance Message Banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs text-left flex items-start gap-3 shadow-inner">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="font-bold text-emerald-300">Traitement et certification de votre reçu en cours...</strong> Temps estimé : moins de 2 minutes. Ne fermez pas cette page ou retrouvez votre document dans <em>« Mes Documents »</em>.
                    </p>
                  </div>

                  {/* Live Transaction Metadata Summary */}
                  <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-1.5 text-left text-slate-300 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Réf. Demande :</span>
                      <span className="font-mono font-bold text-amber-400">{activePendingTxId || 'Génération...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Montant :</span>
                      <span className="font-bold text-slate-100">{payablePrice.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Statut du Guichet :</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Écoute en direct des validations admin</span>
                      </span>
                    </div>
                  </div>

                  {/* Optional WhatsApp Direct Link while waiting */}
                  <div className="pt-1">
                    <a
                      href={`https://wa.me/221789619088?text=${encodeURIComponent(`Bonjour Dokya, j'ai soumis mon reçu de ${payablePrice} FCFA pour ${documentTitle || (activeMode === 'subscription' ? planTitle : 'mon document')} (Réf: ${activePendingTxId || 'TX'}). Pouvez-vous valider rapidement ?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Besoin d'une validation ultra-rapide ? Notifier sur WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* SUCCESS OUTCOME (Instantly displayed when Admin validates) */}
              {!isAiScanning && validationOutcome === 'success' && (
                <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-5 animate-in zoom-in-95 duration-200">
                  {/* Celebratory Icon */}
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
                      <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-10 h-10 animate-bounce" />
                      </div>
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 text-xl select-none animate-pulse">
                      🎉
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-white flex items-center justify-center gap-2">
                      <span>Paiement certifié avec succès !</span>
                    </h4>
                    <p className="text-sm font-semibold text-emerald-300/90 mt-1">
                      {activeMode === 'recharge' 
                        ? 'Votre solde Dokya Wallet a été débloqué et crédité !'
                        : activeMode === 'subscription' 
                          ? 'Votre Pass VIP a été activé avec succès !' 
                          : 'Votre document a été débloqué et enregistré dans votre espace « Mes Documents ».'}
                    </p>
                    {validationDetails.message && (
                      <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                        {validationDetails.message}
                      </p>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-slate-950/90 rounded-2xl border border-emerald-500/20 text-xs space-y-2 text-left shadow-inner">
                    {validationDetails.txId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Référence Transaction :</span>
                        <span className="font-mono font-bold text-amber-400">{validationDetails.txId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Statut de Certification :</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Validé & Débloqué avec Succès
                      </span>
                    </div>
                    {validationDetails.amount !== undefined && (
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <span className="text-slate-400">Montant Réglé :</span>
                        <span className="font-bold text-slate-200">
                          {validationDetails.amount === 0 ? 'Gratuit (Code Promo)' : `${validationDetails.amount.toLocaleString('fr-FR')} FCFA`}
                        </span>
                      </div>
                    )}
                    {validationDetails.newBalance !== undefined && (
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <span className="text-slate-400">Nouveau Solde Disponible :</span>
                        <span className="font-mono font-bold text-emerald-400">{validationDetails.newBalance.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Download PDF / Word / Access Documents */}
                  <div className="space-y-2.5 pt-1">
                    {activeMode === 'document' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {onDownloadPDF ? (
                            <button
                              type="button"
                              onClick={() => {
                                try { onDownloadPDF(); } catch (e) { console.error(e); }
                              }}
                              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
                            >
                              <Download className="w-4 h-4 text-slate-950" />
                              <span>📥 Télécharger mon document (PDF)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onClose}
                              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all"
                            >
                              <FileCheck className="w-4 h-4 text-slate-950" />
                              <span>📥 Accéder à mon document</span>
                            </button>
                          )}

                          {onDownloadDocx && (
                            <button
                              type="button"
                              onClick={() => {
                                try { onDownloadDocx(); } catch (e) { console.error(e); }
                              }}
                              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all transform active:scale-95"
                            >
                              <Download className="w-4 h-4" />
                              <span>📄 Télécharger en Word (.docx)</span>
                            </button>
                          )}

                          {onOpenInterviewPrep && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenInterviewPrep();
                              }}
                              className="w-full sm:col-span-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all transform active:scale-95"
                            >
                              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                              <span>🎙️ Accéder au Module de Simulation d'Entretien RH</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeMode === 'recharge' && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
                      >
                        <Wallet className="w-4 h-4 text-slate-950" />
                        <span>💳 Consulter mon Solde & Continuer</span>
                      </button>
                    )}

                    {activeMode === 'subscription' && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-all transform active:scale-95"
                      >
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>👑 Accéder à mes avantages VIP</span>
                      </button>
                    )}

                    {/* Discrete Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-slate-700/50"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}

              {/* FAILED / REJECTED OUTCOME */}
              {!isAiScanning && validationOutcome === 'failed' && (
                <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">Validation Non Aboutie</h4>
                    <p className="text-xs text-rose-300 mt-1 font-medium">
                      {errorMessage || "Paiement non reconnu ou invalide. Veuillez contacter le support WhatsApp."}
                    </p>
                  </div>

                  {/* Actions: Contact WhatsApp Support + Retry */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-left">
                    <p className="text-xs text-slate-300">
                      Notre équipe support est disponible pour vérifier manuellement votre transfert sous quelques instants :
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={`https://wa.me/221789619088?text=${encodeURIComponent(`Bonjour Dokya, ma transaction ${activePendingTxId || ''} de ${payablePrice} FCFA n'a pas été reconnue. Voici ma preuve de paiement.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Contacter le Support WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Réessayer avec un autre reçu</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Security & Guarantee Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Paiement Sécurisé & Garanti</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Wave & OM Certifiés</span>
            <span>•</span>
            <span className="text-slate-500">Support 24/7</span>
          </div>
        </div>

      </div>
    </div>
  );
};
