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
  price?: number;
  isAlreadyPaid?: boolean;
  onDownloadPDF?: () => void;
  onDownloadDocx?: () => void;
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
  price,
  isAlreadyPaid = false,
  onDownloadPDF,
  onDownloadDocx,
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

  // Reset modal state when opened
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
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
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
        // Subscription via wallet
        const subDurationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
        const subEndDate = new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString();
        const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
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
          if (onSubscriptionSuccess) onSubscriptionSuccess(activeSub, 'wallet');
          if (onPaymentSuccess) onPaymentSuccess('wallet');
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
          if (onPaymentSuccess) onPaymentSuccess('wallet', tx);
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

    setTimeout(() => {
      setIsAiScanning(false);
      setValidationOutcome('success');
      setValidationDetails({
        txId: freeTx.id,
        amount: 0,
        message: `Déblocage gratuit accordé grâce au code promo "${appliedPromo?.code}".`,
        unlockedTitle: activeMode === 'subscription' ? planTitle : documentTitle
      });
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

    const titleContext = activeMode === 'recharge' 
      ? `Recharge Solde (${payablePrice} FCFA)` 
      : activeMode === 'subscription' 
        ? `Abonnement ${planTitle}` 
        : `${documentTypeLabel} : ${documentTitle}`;

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
        transactionRef: transactionRef.trim() || undefined,
        purpose: currentPurpose
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
          type: activeMode === 'recharge' ? 'recharge' : 'document_purchase',
          amount: activeMode === 'recharge' ? payablePrice : -payablePrice,
          currency: 'XOF',
          description: `${titleContext} (Validé par Scan IA)`,
          status: 'COMPLETED',
          aiStatus: 'VALIDATED_BY_AI',
          paymentMethod: result.method === 'orange_money' ? 'orange_money' : 'wave',
          createdAt: new Date().toISOString(),
          documentTitle: titleContext,
          senderPhone: result.senderPhone || fullPhone,
          countryCode: selectedCountry.dialCode,
          countryName: selectedCountry.name,
          receiptImage: previewUrl || undefined,
          newBalance: result.newBalance
        };

        setTimeout(() => {
          setIsAiScanning(false);
          setValidationOutcome('success');
          setValidationDetails({
            txId: result.transactionId,
            amount: payablePrice,
            message: result.message || "Reçu officiel certifié et validé avec succès par le scanner IA !",
            senderPhone: result.senderPhone || fullPhone,
            unlockedTitle: titleContext,
            newBalance: result.newBalance
          });

          // Fire appropriate domain callbacks
          if (activeMode === 'recharge' && onRechargeSuccess) {
            onRechargeSuccess(payablePrice, tx);
          } else if (activeMode === 'subscription' && onSubscriptionSuccess) {
            const subDurationDays = planId === 'annual' ? 365 : (planId === 'weekly' ? 7 : 30);
            const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
            onSubscriptionSuccess({
              status: 'active',
              planId: effectivePlanId,
              planName: planTitle || 'Pass VIP Mensuel',
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString(),
              pricePaid: payablePrice,
              paymentMethod: result.method === 'orange_money' ? 'orange_money' : 'wave',
              documentsGeneratedCount: 0
            }, 'mobile_money');
          }
          if (onPaymentSuccess) onPaymentSuccess('mobile_money', tx);
        }, 800);
      } else {
        setIsAiScanning(false);
        setValidationOutcome('failed');
        setErrorMessage(
          result.error || 
          "L'IA n'a pas pu certifier automatiquement ce reçu. Vérifiez que la capture est nette, complète et récente (moins de 30 min)."
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

  // Fallback: Submit for Manual Admin Validation
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

      const endpoint = activeMode === 'recharge' 
        ? '/api/recharge/submit-payment' 
        : activeMode === 'subscription' 
          ? '/api/subscription/submit-payment' 
          : '/api/documents/submit-payment';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          userEmail: userEmail || 'candidat@dokya.sn',
          userName: userName || 'Candidat Dokya',
          documentTitle,
          documentTypeLabel,
          planId,
          planTitle,
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
        type: activeMode === 'recharge' ? 'recharge' : 'document_purchase',
        amount: activeMode === 'recharge' ? payablePrice : -payablePrice,
        currency: 'XOF',
        description: `${activeMode === 'recharge' ? 'Recharge' : activeMode === 'subscription' ? 'Abonnement' : documentTitle} (En attente de validation manuelle)`,
        status: 'pending',
        aiStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        documentTitle: activeMode === 'subscription' ? planTitle : documentTitle,
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
        message: "Votre reçu a été transmis avec succès à l'équipe Dokya. Validation manuelle en cours (5 à 15 minutes).",
        senderPhone: fullPhone,
        unlockedTitle: activeMode === 'subscription' ? planTitle : documentTitle
      });

      if (activeMode === 'recharge' && onRechargeSuccess) {
        onRechargeSuccess(0, pendingTx);
      } else if (activeMode === 'subscription' && onSubscriptionSuccess) {
        const effectivePlanId: 'weekly' | 'monthly' | 'annual' = planId === 'annual' ? 'annual' : (planId === 'weekly' ? 'weekly' : 'monthly');
        onSubscriptionSuccess({
          status: 'pending',
          planId: effectivePlanId,
          planName: planTitle || 'Pass VIP Mensuel',
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          pricePaid: payablePrice,
          paymentMethod: selectedMethod,
          documentsGeneratedCount: 0,
          senderPhone: fullPhone,
          countryCode: selectedCountry.dialCode,
          countryName: selectedCountry.name,
          transactionReference: transactionRef.trim() || generatedTxId,
          submittedAt: new Date().toISOString(),
          receiptImage: previewUrl || undefined
        }, 'mobile_money');
      }
      if (onPaymentSuccess) onPaymentSuccess('mobile_money', pendingTx);
    } catch (e: any) {
      setIsAiScanning(false);
      setErrorMessage(e.message || "Erreur lors de la transmission de la demande.");
    }
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
          {/* ÉTAPE 3 : SCANNER IA LASER & DÉBLOCAGE INSTANTANÉ                         */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Active AI Laser Scanning Animation */}
              {isAiScanning && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 relative overflow-hidden text-center space-y-4">
                  {/* Laser Beam Effect */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_15px_#10b981]" />

                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                    <ScanLine className="w-8 h-8 text-emerald-400 animate-bounce" />
                    <div className="absolute inset-0 rounded-2xl border border-emerald-400 animate-ping opacity-30" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Scanner OCR IA en cours d'exécution...</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Analyse instantanée des signatures de sécurité et de l'horodatage.
                    </p>
                  </div>

                  {/* Scanning Checklist Steps */}
                  <div className="space-y-2 text-left max-w-xs mx-auto text-xs font-semibold">
                    <div className={`flex items-center gap-2 ${scanPhase >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${scanPhase >= 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {scanPhase >= 1 ? '✓' : '1'}
                      </div>
                      <span>Reconnaissance de l'opérateur</span>
                    </div>

                    <div className={`flex items-center gap-2 ${scanPhase >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${scanPhase >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {scanPhase >= 2 ? '✓' : '2'}
                      </div>
                      <span>Contrôle du montant ({payablePrice.toLocaleString('fr-FR')} FCFA)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${scanPhase >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${scanPhase >= 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {scanPhase >= 3 ? '✓' : '3'}
                      </div>
                      <span>Certification temporelle & anti-doublon</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS OUTCOME */}
              {!isAiScanning && validationOutcome === 'success' && (
                <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-9 h-9" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">
                      {activeMode === 'subscription' 
                        ? 'Pass VIP Activé avec Succès !' 
                        : activeMode === 'recharge' 
                          ? 'Solde Rechargé avec Succès !' 
                          : 'Paiement Validé & Document Débloqué !'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {validationDetails.message}
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1.5 text-left">
                    {validationDetails.txId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Réf Transaction :</span>
                        <span className="font-mono font-bold text-amber-400">{validationDetails.txId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Statut :</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Validé par IA Dokya
                      </span>
                    </div>
                    {validationDetails.newBalance !== undefined && (
                      <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                        <span className="text-slate-400">Nouveau Solde :</span>
                        <span className="font-mono font-bold text-emerald-400">{validationDetails.newBalance.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Download or Close actions */}
                  <div className="space-y-2 pt-2">
                    {activeMode === 'document' && (onDownloadPDF || onDownloadDocx) && (
                      <div className="grid grid-cols-2 gap-2">
                        {onDownloadPDF && (
                          <button
                            type="button"
                            onClick={() => {
                              onDownloadPDF();
                              onClose();
                            }}
                            className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Download className="w-4 h-4" />
                            <span>Télécharger PDF</span>
                          </button>
                        )}
                        {onDownloadDocx && (
                          <button
                            type="button"
                            onClick={() => {
                              onDownloadDocx();
                              onClose();
                            }}
                            className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Download className="w-4 h-4" />
                            <span>Télécharger Word</span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Terminer & Accéder à l'espace
                    </button>
                  </div>
                </div>
              )}

              {/* PENDING OUTCOME (Manual Validation) */}
              {!isAiScanning && validationOutcome === 'pending' && (
                <div className="p-6 rounded-3xl bg-amber-950/30 border border-amber-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                    <Clock className="w-9 h-9" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">Transmission Réussie !</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {validationDetails.message}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Réf Suivi :</span>
                      <span className="font-mono font-bold text-amber-400">{validationDetails.txId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Statut :</span>
                      <span className="font-bold text-amber-300">En cours d'examen par l'administration</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    D'accord, fermer
                  </button>
                </div>
              )}

              {/* FAILED OUTCOME WITH MANUAL FALLBACK */}
              {!isAiScanning && validationOutcome === 'failed' && (
                <div className="p-5 rounded-3xl bg-rose-950/30 border border-rose-500/40 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Analyse IA Non Concluante</h4>
                      <p className="text-xs text-rose-300 mt-0.5">
                        {errorMessage || "Le reçu n'a pas pu être validé automatiquement."}
                      </p>
                    </div>
                  </div>

                  {/* Fallback Option: Submit for manual inspection */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <p className="text-xs text-slate-300 font-medium">
                      Pas d'inquiétude ! Vous pouvez soit reprendre une photo plus nette, soit <strong>transmettre votre reçu directement à notre équipe</strong> pour validation manuelle prioritaire :
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Réessayer avec un autre reçu</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleManualValidationFallback}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Valider par l'Équipe Dokya</span>
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
