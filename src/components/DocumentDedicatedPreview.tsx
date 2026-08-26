import React, { useState } from 'react';
import { CVFormData, AIOptimizedData, BusinessDocData, EbookData, TemplateStyle, LetterTone, BusinessDocTemplateId } from '../types';
import { ALL_CV_TEMPLATES } from '../data/cvTemplatesList';
import { BUSINESS_DOC_TEMPLATES } from '../data/businessDocTemplates';
import { CVTemplate } from './CVTemplate';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { DevisFactureTemplate } from './DevisFactureTemplate';
import { EbookTemplate } from './EbookTemplate';
import { usePricing } from '../contexts/PricingContext';
import { 
  ArrowLeft, Download, FileText, Printer, 
  Sparkles, CheckCircle2, Eye, Palette, ZoomIn, ZoomOut, 
  RotateCcw, Mail, FileCheck, Receipt, Package, ArrowLeftRight,
  Lock, Unlock, CreditCard, ShieldCheck, Loader2, ChevronDown,
  X, Check, LayoutGrid, BookOpen
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
  isEditingDirectly?: boolean;
  setIsEditingDirectly?: (val: boolean) => void;
  onEditForm: () => void;
  onPayToUnlock: () => void;
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
  isEditingDirectly = false,
  onEditForm,
  onPayToUnlock,
  onDownloadPDF,
  onExportDocx,
  onPrint,
  onGoServices,
  isGeneratingPDF = false,
  isGeneratingDocx = false,
  packBusinessSubTab = 'devis',
  setPackBusinessSubTab
}) => {
  const { pricing } = usePricing();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isBusinessTemplateModalOpen, setIsBusinessTemplateModalOpen] = useState<boolean>(false);

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
          subTitle: `${ebookData?.title || 'Mon Livre'} • Format Auto-Édition 6×9 (${ebookData?.language || 'Français'})`,
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
      case 'letter':
        return {
          title: "Lettre de Motivation",
          subTitle: `${formData?.personalInfo?.firstName || 'Candidat'} ${formData?.personalInfo?.lastName || ''} • Lettre Haute Définition`,
          price: pricing.letterOnlyPrice,
          badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Mail
        };
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
          title: `Pack Business • ${activePreviewKind === 'devis' ? 'Document 1: Devis Pro' : 'Document 2: Facture Client'}`,
          subTitle: "Devis & Facture conformes normes OHADA / UEMOA",
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
    if (!isPaid) {
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
    if (!isPaid) {
      onPayToUnlock();
      return;
    }
    if (onExportDocx) onExportDocx();
  };

  const handleTriggerPDF = () => {
    if (!isPaid) {
      onPayToUnlock();
      return;
    }
    if (onDownloadPDF) onDownloadPDF();
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200 pb-24">
      
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL & ACTION BAR                                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Top Row: Navigation + Title + Primary CTAs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Return to edit form button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onEditForm}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Revenir au formulaire pour modifier vos informations"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>← Modifier mes informations</span>
            </button>

            <button
              type="button"
              onClick={onGoServices}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Tous les services
            </button>
          </div>

          {/* Center: Title & Document Badge */}
          <div className="text-left lg:text-center">
            <div className="flex items-center gap-2 flex-wrap lg:justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                isPaid ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : meta.badgeColor
              }`}>
                {isPaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <IconComponent className="w-3.5 h-3.5" />}
                <span>{isPaid ? `Document Débloqué : ${meta.title}` : `Aperçu : ${meta.title}`}</span>
              </span>

              {isPaid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 text-xs font-black border border-emerald-500/20">
                  <Unlock className="w-3 h-3 text-emerald-600" />
                  <span>Payé & Prêt</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  Tarif : {(meta.price || 0).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1 truncate max-w-md">
              {meta.subTitle}
            </p>
          </div>

          {/* Right: Actions depending on Payment State */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            
            {isPaid ? (
              /* ================================================================= */
              /* PAID STATE: PROMINENT WORD AND PDF DOWNLOAD BUTTONS AT THE TOP   */
              /* ================================================================= */
              <>
                {/* 1. PDF DOWNLOAD BUTTON */}
                <button
                  type="button"
                  onClick={handleTriggerPDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Télécharger votre document officiel au format PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Génération PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-emerald-200" />
                      <span>Télécharger en PDF (.pdf)</span>
                    </>
                  )}
                </button>

                {/* 2. WORD (.DOCX) DOWNLOAD BUTTON */}
                {onExportDocx && (
                  <button
                    type="button"
                    onClick={handleTriggerWord}
                    disabled={isGeneratingDocx}
                    className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Télécharger une version Word (.docx) modifiable"
                  >
                    {isGeneratingDocx ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Génération Word...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-blue-200" />
                        <span>Télécharger en Word (.docx)</span>
                      </>
                    )}
                  </button>
                )}

                {/* 3. PRINT BUTTON */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Imprimer directement"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
              </>
            ) : (
              /* ================================================================= */
              /* UNPAID STATE: PROMINENT PAY TO UNLOCK BUTTON                     */
              /* ================================================================= */
              <>
                <button
                  type="button"
                  onClick={onPayToUnlock}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 animate-pulse"
                >
                  <CreditCard className="w-4 h-4 text-amber-300" />
                  <span>Payer & Télécharger ({(meta.price || 0).toLocaleString('fr-FR')} FCFA)</span>
                </button>
              </>
            )}

          </div>

        </div>

        {/* ===================================================================== */}
        {/* SUB-ROW: QUICK CUSTOMIZATION TOOLS & PACK DOCUMENT TABS               */}
        {/* ===================================================================== */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {docType === 'pack_business' && setPackBusinessSubTab && (
            <div className="flex items-center gap-2 bg-amber-50/80 p-1.5 rounded-2xl border border-amber-200">
              <span className="text-[11px] font-black text-amber-900 px-2 hidden sm:inline">Pack Business :</span>
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('devis');
                  setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  packBusinessSubTab === 'devis' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'bg-white text-slate-700 hover:text-amber-800 border border-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Document 1 : Devis Pro</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('facture');
                  setBusinessDocData(prev => ({ ...prev, type: 'facture' }));
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  packBusinessSubTab === 'facture' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-white text-slate-700 hover:text-emerald-800 border border-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Document 2 : Facture Client</span>
              </button>
            </div>
          )}
          
          {/* Customizer for CV */}
          {activePreviewKind === 'cv' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-slate-700">Modèle CV :</span>
                <select
                  value={formData.templateStyle || 'moderne'}
                  onChange={(e) => setFormData({ ...formData, templateStyle: e.target.value as TemplateStyle })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 max-w-[240px] truncate"
                >
                  <optgroup label="Modèles sans Photo (30)">
                    {ALL_CV_TEMPLATES.filter(t => !t.hasPhoto).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Modèles avec Photo (20)">
                    {ALL_CV_TEMPLATES.filter(t => t.hasPhoto).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium text-[11px]">Couleur :</span>
                {[
                  { label: 'Indigo', color: '#4f46e5' },
                  { label: 'Bleu Marine', color: '#1e3a8a' },
                  { label: 'Émeraude', color: '#059669' },
                  { label: 'Anthracite', color: '#334155' },
                  { label: 'Bordeaux', color: '#991b1b' },
                  { label: 'Violet', color: '#7c3aed' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    title={c.label}
                    onClick={() => setFormData({ ...formData, themeColor: c.color })}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      formData.themeColor === c.color ? 'border-slate-900 scale-125' : 'border-white opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Customizer for Ebook */}
          {activePreviewKind === 'ebook' && ebookData && setEbookData && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-xs">Nombre de pages :</span>
                {[5, 10, 15, 20, 30, 50].map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setEbookData({ ...ebookData, targetPageCount: pg })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      (ebookData.targetPageCount || 10) === pg
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pg}p
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                🎯 {ebookData.targetPageCount || 10} pages exactes (1re couv + garde + sommaire + {Math.max(1, (ebookData.targetPageCount || 10) - 3)} int. + 4e couv)
              </span>
            </div>
          )}

          {/* Customizer for Letter */}
          {activePreviewKind === 'letter' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">Ton de la lettre :</span>
              <div className="flex items-center gap-1">
                {(['Convaincante', 'Formelle', 'Dynamique', 'Chaleureuse'] as LetterTone[]).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setFormData({ ...formData, letterTone: tone })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.letterTone === tone
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customizer for Devis / Facture */}
          {(activePreviewKind === 'devis' || activePreviewKind === 'facture') && (
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Thèmes de Couleurs */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Thème :</span>
                {[
                  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-600' },
                  { id: 'emerald', label: 'Émeraude', bg: 'bg-emerald-600' },
                  { id: 'amber', label: 'Or', bg: 'bg-amber-500' },
                  { id: 'slate', label: 'Ardoise', bg: 'bg-slate-900' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBusinessDocData({ ...businessDocData, themeStyle: t.id as any })}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold text-white cursor-pointer transition-all ${t.bg} ${
                      (businessDocData.themeStyle || 'indigo') === t.id ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* SÉLECTEUR DE MODÈLE (10 MODÈLES) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsBusinessTemplateModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 border border-slate-700"
                  title="Changer le modèle de mise en page"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>👉 Modèle : {selectedBusinessTemplate.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
              </div>

              {/* Conversion Devis <-> Facture */}
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
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
              >
                <ArrowLeftRight className="w-3 h-3 text-amber-700" />
                <span>Basculer en {businessDocData.type === 'devis' ? 'Facture' : 'Devis'}</span>
              </button>
            </div>
          )}

          {/* Sub-Switchers for Packs */}
          {docType === 'pack_business' && setPackBusinessSubTab && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('devis');
                  setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  packBusinessSubTab === 'devis' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Devis Professionnel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackBusinessSubTab('facture');
                  setBusinessDocData(prev => ({ ...prev, type: 'facture' }));
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  packBusinessSubTab === 'facture' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Facture Client
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold mr-1">Zoom :</span>
            {[85, 100, 115].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setZoomLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold cursor-pointer transition-all ${
                  zoomLevel === lvl ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lvl}%
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN DOCUMENT STAGE (CENTERED SINGLE A4 SHEET WITH DROP SHADOW)        */}
      {/* ========================================================================= */}
      <div className="bg-slate-100/80 border border-slate-200/90 rounded-3xl p-3 sm:p-6 lg:p-8 flex justify-center items-start min-h-[850px] overflow-x-auto shadow-inner">
        <div 
          className="transition-transform duration-200 origin-top flex justify-center items-start w-full"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          
          {/* Render Active Document */}
          {activePreviewKind === 'ebook' && ebookData && (
            <div className="w-full flex justify-center">
              <EbookTemplate 
                data={ebookData} 
                unlocked={isPaid}
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
              unlocked={isPaid}
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
            <div className="w-full max-w-[210mm] mx-auto">
              <DevisFactureTemplate data={businessDocData} />
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALE DYNAMIQUE DE SÉLECTION DES 10 MODÈLES DE DEVIS & FACTURE        */}
      {/* ========================================================================= */}
      {isBusinessTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-700">
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Choisir un Modèle de {activePreviewKind === 'facture' ? 'Facture' : 'Devis'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  10 modèles 100% épurés sans encadrements lourds, conformes aux standards OHADA / UEMOA
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

            {/* Modal Body: 10 Templates Grid */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
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
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
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

                      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-bold ${
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Vos données saisies restent intégralement conservées lors du changement de modèle.
              </span>
              <button
                type="button"
                onClick={() => setIsBusinessTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM FLOATING ACTION BAR                                             */}
      {/* ========================================================================= */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 text-white backdrop-blur-md px-4 sm:px-6 py-3 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-3 sm:gap-6 max-w-xl w-[92%] justify-between">
        
        {/* Left: Modify button */}
        <button
          type="button"
          onClick={onEditForm}
          className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>← Modifier</span>
        </button>

        {/* Center: Info */}
        <div className="hidden sm:block text-center">
          <span className="text-[11px] font-medium text-slate-300 block">
            {isPaid ? "✓ Document Débloqué" : "Aperçu Sécurisé"}
          </span>
          <span className="text-xs font-black text-amber-400">
            {isPaid ? "Téléchargement Illimité" : `${(meta.price || 0).toLocaleString('fr-FR')} FCFA`}
          </span>
        </div>

        {/* Right: Primary Action depending on payment */}
        {isPaid ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF (.pdf)</span>
            </button>

            {onExportDocx && (
              <button
                type="button"
                onClick={handleTriggerWord}
                disabled={isGeneratingDocx}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onPayToUnlock}
            className="px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <CreditCard className="w-4 h-4 text-amber-300" />
            <span>Payer & Débloquer →</span>
          </button>
        )}

      </div>

    </div>
  );
};
