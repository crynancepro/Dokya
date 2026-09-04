import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TemplateStyle, CVFormData } from '../types';
import { ALL_CV_TEMPLATES, CVTemplateMeta } from '../data/cvTemplatesList';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CVTemplate } from './CVTemplate';
import { 
  Sparkles, Search, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Camera, FileText, Check, X, Maximize2, ZoomIn, ZoomOut,
  LayoutGrid, Square, RefreshCw
} from 'lucide-react';

interface CVTemplateGalleryProps {
  onSelectTemplate: (templateId: TemplateStyle, accentColor?: string) => void;
  selectedTemplateId?: TemplateStyle;
  selectedColor?: string;
  onGoServices?: () => void;
}

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'Tous', count: 50 },
  { id: 'ats', label: '⚡ 100% ATS', count: 30 },
  { id: 'photo', label: '📸 Avec Photo', count: 20 },
  { id: 'Moderne & Design', label: 'Moderne' },
  { id: 'Exécutif & Direction', label: 'Exécutif' },
  { id: 'Tech & Digital', label: 'Tech' },
  { id: 'Minimal & ATS', label: 'Minimaliste' },
  { id: 'Finance & Droit', label: 'Finance' },
  { id: 'Prestige & Luxe', label: 'Prestige' },
  { id: 'Créatif & Studio', label: 'Créatif' },
  { id: 'Santé & Sciences', label: 'Santé' },
  { id: 'Industrie & Terrain', label: 'Industrie' }
];

// Professional avatar sample for templates with photo
const SAMPLE_PHOTO_URL = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

// INDIVIDUAL FLUID CANVA-STYLE A4 THUMBNAIL
const FluidCVThumbnail: React.FC<{
  template: CVTemplateMeta;
  sampleData: CVFormData;
  isSelected: boolean;
  isActiveOnMobile: boolean;
  onSelect: () => void;
  onOpenPreview: () => void;
  onCardTap: () => void;
}> = ({
  template,
  sampleData,
  isSelected,
  isActiveOnMobile,
  onSelect,
  onOpenPreview,
  onCardTap
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
      onClick={onCardTap}
      className={`group relative cursor-pointer select-none transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden ${
        isSelected
          ? 'ring-3 ring-indigo-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-indigo-500/25'
          : 'shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1.5'
      }`}
    >
      {/* 1. PURE FLOATING A4 SHEET (NO ENCLOSING BOX, NO BORDERS) */}
      <div 
        ref={containerRef}
        className="w-full aspect-[210/297] bg-white overflow-hidden rounded-xl sm:rounded-2xl relative"
      >
        <div 
          className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
          style={{ transform: `scale(${scale})` }}
        >
          <CVTemplate
            formData={sampleData}
            style={template.id}
            primaryColor={template.accentColor}
            isPaid={true}
          />
        </div>
      </div>

      {/* Selected Indicator Badge (Discreet, Top-Right) */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-indigo-950/60">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>Actif</span>
        </div>
      )}

      {/* 2. CANVA-STYLE FADE-IN OVERLAY ON HOVER (DESKTOP) OR TAP (MOBILE) */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/30 backdrop-blur-[2px] transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-5 rounded-xl sm:rounded-2xl ${
          isActiveOnMobile
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
        }`}
      >
        {/* Top: Status Badges (ATS / Photo) + Fullscreen Preview Button */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs"
              style={{ backgroundColor: template.accentColor }}
            >
              N° {template.number}
            </span>
            {template.hasPhoto ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 border border-indigo-400/30 shadow-xs">
                <Camera className="w-3 h-3" />
                <span>Photo Pro</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600/90 text-white backdrop-blur-md flex items-center gap-1 border border-emerald-400/30 shadow-xs">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>100% ATS</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview();
            }}
            className="p-1.5 sm:p-2 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg"
            title="Aperçu Plein Écran HD"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
            className="w-full sm:w-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            className="text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Aperçu HD zoomable</span>
          </button>
        </div>

        {/* Bottom: Title & short description */}
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50"
              style={{ backgroundColor: template.accentColor }}
            />
            <h3 className="text-xs sm:text-sm md:text-base font-black text-white truncate drop-shadow-sm">
              {template.label}
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 truncate max-w-full drop-shadow-sm">
            {template.desc}
          </p>
        </div>
      </div>
    </div>
  );
};

export const CVTemplateGallery: React.FC<CVTemplateGalleryProps> = ({
  onSelectTemplate,
  selectedTemplateId = 'moderne',
  onGoServices
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fullPreviewTemplate, setFullPreviewTemplate] = useState<CVTemplateMeta | null>(null);
  
  // Mobile layout switch: 1 column (large Canva-style) vs 2 columns (compact grid)
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(1);
  
  // Mobile active tap card id (to reveal overlay on tap without hover)
  const [activeMobileCardId, setActiveMobileCardId] = useState<string | null>(null);

  // Zoom level for HD preview modal
  const [modalZoom, setModalZoom] = useState<number>(0.85);

  // Set intelligent default modal zoom based on screen width
  const handleOpenFullPreview = (tpl: CVTemplateMeta) => {
    setFullPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const calculatedZoom = Math.min(0.48, Math.max(0.38, (window.innerWidth - 32) / 794));
      setModalZoom(calculatedZoom);
    } else {
      setModalZoom(0.85);
    }
  };

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return ALL_CV_TEMPLATES.filter((tpl) => {
      // Filter tab
      if (activeFilter === 'ats' && tpl.hasPhoto) return false;
      if (activeFilter === 'photo' && !tpl.hasPhoto) return false;
      if (
        activeFilter !== 'all' &&
        activeFilter !== 'ats' &&
        activeFilter !== 'photo' &&
        tpl.category !== activeFilter
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = tpl.label.toLowerCase().includes(q);
        const matchCategory = tpl.category.toLowerCase().includes(q);
        const matchDesc = tpl.desc.toLowerCase().includes(q);
        const matchNumber = String(tpl.number).includes(q);
        const matchTag = tpl.badgeTag?.toLowerCase().includes(q);
        const matchAts = (q === 'ats' || q === 'sans photo') && !tpl.hasPhoto;
        const matchPhoto = (q === 'photo' || q === 'avec photo') && tpl.hasPhoto;
        return matchLabel || matchCategory || matchDesc || matchNumber || matchTag || matchAts || matchPhoto;
      }

      return true;
    });
  }, [activeFilter, searchQuery]);

  // Helper to generate sample data tailored for a template
  const getSampleDataForTemplate = (tpl: CVTemplateMeta): CVFormData => {
    return {
      ...SAMPLE_CV_DATA,
      templateStyle: tpl.id,
      themeColor: tpl.accentColor,
      personalInfo: {
        ...SAMPLE_CV_DATA.personalInfo,
        photoUrl: tpl.hasPhoto ? SAMPLE_PHOTO_URL : ''
      }
    };
  };

  return (
    <div 
      className="space-y-4 sm:space-y-6 animate-in fade-in max-w-7xl mx-auto pb-16 px-2 sm:px-6"
      onClick={() => setActiveMobileCardId(null)}
    >
      
      {/* 1. ULTRA-COMPACT HEADER & MINIMAL TOOLBAR (REDUCED VERTICAL FOOTPRINT) */}
      <div className="space-y-2 pt-1">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
              Modèles de CV
            </h1>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
              50 designs
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mobile Column View Switch (1 Col vs 2 Cols) */}
            <div className="flex sm:hidden items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(1);
                }}
                className={`p-1 rounded-md transition-all ${
                  mobileGridCols === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="1 colonne"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(2);
                }}
                className={`p-1 rounded-md transition-all ${
                  mobileGridCols === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="2 colonnes"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {onGoServices && (
              <button
                type="button"
                onClick={onGoServices}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Retour</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified Ultra-Compact Filter & Search Bar: 1 line on desktop, 2 slim lines on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-900/40 p-1 sm:p-1.5 rounded-xl border border-slate-800/60 backdrop-blur-xs">
          {/* Search bar (slim height 32px) */}
          <div className="relative w-full sm:w-52 md:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (ex: tech, ATS, 12)..."
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg bg-slate-950/80 border border-slate-800/90 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 transition-colors"
                title="Effacer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Desktop divider */}
          <div className="hidden sm:block h-4 w-px bg-slate-800/80 shrink-0" />

          {/* Micro-Pills (Single horizontal scrollable line, no duplication) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth min-w-0 flex-1">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-950/50 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[9px] px-1 py-0.2 rounded-sm ${isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FLUID CANVA-STYLE GRID (GENEROUS BLANK SPACE, PURE A4 SHEETS) */}
      {filteredTemplates.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3">
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            Aucun modèle ne correspond à votre recherche.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      ) : (
        <div 
          className={`grid ${
            mobileGridCols === 1
              ? 'grid-cols-1 max-w-sm mx-auto sm:max-w-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-8 lg:gap-10'
              : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8 lg:gap-10'
          }`}
        >
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            const sampleData = getSampleDataForTemplate(template);
            const isActiveOnMobile = activeMobileCardId === template.id;

            return (
              <FluidCVThumbnail
                key={template.id}
                template={template}
                sampleData={sampleData}
                isSelected={isSelected}
                isActiveOnMobile={isActiveOnMobile}
                onSelect={() => onSelectTemplate(template.id, template.accentColor)}
                onOpenPreview={() => handleOpenFullPreview(template)}
                onCardTap={() => {
                  setActiveMobileCardId(prev => (prev === template.id ? null : template.id));
                }}
              />
            );
          })}
        </div>
      )}

      {/* 3. FULL-SCREEN HIGH-DEFINITION INSPECTION MODAL */}
      {fullPreviewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
            
            {/* Modal Top Header Bar */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 text-white shrink-0 z-10">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span 
                  className="px-2 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-black text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: fullPreviewTemplate.accentColor }}
                >
                  N° {fullPreviewTemplate.number}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                    {fullPreviewTemplate.label}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
                    <span className="truncate">{fullPreviewTemplate.category}</span>
                    <span>•</span>
                    <span className={fullPreviewTemplate.hasPhoto ? 'text-indigo-400' : 'text-emerald-400 font-bold'}>
                      {fullPreviewTemplate.hasPhoto ? 'Avec Portrait' : '100% ATS'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.3, prev - 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Zoom arrière"
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
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Canvas Container */}
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
                <CVTemplate
                  formData={getSampleDataForTemplate(fullPreviewTemplate)}
                  style={fullPreviewTemplate.id}
                  primaryColor={fullPreviewTemplate.accentColor}
                  isPaid={true}
                />
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard (PDF HD & Word .docx)
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = fullPreviewTemplate;
                    setFullPreviewTemplate(null);
                    onSelectTemplate(tpl.id, tpl.accentColor);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
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
