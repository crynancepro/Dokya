import React, { useState } from 'react';
import { 
  X, Check, Sparkles, FileText, FileCode, Wallet, CreditCard, 
  ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Download, 
  Loader2, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { CVFormData, AIOptimizedData, TransactionRecord } from '../types';
import { SenePayCheckoutButton } from './SenePayCheckoutButton';
import { saveGeneratedDocumentMetadata, auth } from '../lib/firebase';
import { safeParseJsonResponse } from '../utils/apiHelpers';

interface DocumentCheckoutWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string; // e.g. "CV Pro ATS", "Lettre de Motivation", "Pack CV + Lettre"
  formData: CVFormData;
  aiData?: AIOptimizedData | null;
  price?: number; // Default 1000 FCFA
  userBalance: number;
  userId?: string;
  onDownloadPDF?: () => Promise<void> | void;
  onDownloadDocx?: () => Promise<void> | void;
  onSuccessTransaction?: (newBalance: number, tx: TransactionRecord) => void;
  onOpenRechargeModal?: () => void;
}

export const DocumentCheckoutWizardModal: React.FC<DocumentCheckoutWizardModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  formData,
  aiData,
  price = 1000,
  userBalance = 0,
  userId,
  onDownloadPDF,
  onDownloadDocx,
  onSuccessTransaction,
  onOpenRechargeModal
}) => {
  // Funnel steps: 1 = Aperçu & Création, 2 = Sélection Format, 3 = Paiement, 4 = Confirmation / Téléchargement
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected formats state (Step 2)
  const [selectPdf, setSelectPdf] = useState<boolean>(true);
  const [selectDocx, setSelectDocx] = useState<boolean>(false);

  // Dynamic / Manual amount state
  const [effectiveAmount, setEffectiveAmount] = useState<number>(price || 1000);
  const [manualAmountInput, setManualAmountInput] = useState<string>(String(price || 1000));
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Processing payment state (Step 3)
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-payment completed status (Step 4)
  const [completedTx, setCompletedTx] = useState<TransactionRecord | null>(null);

  // Update amount when price prop changes
  React.useEffect(() => {
    const p = price || 1000;
    setEffectiveAmount(p);
    setManualAmountInput(String(p));
  }, [price]);

  if (!isOpen) return null;

  const candidateName = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat';
  const targetJob = formData?.personalInfo?.targetJob || 'Poste Visé';
  const hasSelectedAtLeastOneFormat = selectPdf || selectDocx;
  const currentPrice = Math.max(100, effectiveAmount || price || 1000);
  const safeUserBalance = Number(userBalance) || 0;
  const hasEnoughBalance = safeUserBalance >= currentPrice;

  // Handle manual amount change
  const handleManualAmountChange = (val: string) => {
    setManualAmountInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setEffectiveAmount(parsed);
    }
  };

  // Set preset amount
  const handleSelectPreset = (preset: number) => {
    setEffectiveAmount(preset);
    setManualAmountInput(String(preset));
    setIsManualEdit(false);
  };

  // Execute Downloads
  const triggerDownloads = async () => {
    try {
      if (selectPdf && onDownloadPDF) {
        await onDownloadPDF();
      }
      if (selectDocx && onDownloadDocx) {
        await onDownloadDocx();
      }
    } catch (e) {
      console.error('Error during auto-download:', e);
    }
  };

  // Helper to save final generated document metadata to user_documents collection
  const recordDocumentMetadata = async () => {
    const selectedFormatLabel = [selectPdf && 'PDF', selectDocx && 'DOCX'].filter(Boolean).join(' + ') || 'PDF';
    const effectiveUid = userId || auth.currentUser?.uid || 'guest';
    try {
      await saveGeneratedDocumentMetadata({
        userId: effectiveUid,
        title: documentTitle,
        selectedFormat: selectedFormatLabel,
        generationMode: formData?.generationMode || 'cv_only',
        formData,
        aiData,
        createdAt: new Date().toISOString(),
        isPaid: true
      });
    } catch (e) {
      console.warn('Metadata save error:', e);
    }
  };

  // Handle Debit Wallet (Option 1)
  const handleWalletPayment = async () => {
    if (!hasEnoughBalance) {
      setErrorMessage(`Solde insuffisant (${(safeUserBalance || 0).toLocaleString('fr-FR')} FCFA disponibles, ${(currentPrice || 0).toLocaleString('fr-FR')} FCFA requis).`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/wallet/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          amount: currentPrice,
          currentBalance: safeUserBalance,
          documentTitle
        })
      });

      const data = await safeParseJsonResponse(response);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du débit du solde.');
      }

      const newBalance = data.data?.newBalance ?? data.newBalance ?? Math.max(0, safeUserBalance - currentPrice);
      const tx: TransactionRecord = data.data?.transaction || data.transaction || {
        id: `TX-DEBIT-${Date.now()}`,
        userId: userId || 'guest',
        type: 'document_purchase',
        amount: -currentPrice,
        currency: 'XOF',
        description: `Achat document : ${documentTitle}`,
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance,
        documentTitle
      };

      setCompletedTx(tx);
      await recordDocumentMetadata();

      if (onSuccessTransaction) {
        onSuccessTransaction(newBalance, tx);
      }

      // Step 4: Advance & trigger auto-download
      setCurrentStep(4);
      await triggerDownloads();
    } catch (err: any) {
      console.error('Wallet payment error:', err);
      setErrorMessage(err.message || 'Impossible d\'effectuer le paiement via votre solde.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle SenePay success callback
  const handleSenePaySuccess = async () => {
    const tx: TransactionRecord = {
      id: `TX-SENEPAY-${Date.now()}`,
      userId: userId || 'guest',
      type: 'document_purchase',
      amount: -currentPrice,
      currency: 'XOF',
      description: `Achat SenePay Direct : ${documentTitle}`,
      status: 'success',
      createdAt: new Date().toISOString(),
      paymentMethod: 'senepay',
      documentTitle
    };

    setCompletedTx(tx);
    await recordDocumentMetadata();

    if (onSuccessTransaction) {
      onSuccessTransaction(userBalance, tx);
    }

    setCurrentStep(4);
    await triggerDownloads();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden relative animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* HEADER & STEPPER BAR */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Tunnel de Génération & Téléchargement</span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-white">
            {documentTitle}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {documentTypeLabel.includes('Devis') || documentTypeLabel.includes('Facture') || documentTypeLabel.includes('Business')
              ? <>Document Commercial • <strong className="text-white">Conforme UEMOA</strong></>
              : <>Candidat : <strong className="text-white">{candidateName}</strong> ({targetJob})</>}
          </p>

          {/* Stepper indicators */}
          <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
            {/* Step 1 indicator */}
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${
              currentStep >= 1 ? 'border-emerald-400 text-white' : 'border-slate-700 text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                currentStep > 1 ? 'bg-emerald-500 text-slate-950' : currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
              </div>
              <span className="text-[11px] font-bold truncate">1. Aperçu</span>
            </div>

            {/* Step 2 indicator */}
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${
              currentStep >= 2 ? 'border-emerald-400 text-white' : 'border-slate-700 text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                currentStep > 2 ? 'bg-emerald-500 text-slate-950' : currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
              </div>
              <span className="text-[11px] font-bold truncate">2. Format</span>
            </div>

            {/* Step 3 indicator */}
            <div className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${
              currentStep >= 3 ? 'border-emerald-400 text-white' : 'border-slate-700 text-slate-500'
            }`}>
              <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                3
              </div>
              <span className="text-[11px] font-bold truncate">3. Paiement</span>
            </div>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* ======================================================== */}
          {/* ÉTAPE 1 : CRÉATION & APERÇU */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900">
                    Document Généré avec Succès par l'IA Gemini !
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Votre document a été compilé au format ATS Sénégal. Vérifiez le récapitulatif ci-dessous avant de choisir le format.
                  </p>
                </div>
              </div>

              {/* Document Overview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {documentTypeLabel}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Modèle : <strong className="text-slate-800 uppercase">{formData?.templateStyle || 'Moderne'}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>Identité :</span>
                    <span className="font-extrabold text-slate-900">{candidateName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>Intitulé :</span>
                    <span className="font-bold text-slate-900">{targetJob}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>Localisation :</span>
                    <span className="font-bold text-slate-900">{formData?.personalInfo?.city || 'Dakar'}, Sénégal</span>
                  </div>
                  {aiData?.suggestedKeywords && (
                    <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
                      <span>Mots-clés ATS :</span>
                      <span className="font-bold text-indigo-700">{aiData.suggestedKeywords.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button to Step 2 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Suivant : Choisir le format</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 2 : SÉLECTION DU FORMAT */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Sélectionnez le(s) format(s) de téléchargement
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {documentTypeLabel.includes('Pack Emploi')
                    ? 'Le Pack Emploi comprend la génération simultanée du CV Pro ATS et de la Lettre de Motivation.'
                    : documentTypeLabel.includes('Business')
                    ? 'Le Pack Business comprend le Devis Pro et la Facture Client avec calculs automatiques.'
                    : 'Cochez au moins un format (PDF et/ou Word) pour continuer vers l\'étape de règlement.'}
                </p>
              </div>

              {/* Pack Details Banner if applicable */}
              {(documentTypeLabel.includes('Pack') || documentTypeLabel.includes('Duo')) && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="text-xs text-indigo-900">
                    <strong className="font-extrabold block">{documentTypeLabel} sélectionné</strong>
                    <span>Tous les documents inclus dans ce pack seront exportés dans les formats cochés ci-dessous.</span>
                  </div>
                </div>
              )}

              {/* Checkboxes List */}
              <div className="space-y-3">
                
                {/* PDF Checkbox Card */}
                <label 
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    selectPdf
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectPdf}
                    onChange={(e) => setSelectPdf(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>PDF (Format haute définition & certifié)</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        Recommandé ATS / Officiel
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Format standard haute précision A4 non altérable. Prêt pour l'envoi direct aux recruteurs ou aux clients.
                    </p>
                  </div>
                </label>

                {/* WORD DOCX Checkbox Card */}
                <label 
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    selectDocx
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectDocx}
                    onChange={(e) => setSelectDocx(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-blue-600" />
                        <span>Word (.docx) (Format 100% éditable)</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Modifiable à volonté
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Fichier Microsoft Word totalement modifiable pour adapter vos textes ou personnaliser votre mise en page.
                    </p>
                  </div>
                </label>

              </div>

              {!hasSelectedAtLeastOneFormat && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Veuillez cocher au moins un format (PDF ou Word) pour débloquer la suite.</span>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!hasSelectedAtLeastOneFormat}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  <span>Suivant : Réglage du paiement</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 3 : SÉLECTION DU MODE DE PAIEMENT */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* Order Summary Header & Amount Selector */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">Récapitulatif de Commande</span>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Service : <strong className="text-white font-bold">{documentTypeLabel}</strong> • Formats : <strong className="text-amber-300 font-bold">{[selectPdf && 'PDF', selectDocx && 'Word (.docx)'].filter(Boolean).join(' + ')}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400">Montant à régler</span>
                  <p className="text-2xl font-black text-emerald-400">{(currentPrice || 0).toLocaleString('fr-FR')} <span className="text-xs font-bold text-white">FCFA</span></p>
                </div>
              </div>

              {/* SÉLECTEUR DE FORFAIT / PACK OU MONTANT MANUEL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sélectionner une formule ou ajuster le montant</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Tarif Officiel
                  </span>
                </div>

                {/* Grille des tarifs pré-définis réactualisés */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Document Unitaire (CV / Lettre / Devis / Facture)', amount: 1000, badge: 'Unitaire' },
                    { label: 'Pack Emploi (CV + Lettre)', amount: 1399, badge: 'Pack Emploi' },
                    { label: 'Pack Business (Devis + Facture)', amount: 1499, badge: 'Pack Business' },
                    { label: 'Pass Illimité Mois', amount: 3499, badge: 'Pass 1 Mois' },
                    { label: 'Pass Illimité Annuel', amount: 39999, badge: 'Pass 1 An' },
                  ].map((preset) => (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => handleSelectPreset(preset.amount)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        effectiveAmount === preset.amount && !isManualEdit
                          ? 'border-indigo-600 bg-indigo-50/85 text-indigo-950 font-bold shadow-sm ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                          {preset.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 line-clamp-1 font-medium">{preset.label}</div>
                      <div className="text-sm font-black mt-0.5 text-slate-900">
                        {preset.amount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-slate-500">FCFA</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Champ de saisie manuelle du montant */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Ou saisissez votre montant personnalisé :
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={manualAmountInput}
                      onChange={(e) => {
                        setIsManualEdit(true);
                        handleManualAmountChange(e.target.value);
                      }}
                      onFocus={() => setIsManualEdit(true)}
                      placeholder="Ex: 1000"
                      className="w-full pl-3 pr-16 py-2.5 bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-black text-slate-900 outline-none transition-all"
                    />
                    <span className="absolute right-3 text-xs font-extrabold text-indigo-700 pointer-events-none">
                      FCFA
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Indiquez le montant exact souhaité pour le règlement ou le don supplémentaire.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* PAYMENT OPTIONS */}
              <div className="space-y-4">
                
                {/* OPTION 1 : SOLDE USER WALLET */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasEnoughBalance ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Option 1 : Payer avec mon Solde Wallet
                        </h5>
                        <p className="text-[11px] text-slate-500">Débit immédiat de votre solde Dokya</p>
                      </div>
                    </div>

                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                      hasEnoughBalance ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      Solde : {(safeUserBalance || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {hasEnoughBalance ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-emerald-800 font-medium">
                        Votre solde est suffisant ({(safeUserBalance || 0).toLocaleString('fr-FR')} FCFA). {(currentPrice || 0).toLocaleString('fr-FR')} FCFA seront déduits.
                      </p>
                      <button
                        type="button"
                        onClick={handleWalletPayment}
                        disabled={isProcessing}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Traitement du débit...</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4" />
                            <span>Payer {(currentPrice || 0).toLocaleString('fr-FR')} FCFA & Télécharger Immédiatement</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Solde insuffisant ({(safeUserBalance || 0).toLocaleString('fr-FR')} FCFA disponibles, {(currentPrice || 0).toLocaleString('fr-FR')} FCFA requis).</span>
                      </div>
                      {onOpenRechargeModal && (
                        <button
                          type="button"
                          onClick={onOpenRechargeModal}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Recharger mon solde (+3000 FCFA)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* DIVIDER */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest relative">
                    OU
                  </span>
                </div>

                {/* OPTION 2 : GUICHET SENEPAY */}
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Option 2 : Guichet SenePay Direct
                        </h5>
                        <p className="text-[11px] text-slate-500">Wave, Orange Money, Free Money, Carte Bancaire</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Paiement direct de <strong className="text-indigo-900">{(currentPrice || 0).toLocaleString('fr-FR')} FCFA</strong> via votre application Mobile Money sans recharger le solde.
                  </p>

                  <div className="w-full pt-1">
                    <SenePayCheckoutButton
                      amount={currentPrice || 0}
                      description={`Achat document Dokya (${currentPrice || 0} FCFA)`}
                      orderReference={`DOC-${Date.now()}`}
                      buttonText={`Payer ${(currentPrice || 0).toLocaleString('fr-FR')} FCFA via SenePay`}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      onSuccessRedirect={handleSenePaySuccess}
                    />
                  </div>
                </div>

              </div>

              {/* Back to Step 2 */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modifier les formats choisis</span>
                </button>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 4 : CONFIRMATION & TÉLÉCHARGEMENT POST-PAIEMENT */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center animate-in zoom-in-95 py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">Paiement Validé & Téléchargement Lancé !</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Votre document a été débloqué et enregistré dans votre profil candidat. Le téléchargement s'est déclenché automatiquement dans votre navigateur.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Document :</span>
                  <span className="font-bold text-slate-900">{documentTitle}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Format(s) sélectionné(s) :</span>
                  <span className="font-extrabold text-indigo-700">
                    {[selectPdf && 'PDF', selectDocx && 'Word (.docx)'].filter(Boolean).join(' + ')}
                  </span>
                </div>
                {completedTx && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Réf. Transaction :</span>
                    <span className="font-mono text-[11px] text-slate-500">{completedTx.id}</span>
                  </div>
                )}
              </div>

              {/* Re-trigger Download Buttons if needed */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Un problème avec le téléchargement automatique ?
                </p>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {selectPdf && (
                    <button
                      type="button"
                      onClick={onDownloadPDF}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Rétélécharger le PDF</span>
                    </button>
                  )}

                  {selectDocx && (
                    <button
                      type="button"
                      onClick={onDownloadDocx}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Rétélécharger en Word (.docx)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl cursor-pointer shadow-md"
                >
                  Fermer & Continuer
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER BADGE */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-3 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sécurité SSL Cryptée • Conforme aux standards ATS Sénégal</span>
        </div>

      </div>
    </div>
  );
};
