import React, { useState } from 'react';
import { BUSINESS_DOC_TEMPLATES } from '../data/businessDocTemplates';
import { BusinessDocTemplateOption, BusinessDocData, BusinessDocTemplateId } from '../types';
import { DevisFactureTemplate } from './DevisFactureTemplate';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, FileCheck, Receipt, Package, Check, X, Maximize2, ZoomIn, ZoomOut,
  LayoutGrid, Square
} from 'lucide-react';

interface BusinessDocTemplateGalleryProps {
  docType: 'devis' | 'facture' | 'pack_business';
  onSelectTemplate: (templateId: string, themeStyle?: 'indigo' | 'emerald' | 'amber' | 'slate') => void;
  selectedTemplateId?: string;
  onGoServices?: () => void;
}

export const BusinessDocTemplateGallery: React.FC<BusinessDocTemplateGalleryProps> = ({
  docType,
  onSelectTemplate,
  selectedTemplateId = 'classique_ohada',
  onGoServices
}) => {
  const [selectedTheme, setSelectedTheme] = useState<'indigo' | 'emerald' | 'amber' | 'slate'>('indigo');
  const [previewTemplate, setPreviewTemplate] = useState<BusinessDocTemplateOption | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.85);
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(2);

  const getDocTypeInfo = () => {
    switch (docType) {
      case 'devis':
        return {
          title: "Galerie des Modèles de Devis",
          badge: "Devis Pro",
          icon: FileCheck,
          accent: "text-amber-400",
          price: "1 000 FCFA",
          desc: "Sélectionnez votre modèle conforme aux normes commerciales OHADA / UEMOA."
        };
      case 'facture':
        return {
          title: "Galerie des Modèles de Facture",
          badge: "Facture Client",
          icon: Receipt,
          accent: "text-emerald-400",
          price: "1 000 FCFA",
          desc: "Modèle certifié avec mentions légales sénégalaises (NINEA, RC, TVA 18%)."
        };
      case 'pack_business':
      default:
        return {
          title: "Galerie Pack Business (Devis + Facture)",
          badge: "Pack Business Duo",
          icon: Package,
          accent: "text-indigo-400",
          price: "1 499 FCFA",
          desc: "Charte graphique commune synchronisée pour votre devis et votre facture."
        };
    }
  };

  const docInfo = getDocTypeInfo();

  const handleOpenPreview = (tpl: BusinessDocTemplateOption) => {
    setPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const calculatedZoom = Math.min(0.48, Math.max(0.38, (window.innerWidth - 32) / 794));
      setModalZoom(calculatedZoom);
    } else {
      setModalZoom(0.85);
    }
  };

  const getSampleDocData = (tpl: BusinessDocTemplateOption): BusinessDocData => {
    const isQuote = docType === 'devis';
    return {
      type: isQuote ? 'devis' : 'facture',
      templateId: tpl.id as BusinessDocTemplateId,
      themeStyle: selectedTheme,
      docNumber: isQuote ? 'DEV-2026-042' : 'FAC-2026-088',
      issueDate: '2026-08-27',
      dueDate: '2026-09-27',
      validityDays: 30,
      issuer: {
        companyName: 'NEXUS DIGITAL SOLUTIONS SARL',
        name: 'Moussa DIOP',
        ninea: '008945231 2V3',
        rc: 'SN.DKR.2023.B.14890',
        phone: '+221 77 654 32 10',
        email: 'contact@nexus-digital.sn',
        address: 'Point E, Boulevard de l\'Est',
        city: 'Dakar',
        country: 'Sénégal'
      },
      client: {
        companyName: 'GROUPE SAHEL EXPANSION SA',
        name: 'Fatou NDIAYE',
        phone: '+221 78 123 45 67',
        email: 'direction@sahel-expansion.com',
        address: 'Zone Industrielle de Yoff',
        city: 'Dakar',
        country: 'Sénégal'
      },
      items: [
        {
          id: '1',
          description: 'Refonte complète de l\'écosystème web et intégration CRM Cloud',
          quantity: 1,
          unitPrice: 650000,
          total: 650000
        },
        {
          id: '2',
          description: 'Configuration passerelle Wave & Orange Money et sécurisation API',
          quantity: 1,
          unitPrice: 250000,
          total: 250000
        },
        {
          id: '3',
          description: 'Formation de l\'équipe et maintenance préventive 3 mois',
          quantity: 3,
          unitPrice: 50000,
          total: 150000
        }
      ],
      applyVat: true,
      vatRate: 18,
      discountPercent: 0,
      currency: 'FCFA',
      paymentInfo: {
        waveNumber: '77 654 32 10',
        orangeMoneyNumber: '78 123 45 67',
        bankName: 'BOA Sénégal',
        ibanOrRib: 'SN012 01234 567890001234567 89'
      },
      notes: 'Arrêté le présent document à la somme de UN MILLION DEUX CENT TRENTE NEUF MILLE (1 239 000) FCFA Toutes Taxes Comprises.'
    };
  };

  const isMobile2Col = mobileGridCols === 2;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in max-w-7xl mx-auto pb-16 px-1 sm:px-4">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-xl p-4 sm:p-7 lg:p-9">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                {docInfo.badge}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                100% Conforme OHADA & UEMOA
              </span>
            </div>

            {onGoServices && (
              <button
                type="button"
                onClick={onGoServices}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700/80 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              {docInfo.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {docInfo.desc}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs border-t border-slate-800/60 text-slate-400">
            <div className="flex items-center gap-4 text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Calcul automatique HT, TVA 18% & Net TTC
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Arrêté en toutes lettres automatique
              </span>
            </div>

            <span className="text-indigo-300 font-bold bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-800/40">
              {docInfo.price}
            </span>
          </div>
        </div>
      </div>

      {/* 2. THEME PALETTE CONTROLS (SEAMLESS DARK PANEL) */}
      <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
            Palette de Couleur :
          </span>
          <div className="flex items-center gap-2">
            {[
              { id: 'indigo', label: 'Indigo Pro', bg: 'bg-indigo-600', ring: 'ring-indigo-500' },
              { id: 'emerald', label: 'Émeraude Business', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
              { id: 'amber', label: 'Ambre Gold', bg: 'bg-amber-600', ring: 'ring-amber-500' },
              { id: 'slate', label: 'Ardoise Sobre', bg: 'bg-slate-700', ring: 'ring-slate-400' }
            ].map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950 text-white border border-slate-700 ring-2 ring-indigo-500 shadow-sm'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title={theme.label}
                >
                  <span className={`w-3 h-3 rounded-full ${theme.bg}`} />
                  <span className="hidden sm:inline">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Col Switch */}
        <div className="flex sm:hidden items-center bg-slate-950 p-1 rounded-xl border border-slate-800 ml-auto">
          <button
            type="button"
            onClick={() => setMobileGridCols(2)}
            className={`p-1.5 rounded-lg transition-all ${
              mobileGridCols === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileGridCols(1)}
            className={`p-1.5 rounded-lg transition-all ${
              mobileGridCols === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. TEMPLATES GRID (SEAMLESS, NO HEAVY OUTER/INNER BOXES) */}
      <div 
        className={`grid gap-3 sm:gap-5 ${
          isMobile2Col ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {BUSINESS_DOC_TEMPLATES.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const sampleData = getSampleDocData(template);

          return (
            <div
              key={template.id}
              className={`group relative rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${
                isSelected
                  ? 'bg-slate-900 border-2 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>Actif</span>
                </div>
              )}

              <div className="p-2 sm:p-3.5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                    {template.badge}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">
                    OHADA / UEMOA
                  </span>
                </div>

                {/* THUMBNAIL (NATURAL PAPER RENDER) */}
                <div 
                  onClick={() => handleOpenPreview(template)}
                  className={`relative w-full rounded-xl overflow-hidden cursor-pointer flex items-start justify-center bg-slate-950/60 shadow-inner group/thumb transition-colors ${
                    isMobile2Col ? 'h-48 sm:h-64 md:h-72' : 'h-80 sm:h-64 md:h-72'
                  }`}
                  title="Aperçu HD"
                >
                  <div 
                    className="w-[794px] min-h-[1123px] bg-white origin-top shadow-2xl shadow-black/80 pointer-events-none select-none transition-transform duration-300 group-hover/thumb:scale-[0.28]"
                    style={{
                      transform: isMobile2Col ? 'scale(0.185)' : 'scale(0.35)',
                      transformOrigin: 'top center',
                      marginTop: '6px'
                    }}
                  >
                    <DevisFactureTemplate data={sampleData} isUnlocked={true} />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

                  <div className="absolute top-1.5 right-1.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(template);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-slate-300 hover:text-white hover:bg-indigo-600 transition-all shadow-md cursor-pointer active:scale-90"
                      title="Agrandir ce modèle"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-0.5 space-y-1">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                    {template.name}
                  </h3>
                  {(!isMobile2Col || typeof window !== 'undefined' && window.innerWidth >= 640) && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2 sm:p-3 pt-0">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id, selectedTheme)}
                  className={`w-full py-2 sm:py-2.5 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                  }`}
                >
                  <span>{isSelected ? '✓ Modèle sélectionné' : isMobile2Col ? 'Choisir' : 'Choisir ce modèle & Remplir'}</span>
                  {!isSelected && <ArrowRight className="w-3 h-3 shrink-0" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. FULL-SCREEN HD MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
            
            <div className="px-3.5 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 text-white shrink-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="px-2 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-black bg-indigo-600 text-white shrink-0">
                  {previewTemplate.badge}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    Modèle Conforme OHADA • Thème {selectedTheme.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.3, prev - 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 text-slate-300">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.min(1.4, prev + 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-950 flex justify-center items-start scrollbar-thin">
              <div 
                className="bg-white shadow-2xl transition-transform duration-200 ease-out origin-top border border-slate-300 rounded-xs"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${modalZoom})`,
                  marginBottom: '80px'
                }}
              >
                <DevisFactureTemplate
                  data={getSampleDocData(previewTemplate)}
                  isUnlocked={true}
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard ({docInfo.price})
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewTemplate;
                    setPreviewTemplate(null);
                    onSelectTemplate(tpl.id, selectedTheme);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Choisir ce modèle ({docInfo.price})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
