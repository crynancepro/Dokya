import React, { useState, useMemo, useEffect } from 'react';
import { TemplateStyle, CVFormData } from '../types';
import { ALL_CV_TEMPLATES, CVTemplateMeta } from '../data/cvTemplatesList';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CVTemplate } from './CVTemplate';
import { 
  Sparkles, Search, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Camera, FileText, Check, X, Maximize2, ZoomIn, ZoomOut,
  LayoutGrid, Square, RefreshCw, SlidersHorizontal
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

export const CVTemplateGallery: React.FC<CVTemplateGalleryProps> = ({
  onSelectTemplate,
  selectedTemplateId = 'moderne',
  onGoServices
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'no_photo' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fullPreviewTemplate, setFullPreviewTemplate] = useState<CVTemplateMeta | null>(null);
  
  // Mobile layout switch: 2 columns (fast visual grid) vs 1 column (large detailed card)
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(2);
  
  // Zoom level for HD preview modal
  const [modalZoom, setModalZoom] = useState<number>(0.85);

  // Set intelligent default modal zoom based on screen width
  const handleOpenFullPreview = (tpl: CVTemplateMeta) => {
    setFullPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      // On mobile screen (375-430px), fit A4 (794px) to screen width (~0.44 scale)
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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in max-w-7xl mx-auto pb-16 px-1 sm:px-4">
      
      {/* 1. TOP HEADER BANNER (Refined & streamlined on mobile) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border border-indigo-900/40 shadow-xl p-4 sm:p-7 lg:p-9">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>50 Modèles Pro</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                100% Rendu Réel A4
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
              Galerie des Modèles de CV
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Choisissez le design parfait pour votre secteur. Cliquez sur un modèle pour le voir en plein écran ou le sélectionner immédiatement.
            </p>
          </div>

          {/* Quick stats pills */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs border-t border-slate-800/60 text-slate-400">
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <strong className="text-slate-200">30 Sans Photo</strong> (ATS garanti)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <strong className="text-slate-200">20 Avec Photo</strong>
              </span>
            </div>

            <span className="text-indigo-300 font-bold bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-800/40">
              {filteredTemplates.length} affiché{filteredTemplates.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS (SEAMLESS DARK THEME - NO HEAVY WHITE BOX) */}
      <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-lg space-y-3">
        
        {/* Search Bar + Photo Filter + Mobile Grid View Switch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, ATS, Tech, Photo, N°..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
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

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {/* Photo / No-Photo Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setPhotoFilter('all')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
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
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  photoFilter === 'no_photo'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Sans Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('photo')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  photoFilter === 'photo'
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>Avec Photo</span>
              </button>
            </div>

            {/* Mobile Column Switch (2 Cols vs 1 Col) */}
            <div className="flex sm:hidden items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setMobileGridCols(2)}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Affichage 2 colonnes (compact)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileGridCols(1)}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Affichage 1 colonne (large)"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (Smooth Touch Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TEMPLATES GRID (SEAMLESS CARDS, NO HARSH INNER/OUTER BORDERS) */}
      {filteredTemplates.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
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
          className={`grid gap-3 sm:gap-5 ${
            mobileGridCols === 2 
              ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            const sampleData = getSampleDataForTemplate(template);

            // Responsive thumbnail scaling calculation
            // In 2-col mobile, card is ~165px wide -> scale 0.185 gives ~147px width (fits perfectly without overflow)
            // In 1-col mobile, card is ~350px wide -> scale 0.36 gives ~285px width (crisp, centered)
            // On desktop (sm+), column is ~260px wide -> scale 0.26 gives ~206px width
            const isMobile2Col = mobileGridCols === 2;

            return (
              <div
                key={template.id}
                className={`group relative rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40'
                }`}
              >
                {/* Active selection banner if selected */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Actif</span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-2 sm:p-3.5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                  
                  {/* Header Badges (Clean & Compact) */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span 
                        className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black text-white shadow-xs shrink-0"
                        style={{ backgroundColor: template.accentColor }}
                      >
                        N° {template.number}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 truncate max-w-[90px] sm:max-w-[130px]">
                        {template.category}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {template.hasPhoto ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5">
                          <Camera className="w-2.5 h-2.5" />
                          <span className="hidden sm:inline">Photo</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span>ATS</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* REAL A4 THUMBNAIL (NATURAL PAPER SHADOW, NO HEAVY BOX-IN-BOX FRAME) */}
                  <div 
                    onClick={() => handleOpenFullPreview(template)}
                    className={`relative w-full rounded-xl overflow-hidden cursor-pointer flex items-start justify-center bg-slate-950/60 shadow-inner group/thumb transition-colors ${
                      isMobile2Col ? 'h-48 sm:h-64 md:h-72' : 'h-80 sm:h-64 md:h-72'
                    }`}
                    title="Cliquer pour voir l'aperçu plein écran HD"
                  >
                    {/* Natural A4 Paper Render Floating Gracefully */}
                    <div 
                      className="w-[794px] min-h-[1123px] bg-white origin-top shadow-2xl shadow-black/80 pointer-events-none select-none transition-transform duration-300 group-hover/thumb:scale-[0.28]"
                      style={{
                        transform: isMobile2Col
                          ? 'scale(0.185)' 
                          : 'scale(0.35)',
                        transformOrigin: 'top center',
                        marginTop: '6px'
                      }}
                    >
                      <CVTemplate
                        formData={sampleData}
                        style={template.id}
                        primaryColor={template.accentColor}
                        isPaid={true}
                      />
                    </div>

                    {/* Gradient Fade at the bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

                    {/* Quick Expand Button (Always visible on mobile for easy touch, hover on desktop) */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFullPreview(template);
                        }}
                        className="p-1 sm:p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-slate-300 hover:text-white hover:bg-indigo-600 transition-all shadow-md cursor-pointer active:scale-90"
                        title="Agrandir ce modèle"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Desktop Hover Label Overlay */}
                    <div className="hidden sm:flex absolute inset-0 bg-slate-950/50 backdrop-blur-2xs opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex-col items-center justify-center gap-1.5 p-2 text-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-white text-slate-950 text-xs font-black shadow-xl flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Aperçu HD</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Signature Accent */}
                  <div className="pt-0.5 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                        {template.label}
                      </h3>
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-slate-700"
                        style={{ backgroundColor: template.accentColor }}
                        title="Couleur signature"
                      />
                    </div>
                    
                    {/* Description: visible on desktop or 1-col mobile */}
                    {(!isMobile2Col || typeof window !== 'undefined' && window.innerWidth >= 640) && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                        {template.desc}
                      </p>
                    )}
                  </div>

                </div>

                {/* Direct Action Button (Smooth Integration, No Secondary Box) */}
                <div className="p-2 sm:p-3 pt-0">
                  <button
                    type="button"
                    onClick={() => onSelectTemplate(template.id, template.accentColor)}
                    className={`w-full py-2 sm:py-2.5 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                        : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                    }`}
                  >
                    <span>{isSelected ? '✓ Modèle sélectionné' : isMobile2Col ? 'Choisir' : 'Choisir ce modèle & Rédiger'}</span>
                    {!isSelected && <ArrowRight className="w-3 h-3 shrink-0" />}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. FULL-SCREEN HIGH-DEFINITION INSPECTION MODAL (OPTIMIZED FOR MOBILE & DESKTOP) */}
      {fullPreviewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
            
            {/* Modal Top Header Bar */}
            <div className="px-3.5 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 text-white shrink-0 z-10">
              
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                {/* Zoom Controls */}
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
                  <span>Choisir ce modèle</span>
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
