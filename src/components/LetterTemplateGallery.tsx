import React, { useState, useEffect, useRef } from 'react';
import { CoverLetterStyle, CVFormData, CoverLetterType } from '../types';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Check, X, Maximize2, ZoomIn, ZoomOut,
  Briefcase, Send, Users, UserCheck, Square, LayoutGrid
} from 'lucide-react';

interface LetterTemplateGalleryProps {
  onSelectTemplate: (templateId: CoverLetterStyle, letterType?: CoverLetterType) => void;
  selectedStyleId?: CoverLetterStyle;
  selectedLetterType?: CoverLetterType;
  onGoServices?: () => void;
}

const LETTER_TEMPLATES: {
  id: CoverLetterStyle;
  title: string;
  badge: string;
  desc: string;
  accentColor: string;
}[] = [
  {
    id: 'moderne_epuree',
    title: 'Moderne Épurée',
    badge: 'Standard International',
    desc: 'Structure aérée, alignement soigné et typographie nette pour tout profil.',
    accentColor: '#2563eb'
  },
  {
    id: 'executive_classique',
    title: 'Exécutive Classique',
    badge: 'Direction & Cadres',
    desc: 'En-tête formel, bordure d’accentuation fine et hiérarchie institutionnelle.',
    accentColor: '#1e3a8a'
  },
  {
    id: 'creative_accent',
    title: 'Créative Accent',
    badge: 'Tech, Agence & Com',
    desc: 'Bandeau supérieur dynamique, contrastes colorés et mise en valeur de votre pitch.',
    accentColor: '#0d9488'
  },
  {
    id: 'minimaliste_chic',
    title: 'Minimaliste Chic',
    badge: '100% ATS & Sobre',
    desc: 'Style dépouillé sans fioritures, centré sur la force et la clarté du propos.',
    accentColor: '#334155'
  },
  {
    id: 'impact_direct',
    title: 'Impact Direct',
    badge: 'PME & Startups',
    desc: 'Blocs d’arguments visuels pour convaincre rapidement les recruteurs pressés.',
    accentColor: '#7c3aed'
  },
  {
    id: 'diplomatique',
    title: 'Diplomatique & Institutionnel',
    badge: 'ONG, État & Droit',
    desc: 'Protocole strict, respect des formules officielles et présentation prestigieuse.',
    accentColor: '#0f172a'
  }
];

const LETTER_TYPES = [
  {
    id: 'offre' as CoverLetterType,
    title: "Réponse à une Offre d'Emploi",
    badge: "Classique",
    desc: "Cibler précisément les exigences du poste",
    icon: Briefcase
  },
  {
    id: 'spontanee' as CoverLetterType,
    title: "Candidature Spontanée",
    badge: "Proactive",
    desc: "Mettre en avant votre valeur ajoutée",
    icon: Send
  },
  {
    id: 'stage_alternance' as CoverLetterType,
    title: "Stage & Alternance",
    badge: "Junior / Étudiant",
    desc: "Valoriser vos compétences et motivation",
    icon: Users
  },
  {
    id: 'recommandation' as CoverLetterType,
    title: "Recommandation / Réseau",
    badge: "Cooptation",
    desc: "Citer votre contact référent pour appuyer votre candidature",
    icon: UserCheck
  }
];

// FLUID A4 LETTER THUMBNAIL
const FluidLetterThumbnail: React.FC<{
  template: typeof LETTER_TEMPLATES[0];
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
          ? 'ring-3 ring-blue-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-blue-500/25'
          : 'shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1.5'
      }`}
    >
      {/* 1. PURE FLOATING A4 SHEET */}
      <div 
        ref={containerRef}
        className="w-full aspect-[210/297] bg-white overflow-hidden rounded-xl sm:rounded-2xl relative"
      >
        <div 
          className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
          style={{ transform: `scale(${scale})` }}
        >
          <CoverLetterTemplate formData={sampleData} />
        </div>
      </div>

      {/* Selected Indicator Badge */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-blue-950/60">
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
        {/* Top: Badges & Fullscreen Preview */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs"
              style={{ backgroundColor: template.accentColor }}
            >
              {template.badge}
            </span>
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
            className="w-full sm:w-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Aperçu HD zoomable</span>
          </button>
        </div>

        {/* Bottom: Title & description */}
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50"
              style={{ backgroundColor: template.accentColor }}
            />
            <h3 className="text-xs sm:text-sm md:text-base font-black text-white truncate drop-shadow-sm">
              {template.title}
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

export const LetterTemplateGallery: React.FC<LetterTemplateGalleryProps> = ({
  onSelectTemplate,
  selectedStyleId = 'moderne_epuree',
  selectedLetterType = 'offre',
  onGoServices
}) => {
  const [activeLetterType, setActiveLetterType] = useState<CoverLetterType>(selectedLetterType);
  const [previewTemplate, setPreviewTemplate] = useState<typeof LETTER_TEMPLATES[0] | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.85);
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(1);
  const [activeMobileCardId, setActiveMobileCardId] = useState<string | null>(null);

  const handleOpenPreview = (tpl: typeof LETTER_TEMPLATES[0]) => {
    setPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const calculatedZoom = Math.min(0.48, Math.max(0.38, (window.innerWidth - 32) / 794));
      setModalZoom(calculatedZoom);
    } else {
      setModalZoom(0.85);
    }
  };

  const getSampleLetterData = (template: typeof LETTER_TEMPLATES[0]): CVFormData => {
    return {
      ...SAMPLE_CV_DATA,
      templateStyle: template.id as any,
      themeColor: template.accentColor,
      targetCompany: "SONATEL - ORANGE SÉNÉGAL",
      letterInstructions: "Lead Développeur Full-Stack & Cloud avec 5 ans d'expérience en Afrique de l'Ouest"
    };
  };

  return (
    <div 
      className="space-y-6 sm:space-y-8 animate-in fade-in max-w-7xl mx-auto pb-20 px-2 sm:px-6"
      onClick={() => setActiveMobileCardId(null)}
    >
      
      {/* 1. DISCREET HEADER */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Modèles de Lettres de Motivation
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Format Officiel A4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Choisissez un modèle adapté à votre objectif de candidature.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Mobile Column View Switch */}
            <div className="flex sm:hidden items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileGridCols(1);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  mobileGridCols === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400'
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
                  mobileGridCols === 2 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400'
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

        {/* Letter Types Selector (Compact Pills) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {LETTER_TYPES.map((lt) => {
            const isSelected = activeLetterType === lt.id;
            const Icon = lt.icon;
            return (
              <button
                key={lt.id}
                type="button"
                onClick={() => setActiveLetterType(lt.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/20 text-white shadow-xs'
                    : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate">{lt.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{lt.badge}</div>
                </div>
              </button>
            );
          })}
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
        {LETTER_TEMPLATES.map((template) => {
          const isSelected = selectedStyleId === template.id;
          const sampleData = getSampleLetterData(template);
          const isActiveOnMobile = activeMobileCardId === template.id;

          return (
            <FluidLetterThumbnail
              key={template.id}
              template={template}
              sampleData={sampleData}
              isSelected={isSelected}
              isActiveOnMobile={isActiveOnMobile}
              onSelect={() => onSelectTemplate(template.id, activeLetterType)}
              onOpenPreview={() => handleOpenPreview(template)}
              onCardTap={() => {
                setActiveMobileCardId(prev => (prev === template.id ? null : template.id));
              }}
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
                <span 
                  className="px-2 py-0.5 rounded-md text-xs font-black text-white shrink-0"
                  style={{ backgroundColor: previewTemplate.accentColor }}
                >
                  {previewTemplate.badge}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {previewTemplate.title}
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
                <CoverLetterTemplate formData={getSampleLetterData(previewTemplate)} />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Format Officiel A4 Réel
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
                    onSelectTemplate(tpl.id, activeLetterType);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
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
