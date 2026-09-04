import React, { useState } from 'react';
import { CoverLetterType, CVFormData } from '../types';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Mail, Target, Send, GraduationCap, 
  RotateCcw, UserCheck, Check, X, Maximize2, ZoomIn, ZoomOut,
  LayoutGrid, Square
} from 'lucide-react';

interface LetterTemplateGalleryProps {
  onSelectTemplate: (styleId: string, letterType: CoverLetterType) => void;
  selectedStyleId?: string;
  selectedLetterType?: CoverLetterType;
  onGoServices?: () => void;
}

const LETTER_TEMPLATES = [
  {
    id: 'classique_corporate',
    title: '1. Classique Corporate OHADA',
    badge: 'Standard RH',
    desc: 'Format formel et élégant respectant la typologie administrative des grandes entreprises et administrations.',
    accentColor: '#1e293b',
    hasHeaderBanner: false
  },
  {
    id: 'moderne_epuree',
    title: '2. Moderne & Dynamique',
    badge: 'Populaire',
    desc: 'Bannière subtile, typographie contemporaine et accroche percutante pour PME et startups.',
    accentColor: '#4f46e5',
    hasHeaderBanner: true
  },
  {
    id: 'executive_direction',
    title: '3. Exécutive & Direction',
    badge: 'Top Cadres',
    desc: 'Style autoritaire et sobre orienté stratégie, leadership et réalisations chiffrées.',
    accentColor: '#0f172a',
    hasHeaderBanner: true
  },
  {
    id: 'creative_impact',
    title: '4. Créatif & Studio Impact',
    badge: 'Design & Médias',
    desc: 'En-tête stylisé avec lettrine et mise en valeur des compétences clés et motivations.',
    accentColor: '#d97706',
    hasHeaderBanner: true
  },
  {
    id: 'prestige_conseil',
    title: '5. Prestige & Haute Finance',
    badge: 'Luxe / Conseil',
    desc: 'Filet élégant, typographie noble à empattements pour cabinets de conseil et banques.',
    accentColor: '#881337',
    hasHeaderBanner: false
  },
  {
    id: 'minimal_ats',
    title: '6. Minimaliste ATS Pure',
    badge: '100% Parsing',
    desc: 'Structure épurée sans fioritures pour un passage immédiat des filtres automatisés.',
    accentColor: '#334155',
    hasHeaderBanner: false
  }
];

const LETTER_TYPES_LIST = [
  {
    id: 'offre' as CoverLetterType,
    title: "Réponse à une offre",
    badge: "Offre d'emploi",
    desc: "Postuler à une annonce ou un appel à candidatures précis",
    icon: Target
  },
  {
    id: 'spontanee' as CoverLetterType,
    title: "Candidature spontanée",
    badge: "Spontanée",
    desc: "Proposer directement vos compétences à une entreprise ciblée",
    icon: Send
  },
  {
    id: 'stage' as CoverLetterType,
    title: "Stage / Alternance",
    badge: "Étudiant & Stage",
    desc: "Valoriser votre parcours académique, projet d'études et motivation",
    icon: GraduationCap
  },
  {
    id: 'reconversion' as CoverLetterType,
    title: "Reconversion pro",
    badge: "Reconversion",
    desc: "Mettre en avant votre nouvelle trajectoire et vos atouts",
    icon: RotateCcw
  },
  {
    id: 'recommandation' as CoverLetterType,
    title: "Recommandation / Réseau",
    badge: "Cooptation",
    desc: "Citer votre contact référent pour appuyer votre candidature",
    icon: UserCheck
  }
];

export const LetterTemplateGallery: React.FC<LetterTemplateGalleryProps> = ({
  onSelectTemplate,
  selectedStyleId = 'moderne_epuree',
  selectedLetterType = 'offre',
  onGoServices
}) => {
  const [activeLetterType, setActiveLetterType] = useState<CoverLetterType>(selectedLetterType);
  const [previewTemplate, setPreviewTemplate] = useState<typeof LETTER_TEMPLATES[0] | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.85);
  const [mobileGridCols, setMobileGridCols] = useState<1 | 2>(2);

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

  const isMobile2Col = mobileGridCols === 2;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in max-w-7xl mx-auto pb-16 px-1 sm:px-4">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white border border-blue-900/40 shadow-xl p-4 sm:p-7 lg:p-9">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-blue-500/25 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                Lettre de Motivation Pro
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Format Officiel A4
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
              Galerie des Modèles de Lettre
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Sélectionnez un style de mise en page et l'objectif de votre lettre. L'IA rédigera pour vous une lettre percutante et convaincante.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs border-t border-slate-800/60 text-slate-400">
            <div className="flex items-center gap-4 text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Normes formelles Sénégal & International
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Export PDF HD & Word (.docx)
              </span>
            </div>

            <span className="text-blue-300 font-bold bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-800/40">
              1 000 FCFA
            </span>
          </div>
        </div>
      </div>

      {/* 2. OBJECTIVE / LETTER TYPE SWITCHER (DARK SEAMLESS PANEL) */}
      <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
            Type de Candidature :
          </h3>

          {/* Mobile Col Switch */}
          <div className="flex sm:hidden items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMobileGridCols(2)}
              className={`p-1.5 rounded-lg transition-all ${
                mobileGridCols === 2 ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileGridCols(1)}
              className={`p-1.5 rounded-lg transition-all ${
                mobileGridCols === 1 ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {LETTER_TYPES_LIST.map((lt) => {
            const isSelected = activeLetterType === lt.id;
            const Icon = lt.icon;
            return (
              <button
                key={lt.id}
                type="button"
                onClick={() => setActiveLetterType(lt.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/20 text-white shadow-xs'
                    : 'border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                    {lt.badge}
                  </span>
                </div>
                <div className="text-xs font-black text-white truncate">{lt.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TEMPLATES GRID (SEAMLESS CARDS, NO HARSH BORDERS) */}
      <div 
        className={`grid gap-3 sm:gap-5 ${
          isMobile2Col ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {LETTER_TEMPLATES.map((template) => {
          const isSelected = selectedStyleId === template.id;
          const sampleData = getSampleLetterData(template);

          return (
            <div
              key={template.id}
              className={`group relative rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 ${
                isSelected
                  ? 'bg-slate-900 border-2 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>Actif</span>
                </div>
              )}

              <div className="p-2 sm:p-3.5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-1.5">
                  <span 
                    className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: template.accentColor }}
                  >
                    Style {template.id.split('_')[0]}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {template.badge}
                  </span>
                </div>

                {/* THUMBNAIL (NATURAL FLOATING PAPER) */}
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
                    <CoverLetterTemplate formData={sampleData} />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

                  <div className="absolute top-1.5 right-1.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(template);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-slate-300 hover:text-white hover:bg-blue-600 transition-all shadow-md cursor-pointer active:scale-90"
                      title="Agrandir ce modèle"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-0.5 space-y-1">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-blue-400 transition-colors truncate">
                    {template.title}
                  </h3>
                  {(!isMobile2Col || typeof window !== 'undefined' && window.innerWidth >= 640) && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                      {template.desc}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2 sm:p-3 pt-0">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id, activeLetterType)}
                  className={`w-full py-2 sm:py-2.5 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                      : 'bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white'
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

      {/* 4. HIGH-DEFINITION PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
            
            <div className="px-3.5 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 text-white shrink-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span 
                  className="px-2 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-black text-white shrink-0"
                  style={{ backgroundColor: previewTemplate.accentColor }}
                >
                  {previewTemplate.badge}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                    {previewTemplate.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    Modèle de Lettre Formelle Pro
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
                <CoverLetterTemplate
                  formData={getSampleLetterData(previewTemplate)}
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard (1 000 FCFA)
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
                    onSelectTemplate(tpl.id, activeLetterType);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Choisir ce modèle (1 000 F)</span>
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
