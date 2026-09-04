import React, { useState, useEffect, useRef } from 'react';
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

// FLUID A4 BUSINESS DOC THUMBNAIL (100% CLICKABLE MOBILE & DESKTOP)
const FluidBusinessDocThumbnail: React.FC<{
  template: BusinessDocTemplateOption;
  sampleData: BusinessDocData;
  isSelected: boolean;
  onSelect: () => void;
  onOpenPreview: () => void;
}> = ({
  template,
  sampleData,
  isSelected,
  onSelect,
  onOpenPreview
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.32);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setScale(width / 794);
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Sélectionner le modèle ${template.name}`}
      className={`group relative cursor-pointer select-none transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col bg-slate-900/60 p-2 sm:p-0 ${
        isSelected
          ? 'ring-3 ring-indigo-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-indigo-500/25'
          : 'shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1.5'
      }`}
    >
      {/* 1. PURE FLOATING A4 SHEET */}
      <div 
        ref={containerRef}
        className="w-full aspect-[210/297] bg-white overflow-hidden rounded-lg sm:rounded-2xl relative shrink-0"
      >
        <div 
          className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
          style={{ transform: `scale(${scale})` }}
        >
          <DevisFactureTemplate data={sampleData} />
        </div>

        {/* Top-Left: Discreet Fullscreen Preview Quick-Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview();
          }}
          className="absolute top-2 left-2 z-20 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg flex items-center justify-center"
          title="Aperçu Plein Écran HD"
          aria-label="Aperçu Plein Écran HD"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Selected Indicator Badge (Top-Right) */}
        {isSelected && (
          <div className="absolute top-2 right-2 z-20 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-indigo-950/60">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Actif</span>
          </div>
        )}
      </div>

      {/* 2. DEDICATED MOBILE ACTION BAR (ALWAYS VISIBLE & 100% TOUCH-CLICKABLE) */}
      <div className="sm:hidden pt-2.5 pb-1 px-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="text-xs font-black text-white truncate min-w-0">
            {template.name}
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-600 text-white shrink-0">
            {template.badge}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
              isSelected
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Sélectionné</span>
              </>
            ) : (
              <>
                <span>Choisir ce modèle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-90 cursor-pointer shrink-0"
            title="Aperçu HD"
            aria-label="Aperçu HD"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* 3. CANVA-STYLE FADE-IN OVERLAY ON DESKTOP HOVER */}
      <div
        className="hidden sm:flex absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/30 backdrop-blur-[2px] transition-all duration-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto flex-col justify-between p-4 md:p-5 rounded-2xl"
      >
        {/* Top: Status Badges & Fullscreen Preview */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
              {template.badge}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-slate-300 border border-slate-700">
              OHADA / UEMOA
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview();
            }}
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg"
            title="Aperçu Plein Écran HD"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Action Button */}
        <div className="flex flex-col items-center justify-center gap-2 my-auto py-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isSelected ? '✓ Modèle sélectionné' : 'Sélectionner ce modèle'}</span>
            {!isSelected && <ArrowRight className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview();
            }}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Aperçu HD zoomable</span>
          </button>
        </div>

        {/* Bottom: Title & description */}
        <div className="space-y-1 text-left">
          <h3 className="text-sm md:text-base font-black text-white truncate drop-shadow-sm">
            {template.name}
          </h3>
          <p className="text-xs text-slate-300 truncate max-w-full drop-shadow-sm">
            {template.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export const BusinessDocTemplateGallery: React.FC<BusinessDocTemplateGalleryProps> = ({
  docType,
  onSelectTemplate,
  selectedTemplateId = 'classique_ohada',
  onGoServices
}) => {
  const [selectedTheme, setSelectedTheme] = useState<'indigo' | 'emerald' | 'amber' | 'slate'>('indigo');
  const [previewTemplate, setPreviewTemplate] = useState<BusinessDocTemplateOption | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.85);
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(1);

  const getDocTypeInfo = () => {
    switch (docType) {
      case 'devis':
        return {
          title: "Modèles de Devis Professionnels",
          badge: "Devis Pro",
          icon: FileCheck,
          accent: "text-amber-400",
          desc: "Sélectionnez votre modèle conforme aux normes commerciales OHADA / UEMOA."
        };
      case 'facture':
        return {
          title: "Modèles de Facture Client",
          badge: "Facture",
          icon: Receipt,
          accent: "text-emerald-400",
          desc: "Modèle certifié avec mentions légales sénégalaises (NINEA, RC, TVA 18%)."
        };
      case 'pack_business':
      default:
        return {
          title: "Modèles Pack Business (Devis & Facture)",
          badge: "Pack Business Duo",
          icon: Package,
          accent: "text-indigo-400",
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
          description: 'Refonte complète plateforme web e-commerce & API Wave / Orange Money',
          quantity: 1,
          unitPrice: 900000,
          total: 900000
        },
        {
          id: '2',
          description: 'Formation équipe technique & support mensuel prioritaire 24/7',
          quantity: 1,
          unitPrice: 150000,
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

  return (
    <div 
      className="space-y-6 sm:space-y-8 animate-in fade-in max-w-7xl mx-auto pb-20 px-2 sm:px-6"
    >
      
      {/* 1. DISCREET HEADER */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {docInfo.title}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Normes OHADA / UEMOA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {docInfo.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Mobile Column Switch */}
            <div className="flex sm:hidden items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(1);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                }`}
                title="Pleine largeur"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(2);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                }`}
                title="2 colonnes"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {onGoServices && (
              <button
                type="button"
                onClick={onGoServices}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>
            )}
          </div>
        </div>

        {/* Color Palette Selector (Compact, Airy) */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            Nuance du document :
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'indigo', label: 'Indigo Pro', bg: 'bg-indigo-600' },
              { id: 'emerald', label: 'Émeraude', bg: 'bg-emerald-600' },
              { id: 'amber', label: 'Ambre Gold', bg: 'bg-amber-600' },
              { id: 'slate', label: 'Ardoise Sobre', bg: 'bg-slate-700' }
            ].map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.bg}`} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FLUID CANVA-STYLE GRID */}
      <div 
        className={`grid ${
          mobileGridCols === 1
            ? 'grid-cols-1 max-w-sm mx-auto sm:max-w-none sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-8 lg:gap-10'
            : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 lg:gap-10'
        }`}
      >
        {BUSINESS_DOC_TEMPLATES.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const sampleData = getSampleDocData(template);

          return (
            <FluidBusinessDocThumbnail
              key={template.id}
              template={template}
              sampleData={sampleData}
              isSelected={isSelected}
              onSelect={() => onSelectTemplate(template.id, selectedTheme)}
              onOpenPreview={() => handleOpenPreview(template)}
            />
          );
        })}
      </div>

      {/* 3. FULL-SCREEN PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
            
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 text-white shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-600 text-white shrink-0">
                  {previewTemplate.badge}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {previewTemplate.name}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.3, prev - 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 text-slate-300">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.min(1.4, prev + 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800"
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
                <DevisFactureTemplate data={getSampleDocData(previewTemplate)} />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conforme Directives OHADA & UEMOA
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
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
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                >
                  <span>Sélectionner ce modèle</span>
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
