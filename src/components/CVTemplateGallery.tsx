import React, { useState, useMemo } from 'react';
import { TemplateStyle, CVFormData } from '../types';
import { ALL_CV_TEMPLATES, CVTemplateMeta } from '../data/cvTemplatesList';
import { SAMPLE_CV_DATA } from '../data/sampleData';
import { CVTemplate } from './CVTemplate';
import { 
  Sparkles, Search, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, Camera, FileText, Check, X, Maximize2, ZoomIn, ZoomOut
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
  const [modalZoom, setModalZoom] = useState<number>(0.9);

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
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Étape 1 sur 2 : Sélection du Modèle de CV
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                50 Vrais Modèles Rendus en Haute Définition
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
            Galerie Visuelle des Modèles de CV Professionnels
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            Consultez le rendu réel et la typographie de chaque modèle. Cliquez sur <span className="font-bold text-white">« Aperçu Plein Écran »</span> pour inspecter les moindres détails avant de sélectionner votre modèle.
          </p>

          {/* QUICK SUMMARY BAR */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6 text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <strong>30 Modèles Sans Photo</strong> (100% Parsing ATS Garanti)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <strong>20 Modèles Avec Photo</strong> (Cadres, Startups, Médias)
              </span>
            </div>

            <div className="text-indigo-200 font-bold bg-indigo-950/70 px-3 py-1 rounded-xl border border-indigo-800/60">
              {filteredTemplates.length} modèle{filteredTemplates.length > 1 ? 's' : ''} affiché{filteredTemplates.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        
        {/* Search and Photo quick switch */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un modèle (ex: ATS, Exécutif, Tech, Photo, 1...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Photo / No-Photo Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPhotoFilter('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                photoFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({ALL_CV_TEMPLATES.length})
            </button>
            <button
              type="button"
              onClick={() => setPhotoFilter('no_photo')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                photoFilter === 'no_photo'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Sans Photo (30)</span>
            </button>
            <button
              type="button"
              onClick={() => setPhotoFilter('photo')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                photoFilter === 'photo'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Avec Photo (20)</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. REAL RENDERED TEMPLATES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const sampleData = getSampleDataForTemplate(template);

          return (
            <div
              key={template.id}
              className={`group bg-white rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1.5 ${
                isSelected
                  ? 'border-indigo-600 ring-4 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-indigo-400'
              }`}
            >
              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                
                {/* Header Info & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-black text-white shadow-2xs"
                      style={{ backgroundColor: template.accentColor }}
                    >
                      N° {template.number}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {template.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {template.hasPhoto ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 flex items-center gap-1">
                        <Camera className="w-2.5 h-2.5" />
                        <span>Photo</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>100% ATS</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* REAL MINI-RENDER HTML/CSS THUMBNAIL (Scaled down exact A4 preview) */}
                <div 
                  onClick={() => {
                    setFullPreviewTemplate(template);
                    setModalZoom(0.9);
                  }}
                  className="relative h-64 sm:h-72 w-full rounded-2xl bg-slate-100 border border-slate-200/90 overflow-hidden cursor-pointer group-hover:border-indigo-400 transition-all shadow-inner flex items-start justify-center"
                  title="Cliquer pour voir l'aperçu plein écran haute définition"
                >
                  {/* Container with exact A4 aspect ratio scaled down */}
                  <div 
                    className="w-[794px] min-h-[1123px] bg-white origin-top shadow-md pointer-events-none select-none transition-transform duration-300 group-hover:scale-[0.27]"
                    style={{
                      transform: 'scale(0.25)',
                      transformOrigin: 'top center',
                      marginTop: '4px'
                    }}
                  >
                    <CVTemplate
                      formData={sampleData}
                      style={template.id}
                      primaryColor={template.accentColor}
                      isPaid={true}
                    />
                  </div>

                  {/* Gradient Shadow bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/30 to-transparent pointer-events-none" />

                  {/* Hover Overlay with Action Button */}
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <span className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-black shadow-xl flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <Maximize2 className="w-4 h-4 text-indigo-600" />
                      <span>Aperçu Plein Écran</span>
                    </span>
                    <span className="text-[11px] text-white/90 font-medium">
                      Inspecter la mise en page détaillée
                    </span>
                  </div>
                </div>

                {/* Title & Distinctive Signature Details */}
                <div className="pt-1">
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                    <span>{template.label}</span>
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-slate-300"
                      style={{ backgroundColor: template.accentColor }}
                      title="Couleur signature"
                    />
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {template.desc}
                  </p>
                </div>

              </div>

              {/* Primary Selection Button */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id, template.accentColor)}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-900 hover:bg-indigo-600 text-white group-hover:bg-indigo-600'
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

      {/* 4. FULL-SCREEN HIGH-DEFINITION INSPECTION MODAL */}
      {fullPreviewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
            
            {/* Modal Top Sticky Action Bar */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 z-10">
              
              <div className="flex items-center gap-3">
                <span 
                  className="px-2.5 py-1 rounded-md text-xs font-black text-white shadow-xs"
                  style={{ backgroundColor: fullPreviewTemplate.accentColor }}
                >
                  N° {fullPreviewTemplate.number}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    {fullPreviewTemplate.label}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{fullPreviewTemplate.category}</span>
                    <span>•</span>
                    <span className={fullPreviewTemplate.hasPhoto ? 'text-indigo-400' : 'text-emerald-400 font-bold'}>
                      {fullPreviewTemplate.hasPhoto ? 'Avec Portrait Photo' : '100% Parsing ATS Garanti'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zoom Controls & Actions */}
              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                    title="Zoom arrière"
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
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const tpl = fullPreviewTemplate;
                    setFullPreviewTemplate(null);
                    onSelectTemplate(tpl.id, tpl.accentColor);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Choisir ce modèle (1 000 F)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Fermer l'aperçu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            </div>

            {/* Modal Body: Scrollable Canvas Container */}
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
                <CVTemplate
                  formData={getSampleDataForTemplate(fullPreviewTemplate)}
                  style={fullPreviewTemplate.id}
                  primaryColor={fullPreviewTemplate.accentColor}
                  isPaid={true}
                />
              </div>
            </div>

            {/* Modal Bottom Quick Reminder */}
            <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format Standard A4 (Téléchargeable en PDF HD & Word .docx)
                </span>
                <span className="hidden md:inline text-slate-500">
                  {fullPreviewTemplate.desc}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
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
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all"
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
