import React, { useState } from 'react';
import { CVFormData, AIOptimizedData, BusinessDocData, EbookData, TemplateStyle, LetterTone, BusinessDocTemplateId } from '../types';
import { ALL_CV_TEMPLATES } from '../data/cvTemplatesList';
import { BUSINESS_DOC_TEMPLATES } from '../data/businessDocTemplates';
import { CVTemplate } from './CVTemplate';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { DevisFactureTemplate } from './DevisFactureTemplate';
import { EbookTemplate } from './EbookTemplate';
import { A4PreviewContainer } from './A4PreviewContainer';
import { usePricing } from '../contexts/PricingContext';
import { DocumentShareWhatsAppParams, openDocumentWhatsAppShare } from '../utils/whatsappUtils';
import {
  captureDocumentAsImage,
  downloadImageFile,
  copyImageBlobToClipboard,
  shareDocumentWithCaptureOnWhatsApp,
  DocumentCaptureResult
} from '../utils/documentCaptureUtils';
import { 
  ArrowLeft, Download, FileText, Printer, 
  Sparkles, CheckCircle2, Eye, Palette, ZoomIn, ZoomOut, 
  RotateCcw, Mail, FileCheck, Receipt, Package, ArrowLeftRight,
  Lock, Unlock, CreditCard, ShieldCheck, Loader2, ChevronDown,
  X, Check, LayoutGrid, BookOpen, Crown, Camera, Copy, Share2
} from 'lucide-react';

interface DocumentDedicatedPreviewProps {
  docType: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook';
  formData: CVFormData;
  setFormData: React.Dispatch<React.SetStateAction<CVFormData>>;
  businessDocData: BusinessDocData;
  setBusinessDocData: React.Dispatch<React.SetStateAction<BusinessDocData>>;
  ebookData?: EbookData;
  setEbookData?: React.Dispatch<React.SetStateAction<EbookData>>;
  aiData: AIOptimizedData | null;
  userBalance?: number;
  isPaid?: boolean;
  isUnlocked?: boolean;
  isVipActive?: boolean;
  isEditingDirectly?: boolean;
  setIsEditingDirectly?: (val: boolean) => void;
  onEditForm: () => void;
  onPayToUnlock: () => void;
  onOpenRechargeModal?: () => void;
  onDownloadPDF?: () => void;
  onExportDocx?: () => void;
  onPrint?: () => void;
  onGoServices: () => void;
  isGeneratingPDF?: boolean;
  isGeneratingDocx?: boolean;
  packEmploiSubTab?: 'cv' | 'letter';
  setPackEmploiSubTab?: (tab: 'cv' | 'letter') => void;
  packBusinessSubTab?: 'devis' | 'facture';
  setPackBusinessSubTab?: (tab: 'devis' | 'facture') => void;
  onOpenInterviewPrep?: () => void;
}

export const DocumentDedicatedPreview: React.FC<DocumentDedicatedPreviewProps> = ({
  docType,
  formData,
  setFormData,
  businessDocData,
  setBusinessDocData,
  ebookData,
  setEbookData,
  aiData,
  userBalance = 0,
  isPaid = false,
  isUnlocked = false,
  isVipActive = false,
  isEditingDirectly = false,
  onEditForm,
  onPayToUnlock,
  onOpenRechargeModal,
  onDownloadPDF,
  onExportDocx,
  onPrint,
  onGoServices,
  isGeneratingPDF = false,
  isGeneratingDocx = false,
  packBusinessSubTab = 'devis',
  setPackBusinessSubTab,
  onOpenInterviewPrep
}) => {
  const isEffectivePaid = Boolean(isPaid || isUnlocked || isVipActive);
  const { pricing } = usePricing();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isBusinessTemplateModalOpen, setIsBusinessTemplateModalOpen] = useState<boolean>(false);

  // States pour la Capture HD et le Partage WhatsApp
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState<boolean>(false);
  const [capturedImageResult, setCapturedImageResult] = useState<DocumentCaptureResult | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 5000);
  };

  // Determine current active document in preview
  let activePreviewKind: 'cv' | 'letter' | 'devis' | 'facture' | 'ebook' = 'cv';
  if (docType === 'cv') activePreviewKind = 'cv';
  else if (docType === 'letter') activePreviewKind = 'letter';
  else if (docType === 'devis') activePreviewKind = 'devis';
  else if (docType === 'facture') activePreviewKind = 'facture';
  else if (docType === 'pack_business') activePreviewKind = (packBusinessSubTab || 'devis') as 'devis' | 'facture';
  else if (docType === 'ebook') activePreviewKind = 'ebook';

  const selectedBusinessTemplate = BUSINESS_DOC_TEMPLATES.find(
    (t) => t.id === (businessDocData.templateId || 'classique_ohada')
  ) || BUSINESS_DOC_TEMPLATES[0];

  // Pricing & Labels
  const getDocumentMeta = () => {
    switch (docType) {
      case 'ebook':
        return {
          title: "Livre Numérique (Ebook Pro)",
          subTitle: `${ebookData?.title || 'Mon Livre'} • Format Auto-Édition 6×9`,
          price: pricing.ebookPrice ?? 1500,
          badgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
          icon: BookOpen
        };
      case 'cv':
        return {
          title: "CV Pro ATS",
          subTitle: `${formData?.personalInfo?.firstName || 'Candidat'} ${formData?.personalInfo?.lastName || ''} - Modèle ${formData.templateStyle || 'Moderne'}`,
          price: pricing.cvOnlyPrice,
          badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: FileText
        };
      case 'letter': {
        const cat = formData?.letterCategory;
        const letterSubject = formData?.letterSubject || (
          cat === 'administration' ? 'Lettre Administrative' :
          cat === 'business' ? 'Lettre Commerciale' :
          cat === 'sur_mesure' ? 'Lettre Sur-Mesure' :
          'Lettre de Motivation'
        );
        return {
          title: letterSubject,
          subTitle: `${formData?.personalInfo?.firstName || 'Candidat'} ${formData?.personalInfo?.lastName || ''} • Haute Définition`,
          price: pricing.letterOnlyPrice,
          badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Mail
        };
      }
      case 'devis':
        return {
          title: "Devis Professionnel",
          subTitle: `Devis N° ${businessDocData.docNumber || 'DEV-2026-001'} • ${businessDocData.issuer?.companyName || 'Mon Entreprise'}`,
          price: pricing.devisPrice,
          badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
          icon: FileCheck
        };
      case 'facture':
        return {
          title: "Facture Client",
          subTitle: `Facture N° ${businessDocData.docNumber || 'FAC-2026-001'} • ${businessDocData.issuer?.companyName || 'Mon Entreprise'}`,
          price: pricing.facturePrice,
          badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: Receipt
        };
      case 'pack_business':
        return {
          title: `Pack Business • ${activePreviewKind === 'devis' ? 'Devis Pro' : 'Facture Client'}`,
          subTitle: "Normes OHADA / UEMOA",
          price: pricing.businessPackPrice,
          badgeColor: "bg-amber-50 text-amber-900 border-amber-300",
          icon: Package
        };
      default:
        return {
          title: "Document Premium",
          subTitle: "Document prêt pour téléchargement",
          price: pricing.cvOnlyPrice,
          badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
          icon: FileText
        };
    }
  };

  const meta = getDocumentMeta();
  const IconComponent = meta.icon;

  const handlePrintDocument = () => {
    if (!isEffectivePaid) {
      onPayToUnlock();
      return;
    }
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleTriggerWord = () => {
    if (!isEffectivePaid) {
      onPayToUnlock();
      return;
    }
    if (onExportDocx) onExportDocx();
  };

  const handleTriggerPDF = () => {
    if (!isEffectivePaid) {
      onPayToUnlock();
      return;
    }
    if (onDownloadPDF) onDownloadPDF();
  };

  // Nom du fichier pour les exports
  const getDocumentFilename = (): string => {
    if (activePreviewKind === 'cv') {
      const name = `${formData?.personalInfo?.firstName || 'Candidat'}_${formData?.personalInfo?.lastName || ''}`.trim();
      return `CV_${name || 'Dokya'}`;
    }
    if (activePreviewKind === 'letter') {
      const name = `${formData?.personalInfo?.firstName || 'Candidat'}_${formData?.personalInfo?.lastName || ''}`.trim();
      return `Lettre_${name || 'Dokya'}`;
    }
    if (activePreviewKind === 'devis') {
      return `Devis_${businessDocData.docNumber || 'DEV-001'}`;
    }
    if (activePreviewKind === 'facture') {
      return `Facture_${businessDocData.docNumber || 'FAC-001'}`;
    }
    if (activePreviewKind === 'ebook') {
      return `Ebook_${(ebookData?.title || 'MonLivre').slice(0, 20)}`;
    }
    return `Document_${Date.now()}`;
  };

  // Paramètres WhatsApp complets
  const getWhatsAppParams = (): DocumentShareWhatsAppParams => {
    let title = meta.title;
    let recipientName = '';
    let targetJobOrCompany = '';
    let docNumber = '';
    let totalAmount: number | undefined;
    let paymentStatus: 'PAID' | 'UNPAID' | undefined;

    if (activePreviewKind === 'cv') {
      title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - CV Pro ATS`.trim() || 'Mon CV Pro ATS';
      recipientName = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''}`.trim();
      targetJobOrCompany = formData?.personalInfo?.targetJob || '';
    } else if (activePreviewKind === 'letter') {
      const cat = formData?.letterCategory;
      const letterSubject = formData?.letterSubject || (
        cat === 'administration' ? 'Lettre Administrative' :
        cat === 'business' ? 'Lettre Commerciale' :
        cat === 'sur_mesure' ? 'Lettre Sur-Mesure' :
        'Lettre de Motivation'
      );
      title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - ${letterSubject}`.trim();
      recipientName = formData?.targetCompany || `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''}`.trim();
      targetJobOrCompany = formData?.targetCompany || formData?.personalInfo?.targetJob || '';
    } else if (activePreviewKind === 'devis') {
      title = `Devis Commercial N° ${businessDocData.docNumber || 'DEV-001'}`;
      recipientName = businessDocData.client?.name || businessDocData.client?.companyName || '';
      targetJobOrCompany = businessDocData.issuer?.companyName || '';
      docNumber = businessDocData.docNumber || '';
      totalAmount = (businessDocData as any).totalTTC || (businessDocData as any).total || undefined;
    } else if (activePreviewKind === 'facture') {
      title = `Facture Client N° ${businessDocData.docNumber || 'FAC-001'}`;
      recipientName = businessDocData.client?.name || businessDocData.client?.companyName || '';
      targetJobOrCompany = businessDocData.issuer?.companyName || '';
      docNumber = businessDocData.docNumber || '';
      totalAmount = (businessDocData as any).totalTTC || (businessDocData as any).total || undefined;
      paymentStatus = isPaid ? 'PAID' : 'UNPAID';
    } else if (activePreviewKind === 'ebook') {
      title = ebookData?.title || 'Mon Livre Numérique';
      recipientName = ebookData?.author || '';
    }

    return {
      title,
      type: activePreviewKind,
      recipientName,
      targetJobOrCompany,
      docNumber,
      totalAmount,
      paymentStatus,
      recipientPhone: businessDocData?.client?.phone
    };
  };

  /**
   * NOUVELLE FONCTIONNALITÉ POST-PAIEMENT : CAPTURE HD DU DOCUMENT (IMAGE PNG)
   */
  const handleCaptureHD = async () => {
    if (!isEffectivePaid) {
      onPayToUnlock();
      return;
    }
    try {
      setIsCapturing(true);
      const target = document.getElementById('dokya-document-capture-target');
      const result = await captureDocumentAsImage(target, getDocumentFilename());

      // Télécharger immédiatement le fichier PNG
      downloadImageFile(result.blob, result.fileName);

      // Copier dans le presse-papier
      const copied = await copyImageBlobToClipboard(result.blob);
      setCapturedImageResult(result);
      setIsCaptureModalOpen(true);

      if (copied) {
        showToast("📸 Capture HD téléchargée et copiée dans le presse-papier !");
      } else {
        showToast("📸 Capture HD téléchargée avec succès (Format PNG) !");
      }
    } catch (err: any) {
      console.error("Erreur capture document:", err);
      showToast("Impossible de capturer le document. Veuillez réessayer.");
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * BOUTON WHATSAPP AVEC CAPTURE INCLUSE (DISPONIBLE UNIQUEMENT APRÈS PAIEMENT)
   */
  const handleShareWhatsApp = async () => {
    if (!isEffectivePaid) {
      onPayToUnlock();
      return;
    }
    try {
      setIsSharingWhatsApp(true);
      const target = document.getElementById('dokya-document-capture-target');
      const captureResult = await captureDocumentAsImage(target, getDocumentFilename());
      const shareParams = getWhatsAppParams();

      const outcome = await shareDocumentWithCaptureOnWhatsApp(shareParams, captureResult);
      if (outcome.method === 'clipboard_download') {
        showToast("📸 Capture copiée & téléchargée ! Collez-la dans votre message WhatsApp (Ctrl+V).");
      }
    } catch (err: any) {
      console.error("Erreur partage WhatsApp avec capture:", err);
      // Fallback gracieux sur le message WhatsApp officiel standard si la capture échoue
      openDocumentWhatsAppShare(getWhatsAppParams());
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4 animate-in fade-in duration-200 pb-20">
      
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL & ACTION BAR (ULTRA COMPACT SUR MOBILE ET PC)               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3.5 shadow-xs space-y-2.5">
        
        {/* Ligne 1 : Navigation + Titre & Statut + Actions Principales */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Gauche : Boutons Retour & Accès Rapides */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onEditForm}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Revenir au formulaire pour modifier vos données"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>← Modifier</span>
            </button>

            <button
              type="button"
              onClick={onGoServices}
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Services
            </button>

            {docType === 'cv' && onOpenInterviewPrep && (
              <button
                id="btn-preview-open-interview-prep"
                type="button"
                onClick={onOpenInterviewPrep}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Préparer votre entretien d'embauche RH"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span className="hidden md:inline">Coaching RH</span>
                <span className="md:hidden">RH</span>
              </button>
            )}
          </div>

          {/* Centre : Titre compact & Statut de paiement */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isVipActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border bg-amber-50 text-amber-900 border-amber-300">
                <Crown className="w-3 h-3 text-amber-500" />
                <span className="truncate max-w-[160px] sm:max-w-none">{meta.title} (VIP)</span>
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isPaid ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : meta.badgeColor
              }`}>
                {isPaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <IconComponent className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate max-w-[150px] sm:max-w-[240px] font-extrabold">{meta.title}</span>
              </span>
            )}

            {isEffectivePaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 text-[11px] font-black border border-emerald-500/20 shrink-0">
                <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                <span>Débloqué</span>
              </span>
            ) : (
              <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                {(meta.price || 0).toLocaleString('fr-FR')} FCFA
              </span>
            )}
          </div>

          {/* Droite : Boutons d'Action Conditionnels */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isEffectivePaid ? (
              /* ================================================================= */
              /* ÉTAT PAYÉ : TÉLÉCHARGEMENT PDF, WORD, CAPTURE HD ET WHATSAPP       */
              /* ================================================================= */
              <>
                {/* Bouton PDF */}
                <button
                  type="button"
                  onClick={handleTriggerPDF}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Télécharger le PDF officiel"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-200" />
                  )}
                  <span>PDF</span>
                </button>

                {/* Bouton Word */}
                {onExportDocx && (
                  <button
                    type="button"
                    onClick={handleTriggerWord}
                    disabled={isGeneratingDocx}
                    className="hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Télécharger la version Word modifiable"
                  >
                    {isGeneratingDocx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-200" />
                    )}
                    <span>Word</span>
                  </button>
                )}

                {/* 📸 NOUVELLE FONCTIONNALITÉ : CAPTURE HD (PNG) */}
                <button
                  type="button"
                  onClick={handleCaptureHD}
                  disabled={isCapturing}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Capturer le document sous forme d'image haute définition (PNG)"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span className="hidden sm:inline">Capture...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span>Capture HD</span>
                    </>
                  )}
                </button>

                {/* 📲 BOUTON WHATSAPP AVEC CAPTURE (DISPONIBLE STRICTEMENT APRÈS PAIEMENT) */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={isSharingWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
                  title="Partager sur WhatsApp avec la capture du document"
                >
                  {isSharingWhatsApp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span className="hidden sm:inline">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">📲</span>
                      <span>WhatsApp</span>
                    </>
                  )}
                </button>

                {/* Bouton Impression */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="hidden md:flex p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all items-center cursor-pointer"
                  title="Imprimer directement"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </>
            ) : (
              /* ================================================================= */
              /* ÉTAT NON-PAYÉ : BOUTON PRINCIPAL DE PAIEMENT UNIQUEMENT           */
              /* LE BOUTON WHATSAPP EST STRICTEMENT MASQUÉ AVANT LE PAIEMENT       */
              /* ================================================================= */
              <button
                type="button"
                id="btn-preview-pay"
                onClick={onPayToUnlock}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 ring-2 ring-emerald-400/40"
                title="Payer et débloquer le téléchargement, la capture et WhatsApp"
              >
                <CreditCard className="w-4 h-4 text-amber-300" />
                <span>Payer & Débloquer ({(meta.price || 0).toLocaleString('fr-FR')} FCFA)</span>
              </button>
            )}
          </div>

        </div>

        {/* Ligne 2 (Sous-Barre Ultra Compacte) : Outils de Personnalisation & Zoom */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Pack Business Sub-tabs */}
          {docType === 'pack_business' && setPackBusinessSubTab && (
            <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('devis');
                  setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  packBusinessSubTab === 'devis' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white text-slate-700'
                }`}
              >
                <FileCheck className="w-3 h-3" />
                <span>1. Devis Pro</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('facture');
                  setBusinessDocData(prev => ({ ...prev, type: 'facture' }));
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  packBusinessSubTab === 'facture' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-slate-700'
                }`}
              >
                <Receipt className="w-3 h-3" />
                <span>2. Facture Client</span>
              </button>
            </div>
          )}

          {/* Outils CV : Modèle + Couleurs */}
          {activePreviewKind === 'cv' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <select
                  value={formData.templateStyle || 'moderne'}
                  onChange={(e) => setFormData({ ...formData, templateStyle: e.target.value as TemplateStyle })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-900 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 max-w-[170px] sm:max-w-[210px] truncate"
                >
                  <optgroup label="Sans Photo (30)">
                    {ALL_CV_TEMPLATES.filter(t => !t.hasPhoto).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Avec Photo (20)">
                    {ALL_CV_TEMPLATES.filter(t => t.hasPhoto).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Pastilles de Couleurs Tendance */}
              <div className="flex items-center gap-1">
                {[
                  { label: 'Indigo', color: '#4f46e5' },
                  { label: 'Bleu Marine', color: '#1e3a8a' },
                  { label: 'Émeraude', color: '#059669' },
                  { label: 'Anthracite', color: '#334155' },
                  { label: 'Bordeaux', color: '#991b1b' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    title={c.label}
                    onClick={() => setFormData({ ...formData, themeColor: c.color })}
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                      formData.themeColor === c.color ? 'border-slate-900 scale-125 ring-1 ring-slate-900' : 'border-white opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Outils Devis & Facture : Choix Modèle & Thème */}
          {(activePreviewKind === 'devis' || activePreviewKind === 'facture') && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsBusinessTemplateModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Palette className="w-3 h-3 text-amber-400" />
                <span>Modèle : {selectedBusinessTemplate.name}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>

              {/* Thèmes de Couleurs rapides */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'indigo', bg: 'bg-indigo-600' },
                  { id: 'emerald', bg: 'bg-emerald-600' },
                  { id: 'amber', bg: 'bg-amber-500' },
                  { id: 'slate', bg: 'bg-slate-900' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBusinessDocData({ ...businessDocData, themeStyle: t.id as any })}
                    className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all ${t.bg} ${
                      (businessDocData.themeStyle || 'indigo') === t.id ? 'ring-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              {/* Bascule Devis <-> Facture */}
              <button
                type="button"
                onClick={() => {
                  const newType = businessDocData.type === 'devis' ? 'facture' : 'devis';
                  setBusinessDocData({
                    ...businessDocData,
                    type: newType,
                    docNumber: newType === 'facture' ? `FAC-${new Date().getFullYear()}-001` : `DEV-${new Date().getFullYear()}-001`
                  });
                }}
                className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-2.5 h-2.5 text-amber-700" />
                <span>En {businessDocData.type === 'devis' ? 'Facture' : 'Devis'}</span>
              </button>
            </div>
          )}

          {/* Outils Lettre : Tonalité */}
          {activePreviewKind === 'letter' && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Ton :</span>
              {(['Convaincante', 'Formelle', 'Dynamique', 'Chaleureuse'] as LetterTone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setFormData({ ...formData, letterTone: tone })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    formData.letterTone === tone ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          )}

          {/* Outils Ebook */}
          {activePreviewKind === 'ebook' && ebookData && setEbookData && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Pages :</span>
              {[5, 10, 15, 20, 30].map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setEbookData({ ...ebookData, targetPageCount: pg })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    (ebookData.targetPageCount || 10) === pg ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pg}p
                </button>
              ))}
            </div>
          )}

          {/* Contrôle de Zoom Compact */}
          <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200 ml-auto">
            <span className="text-[10px] text-slate-500 font-bold">Zoom:</span>
            {[85, 100, 115].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setZoomLevel(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer transition-all ${
                  zoomLevel === lvl ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lvl}%
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Bannière d'Avertissement Ultra Compacte & Dissimulable */}
      {!isWarningDismissed && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-900 shadow-2xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="shrink-0">⚡</span>
            <p className="font-medium truncate">
              Pensez à télécharger ou capturer votre document. Vos fichiers générés sont conservés sous 24h à 48h.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWarningDismissed(true)}
            className="p-1 text-amber-700 hover:text-amber-950 rounded-md cursor-pointer shrink-0 ml-2"
            title="Masquer cette alerte"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toast Notification Rapide */}
      {toastNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 max-w-md w-[90%] justify-center text-center">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN DOCUMENT STAGE (PAGE A4 CENTRÉE AVEC ID DE CAPTURE CIBLÉ)         */}
      {/* ========================================================================= */}
      <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-1 sm:p-4 flex justify-center items-start min-h-[600px] overflow-x-auto shadow-inner relative">
        <div 
          id="dokya-document-capture-target"
          className="transition-all duration-300 w-full flex justify-center"
          style={{
            userSelect: 'auto',
            pointerEvents: 'auto'
          }}
        >
          <A4PreviewContainer zoomLevel={zoomLevel}>
            
            {/* Document Actif */}
            {activePreviewKind === 'ebook' && ebookData && (
              <div className="w-full flex justify-center">
                <EbookTemplate 
                  data={ebookData} 
                  unlocked={isEffectivePaid}
                  isEditingDirectly={isEditingDirectly}
                  onUpdateData={(newData) => setEbookData && setEbookData(prev => ({ ...prev, ...newData }))}
                />
              </div>
            )}

            {activePreviewKind === 'cv' && (
              <CVTemplate 
                formData={formData} 
                data={formData} 
                aiData={aiData} 
                isEditingDirectly={isEditingDirectly}
                unlocked={isEffectivePaid}
              />
            )}

            {activePreviewKind === 'letter' && (
              <CoverLetterTemplate
                formData={formData}
                data={formData}
                aiData={aiData}
                isEditingDirectly={isEditingDirectly}
              />
            )}

            {(activePreviewKind === 'devis' || activePreviewKind === 'facture') && (
              <div className="w-[210mm] min-w-[210mm] max-w-[210mm] mx-auto">
                <DevisFactureTemplate data={businessDocData} />
              </div>
            )}

          </A4PreviewContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALE D'APERÇU DE LA CAPTURE HD (NOUVELLE FONCTIONNALITÉ POST-PAIEMENT) */}
      {/* ========================================================================= */}
      {isCaptureModalOpen && capturedImageResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header de la modale */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Camera className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Capture HD Générée avec Succès !
                  </h3>
                  <p className="text-xs text-slate-500">
                    Image haute définition (PNG 300 DPI) prête pour téléchargement et partage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCaptureModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aperçu Miniature de l'image capturée */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-100/60 flex flex-col items-center justify-center">
              <div className="max-w-[320px] sm:max-w-[380px] bg-white rounded-xl shadow-lg border border-slate-200 p-2 overflow-hidden">
                <img 
                  src={capturedImageResult.dataUrl} 
                  alt="Aperçu Capture Dokya"
                  className="w-full h-auto object-contain rounded"
                />
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-2">
                Fichier : {capturedImageResult.fileName} ({Math.round(capturedImageResult.blob.size / 1024)} Ko)
              </p>
            </div>

            {/* Actions dans la Modale */}
            <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadImageFile(capturedImageResult.blob, capturedImageResult.fileName)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Télécharger l'image</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyImageBlobToClipboard(capturedImageResult.blob);
                    if (ok) {
                      setCopiedSuccess(true);
                      setTimeout(() => setCopiedSuccess(false), 3000);
                      showToast("✓ Image copiée dans le presse-papier !");
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedSuccess ? 'Copiée !' : 'Copier l\'image'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCaptureModalOpen(false);
                  handleShareWhatsApp();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              >
                <span className="text-sm">📲</span>
                <span>Partager sur WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALE DE SÉLECTION DES MODÈLES FACTURE & DEVIS                         */}
      {/* ========================================================================= */}
      {isBusinessTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-700">
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Choisir un Modèle de {activePreviewKind === 'facture' ? 'Facture' : 'Devis'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  10 modèles épurés conformes aux standards OHADA / UEMOA
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBusinessTemplateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUSINESS_DOC_TEMPLATES.map((tpl, idx) => {
                  const isSelected = (businessDocData.templateId || 'classique_ohada') === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setBusinessDocData(prev => ({ ...prev, templateId: tpl.id }));
                        setIsBusinessTemplateModalOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            Modèle {idx + 1}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}>
                            {tpl.badge}
                          </span>
                        </div>

                        <h3 className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {tpl.name}
                        </h3>

                        <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {tpl.description}
                        </p>
                      </div>

                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] font-bold ${
                        isSelected ? 'border-white/10 text-amber-300' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span>{isSelected ? '✓ Modèle Actif' : 'Cliquer pour appliquer'}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsBusinessTemplateModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BOTTOM FLOATING ACTION BAR (ÉPURÉE & COMPACTE)                          */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 text-white backdrop-blur-md px-3 sm:px-5 py-2.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 sm:gap-4 max-w-xl w-[92%] justify-between">
        
        {/* Retour au formulaire */}
        <button
          type="button"
          onClick={onEditForm}
          className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Modifier</span>
        </button>

        {/* Info Statut au centre */}
        <div className="hidden sm:block text-center">
          <span className="text-[11px] font-medium text-slate-300 block">
            {isVipActive ? "👑 Pass VIP Inclus" : isPaid ? "✓ Document Débloqué" : "Aperçu Sécurisé"}
          </span>
          <span className="text-xs font-black text-amber-400">
            {isEffectivePaid ? "Prêt à télécharger" : `${(meta.price || 0).toLocaleString('fr-FR')} FCFA`}
          </span>
        </div>

        {/* Actions selon Statut Paiement */}
        {isEffectivePaid ? (
          <div className="flex items-center gap-1.5">
            {/* PDF */}
            <button
              type="button"
              onClick={handleTriggerPDF}
              disabled={isGeneratingPDF}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>PDF</span>
            </button>

            {/* Word (optionnel) */}
            {onExportDocx && (
              <button
                type="button"
                onClick={handleTriggerWord}
                disabled={isGeneratingDocx}
                className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>
            )}

            {/* Capture HD */}
            <button
              type="button"
              onClick={handleCaptureHD}
              disabled={isCapturing}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Capturer le document en image PNG"
            >
              {isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-amber-300" />}
              <span className="hidden sm:inline">Capture</span>
            </button>

            {/* WhatsApp (disponible uniquement après paiement) */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Partager sur WhatsApp avec la capture"
            >
              {isSharingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs">📲</span>}
              <span>WhatsApp</span>
            </button>
          </div>
        ) : (
          /* Bouton de Paiement unique si non payé */
          <button
            type="button"
            onClick={onPayToUnlock}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <CreditCard className="w-4 h-4 text-amber-300" />
            <span>Payer & Débloquer →</span>
          </button>
        )}

      </div>

    </div>
  );
};
