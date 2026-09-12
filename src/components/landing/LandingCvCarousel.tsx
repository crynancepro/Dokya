import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Star, ArrowRight, CheckCircle2, Briefcase, Camera, Sparkles, 
  ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, X, 
  LayoutGrid, SlidersHorizontal, Eye, Play, Pause
} from 'lucide-react';
import { ALL_CV_TEMPLATES, CVTemplateMeta } from '../../data/cvTemplatesList';
import { SAMPLE_CV_DATA } from '../../data/sampleData';
import { CVTemplate } from '../CVTemplate';
import { CVFormData } from '../../types';

interface LandingCvCarouselProps {
  onSelectCvTemplate: (templateId?: string) => void;
}

const SAMPLE_PHOTO_URL = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

// Catégories avec labels courts pour filtres
const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tous les 50 Modèles' },
  { id: 'no_photo', label: '⚡ Sans Photo • ATS (30)' },
  { id: 'with_photo', label: '📸 Avec Photo (20)' },
  { id: 'Moderne & Design', label: 'Moderne' },
  { id: 'Exécutif & Direction', label: 'Exécutif' },
  { id: 'Tech & Digital', label: 'Tech' },
  { id: 'Finance & Droit', label: 'Finance' },
  { id: 'Minimal & ATS', label: 'Minimaliste' },
  { id: 'Santé & Sciences', label: 'Santé' },
  { id: 'Industrie & Terrain', label: 'Industrie' },
];

// Carte A4 réelle avec le composant CVTemplate officiel
const RealA4CvCard: React.FC<{
  template: CVTemplateMeta;
  sampleData: CVFormData;
  onSelect: () => void;
  onOpenPreview: () => void;
}> = ({ template, sampleData, onSelect, onOpenPreview }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.33);

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
      aria-label={`Sélectionner le modèle de CV ${template.label}`}
      className="group relative cursor-pointer select-none rounded-2xl overflow-hidden flex flex-col bg-slate-900 border border-slate-800 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:border-indigo-500/50 transition-all duration-300 p-2 sm:p-2.5 shrink-0 w-[260px] sm:w-[290px] text-left transform hover:scale-102 hover:-translate-y-1"
    >
      {/* 1. FEUILLE A4 RÉELLE EN MINIATURE HAUTE FIDÉLITÉ */}
      <div 
        ref={containerRef}
        className="w-full aspect-[210/297] bg-white overflow-hidden rounded-xl relative shadow-md shrink-0 border border-slate-200"
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

        {/* Bouton Loupe / Aperçu Plein Écran HD */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview();
          }}
          className="absolute top-2.5 left-2.5 z-20 p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg flex items-center justify-center group-hover:scale-105"
          title="Aperçu Plein Écran HD (Zoom)"
          aria-label="Aperçu Plein Écran HD"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
        </button>

        {/* Badge Numéro Officiel du Modèle */}
        <div 
          className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-md text-[9px] font-black text-white shadow-md flex items-center gap-1 backdrop-blur-xs"
          style={{ backgroundColor: template.accentColor }}
        >
          <span>N° {template.number}</span>
        </div>

        {/* Overlay d'action subtile au survol */}
        <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600/90 text-white text-xs font-black shadow-lg backdrop-blur-sm flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </span>
        </div>
      </div>

      {/* 2. INFORMATIONS DU MODÈLE ET BOUTON D'ACTION */}
      <div className="pt-2.5 pb-1 px-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate group-hover:text-indigo-300 transition-colors">
              {template.label}
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              {template.category}
            </p>
          </div>

          {template.hasPhoto ? (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50 flex items-center gap-0.5 shrink-0">
              <Camera className="w-2.5 h-2.5" />
              <span>Photo</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              <span>100% ATS</span>
            </span>
          )}
        </div>

        {/* Bouton de sélection */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer group-hover:bg-indigo-600"
        >
          <span>Utiliser le modèle N° {template.number}</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export const LandingCvCarousel: React.FC<LandingCvCarouselProps> = ({
  onSelectCvTemplate,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [fullPreviewTemplate, setFullPreviewTemplate] = useState<CVTemplateMeta | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.8);
  const [viewMode, setViewMode] = useState<'marquee' | 'grid'>('marquee');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Filtrage des 50 modèles
  const filteredTemplates = useMemo(() => {
    if (selectedFilter === 'no_photo') {
      return ALL_CV_TEMPLATES.filter(t => !t.hasPhoto);
    }
    if (selectedFilter === 'with_photo') {
      return ALL_CV_TEMPLATES.filter(t => t.hasPhoto);
    }
    if (selectedFilter !== 'all') {
      return ALL_CV_TEMPLATES.filter(t => t.category === selectedFilter);
    }
    return ALL_CV_TEMPLATES;
  }, [selectedFilter]);

  // Duplication pour le défilement automatique infini
  const marqueeCards = useMemo(() => {
    return [...filteredTemplates, ...filteredTemplates];
  }, [filteredTemplates]);

  // Vitesse calculée en fonction du nombre de modèles
  const marqueeDuration = useMemo(() => {
    return `${Math.max(40, filteredTemplates.length * 2.2)}s`;
  }, [filteredTemplates.length]);

  // Données types du CV adaptées avec photo ou sans photo
  const getSampleDataForTemplate = (tpl: CVTemplateMeta): CVFormData => {
    return {
      ...SAMPLE_CV_DATA,
      templateStyle: tpl.id,
      themeColor: tpl.accentColor,
      personalInfo: {
        ...SAMPLE_CV_DATA.personalInfo,
        photoUrl: tpl.hasPhoto ? SAMPLE_PHOTO_URL : '',
      },
    };
  };

  const handleOpenPreview = (tpl: CVTemplateMeta) => {
    setFullPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const calculatedZoom = Math.min(0.48, Math.max(0.38, (window.innerWidth - 32) / 794));
      setModalZoom(calculatedZoom);
    } else {
      setModalZoom(0.85);
    }
  };

  return (
    <div className="w-full relative py-2 space-y-4">
      
      {/* 1. BARRE DE COMMANDE SUPÉRIEURE (Filtres, Compteur, Mode Défilement Automatique vs Grille & Play/Pause) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Badge Compteur Officiel & État Défilement */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 font-mono font-bold flex items-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{filteredTemplates.length} sur les 50 Vrais Modèles Réels Dokya</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[11px] border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Défilement continu automatique • Pause au survol</span>
            </span>
          </div>

          {/* Contrôles de navigation & Mode d'affichage */}
          <div className="flex items-center gap-2">
            
            {/* Bouton Play / Pause Défilement Automatique */}
            {viewMode === 'marquee' && (
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title={isPlaying ? 'Mettre en pause le défilement automatique' : 'Reprendre le défilement automatique'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span className="hidden sm:inline">Défiler</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle Mode Défilement Automatique vs Grille Complète */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('marquee')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'marquee'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue Défilement Automatique Continu"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue Grille Complète"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grille (Tous)</span>
              </button>
            </div>

          </div>

        </div>

        {/* Liste des Filtres Métiers et Types */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-[11px] ${
                selectedFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

      </div>

      {/* 2. ZONE DE PRÉSENTATION DES VRAIS MODÈLES DE CV (DÉFILEMENT AUTOMATIQUE OU GRILLE) */}
      <div className="w-full">
        
        {viewMode === 'marquee' ? (
          /* BANDE DÉFILANTE CONTINUE INFINIE AUTOMATIQUE (SCROLL PAR LUI-MÊME AVEC PAUSE AU SURVOL) */
          <div className="relative w-full overflow-hidden">
            {/* Masques latéraux progressifs pour sortie/entrée transparente */}
            <div className="absolute top-0 left-0 bottom-0 w-12 sm:w-28 z-20 pointer-events-none bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute top-0 right-0 bottom-0 w-12 sm:w-28 z-20 pointer-events-none bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent" />

            <div 
              className="animate-marquee-left flex items-stretch gap-4 sm:gap-6 py-3"
              style={{ 
                animationDuration: marqueeDuration,
                animationPlayState: isPlaying ? undefined : 'paused' 
              }}
            >
              {marqueeCards.map((tpl, idx) => (
                <div key={`${tpl.id}-${tpl.number}-${idx}`} className="shrink-0">
                  <RealA4CvCard
                    template={tpl}
                    sampleData={getSampleDataForTemplate(tpl)}
                    onSelect={() => onSelectCvTemplate(tpl.id)}
                    onOpenPreview={() => handleOpenPreview(tpl)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* VUE GRILLE COMPLÈTE (POUR EXAMINER TOUT D'UN COUP) */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-3">
            {filteredTemplates.map((tpl) => (
              <RealA4CvCard
                key={tpl.id}
                template={tpl}
                sampleData={getSampleDataForTemplate(tpl)}
                onSelect={() => onSelectCvTemplate(tpl.id)}
                onOpenPreview={() => handleOpenPreview(tpl)}
              />
            ))}
          </div>
        )}

      </div>

      {/* 3. MODALE D'APERÇU PLEIN ÉCRAN HD INTERACTIVE (ZOOMABLE) */}
      {fullPreviewTemplate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setFullPreviewTemplate(null)}
        >
          <div 
            className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la modale */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span 
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/20"
                  style={{ backgroundColor: fullPreviewTemplate.accentColor }}
                />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {fullPreviewTemplate.label}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Modèle N° {fullPreviewTemplate.number} sur 50 • {fullPreviewTemplate.category}
                  </p>
                </div>
              </div>

              {/* Contrôles de Zoom */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.35, prev - 0.08))}
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

            {/* Corps du modal : Feuille A4 haute définition */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-950 flex justify-center items-start scrollbar-thin">
              <div 
                className="bg-white shadow-2xl transition-transform duration-200 ease-out origin-top border border-slate-300 rounded-xs"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${modalZoom})`,
                  marginBottom: '80px',
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

            {/* Bas de page du modal */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard Officiel Dokya (PDF HD &amp; Word .docx)
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
                    onSelectCvTemplate(tpl.id);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Créer mon CV avec ce modèle</span>
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
