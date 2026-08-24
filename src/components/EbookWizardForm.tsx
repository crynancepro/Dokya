import React, { useState } from 'react';
import { EbookData, EbookCoverProposal, EbookBackCoverProposal } from '../types';
import { 
  AVAILABLE_EBOOK_LANGUAGES, AVAILABLE_EBOOK_GENRES, AVAILABLE_EBOOK_TONES,
  EBOOK_PAGE_COUNT_PRESETS,
  buildPollinationsImageUrl, generateContextualEbookProposals
} from '../data/sampleEbookData';
import { generateEbookCoversWithGemini, generateEbookContentWithGemini } from '../lib/geminiService';
import { 
  BookOpen, Sparkles, RefreshCw, Upload, Image as ImageIcon, 
  Check, ArrowRight, ArrowLeft, Layers, PenTool, Layout, 
  Globe, User, Award, FileText, CheckCircle2, ChevronRight,
  HelpCircle, Eye, Trash2, Plus, AlertCircle, Loader2, Palette, Wand2, Hash
} from 'lucide-react';

interface EbookWizardFormProps {
  data: EbookData;
  setData: React.Dispatch<React.SetStateAction<EbookData>>;
  onGoPreview: () => void;
  onGoServices: () => void;
}

export const EbookWizardForm: React.FC<EbookWizardFormProps> = ({
  data,
  setData,
  onGoPreview,
  onGoServices
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(data.currentStep || 1);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(data.currentStep || 1);
  const [activeCoverTab, setActiveCoverTab] = useState<'front' | 'back' | 'spread'>('front');
  
  const [isGeneratingCovers, setIsGeneratingCovers] = useState<boolean>(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState<boolean>(false);
  const [customFrontPrompt, setCustomFrontPrompt] = useState<string>(data.frontCover.customPrompt || '');
  const [customBackPrompt, setCustomBackPrompt] = useState<string>(data.backCover.customPrompt || '');
  const [selectedChapIndex, setSelectedChapIndex] = useState<number>(0);
  const [zoomModal, setZoomModal] = useState<{ type: 'front' | 'back'; url?: string } | null>(null);

  // Synchronize and generate single unique high quality cover and back closure
  const handleGenerateCoversFromTitle = async (customTitle?: string, customSubtitle?: string) => {
    const titleToUse = (customTitle !== undefined ? customTitle : data.title).trim() || 'Livre Bestseller';
    const subtitleToUse = (customSubtitle !== undefined ? customSubtitle : data.subtitle).trim();

    setIsGeneratingCovers(true);
    try {
      // 1. Try with Gemini AI service
      const res = await generateEbookCoversWithGemini({
        title: titleToUse,
        subtitle: subtitleToUse,
        author: data.author,
        genre: data.genre,
        language: data.language,
        targetAudience: data.targetAudience,
        tone: data.tone,
        summaryOrPrompt: data.summaryOrPrompt,
        customPrompt: activeCoverTab === 'front' ? customFrontPrompt : customBackPrompt
      });

      if (res.success && res.frontProposals?.length) {
        setData(prev => ({
          ...prev,
          title: customTitle !== undefined ? customTitle : prev.title,
          subtitle: customSubtitle !== undefined ? customSubtitle : prev.subtitle,
          frontCover: {
            ...prev.frontCover,
            proposals: res.frontProposals as any,
            mode: 'proposal',
            selectedIndex: 0
          },
          backCover: {
            ...prev.backCover,
            proposals: res.backProposals as any,
            mode: 'proposal',
            selectedIndex: 0
          }
        }));
      } else {
        // Fallback to contextual generation
        const proposals = generateContextualEbookProposals({
          title: titleToUse,
          subtitle: subtitleToUse,
          author: data.author,
          genre: data.genre,
          language: data.language,
          targetAudience: data.targetAudience,
          summaryOrPrompt: data.summaryOrPrompt
        });

        setData(prev => ({
          ...prev,
          title: customTitle !== undefined ? customTitle : prev.title,
          subtitle: customSubtitle !== undefined ? customSubtitle : prev.subtitle,
          frontCover: {
            ...prev.frontCover,
            proposals: proposals.frontProposals,
            mode: 'proposal',
            selectedIndex: 0
          },
          backCover: {
            ...prev.backCover,
            proposals: proposals.backProposals,
            mode: 'proposal',
            selectedIndex: 0
          }
        }));
      }
    } catch (err) {
      console.error('Erreur génération couvertures :', err);
    } finally {
      setIsGeneratingCovers(false);
    }
  };

  // Handle Front Cover Upload
  const handleFrontImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setData(prev => ({
          ...prev,
          frontCover: {
            ...prev.frontCover,
            customImageUrl: result,
            mode: 'uploaded'
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Back Cover Upload
  const handleBackImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setData(prev => ({
          ...prev,
          backCover: {
            ...prev.backCover,
            customImageUrl: result,
            mode: 'uploaded'
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Regenerate Covers
  const handleRegenerateCovers = async () => {
    setIsGeneratingCovers(true);
    try {
      const res = await generateEbookCoversWithGemini({
        title: data.title,
        subtitle: data.subtitle,
        author: data.author,
        genre: data.genre,
        language: data.language,
        targetAudience: data.targetAudience,
        tone: data.tone,
        summaryOrPrompt: data.summaryOrPrompt,
        customPrompt: activeCoverTab === 'front' ? customFrontPrompt : customBackPrompt
      });

      if (res.success && res.frontProposals?.length) {
        setData(prev => ({
          ...prev,
          frontCover: {
            ...prev.frontCover,
            proposals: res.frontProposals as any,
            mode: 'proposal',
            selectedIndex: 0
          },
          backCover: {
            ...prev.backCover,
            proposals: res.backProposals as any,
            mode: 'proposal',
            selectedIndex: 0
          }
        }));
      } else {
        const proposals = generateContextualEbookProposals({
          title: data.title,
          subtitle: data.subtitle,
          author: data.author,
          genre: data.genre,
          language: data.language,
          targetAudience: data.targetAudience,
          summaryOrPrompt: data.summaryOrPrompt
        });

        setData(prev => ({
          ...prev,
          frontCover: {
            ...prev.frontCover,
            proposals: proposals.frontProposals,
            mode: 'proposal',
            selectedIndex: 0
          },
          backCover: {
            ...prev.backCover,
            proposals: proposals.backProposals,
            mode: 'proposal',
            selectedIndex: 0
          }
        }));
      }
    } catch (err) {
      console.error('Erreur régénération couvertures :', err);
    } finally {
      setIsGeneratingCovers(false);
    }
  };

  // Generate Direct AI Artwork on current selected cover proposal
  const handleGenerateDirectAiArtwork = (target: 'front' | 'back') => {
    const promptText = target === 'front' ? (customFrontPrompt || data.title) : (customBackPrompt || data.title);
    const newSeed = Math.floor(1000 + Math.random() * 90000);
    const generatedUrl = buildPollinationsImageUrl(promptText, newSeed);

    if (target === 'front') {
      const activeIdx = data.frontCover.selectedIndex ?? 0;
      const updatedProposals = [...(data.frontCover.proposals || [])];
      if (updatedProposals[activeIdx]) {
        updatedProposals[activeIdx] = {
          ...updatedProposals[activeIdx],
          artImageUrl: generatedUrl,
          imagePrompt: promptText
        };
      }
      setData(prev => ({
        ...prev,
        frontCover: {
          ...prev.frontCover,
          proposals: updatedProposals,
          mode: 'proposal'
        }
      }));
    } else {
      const activeIdx = data.backCover.selectedIndex ?? 0;
      const updatedProposals = [...(data.backCover.proposals || [])];
      if (updatedProposals[activeIdx]) {
        updatedProposals[activeIdx] = {
          ...updatedProposals[activeIdx],
          artImageUrl: generatedUrl,
          imagePrompt: promptText
        };
      }
      setData(prev => ({
        ...prev,
        backCover: {
          ...prev.backCover,
          proposals: updatedProposals,
          mode: 'proposal'
        }
      }));
    }
  };

  // Generate Ebook Chapters and TOC with Gemini
  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    try {
      const res = await generateEbookContentWithGemini({
        title: data.title,
        subtitle: data.subtitle,
        author: data.author,
        genre: data.genre,
        language: data.language,
        targetAudience: data.targetAudience,
        tone: data.tone,
        summaryOrPrompt: data.summaryOrPrompt,
        chapterCount: data.chapterCount || 5,
        targetPageCount: data.targetPageCount || 10
      });

      if (res.success && res.chapters?.length) {
        setData(prev => ({
          ...prev,
          tableOfContents: res.tableOfContents as any,
          chapters: res.chapters as any
        }));
        setSelectedChapIndex(0);
      }
    } catch (err) {
      console.error('Erreur génération chapitres :', err);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Transition: Step 1 -> Step 2
  const handleValidateStep1 = () => {
    if (!data.title.trim()) {
      setData(prev => ({ ...prev, title: "L'Art de l'Excellence & du Succès" }));
    }
    // Ensure covers are tailored to the current title
    if (!data.frontCover.proposals?.length || !data.backCover.proposals?.length) {
      handleGenerateCoversFromTitle();
    }
    setMaxCompletedStep(prev => Math.max(prev, 2));
    setActiveStep(2);
    setData(prev => ({ ...prev, currentStep: 2 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Transition: Step 2 -> Step 3
  const handleValidateStep2 = () => {
    setMaxCompletedStep(prev => Math.max(prev, 3));
    setActiveStep(3);
    setData(prev => ({ ...prev, currentStep: 3 }));
    // Auto-generate content if chapters are empty
    if (!data.chapters?.length) {
      handleGenerateContent();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Current Front and Back proposals
  const frontProposal = data.frontCover.proposals?.[data.frontCover.selectedIndex || 0] || data.frontCover.proposals?.[0];
  const backProposal = data.backCover.proposals?.[data.backCover.selectedIndex || 0] || data.backCover.proposals?.[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SERVICE BANNER                                            */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-900 border border-indigo-200">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Générateur d'Ebook & Livre Numérique</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              Format Auto-Édition 6×9 po
            </span>
            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              1 500 FCFA
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            Création Guidée de Livre Numérique Professionnel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Suivez les 3 étapes pour configurer, designer vos couvertures et rédiger l'ouvrage complet avec l'IA.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onGoServices}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
          >
            ← Tous les services
          </button>

          <button
            type="button"
            onClick={onGoPreview}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>Voir l'Aperçu Final</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRESS STEPPER BAR (STRICT & CLEAN NAVIGATION)                       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        {/* Visual Progress Bar Line */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ 
              width: activeStep === 1 ? '33.3%' : activeStep === 2 ? '66.6%' : '100%' 
            }}
          />
        </div>

        {/* 3 Steps Interactive Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* STEP 1 TAB */}
          <button
            type="button"
            onClick={() => {
              setActiveStep(1);
              setData(prev => ({ ...prev, currentStep: 1 }));
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 text-left ${
              activeStep === 1 
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-2 ring-indigo-200' 
                : maxCompletedStep >= 1
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
              activeStep === 1 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : maxCompletedStep > 1 
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
            }`}>
              {maxCompletedStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${activeStep === 1 ? 'text-indigo-600' : 'text-slate-500'}`}>
                Étape 1
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                1. Informations Générales
              </span>
            </div>
          </button>

          {/* STEP 2 TAB */}
          <button
            type="button"
            onClick={() => {
              if (maxCompletedStep >= 2) {
                setActiveStep(2);
                setData(prev => ({ ...prev, currentStep: 2 }));
              }
            }}
            disabled={maxCompletedStep < 2}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
              activeStep === 2 
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-2 ring-indigo-200' 
                : maxCompletedStep >= 2
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
              activeStep === 2 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : maxCompletedStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}>
              {maxCompletedStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${activeStep === 2 ? 'text-indigo-600' : 'text-slate-500'}`}>
                Étape 2
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                2. Design des Couvertures
              </span>
            </div>
          </button>

          {/* STEP 3 TAB */}
          <button
            type="button"
            onClick={() => {
              if (maxCompletedStep >= 3) {
                setActiveStep(3);
                setData(prev => ({ ...prev, currentStep: 3 }));
              }
            }}
            disabled={maxCompletedStep < 3}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
              activeStep === 3 
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-2 ring-indigo-200' 
                : maxCompletedStep >= 3
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
              activeStep === 3 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : maxCompletedStep >= 3
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${activeStep === 3 ? 'text-indigo-600' : 'text-slate-500'}`}>
                Étape 3
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                3. Rédaction & Export
              </span>
            </div>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP CONTENT VIEWS (ONLY ONE VIEW ACTIVE AT A TIME)                    */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW ÉTAPE 1 : CONFIGURATION GÉNÉRALE                                     */}
      {/* ------------------------------------------------------------------------- */}
      {activeStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
          
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase tracking-wider">
                Étape 1 sur 3
              </span>
              <span className="text-xs text-slate-500 font-bold">Paramétrage Fondamental</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>Configuration Générale du Livre</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez la langue, le sujet, le titre, l'auteur et le volume exact de pages souhaité.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Language Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Langue de rédaction <span className="text-rose-500">*</span>
              </label>
              <select
                value={data.language}
                onChange={(e) => setData({ ...data, language: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {AVAILABLE_EBOOK_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.label.split(' ')[0]}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Genre / Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Genre / Thématique <span className="text-rose-500">*</span>
              </label>
              <select
                value={data.genre}
                onChange={(e) => setData({ ...data, genre: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {AVAILABLE_EBOOK_GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Tone of Voice */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Style & Tonalité <span className="text-rose-500">*</span>
              </label>
              <select
                value={data.tone}
                onChange={(e) => setData({ ...data, tone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {AVAILABLE_EBOOK_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Main Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Titre Principal du Livre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setData(prev => ({
                    ...prev,
                    title: newTitle,
                    frontCover: {
                      ...prev.frontCover,
                      proposals: prev.frontCover.proposals?.map(p => ({ ...p, title: newTitle }))
                    }
                  }));
                }}
                placeholder="ex: L'Art de l'Investissement Digital en Afrique"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 5. Author Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nom de l'Auteur <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={data.author}
                onChange={(e) => setData({ ...data, author: e.target.value })}
                placeholder="ex: Dr. Cheikh Tidiane Ndiaye"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 6. Subtitle */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sous-titre (Optionnel mais recommandé)
              </label>
              <input
                type="text"
                value={data.subtitle}
                onChange={(e) => {
                  const newSub = e.target.value;
                  setData(prev => ({
                    ...prev,
                    subtitle: newSub,
                    frontCover: {
                      ...prev.frontCover,
                      proposals: prev.frontCover.proposals?.map(p => ({ ...p, subtitle: newSub }))
                    }
                  }));
                }}
                placeholder="ex: Guide Pratique pour Bâtir sa Liberté Financière"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 7. Chapter Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre de Chapitres
              </label>
              <select
                value={data.chapterCount}
                onChange={(e) => setData({ ...data, chapterCount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={3}>3 Chapitres (Synthétique & Rapide)</option>
                <option value={5}>5 Chapitres (Standard Équilibré - Recommandé)</option>
                <option value={7}>7 Chapitres (Complet & Détaillé)</option>
                <option value={10}>10 Chapitres (Manuel de Référence)</option>
              </select>
            </div>

            {/* 8. TARGET PAGE COUNT */}
            <div className="sm:col-span-3 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border-2 border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                    <Hash className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>Volume & Nombre de Pages Exactes</span>
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Normes KDP
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Définissez le volume total souhaité pour votre livre (incluant couverture, mentions, sommaire et fermeture).
                    </p>
                  </div>
                </div>

                {/* Number Stepper / Direct Input */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500">Total :</span>
                  <input
                    type="number"
                    min={4}
                    max={250}
                    value={data.targetPageCount || 10}
                    onChange={(e) => {
                      const val = Math.max(4, Math.min(250, Number(e.target.value) || 4));
                      setData({ ...data, targetPageCount: val });
                    }}
                    className="w-16 text-center text-sm font-black text-indigo-700 bg-indigo-50/50 rounded-lg py-1 border border-indigo-300 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <span className="text-xs font-black text-slate-800">Pages</span>
                </div>
              </div>

              {/* Quick Presets Buttons */}
              <div>
                <span className="block text-[11px] font-extrabold text-slate-600 mb-2">
                  Sélection rapide des volumes recommandés :
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {EBOOK_PAGE_COUNT_PRESETS.map((preset) => {
                    const isSelected = (data.targetPageCount || 10) === preset.count;
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => setData({ ...data, targetPageCount: preset.count })}
                        className={`p-2.5 rounded-xl border-2 transition-all text-left flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                            : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-xs">{preset.count} Pages</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {preset.badge}
                          </span>
                        </div>
                        <span className={`text-[10px] leading-tight line-clamp-1 ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-Time Exact Page Breakdown Banner */}
              {(() => {
                const total = Math.max(4, data.targetPageCount || 10);
                const interior = Math.max(1, total - 3);
                return (
                  <div className="bg-white/90 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="font-bold">Structure exacte ({total} pages) :</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        P.1 Couverture Avant
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        P.2 Mentions Légales
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        P.3 Sommaire
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-black">
                        P.4 à P.{total - 1} ({interior} pages intérieures)
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        P.{total} 4e de Couverture
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 9. Brief / Synopsis / Prompt */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sujet principal / Idées clés ou prompt pour l'IA
              </label>
              <textarea
                rows={3}
                value={data.summaryOrPrompt}
                onChange={(e) => setData({ ...data, summaryOrPrompt: e.target.value })}
                placeholder="Décrivez en quelques phrases les points essentiels, études de cas ou concepts clés que le livre doit aborder..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>

          {/* Action Button: Validate Step 1 */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleValidateStep1}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
            >
              <span>Valider et passer au design de couverture</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW ÉTAPE 2 : DESIGN DES COUVERTURES (AVANT & FERMETURE)                 */}
      {/* ------------------------------------------------------------------------- */}
      {activeStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
          
          {/* Header & Sub-Navigation Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase tracking-wider">
                  Étape 2 sur 3
                </span>
                <span className="text-xs text-slate-500 font-bold">Design Visuel 6×9 po</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                <span>Design des Couvertures (Avant et Fermeture)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personnalisez la première de couverture et la quatrième de couverture (dos du livre).
              </p>
            </div>

            {/* 2 Sub-Tabs: [1. Couverture Avant] | [2. Quatrième de Couverture] | [Vue Dépliée] */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveCoverTab('front')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCoverTab === 'front'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Couverture Avant</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCoverTab('back')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCoverTab === 'back'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Quatrième de Couverture</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCoverTab('spread')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCoverTab === 'spread'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>📖 Vue Jaquette</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1 : COUVERTURE AVANT (FRONT COVER) */}
          {activeCoverTab === 'front' && (
            <div className="space-y-6">
              
              {/* Unique Front Cover Render */}
              <div className="flex flex-col items-center justify-center py-2">
                {frontProposal ? (
                  <div className="w-full max-w-sm sm:max-w-md mx-auto">
                    <div
                      className="group relative rounded-3xl cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden bg-slate-950 aspect-[1/1.5] shadow-2xl ring-2 ring-indigo-500/50 hover:shadow-indigo-500/20"
                    >
                      {/* Background Image Layer */}
                      {(data.frontCover.mode === 'uploaded' && data.frontCover.customImageUrl) ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${data.frontCover.customImageUrl})` }}
                        />
                      ) : frontProposal.artImageUrl ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url(${frontProposal.artImageUrl})` }}
                        />
                      ) : null}

                      {/* Gradient Overlay for Guaranteed Contrast */}
                      <div className={`absolute inset-0 bg-gradient-to-t ${frontProposal.bgGradient || 'from-slate-950 via-slate-950/75 to-slate-900/80'} ${frontProposal.artImageUrl || data.frontCover.customImageUrl ? 'opacity-85' : 'opacity-100'} pointer-events-none z-0`} />

                      {/* Realistic 3D Spine Highlight on Left Edge */}
                      <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-5 bg-gradient-to-r from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                      <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-[1px] bg-white/25 pointer-events-none z-20" />

                      {/* Gold Decorative Inner Frame */}
                      <div className="absolute inset-3 sm:inset-4 border border-amber-400/35 rounded-2xl pointer-events-none z-10" />

                      {/* Top Content: Genre Badge & Art Style */}
                      <div className="relative z-10 p-5 pb-0 flex flex-col gap-2 text-white">
                        <div className="flex items-center justify-between">
                          <span 
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-400/40 bg-black/75 shadow-xs backdrop-blur-xs text-amber-300 flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{frontProposal.artStyleLabel || 'Design Unique'}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setZoomModal({ type: 'front', url: (data.frontCover.mode === 'uploaded' && data.frontCover.customImageUrl) ? data.frontCover.customImageUrl : (frontProposal.artImageUrl || '') })}
                              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/20 transition-all text-xs flex items-center gap-1"
                              title="Agrandir en HD"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden sm:inline">Zoom HD</span>
                            </button>

                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white flex items-center gap-1 shadow-md font-black text-[10px] uppercase tracking-wider">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Actif</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-amber-300/90 font-bold drop-shadow-xs">
                          <span>{frontProposal.genreBadge || data.genre || 'Édition Premium'}</span>
                          <span className="text-[9px] text-slate-300">{frontProposal.paletteName}</span>
                        </div>
                      </div>

                      {/* Center: Real Book Typography (Title + Subtitle) */}
                      <div className="relative z-10 px-6 py-4 text-center my-auto space-y-2.5">
                        <div className="inline-block px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-xs border border-white/15 w-full shadow-lg">
                          <h3 
                            className="text-base sm:text-lg font-black leading-tight line-clamp-3 drop-shadow-md text-white"
                            style={{ color: frontProposal.textColor || '#ffffff' }}
                          >
                            {data.title || frontProposal.title}
                          </h3>
                          
                          <div className="w-12 h-0.5 bg-amber-400 mx-auto my-2 rounded-full opacity-80" />

                          <p 
                            className="text-xs font-medium line-clamp-2 leading-tight text-slate-200 drop-shadow-xs"
                            style={{ color: frontProposal.subtitleColor || '#e2e8f0' }}
                          >
                            {data.subtitle || frontProposal.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Footer: Author & Publishing Seal */}
                      <div className="relative z-10 p-5 pt-2 text-white flex flex-col gap-2">
                        <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                            <User className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="font-bold truncate drop-shadow-xs text-white">
                              {data.author || frontProposal.author}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] bg-black/60 px-2 py-0.5 rounded text-amber-300 border border-amber-400/20">
                            Dokya AI • 6×9
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 3 Actions: Regenerate / Custom Prompt / Upload Image */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Regenerate Action */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. Régénérer un design</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Génère un nouveau visuel adapté automatiquement au sujet du livre.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCovers}
                    disabled={isGeneratingCovers}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCovers ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingCovers ? 'Génération...' : '🔄 Nouveau Design IA'}</span>
                  </button>
                </div>

                {/* 2. Custom Prompt Input */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Prompt visuel personnalisé</span>
                    </label>
                    <input
                      type="text"
                      value={customFrontPrompt}
                      onChange={(e) => setCustomFrontPrompt(e.target.value)}
                      placeholder="ex: Montagne dorée au lever du soleil..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateDirectAiArtwork('front')}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Générer le visuel</span>
                  </button>
                </div>

                {/* 3. Image Upload */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>3. Importer une image</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Importez votre propre fichier (JPG, PNG) depuis votre appareil.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="truncate">{data.frontCover.mode === 'uploaded' ? '✓ Image importée' : 'Choisir une image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrontImageUpload}
                        className="hidden"
                      />
                    </label>

                    {data.frontCover.mode === 'uploaded' && data.frontCover.customImageUrl && (
                      <button
                        type="button"
                        onClick={() => setData(prev => ({ ...prev, frontCover: { ...prev.frontCover, mode: 'proposal', customImageUrl: '' } }))}
                        className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer"
                        title="Supprimer l'image importée"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SUB-TAB 2 : QUATRIÈME DE COUVERTURE (BACK COVER) */}
          {activeCoverTab === 'back' && (
            <div className="space-y-6">
              
              {/* Unique Back Cover Render */}
              <div className="flex flex-col items-center justify-center py-2">
                {backProposal ? (
                  <div className="w-full max-w-sm sm:max-w-md mx-auto">
                    <div
                      className="group relative rounded-3xl p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between min-h-[420px] overflow-hidden bg-slate-950 shadow-2xl ring-2 ring-indigo-500/50"
                    >
                      {/* Background Image Layer */}
                      {(data.backCover.mode === 'uploaded' && data.backCover.customImageUrl) ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${data.backCover.customImageUrl})` }}
                        />
                      ) : backProposal.artImageUrl ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url(${backProposal.artImageUrl})` }}
                        />
                      ) : null}

                      {/* Dark gradient layer */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${backProposal.bgGradient || 'from-slate-950 via-slate-900 to-black'} ${backProposal.artImageUrl || data.backCover.customImageUrl ? 'opacity-90' : 'opacity-100'} pointer-events-none z-0`} />

                      {/* Realistic 3D Spine Highlight on RIGHT Edge */}
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                      <div className="absolute right-4 top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none z-20" />

                      {/* Decorative Frame */}
                      <div className="absolute inset-3 sm:inset-4 border border-white/15 rounded-2xl pointer-events-none z-10" />

                      {/* Top Bar: Proposal Badge + Zoom */}
                      <div className="relative z-10 flex items-center justify-between text-white mb-3">
                        <span 
                          className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-400/40 bg-black/75 shadow-xs backdrop-blur-xs text-amber-300 flex items-center gap-1.5"
                        >
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{backProposal.artStyleLabel || 'Fermeture Pro'}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setZoomModal({ type: 'back', url: (data.backCover.mode === 'uploaded' && data.backCover.customImageUrl) ? data.backCover.customImageUrl : (backProposal.artImageUrl || '') })}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/20 transition-all text-xs flex items-center gap-1"
                            title="Agrandir en HD"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">Zoom HD</span>
                          </button>

                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white flex items-center gap-1 shadow-md font-black text-[10px] uppercase tracking-wider">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Actif</span>
                          </span>
                        </div>
                      </div>

                      {/* Synopsis Box with Rich Contrast */}
                      <div className="relative z-10 space-y-3.5 text-white my-auto">
                        <div className="p-4 rounded-xl bg-black/60 border border-white/20 backdrop-blur-xs space-y-2 shadow-md">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>RÉSUMÉ OFFICIEL DU LIVRE</span>
                          </span>
                          <p className="text-xs leading-relaxed text-slate-100 line-clamp-4 drop-shadow-xs font-normal">
                            {backProposal.synopsis}
                          </p>
                        </div>

                        {/* Key Takeaways */}
                        {backProposal.keyTakeaways && backProposal.keyTakeaways.length > 0 && (
                          <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/10 backdrop-blur-xs">
                            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                              Ce que vous allez apprendre :
                            </span>
                            {backProposal.keyTakeaways.slice(0, 3).map((pt, pIdx) => (
                              <div key={pIdx} className="text-[11px] text-slate-200 flex items-center gap-1.5 drop-shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{pt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Bar: Barcode, Quote & ISBN */}
                      <div className="relative z-10 mt-3 pt-3 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-300">
                        
                        {/* Quote */}
                        <div className="italic truncate max-w-[200px] text-amber-200/90 text-[11px]">
                          "{backProposal.quoteOrCallToAction || 'Le savoir qui transforme votre avenir.'}"
                        </div>

                        {/* Realistic EAN-13 Barcode */}
                        <div className="flex items-center gap-2 bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-md shrink-0 border border-slate-200">
                          <div className="flex items-end gap-[1.5px] h-6">
                            <div className="w-[1.5px] h-6 bg-black" />
                            <div className="w-[1px] h-6 bg-black" />
                            <div className="w-[2px] h-6 bg-black" />
                            <div className="w-[1px] h-6 bg-black" />
                            <div className="w-[3px] h-6 bg-black" />
                            <div className="w-[1px] h-6 bg-black" />
                            <div className="w-[2px] h-6 bg-black" />
                            <div className="w-[1px] h-6 bg-black" />
                            <div className="w-[1.5px] h-6 bg-black" />
                          </div>

                          <div className="flex flex-col text-[8px] font-mono leading-none">
                            <span className="font-bold">{backProposal.isbnNumber || '978-2-84000-01-9'}</span>
                            <span className="text-[7px] text-slate-500 font-bold mt-0.5">PRIX : 1 500 FCFA</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 3 Actions: Regenerate / Custom Prompt / Upload Image */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Regenerate Action */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. Régénérer le pitch</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Génère un nouveau résumé et des points d'apprentissage adaptés.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCovers}
                    disabled={isGeneratingCovers}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCovers ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingCovers ? 'Génération...' : '🔄 Nouveau Résumé IA'}</span>
                  </button>
                </div>

                {/* 2. Custom Prompt Input */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Prompt / Ambiance personnalisée</span>
                    </label>
                    <input
                      type="text"
                      value={customBackPrompt}
                      onChange={(e) => setCustomBackPrompt(e.target.value)}
                      placeholder="ex: Accentuer l'aspect pratique et les résultats concrets..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateDirectAiArtwork('back')}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Actualiser le visuel</span>
                  </button>
                </div>

                {/* 3. Image Upload */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>3. Importer un arrière-plan</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Téléversez une image de fond personnalisée pour la 4e de couverture.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="truncate">{data.backCover.mode === 'uploaded' ? '✓ Image arrière importée' : 'Choisir une image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackImageUpload}
                        className="hidden"
                      />
                    </label>

                    {data.backCover.mode === 'uploaded' && data.backCover.customImageUrl && (
                      <button
                        type="button"
                        onClick={() => setData(prev => ({ ...prev, backCover: { ...prev.backCover, mode: 'proposal', customImageUrl: '' } }))}
                        className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer"
                        title="Supprimer l'image importée"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SUB-TAB 3 : VUE JAQUETTE DÉPLIÉE (SPREAD VIEW) */}
          {activeCoverTab === 'spread' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Vue Jaquette Complète Dépliée (Amazon KDP & Imprimeur)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Voici l'apparence physique continue de votre livre : Quatrième de couverture (gauche) + Tranche de reliure (centre) + Première de couverture (droite).
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-black/60 px-2.5 py-1 rounded-lg text-emerald-400 border border-emerald-500/30 shrink-0">
                  ✓ Format d'Impression KDP 6×9 Prêt
                </span>
              </div>

              {/* Spread Layout Box */}
              <div className="flex flex-col md:flex-row items-stretch justify-center gap-0 max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-2xl bg-black">
                
                {/* 1. Back Cover (Left Side) */}
                <div className="flex-1 p-5 bg-slate-950 flex flex-col justify-between min-h-[360px] relative border-r border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-95 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-black/80 to-transparent pointer-events-none" />
                  <div className="absolute inset-2 border border-white/10 rounded-xl pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider bg-black/60 px-2 py-0.5 rounded border border-amber-400/30 inline-block">
                      Quatrième de Couverture (Dos)
                    </span>
                    <h4 className="text-xs font-black text-white line-clamp-1">{data.title}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300 line-clamp-4">
                      {backProposal?.synopsis || "Ce guide complet offre des clés concrètes pour maîtriser votre sujet pas à pas avec des méthodologies éprouvées et applicables immédiatement."}
                    </p>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                    <span className="italic truncate max-w-[130px]">{data.author}</span>
                    <span className="font-mono text-amber-400 font-bold bg-black/60 px-1.5 py-0.5 rounded">
                      ISBN: 978-2-84000-01
                    </span>
                  </div>
                </div>

                {/* 2. Central Book Spine (Tranche de Reliure) */}
                <div className="w-full md:w-12 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-y md:border-y-0 md:border-x border-amber-400/40 p-2 flex md:flex-col items-center justify-between text-center relative shrink-0">
                  <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest hidden md:inline">
                    6×9
                  </span>
                  <div className="my-auto md:[writing-mode:vertical-rl] md:rotate-180 text-center font-black text-xs text-white tracking-wider truncate max-w-[200px] md:max-h-[220px] drop-shadow-xs">
                    {data.title} — {data.author}
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 hidden md:inline">
                    DOKYA
                  </span>
                </div>

                {/* 3. Front Cover (Right Side) */}
                <div className="flex-1 p-5 bg-slate-950 flex flex-col justify-between min-h-[360px] relative">
                  {frontProposal?.artImageUrl && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40"
                      style={{ backgroundImage: `url(${frontProposal.artImageUrl})` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90 pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/80 to-transparent pointer-events-none" />
                  <div className="absolute inset-2 border border-amber-400/30 rounded-xl pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider bg-black/60 px-2 py-0.5 rounded border border-amber-400/30">
                      Première de Couverture
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">{frontProposal?.genreBadge || 'Bestseller'}</span>
                  </div>

                  <div className="relative z-10 my-auto text-center space-y-2 py-4">
                    <h3 className="text-sm font-black text-white leading-snug drop-shadow-md">
                      {data.title}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium leading-tight">
                      {data.subtitle}
                    </p>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-300">
                    <span className="font-black text-white">{data.author}</span>
                    <span className="text-amber-400 font-bold">Dokya Éditions</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Action Buttons: Back to Step 1 or Validate Step 2 */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Revenir à la configuration</span>
            </button>

            <button
              type="button"
              onClick={handleValidateStep2}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
            >
              <span>Valider le design et générer le livre</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW ÉTAPE 3 : RÉDACTION DU CONTENU & EXPORT FINAL                        */}
      {/* ------------------------------------------------------------------------- */}
      {activeStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
          
          {/* Header & AI Write Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase tracking-wider">
                  Étape 3 sur 3
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                  🎯 Calibrage : {data.targetPageCount || 10} Pages Exactes
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Table des Matières & Rédaction des Chapitres</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rédigé intégralement en <span className="font-bold text-indigo-600">{data.language || 'Français'}</span> selon les normes d'auto-édition KDP 6×9 ({Math.max(1, (data.targetPageCount || 10) - 3)} pages intérieures).
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={isGeneratingContent}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 transition-all active:scale-95 shrink-0"
            >
              {isGeneratingContent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Rédaction IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Rédiger tout l'Ebook avec l'IA</span>
                </>
              )}
            </button>
          </div>

          {/* Chapters Manager & Live Content Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Chapter List (Tabs) */}
            <div className="space-y-2 lg:border-r lg:border-slate-100 lg:pr-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Sommaire ({data.chapters?.length || 0} chapitres)
                </span>
                
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = (data.chapters?.length || 0) + 1;
                    const newChap = {
                      id: `chap-${Date.now()}`,
                      chapterNumber: nextNum,
                      title: `Chapitre ${nextNum} : Nouveau Thème`,
                      subtitle: "Sous-titre explicatif",
                      readingTimeMinutes: 7,
                      keyTakeaways: ["Point clé 1", "Point clé 2"],
                      content: `## ${nextNum}.1 Introduction\n\nContenu du nouveau chapitre.\n\n> *« Citation inspirante. »*`
                    };
                    const newTOC = {
                      id: `toc-${Date.now()}`,
                      chapterNumber: nextNum,
                      title: newChap.title,
                      summary: newChap.subtitle
                    };
                    setData(prev => ({
                      ...prev,
                      tableOfContents: [...prev.tableOfContents, newTOC],
                      chapters: [...prev.chapters, newChap]
                    }));
                    setSelectedChapIndex((data.chapters?.length || 0));
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {data.chapters?.map((chap, idx) => (
                  <button
                    key={chap.id || idx}
                    type="button"
                    onClick={() => setSelectedChapIndex(idx)}
                    className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 ${
                      selectedChapIndex === idx 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate max-w-[85%]">
                      <span className={`text-[10px] font-black uppercase block ${selectedChapIndex === idx ? 'text-indigo-200' : 'text-indigo-600'}`}>
                        Chapitre {chap.chapterNumber || (idx + 1)}
                      </span>
                      <span className="text-xs font-bold truncate block">
                        {chap.title}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${selectedChapIndex === idx ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Selected Chapter Editor */}
            <div className="lg:col-span-2 space-y-4">
              {data.chapters && data.chapters[selectedChapIndex] ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-indigo-600">
                      Édition du Chapitre {data.chapters[selectedChapIndex].chapterNumber || (selectedChapIndex + 1)}
                    </span>

                    {data.chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = data.chapters.filter((_, i) => i !== selectedChapIndex);
                          const updatedTOC = data.tableOfContents.filter((_, i) => i !== selectedChapIndex);
                          setData(prev => ({ ...prev, chapters: updated, tableOfContents: updatedTOC }));
                          setSelectedChapIndex(Math.max(0, selectedChapIndex - 1));
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Titre du Chapitre</label>
                    <input
                      type="text"
                      value={data.chapters[selectedChapIndex].title}
                      onChange={(e) => {
                        const updated = [...data.chapters];
                        updated[selectedChapIndex].title = e.target.value;
                        const updatedTOC = [...data.tableOfContents];
                        if (updatedTOC[selectedChapIndex]) {
                          updatedTOC[selectedChapIndex].title = e.target.value;
                        }
                        setData(prev => ({ ...prev, chapters: updated, tableOfContents: updatedTOC }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Sous-titre / Thème</label>
                    <input
                      type="text"
                      value={data.chapters[selectedChapIndex].subtitle || ''}
                      onChange={(e) => {
                        const updated = [...data.chapters];
                        updated[selectedChapIndex].subtitle = e.target.value;
                        const updatedTOC = [...data.tableOfContents];
                        if (updatedTOC[selectedChapIndex]) {
                          updatedTOC[selectedChapIndex].summary = e.target.value;
                        }
                        setData(prev => ({ ...prev, chapters: updated, tableOfContents: updatedTOC }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Content Markdown Area */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {"Contenu Rédactionnel (Titres ##, listes -, citations >)"}
                    </label>
                    <textarea
                      rows={12}
                      value={data.chapters[selectedChapIndex].content}
                      onChange={(e) => {
                        const updated = [...data.chapters];
                        updated[selectedChapIndex].content = e.target.value;
                        setData(prev => ({ ...prev, chapters: updated }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-mono leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  Aucun chapitre sélectionné. Cliquez sur "Rédiger tout l'Ebook avec l'IA" ci-dessus.
                </div>
              )}
            </div>

          </div>

          {/* Bottom Action: Direct to Final Dedicated Preview */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Revenir au design des couvertures</span>
            </button>

            <button
              type="button"
              onClick={onGoPreview}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>👉 Voir l'Aperçu Complet & Télécharger (PDF / Word)</span>
            </button>
          </div>

        </div>
      )}

      {/* MODAL ZOOM HD COUVERTURE / FERMETURE */}
      {zoomModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomModal(null)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black tracking-wide text-amber-300">
                  {zoomModal.type === 'front' ? 'COUVERTURE AVANT (HD RÉALISTE)' : 'QUATRIÈME DE COUVERTURE (FERMETURE HD)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-[1/1.45] w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40">
              <img
                src={zoomModal.url}
                alt="Page de couverture réelle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-5 flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 text-right">
                  Édition KDP Pro
                </div>
                <div>
                  <h4 className="text-lg font-black text-white leading-tight drop-shadow-md">
                    {data.title || 'Votre Titre d\'Ebook'}
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1 drop-shadow">
                    {data.author || 'Auteur du Livre'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setZoomModal(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Fermer l'aperçu HD
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
