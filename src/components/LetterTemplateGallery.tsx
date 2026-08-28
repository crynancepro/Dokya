import React, { useState } from 'react';
import { CoverLetterType, CVFormData } from '../types';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Mail, Target, Send, GraduationCap, 
  RotateCcw, UserCheck, Check, X, Maximize2, ZoomIn, ZoomOut
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
    badge: "Compétences transférables",
    desc: "Mettre en avant votre nouvelle trajectoire et vos atouts",
    icon: RotateCcw
  },
  {
    id: 'recommandation' as CoverLetterType,
    title: "Recommandation / Réseau",
    badge: "Parrainage",
    desc: "Mentionner un contact clé ou une recommandation",
    icon: UserCheck
  }
];

export const LetterTemplateGallery: React.FC<LetterTemplateGalleryProps> = ({
  onSelectTemplate,
  selectedStyleId = 'moderne_epuree',
  selectedLetterType = 'spontanee',
  onGoServices
}) => {
  const [activeLetterType, setActiveLetterType] = useState<CoverLetterType>(selectedLetterType);
  const [previewTemplate, setPreviewTemplate] = useState<typeof LETTER_TEMPLATES[0] | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.9);

  // Helper sample letter data
  const getSampleLetterData = (tpl: typeof LETTER_TEMPLATES[0]): CVFormData => ({
    ...SAMPLE_CV_DATA,
    templateStyle: 'moderne',
    themeColor: tpl.accentColor,
    targetCompany: 'ORANGE SÉNÉGAL / SONATEL',
    personalInfo: {
      ...SAMPLE_CV_DATA.personalInfo,
      targetJob: 'Directeur de Projet Digital & Transformation'
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. TOP HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white border border-blue-900/50 shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/30 text-blue-300 border border-blue-400/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Étape 1 sur 2 : Sélection du Modèle de Lettre
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Vrais Modèles Rendus Haute Définition
              </span>
            </div>

            {onGoServices && (
              <button
                type="button"
                onClick={onGoServices}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95 w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux services</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Galerie Visuelle des Lettres de Motivation
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            Consultez le rendu réel et la typographie formelle de chaque modèle. Cliquez sur <span className="font-bold text-white">« Aperçu Plein Écran »</span> pour inspecter la mise en page avant de sélectionner.
          </p>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Normes formelles Sénégal, Afrique & International
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Téléchargement PDF HD & Word (.docx)
              </span>
            </div>

            <div className="text-blue-300 font-bold bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              Tarif : 1 000 FCFA
            </div>
          </div>
        </div>
      </div>

      {/* 2. OBJECTIVE / LETTER TYPE SWITCHER */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Type de Candidature visé :
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {LETTER_TYPES_LIST.map((lt) => {
            const isSelected = activeLetterType === lt.id;
            const Icon = lt.icon;
            return (
              <button
                key={lt.id}
                type="button"
                onClick={() => setActiveLetterType(lt.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {lt.badge}
                  </span>
                </div>
                <div className="text-xs font-black text-slate-900">{lt.title}</div>
                <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{lt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TEMPLATES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {LETTER_TEMPLATES.map((template) => {
          const isSelected = selectedStyleId === template.id;
          const sampleData = getSampleLetterData(template);

          return (
            <div
              key={template.id}
              className={`group bg-white rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1.5 ${
                isSelected
                  ? 'border-blue-600 ring-4 ring-blue-500/20'
                  : 'border-slate-200 hover:border-blue-400'
              }`}
            >
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: template.accentColor }}
                  >
                    Style N° {template.id}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    {template.badge}
                  </span>
                </div>

                {/* REAL MINI-RENDER HTML/CSS THUMBNAIL */}
                <div 
                  onClick={() => {
                    setPreviewTemplate(template);
                    setModalZoom(0.9);
                  }}
                  className="relative h-64 sm:h-72 w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer group-hover:border-blue-400 transition-all shadow-inner flex items-start justify-center"
                  title="Cliquer pour voir l'aperçu plein écran haute définition"
                >
                  <div 
                    className="w-[794px] min-h-[1123px] bg-white origin-top shadow-md pointer-events-none select-none transition-transform duration-300 group-hover:scale-[0.27]"
                    style={{
                      transform: 'scale(0.25)',
                      transformOrigin: 'top center',
                      marginTop: '4px'
                    }}
                  >
                    <CoverLetterTemplate
                      formData={sampleData}
                    />
                  </div>

                  {/* Gradient Shadow bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/30 to-transparent pointer-events-none" />

                  {/* Hover Overlay with Action Button */}
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <span className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-black shadow-xl flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <Maximize2 className="w-4 h-4 text-blue-600" />
                      <span>Aperçu Plein Écran</span>
                    </span>
                    <span className="text-[11px] text-white/90 font-medium">
                      Inspecter la disposition formelle
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {template.desc}
                  </p>
                </div>

              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id, activeLetterType)}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-900 hover:bg-blue-600 text-white group-hover:bg-blue-600'
                  }`}
                >
                  <span>Choisir ce modèle & Rédiger</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* 4. HIGH-DEFINITION FULL-SCREEN PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 z-10">
              <div className="flex items-center gap-3">
                <span 
                  className="px-2.5 py-1 rounded-md text-xs font-black text-white"
                  style={{ backgroundColor: previewTemplate.accentColor }}
                >
                  {previewTemplate.badge}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    {previewTemplate.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modèle de Lettre de Motivation Professionnelle
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-slate-300">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.min(1.3, prev + 0.1))}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewTemplate;
                    setPreviewTemplate(null);
                    onSelectTemplate(tpl.id, activeLetterType);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Choisir ce modèle (1 000 F)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-900/90 flex justify-center items-start scrollbar-thin">
              <div 
                className="bg-white rounded-md shadow-2xl transition-transform duration-200 ease-out origin-top border border-slate-300"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${modalZoom})`,
                  marginBottom: '60px'
                }}
              >
                <CoverLetterTemplate
                  formData={getSampleLetterData(previewTemplate)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard (PDF HD & Word .docx)
                </span>
                <span className="hidden md:inline text-slate-500">
                  {previewTemplate.desc}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
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
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all"
                >
                  Valider la sélection →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

