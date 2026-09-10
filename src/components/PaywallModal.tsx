import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Crown, Briefcase, Zap, CheckCircle2, ShieldCheck, Download, 
  FileText, ArrowRight, ExternalLink, Copy, Check, Upload, Loader2, 
  Sparkles, Smartphone, Wallet, AlertCircle, Star, Lock, Clock, FileCheck
} from 'lucide-react';
import { 
  recordTransactionEverywhere, 
  saveTransactionRecord, 
  subscribeToTransactionStatus, 
  subscribeToUserProfile,
  auth
} from '../lib/firebase';
import { TransactionRecord } from '../types';
import { verifyReceiptImage } from '../services/receiptPaymentService';

// Données officielles de paiement mobile Dokya Sénégal
export const WAVE_PAY_URL = 'https://pay.wave.com/m/M_sn_wXlszdyVZOIV/c/sn/';
export const OM_BENEFICIARY_PHONE = '+221 78 961 90 88';
export const OM_BENEFICIARY_NAME = 'NGOUALA LAVOISIER FORTUNÉ PETER';

export type PaywallFormulaId = 'single' | 'vip_career' | 'business';

export interface PaywallFormula {
  id: PaywallFormulaId;
  title: string;
  subtitle: string;
  price: number;
  priceFormatted: string;
  badge?: string;
  badgeColor?: string;
  icon: any;
  popular?: boolean;
  features: string[];
  ctaLabel: string;
}

export const PAYWALL_FORMULAS: PaywallFormula[] = [
  {
    id: 'single',
    title: "Paiement à l'acte",
    subtitle: "Déblocage immédiat de votre document actif",
    price: 1000,
    priceFormatted: "1 000 F CFA",
    icon: Zap,
    features: [
      "Téléchargement immédiat du document en cours",
      "Formats haute résolution PDF & Word (.docx) éditables",
      "Sans filigrane, mise en page vectorielle A4",
      "Conservation & archivage permanent dans votre espace"
    ],
    ctaLabel: "Choisir le Paiement à l'acte"
  },
  {
    id: 'vip_career',
    title: "Pass VIP Carrière",
    subtitle: "Accès illimité pour booster vos recrutements",
    price: 2500,
    priceFormatted: "2 500 F CFA",
    badge: "Populaire Candidats 🔥",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    popular: true,
    icon: Crown,
    features: [
      "Tous les modèles de CV professionnels certifiés ATS",
      "Génération illimitée de lettres de motivation",
      "Simulateur & Coaching d'Entretien RH par IA",
      "Téléchargements illimités PDF & Word pendant 30 jours",
      "Assistance prioritaire Dokya Carrière"
    ],
    ctaLabel: "Activer le Pass VIP Carrière"
  },
  {
    id: 'business',
    title: "Pass Business",
    subtitle: "Facturation pro & gestion commerciale complète",
    price: 5000,
    priceFormatted: "5 000 F CFA",
    badge: "Entreprises & Freelances 💼",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: Briefcase,
    features: [
      "Factures & Devis illimités conformes normes OHADA / UEMOA",
      "Partage direct WhatsApp 1-Clic et relances clients",
      "Suivi des encaissements, créances et états de compte",
      "Comprend tout le Pass VIP Carrière (CV + Lettres)",
      "Multi-entreprises & mentions légales professionnelles"
    ],
    ctaLabel: "Activer le Pass Business"
  }
];

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  documentTypeLabel?: string;
  targetDocId?: string;
  targetFormat?: 'pdf' | 'docx';
  userBalance?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  onUnlocked: () => void;
  onDownloadAction?: (format: 'pdf' | 'docx') => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  documentTitle = 'Document Professionnel',
  documentTypeLabel = 'Document',
  targetDocId,
  targetFormat = 'pdf',
  userBalance = 0,
  userId,
  userEmail,
  userName,
  onUnlocked,
  onDownloadAction,
  onBalanceUpdated
}) => {
  // Selected formula
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallFormulaId>('single');
  const selectedFormula = PAYWALL_FORMULAS.find(f => f.id === selectedPlanId) || PAYWALL_FORMULAS[0];

  // Payment channel & workflow step
  // Step 1: Choix formule & Paiement, Step 2: Envoi preuve & Attente approbation
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'wallet'>('wave');
  
  // Proof upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [txReference, setTxReference] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Approval tracking
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const txUnsubRef = useRef<(() => void) | null>(null);
  const userProfileUnsubRef = useRef<(() => void) | null>(null);

  // Reset states on opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploadError(null);
      setIsApproved(false);
      setIsSubmittingProof(false);
      setActiveTxId(null);
    } else {
      if (txUnsubRef.current) {
        txUnsubRef.current();
        txUnsubRef.current = null;
      }
      if (userProfileUnsubRef.current) {
        userProfileUnsubRef.current();
        userProfileUnsubRef.current = null;
      }
    }
  }, [isOpen]);

  // Listen to profile updates (e.g. if admin approves VIP or balance)
  useEffect(() => {
    const currentUid = (userId && userId !== 'guest') ? userId : auth.currentUser?.uid;
    if (!isOpen || !currentUid || currentUid === 'guest') return;

    userProfileUnsubRef.current = subscribeToUserProfile(currentUid, (profileData) => {
      const subStatus = (profileData.subscription?.status || (profileData as any).subscriptionStatus || '').toUpperCase();
      const isVip = subStatus === 'ACTIVE' || subStatus === 'APPROVED' || (profileData as any).subscriptionStatus === 'unlimited';
      const isDocPurchased = targetDocId && Array.isArray((profileData as any).purchasedDocIds) && (profileData as any).purchasedDocIds.includes(targetDocId);

      if (isVip || isDocPurchased) {
        triggerUnlockSuccess();
      }
    });

    return () => {
      if (userProfileUnsubRef.current) {
        userProfileUnsubRef.current();
        userProfileUnsubRef.current = null;
      }
    };
  }, [isOpen, userId, targetDocId]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  // Trigger unlock when approved
  const triggerUnlockSuccess = () => {
    setIsApproved(true);
    setTimeout(() => {
      onUnlocked();
      if (onDownloadAction && targetFormat) {
        onDownloadAction(targetFormat);
      }
      onClose();
    }, 1800);
  };

  // 1. Pay with wallet balance if sufficient
  const handlePayWithWallet = async () => {
    if (userBalance < selectedFormula.price) {
      setUploadError(`Votre solde (${userBalance} F CFA) est insuffisant pour cette formule.`);
      return;
    }

    setIsPayingWithWallet(true);
    setUploadError(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const txId = `TX-WALLET-${Date.now()}`;

    try {
      const tx: TransactionRecord = {
        id: txId,
        transactionId: txId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: selectedFormula.id === 'single' ? 'DIRECT_PURCHASE' : 'PASS_VIP',
        amount: -selectedFormula.price,
        expectedAmount: selectedFormula.price,
        currency: 'FCFA',
        description: `Règlement ${selectedFormula.title} (Débit solde)`,
        status: 'APPROVED',
        aiStatus: 'COMPLETED',
        paymentMethod: 'wallet',
        targetDocId: targetDocId,
        unlockedDocId: targetDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await recordTransactionEverywhere(tx);

      const newBal = Math.max(0, userBalance - selectedFormula.price);
      if (onBalanceUpdated) {
        onBalanceUpdated(newBal);
      }

      triggerUnlockSuccess();
    } catch (err: any) {
      console.error('[Wallet Pay Error]:', err);
      setUploadError("Une erreur est survenue lors du débit du solde. Veuillez réessayer.");
    } finally {
      setIsPayingWithWallet(false);
    }
  };

  // 2. Handle proof image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError("Veuillez sélectionner un fichier image valide (JPG, PNG).");
      return;
    }
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
    setUploadError(null);
  };

  // 3. Submit proof of payment to admin and start real-time listener
  const handleSubmitProof = async () => {
    if (!receiptFile) {
      setUploadError("Veuillez joindre la capture d'écran ou le reçu de votre transfert.");
      return;
    }

    setIsSubmittingProof(true);
    setUploadError(null);

    const currentUid = (userId && userId !== 'guest') ? userId : (auth.currentUser?.uid || 'guest');
    const nowIso = new Date().toISOString();
    const newTxId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setActiveTxId(newTxId);

    try {
      // 1. Convert image to Base64 for Firestore storage & OCR
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(receiptFile);
      });
      const base64Data = await base64Promise;

      // 2. Initial Transaction Record with status 'PENDING'
      const tx: TransactionRecord = {
        id: newTxId,
        transactionId: newTxId,
        userId: currentUid,
        userEmail: userEmail || auth.currentUser?.email || 'candidat@dokya.sn',
        userName: userName || auth.currentUser?.displayName || 'Client Dokya',
        type: selectedFormula.id === 'single' ? 'DIRECT_PURCHASE' : 'PASS_VIP',
        amount: selectedFormula.price,
        expectedAmount: selectedFormula.price,
        currency: 'FCFA',
        description: `Paiement ${selectedFormula.title} - ${documentTitle}`,
        status: 'PENDING',
        aiStatus: 'PENDING',
        paymentMethod: selectedMethod === 'orange_money' ? 'orange_money' : 'wave',
        senderPhone: senderPhone.trim() || undefined,
        receiptUrl: base64Data || undefined,
        targetDocId: targetDocId,
        unlockedDocId: targetDocId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Save everywhere
      await recordTransactionEverywhere(tx);

      // 3. Try automatic fast OCR verification in background
      try {
        const verifyRes = await verifyReceiptImage({
          file: receiptFile,
          expectedAmount: selectedFormula.price,
          documentTitle,
          userId: currentUid,
          userEmail: tx.userEmail,
          senderPhone: senderPhone.trim(),
          purpose: selectedFormula.id === 'single' ? 'document_unlock' : 'pass_vip'
        });

        if (verifyRes.success && verifyRes.status === 'COMPLETED') {
          // Immediately approved by AI OCR!
          tx.status = 'APPROVED';
          tx.aiStatus = 'VALIDATED_BY_AI';
          tx.updatedAt = new Date().toISOString();
          await recordTransactionEverywhere(tx);
          triggerUnlockSuccess();
          return;
        }
      } catch (_ocrErr) {
        console.warn('[AI OCR Verification Warn]:', _ocrErr);
      }

      // 4. Listen in real time for admin manual validation (status === 'APPROVED')
      if (txUnsubRef.current) txUnsubRef.current();
      txUnsubRef.current = subscribeToTransactionStatus(newTxId, (status, updatedTx) => {
        const statusUpper = (status || updatedTx?.status || '').toUpperCase();
        if (
          statusUpper === 'APPROVED' || 
          statusUpper === 'MANUALLY_VALIDATED' || 
          statusUpper === 'VALIDATED_BY_AI' || 
          statusUpper === 'COMPLETED' ||
          statusUpper === 'SUCCESS'
        ) {
          triggerUnlockSuccess();
        }
      });


      setCurrentStep(2);
    } catch (err: any) {
      console.error('[Proof Submission Error]:', err);
      setUploadError("Une erreur est survenue lors de l'enregistrement de votre reçu. Veuillez réessayer.");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const copyOmPhone = () => {
    navigator.clipboard.writeText(OM_BENEFICIARY_PHONE.replace(/\s+/g, ''));
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Débloquer mon Document
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Tarification & Pass VIP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md sm:max-w-lg">
                {documentTitle} ({documentTypeLabel}) • Export HD sans filigrane
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* APPROVED STATE SUCCESS BANNER */}
          {isApproved ? (
            <div className="p-8 text-center space-y-4 bg-emerald-950/40 border border-emerald-500/40 rounded-3xl animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-black text-white">Paiement Validé & Approuvé !</h4>
                <p className="text-sm text-emerald-200 mt-1">
                  Votre document est débloqué. Le téléchargement {targetFormat.toUpperCase()} démarre automatiquement...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Génération du fichier haute définition en cours...</span>
              </div>
            </div>
          ) : currentStep === 1 ? (
            <>
              {/* Solde Portefeuille Information Bar */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Votre Solde Portefeuille :</span>
                    <p className="text-sm font-black text-white font-mono">{userBalance.toLocaleString('fr-FR')} F CFA</p>
                  </div>
                </div>

                {userBalance >= selectedFormula.price ? (
                  <button
                    type="button"
                    onClick={handlePayWithWallet}
                    disabled={isPayingWithWallet}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isPayingWithWallet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Débit du solde...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Payer avec mon solde ({selectedFormula.priceFormatted})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 sm:text-right">
                    Réglez directement par <strong className="text-cyan-400">Wave</strong> ou <strong className="text-orange-400">Orange Money</strong> ci-dessous
                  </span>
                )}
              </div>

              {/* LES 3 FORMULES OBLIGATOIRES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Choisissez votre formule</span>
                  </label>
                  <span className="text-[11px] text-slate-400">3 options sans engagement</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {PAYWALL_FORMULAS.map((formula) => {
                    const isSelected = selectedPlanId === formula.id;
                    const Icon = formula.icon;

                    return (
                      <div
                        key={formula.id}
                        onClick={() => setSelectedPlanId(formula.id)}
                        className={`relative rounded-2xl p-4 transition-all cursor-pointer border flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {formula.badge && (
                          <span className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-sm ${formula.badgeColor}`}>
                            {formula.badge}
                          </span>
                        )}

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-white">{formula.title}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{formula.subtitle}</p>
                          </div>

                          <div className="pt-1">
                            <span className="text-lg font-black text-white font-mono">{formula.priceFormatted}</span>
                            {formula.id !== 'single' && (
                              <span className="text-[10px] text-slate-400 ml-1">/ 30 jours</span>
                            )}
                          </div>

                          <ul className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                            {formula.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHOIX DU MOYEN DE PAIEMENT DIRECT */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Moyen de Règlement direct</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Wave */}
                  <div
                    onClick={() => setSelectedMethod('wave')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedMethod === 'wave'
                        ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-base border border-cyan-500/30">
                        🌊
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white">Wave Sénégal (1-Clic)</h5>
                        <p className="text-[11px] text-cyan-300/80">Lien marchand officiel sécurisé</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedMethod === 'wave' ? 'border-cyan-400 bg-cyan-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {selectedMethod === 'wave' && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Orange Money */}
                  <div
                    onClick={() => setSelectedMethod('orange_money')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedMethod === 'orange_money'
                        ? 'bg-orange-950/30 border-orange-500/60 ring-1 ring-orange-500/30'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-300 flex items-center justify-center font-black text-base border border-orange-500/30">
                        📱
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white">Orange Money</h5>
                        <p className="text-[11px] text-orange-300/80">Transfert direct +221 78 961 90 88</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedMethod === 'orange_money' ? 'border-orange-400 bg-orange-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {selectedMethod === 'orange_money' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>

                {/* DÉTAILS DU PAIEMENT WAVE OU OM AVEC BOUTON DE REDIRECTION DIRECT */}
                {selectedMethod === 'wave' ? (
                  <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-cyan-200">
                          Montant à régler : <strong className="text-white font-mono">{selectedFormula.priceFormatted}</strong>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cliquez sur le bouton ci-dessous pour ouvrir directement l'application Wave ou payer par QR code :
                        </p>
                      </div>

                      <a
                        href={WAVE_PAY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all shrink-0 cursor-pointer active:scale-95"
                      >
                        <span>Ouvrir Wave pour Payer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-2xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-orange-200">
                          Numéro Orange Money : <strong className="text-white font-mono">{OM_BENEFICIARY_PHONE}</strong>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Bénéficiaire : <strong className="text-white">{OM_BENEFICIARY_NAME}</strong> • Montant : <strong className="text-white font-mono">{selectedFormula.priceFormatted}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={copyOmPhone}
                        className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
                      >
                        {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPhone ? 'Copié !' : 'Copier le Numéro'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ENVOI DE LA PREUVE DE PAIEMENT (CAPTURE D'ÉCRAN / REÇU) */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Envoi de la preuve de paiement (Capture / Reçu)</span>
                </label>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                  {/* File Input Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl text-center cursor-pointer transition-colors bg-slate-900/40 space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {receiptPreview ? (
                      <div className="space-y-2">
                        <img
                          src={receiptPreview}
                          alt="Reçu de paiement"
                          className="max-h-36 mx-auto rounded-lg border border-slate-700 shadow-md object-contain"
                        />
                        <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reçu sélectionné : {receiptFile?.name}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-200">
                          Cliquez pour déposer votre capture d'écran de transfert Wave ou OM
                        </p>
                        <p className="text-[10px] text-slate-400">Formats acceptés : JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </div>

                  {/* Optional fields: sender phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Votre Numéro de Téléphone :
                      </label>
                      <input
                        type="tel"
                        placeholder="Ex: 77 123 45 67"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Réf. / ID Transaction (Optionnel) :
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: W-123456789"
                        value={txReference}
                        onChange={(e) => setTxReference(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    disabled={isSubmittingProof || !receiptFile}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingProof ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmission de la preuve & Vérification...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>Transmettre la Preuve & Débloquer l'Exportation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* STEP 2: WAITING FOR ADMIN APPROVAL (REAL-TIME LISTENER) */
            <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-white">
                  Preuve transmise avec succès !
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Votre transaction <span className="font-mono text-amber-300 font-bold">{activeTxId}</span> est enregistrée. L'administrateur valide votre preuve de paiement.
                </p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Formule :</span>
                  <strong className="text-white">{selectedFormula.title}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Montant :</span>
                  <strong className="text-emerald-400 font-mono">{selectedFormula.priceFormatted}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Statut actuel :</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>EN ATTENTE D'APPROBATION</span>
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 max-w-md mx-auto">
                ⚡ <strong>Synchronisation en temps réel :</strong> Dès que le statut <code>status == "APPROVED"</code> est attribué par l'admin, cette fenêtre se débloquera automatiquement et déclenchera votre téléchargement.
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  ← Modifier la preuve
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Fermer (Patienter en arrière-plan)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">Plateforme Certifiée Dokya AI Studio • Paiements Wave & OM Sécurisés</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
};
