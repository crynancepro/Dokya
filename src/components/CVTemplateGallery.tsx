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

const CATEGORIES = [
  'Tous',
  '⚡ 100% ATS (Sans Photo)',
  '📸 Avec Photo Pro',
  'Exécutif & Direction',
  'Moderne & Design',
  'Minimal & ATS',
  'Tech & Digital',
  'Prestige & Luxe',
  'Finance & Droit',
  'Créatif & Studio',
  'Santé & Sciences',
  'Industrie & Terrain'
] as const;

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
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'no_photo' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fullPreviewTemplate, setFullPreviewTemplate] = useState<CVTemplateMeta | null>(null);
  
  // Mobile layout switch: 1 column (large, detailed Canva-style) vs 2 columns (compact grid)
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
      // Photo filter
      if (photoFilter === 'no_photo' && tpl.hasPhoto) return false;
      if (photoFilter === 'photo' && !tpl.hasPhoto) return false;

      // Category filter
      if (selectedCategory === '⚡ 100% ATS (Sans Photo)' && tpl.hasPhoto) return false;
      if (selectedCategory === '📸 Avec Photo Pro' && !tpl.hasPhoto) return false;
      if (
        selectedCategory !== 'Tous' &&
        selectedCategory !== '⚡ 100% ATS (Sans Photo)' &&
        selectedCategory !== '📸 Avec Photo Pro' &&
        tpl.category !== selectedCategory
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
        return matchLabel || matchCategory || matchDesc || matchNumber || matchTag;
      }

      return true;
    });
  }, [selectedCategory, photoFilter, searchQuery]);

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
      className="space-y-6 sm:space-y-8 animate-in fade-in max-w-7xl mx-auto pb-20 px-2 sm:px-6"
      onClick={() => setActiveMobileCardId(null)}
    >
      
      {/* 1. DISCREET, COMPACT TOP BAR & SEARCH (NO BULKY PROMO BOX) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Galerie des Modèles de CV
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                50 designs A4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Survolez ou appuyez sur un modèle pour afficher ses options et le sélectionner.
            </p>
          </div>

          {onGoServices && (
            <button
              type="button"
              onClick={onGoServices}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          )}
        </div>

        {/* Search Input + Simplified Filter Badges + Mobile Col Switch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, ATS, Tech, N°..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters (Simplified ATS / Photo Toggle) */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setPhotoFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  photoFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tous (50)
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('no_photo')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  photoFilter === 'no_photo'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>100% ATS</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('photo')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  photoFilter === 'photo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Avec Photo</span>
              </button>
            </div>

            {/* Mobile Column View Switch (1 Col = large Canva view, 2 Cols = compact) */}
            <div className="flex sm:hidden items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(1);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Affichage 1 colonne (Pleine largeur)"
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
                  mobileGridCols === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Affichage 2 colonnes (Compact)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Row (Airy, Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FLUID CANVA-STYLE GRID (GENEROUS BLANK SPACE, PURE A4 SHEETS) */}
      {filteredTemplates.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3">
          <p className="text-slate-400 text-sm font-medium">
            Aucun modèle ne correspond à votre recherche.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Tous');
              setPhotoFilter('all');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all cursor-pointer"
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
