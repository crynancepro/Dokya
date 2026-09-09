import React, { useState } from 'react';
import { EbookData, EbookCoverProposal, EbookBackCoverProposal, BookPlanSection } from '../types';
import { 
  AVAILABLE_EBOOK_LANGUAGES, AVAILABLE_EBOOK_GENRES, AVAILABLE_EBOOK_TONES,
  EBOOK_PAGE_COUNT_PRESETS,
  buildPollinationsImageUrl, generateContextualEbookProposals
} from '../data/sampleEbookData';
import { 
  generateEbookCoversWithGemini, 
  generateEbookContentWithGemini,
  generateBookPlanWithGemini,
  generateBookSectionWithGemini,
  generateFullBookSequentially,
  assembleChaptersFromSections,
  getLastNWords,
  SequentialBookGenerationProgress
} from '../lib/geminiService';
import { AIFormValidationBanner } from './AIFormValidationBanner';
import { validateEbookForm } from '../lib/formValidationUtils';
import { 
  BookOpen, Sparkles, RefreshCw, Upload, Image as ImageIcon, 
  Check, ArrowRight, ArrowLeft, Layers, PenTool, Layout, 
  Globe, User, Award, FileText, CheckCircle2, ChevronRight,
  HelpCircle, Eye, Trash2, Plus, AlertCircle, Loader2, Palette, Wand2, Hash,
  ListOrdered, CheckCheck, Play, ArrowDown
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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isGeneratingSequential, setIsGeneratingSequential] = useState<boolean>(false);
  const [showPlanDetails, setShowPlanDetails] = useState<boolean>(true);
  const [sequentialProgress, setSequentialProgress] = useState<{
    currentSectionIndex: number;
    totalSections: number;
    currentSectionTitle: string;
    currentChapterTitle: string;
    percent: number;
    message: string;
    totalWords: number;
  }>({
    currentSectionIndex: 0,
    totalSections: 0,
    currentSectionTitle: '',
    currentChapterTitle: '',
    percent: 0,
    message: '',
    totalWords: 0
  });

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
        customPrompt: customFrontPrompt || customBackPrompt || undefined
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
        customPrompt: customFrontPrompt || customBackPrompt || undefined
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

  // ÉTAPE A : Générer la structure globale du livre (Plan détaillé / Sommaire)
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const res = await generateBookPlanWithGemini({
        title: data.title || "Livre Numérique d'Excellence",
        subtitle: data.subtitle,
        author: data.author || "Auteur",
        genre: data.genre,
        language: data.language,
        targetAudience: data.targetAudience,
        tone: data.tone,
        userSynopsisOrIdeas: data.userSynopsisOrIdeas || data.summaryOrPrompt,
        summaryOrPrompt: data.summaryOrPrompt,
        chapterCount: data.chapterCount || 5,
        targetPageCount: data.targetPageCount || 10
      });

      if (res.success && res.plan?.length) {
        setData(prev => ({
          ...prev,
          bookPlan: res.plan
        }));
        setShowPlanDetails(true);
      }
    } catch (err) {
      console.error('Erreur génération du plan :', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // ÉTAPE B : Boucle séquentielle pour générer chaque section une par une
  const handleStartSequentialGeneration = async (customPlan?: BookPlanSection[]) => {
    setIsGeneratingSequential(true);
    setIsGeneratingContent(true);

    const planToUse = customPlan || data.bookPlan;

    setSequentialProgress({
      currentSectionIndex: 0,
      totalSections: planToUse?.length || 0,
      currentSectionTitle: '',
      currentChapterTitle: '',
      percent: 5,
      message: 'Initialisation de la rédaction séquentielle IA...',
      totalWords: 0
    });

    try {
      const res = await generateFullBookSequentially({
        data: {
          title: data.title || "Livre Numérique d'Excellence",
          subtitle: data.subtitle,
          author: data.author || "Auteur",
          genre: data.genre,
          language: data.language,
          targetAudience: data.targetAudience,
          tone: data.tone,
          userSynopsisOrIdeas: data.userSynopsisOrIdeas || data.summaryOrPrompt,
          summaryOrPrompt: data.summaryOrPrompt,
          chapterCount: data.chapterCount || 5,
          targetPageCount: data.targetPageCount || 10,
          existingPlan: planToUse && planToUse.length > 0 ? planToUse : undefined
        },
        onProgress: (prog: SequentialBookGenerationProgress) => {
          setSequentialProgress({
            currentSectionIndex: prog.currentSectionIndex,
            totalSections: prog.totalSections,
            currentSectionTitle: prog.currentSectionTitle,
            currentChapterTitle: prog.currentChapterTitle,
            percent: prog.percent,
            message: prog.message,
            totalWords: prog.totalWordsGenerated
          });

          // Update book plan live with completed sections
          if (prog.plan && prog.plan.length > 0) {
            setData(prev => ({
              ...prev,
              bookPlan: prog.plan
            }));
          }
        }
      });

      if (res.success && res.chapters?.length) {
        setData(prev => ({
          ...prev,
          bookPlan: res.plan,
          tableOfContents: res.tableOfContents as any,
          chapters: res.chapters as any
        }));
        setSelectedChapIndex(0);
      }
    } catch (err) {
      console.error('Erreur génération séquentielle du livre :', err);
    } finally {
      setIsGeneratingSequential(false);
      setIsGeneratingContent(false);
    }
  };

  // Régénérer une section individuelle spécifique
  const handleRegenerateSingleSection = async (sectionIndex: number) => {
    if (!data.bookPlan || !data.bookPlan[sectionIndex]) return;

    const currentPlan = [...data.bookPlan];
    const targetSection = currentPlan[sectionIndex];

    // Trouver les 200 derniers mots de la section précédente si existante
    let prevWords = '';
    if (sectionIndex > 0 && currentPlan[sectionIndex - 1]?.content) {
      prevWords = getLastNWords(currentPlan[sectionIndex - 1].content!, 200);
    }

    try {
      // Marquer comme en cours
      currentPlan[sectionIndex] = { ...targetSection, status: 'generating' };
      setData(prev => ({ ...prev, bookPlan: currentPlan }));

      const res = await generateBookSectionWithGemini({
        section: targetSection,
        bookInfo: {
          title: data.title,
          subtitle: data.subtitle,
          author: data.author,
          genre: data.genre,
          language: data.language,
          tone: data.tone,
          targetAudience: data.targetAudience
        },
        previousSectionLastWords: prevWords,
        sectionIndex,
        totalSections: currentPlan.length
      });

      currentPlan[sectionIndex] = {
        ...targetSection,
        content: res.content,
        wordCount: res.wordCount,
        status: 'completed'
      };

      // Mettre à jour le plan et ré-assembler les chapitres
      setData(prev => {
        const assembled = assembleChaptersFromSections(currentPlan, {
          title: prev.title,
          author: prev.author,
          targetPageCount: prev.targetPageCount
        });
        return {
          ...prev,
          bookPlan: currentPlan,
          chapters: assembled.chapters,
          tableOfContents: assembled.tableOfContents
        };
      });
    } catch (err) {
      console.error('Erreur régénération section :', err);
      currentPlan[sectionIndex] = { ...targetSection, status: 'error' };
      setData(prev => ({ ...prev, bookPlan: currentPlan }));
    }
  };

  // Wrapper standard pour le bouton global
  const handleGenerateContent = async () => {
    await handleStartSequentialGeneration();
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
    
    // Si aucun plan n'existe encore, pré-générer le plan automatiquement
    if (!data.bookPlan || data.bookPlan.length === 0) {
      handleGeneratePlan();
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
          
          {/* Real-Time Ebook Validation Banner */}
          <AIFormValidationBanner
            report={validateEbookForm(data)}
            onEnrichAI={async () => {
              if (!data.title) {
                setData(prev => ({
                  ...prev,
                  title: prev.title || 'Guide Stratégique de Réussite Professionnelle',
                  author: prev.author || 'Dr. Amadou Diallo',
                  summaryOrPrompt: prev.summaryOrPrompt || 'Méthodologie concrète, études de cas et plans d\'action étape par étape pour accélérer sa carrière et son leadership en Afrique et à l\'international.',
                  genre: prev.genre || 'Business & Entrepreneuriat',
                  targetAudience: prev.targetAudience || 'Professionnels & Entrepreneurs'
                }));
              }
            }}
            enrichButtonLabel="Compléter avec des suggestions IA"
            isGenerating={isGeneratingCovers || isGeneratingContent}
          />

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
      {/* ------------------------------------------------------------------------- */}
      {/* VIEW ÉTAPE 2 : DESIGN DES COUVERTURES (AVANT & FERMETURE)                 */}
      {/* ------------------------------------------------------------------------- */}
      {activeStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase tracking-wider">
                  Étape 2 sur 3
                </span>
                <span className="text-xs text-slate-500 font-bold">Design Visuel 6×9 po</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                <span>Design des Couvertures (Façade Avant & Façade Arrière)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualisez et personnalisez simultanément la première de couverture et la quatrième de couverture.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>Format Standard 6×9 po (KDP)</span>
              </span>
            </div>
          </div>

          {/* 1. DUAL SIDE-BY-SIDE MOCKUP CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            
            {/* CARTE 1 (GAUCHE) : PREMIÈRE DE COUVERTURE */}
            <div className="flex flex-col space-y-3">
              {/* Card Top Sub-Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Carte 1 : Première de Couverture</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomModal({ 
                      type: 'front', 
                      url: (data.frontCover.mode === 'uploaded' && data.frontCover.customImageUrl) 
                        ? data.frontCover.customImageUrl 
                        : (frontProposal?.artImageUrl || '') 
                    })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                    title="Agrandir en HD"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Zoom HD</span>
                  </button>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    ✓ Actif
                  </span>
                </div>
              </div>

              {/* Card 1 Visual Container */}
              <div className="w-full flex-1 flex flex-col justify-center">
                <div className="group relative rounded-3xl cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden bg-slate-950 aspect-[1/1.5] min-h-[500px] shadow-2xl ring-2 ring-indigo-500/40 hover:shadow-indigo-500/20">
                  {/* Background Image Layer */}
                  {(data.frontCover.mode === 'uploaded' && data.frontCover.customImageUrl) ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${data.frontCover.customImageUrl})` }}
                    />
                  ) : frontProposal?.artImageUrl ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${frontProposal.artImageUrl})` }}
                    />
                  ) : null}

                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${frontProposal?.bgGradient || 'from-slate-950 via-slate-950/75 to-slate-900/80'} ${frontProposal?.artImageUrl || data.frontCover.customImageUrl ? 'opacity-85' : 'opacity-100'} pointer-events-none z-0`} />

                  {/* Realistic 3D Spine Highlight on Left Edge */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-5 bg-gradient-to-r from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                  <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-[1px] bg-white/25 pointer-events-none z-20" />

                  {/* Gold Decorative Inner Frame */}
                  <div className="absolute inset-3 sm:inset-4 border border-amber-400/35 rounded-2xl pointer-events-none z-10" />

                  {/* Top Content inside Front Card */}
                  <div className="relative z-10 p-5 pb-0 flex flex-col gap-2 text-white">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-400/40 bg-black/75 shadow-xs backdrop-blur-xs text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{frontProposal?.artStyleLabel || 'Design Unique'}</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-300/90 drop-shadow-xs">
                        {frontProposal?.genreBadge || data.genre || 'Édition Premium'}
                      </span>
                    </div>
                  </div>

                  {/* Center Content: Title + Subtitle Box */}
                  <div className="relative z-10 px-6 py-4 text-center my-auto space-y-2.5">
                    <div className="inline-block px-5 py-4 rounded-2xl bg-black/60 backdrop-blur-xs border border-white/15 w-full shadow-2xl">
                      <h3 
                        className="text-base sm:text-xl font-black leading-tight line-clamp-3 drop-shadow-md text-white"
                        style={{ color: frontProposal?.textColor || '#ffffff' }}
                      >
                        {data.title || frontProposal?.title || 'Titre du Livre'}
                      </h3>
                      
                      <div className="w-12 h-0.5 bg-amber-400 mx-auto my-2.5 rounded-full opacity-80" />

                      <p 
                        className="text-xs font-medium line-clamp-2 leading-relaxed text-slate-200 drop-shadow-xs"
                        style={{ color: frontProposal?.subtitleColor || '#e2e8f0' }}
                      >
                        {data.subtitle || frontProposal?.subtitle || 'Sous-titre descriptif de l\'ouvrage'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer: Author & Publisher */}
                  <div className="relative z-10 p-5 pt-2 text-white flex flex-col gap-2">
                    <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold truncate drop-shadow-xs text-white">
                          {data.author || frontProposal?.author || 'Auteur'}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] bg-black/70 px-2 py-0.5 rounded text-amber-300 border border-amber-400/20 font-bold">
                        Format 6×9 po
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARTE 2 (DROITE) : QUATRIÈME DE COUVERTURE */}
            <div className="flex flex-col space-y-3">
              {/* Card Top Sub-Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Carte 2 : Quatrième de Couverture</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomModal({ 
                      type: 'back', 
                      url: (data.backCover.mode === 'uploaded' && data.backCover.customImageUrl) 
                        ? data.backCover.customImageUrl 
                        : (backProposal?.artImageUrl || '') 
                    })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                    title="Agrandir en HD"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Zoom HD</span>
                  </button>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    ✓ Actif
                  </span>
                </div>
              </div>

              {/* Card 2 Visual Container */}
              <div className="w-full flex-1 flex flex-col justify-center">
                <div className="group relative rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden bg-slate-950 aspect-[1/1.5] min-h-[500px] shadow-2xl ring-2 ring-indigo-500/40 p-5 sm:p-6">
                  {/* Background Image Layer */}
                  {(data.backCover.mode === 'uploaded' && data.backCover.customImageUrl) ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${data.backCover.customImageUrl})` }}
                    />
                  ) : backProposal?.artImageUrl ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${backProposal.artImageUrl})` }}
                    />
                  ) : null}

                  {/* Dark gradient layer */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${backProposal?.bgGradient || 'from-slate-950 via-slate-900 to-black'} ${backProposal?.artImageUrl || data.backCover.customImageUrl ? 'opacity-90' : 'opacity-100'} pointer-events-none z-0`} />

                  {/* Realistic 3D Spine Highlight on RIGHT Edge */}
                  <div className="absolute right-0 top-0 bottom-0 w-4 sm:w-5 bg-gradient-to-l from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                  <div className="absolute right-4 sm:right-5 top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none z-20" />

                  {/* Decorative Frame */}
                  <div className="absolute inset-3 sm:inset-4 border border-white/20 rounded-2xl pointer-events-none z-10" />

                  {/* Top Bar inside Back Card */}
                  <div className="relative z-10 flex items-center justify-between text-white mb-2">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-400/40 bg-black/75 shadow-xs backdrop-blur-xs text-amber-300 flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-amber-400" />
                      <span>{backProposal?.artStyleLabel || 'Fermeture Pro'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-amber-400/20">
                      Dos KDP 6×9
                    </span>
                  </div>

                  {/* Synopsis Box & Key Takeaways */}
                  <div className="relative z-10 space-y-3 text-white my-auto">
                    {/* Official Summary Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/60 border border-white/20 backdrop-blur-xs space-y-1.5 shadow-md">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>RÉSUMÉ OFFICIEL DU LIVRE</span>
                      </span>
                      <p className="text-xs leading-relaxed text-slate-100 line-clamp-4 drop-shadow-xs font-normal">
                        {backProposal?.synopsis || 'Ce guide complet offre des clés concrètes pour maîtriser votre sujet pas à pas avec des méthodologies éprouvées et applicables immédiatement.'}
                      </p>
                    </div>

                    {/* Key Takeaways */}
                    {backProposal?.keyTakeaways && backProposal.keyTakeaways.length > 0 && (
                      <div className="space-y-1.5 bg-black/40 p-3 sm:p-3.5 rounded-xl border border-white/10 backdrop-blur-xs">
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
                  <div className="relative z-10 mt-2 pt-2.5 border-t border-white/20 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                    {/* Quote */}
                    <div className="italic truncate max-w-[170px] text-amber-200/90 text-[10px]">
                      "{backProposal?.quoteOrCallToAction || 'Le savoir qui transforme votre avenir.'}"
                    </div>

                    {/* Realistic EAN-13 Barcode */}
                    <div className="flex items-center gap-2 bg-white text-slate-900 px-2.5 py-1 rounded-lg shadow-md shrink-0 border border-slate-200">
                      <div className="flex items-end gap-[1.5px] h-5">
                        <div className="w-[1.5px] h-5 bg-black" />
                        <div className="w-[1px] h-5 bg-black" />
                        <div className="w-[2px] h-5 bg-black" />
                        <div className="w-[1px] h-5 bg-black" />
                        <div className="w-[3px] h-5 bg-black" />
                        <div className="w-[1px] h-5 bg-black" />
                        <div className="w-[2px] h-5 bg-black" />
                        <div className="w-[1px] h-5 bg-black" />
                        <div className="w-[1.5px] h-5 bg-black" />
                      </div>

                      <div className="flex flex-col text-[7.5px] font-mono leading-none">
                        <span className="font-bold">{backProposal?.isbnNumber || '978-2-84000-01-9'}</span>
                        <span className="text-[6.5px] text-slate-500 font-bold mt-0.5">1 500 FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 2. BARRE D'ACTION ET PERSONNALISATION (MODULES 1, 2, 3) */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Barre d'Action et Personnalisation des Couvertures</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Les modifications sont immédiatement répercutées sur les 2 façades ci-dessus.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Module 1: Régénérer le pitch/design */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>1. Régénérer le pitch & design</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Génère automatiquement un nouveau visuel avant et un pitch arrière adapté au livre avec l'IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateCovers}
                  disabled={isGeneratingCovers}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCovers ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingCovers ? 'Génération IA...' : '🔄 Régénérer les 2 Couvertures'}</span>
                </button>
              </div>

              {/* Module 2: Prompt personnalisé */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                    <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2. Prompt visuel personnalisé</span>
                  </label>
                  <input
                    type="text"
                    value={customFrontPrompt}
                    onChange={(e) => {
                      setCustomFrontPrompt(e.target.value);
                      setCustomBackPrompt(e.target.value);
                    }}
                    placeholder="ex: Design minimaliste, doré et sombre..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGenerateDirectAiArtwork('front')}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-all"
                    title="Générer et appliquer à la première de couverture"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>✨ Visuel Avant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateDirectAiArtwork('back')}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-all"
                    title="Générer et appliquer à la quatrième de couverture"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>✨ Visuel Arrière</span>
                  </button>
                </div>
              </div>

              {/* Module 3: Importer une image */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Importer une image</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Téléversez vos propres fichiers d'image (JPG, PNG) depuis votre appareil.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {/* Front upload */}
                  <div className="flex items-center gap-1.5">
                    <label className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-[11px] cursor-pointer shadow-2xs">
                      <span className="flex items-center gap-1.5 truncate">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="truncate">{data.frontCover.mode === 'uploaded' ? '✓ Avant importé' : 'Image Avant'}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">Fichier</span>
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
                        className="p-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer shrink-0"
                        title="Supprimer l'image avant importée"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Back upload */}
                  <div className="flex items-center gap-1.5">
                    <label className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-[11px] cursor-pointer shadow-2xs">
                      <span className="flex items-center gap-1.5 truncate">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="truncate">{data.backCover.mode === 'uploaded' ? '✓ Arrière importé' : 'Image Arrière'}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">Fichier</span>
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
                        className="p-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer shrink-0"
                        title="Supprimer l'image arrière importée"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

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
          
          {/* Header & Architecture Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase tracking-wider">
                  Étape 3 sur 3
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                  🎯 Calibrage : {data.targetPageCount || 10} Pages Exactes
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-black border border-purple-200">
                  ⚡ Flux Séquentiel Anti-Répétition
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Plan Détaillé & Rédaction Séquentielle IA</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Génération en 2 temps : <span className="font-bold text-slate-700">1. Plan par section</span> → <span className="font-bold text-indigo-600">2. Boucle séquentielle avec mémoire des 200 mots précédents</span> pour une narration fluide sans phrases génériques.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan || isGeneratingSequential}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    <span>Création du plan...</span>
                  </>
                ) : (
                  <>
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{data.bookPlan?.length ? "Régénérer le Plan" : "1. Générer le Plan"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleStartSequentialGeneration()}
                disabled={isGeneratingSequential || isGeneratingPlan}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 transition-all active:scale-95 shrink-0"
              >
                {isGeneratingSequential ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Rédaction séquentielle ({sequentialProgress.currentSectionIndex}/{sequentialProgress.totalSections})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>2. Lancer la Rédaction Séquentielle IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION A : SAISIE DES IDÉES & SYNOPSIS DE L'AUTEUR (AVANT LE PLAN)       */}
          {/* ========================================================================= */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <PenTool className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Idées Clés, Synopsis & Directives de Rédaction
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Précisez vos thèmes de prédilection, études de cas ou arguments pour guider la structure du plan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan || isGeneratingSequential}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
              >
                {isGeneratingPlan ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>Mettre à jour le Plan IA</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={data.userSynopsisOrIdeas !== undefined ? data.userSynopsisOrIdeas : data.summaryOrPrompt}
              onChange={(e) => {
                const val = e.target.value;
                setData(prev => ({
                  ...prev,
                  userSynopsisOrIdeas: val,
                  summaryOrPrompt: val
                }));
              }}
              placeholder="Ex: Explorer les opportunités du marché informel en Afrique de l'Ouest, intégrer des études de cas de jeunes entrepreneurs sénégalais et ivoiriens, fournir des checklists financières précises et un plan d'action sur 90 jours..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed placeholder:text-slate-400"
            />

            {/* Quick Inspiration Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Inspirations rapides :</span>
              {[
                "📊 Études de cas réelles & chiffres concrets",
                "🌍 Focus Afrique & économie émergente",
                "🛠️ Guide pratique pas à pas",
                "💡 Narration immersive & dialogues vivants",
                "📅 Feuille de route opérationnelle sur 90 jours"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const current = (data.userSynopsisOrIdeas || data.summaryOrPrompt || '').trim();
                    const updated = current ? `${current}. ${chip.replace(/^[^\s]+\s/, '')}` : chip.replace(/^[^\s]+\s/, '');
                    setData(prev => ({
                      ...prev,
                      userSynopsisOrIdeas: updated,
                      summaryOrPrompt: updated
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[11px] font-medium text-slate-700 cursor-pointer transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION B : PLAN DÉTAILLÉ (SOMMAIRE DES SECTIONS [{ chapter, section, summary }]) */}
          {/* ========================================================================= */}
          {data.bookPlan && data.bookPlan.length > 0 && (
            <div className="border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-slate-50/20 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                    <ListOrdered className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>Plan Détaillé de l'Ouvrage ({data.bookPlan.length} sections)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        Structuré pour Rédaction Séquentielle
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chaque section ci-dessous est rédigée individuellement par l'IA (+500 mots, zéro répétition). Vous pouvez affiner les titres et résumés.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPlanDetails(!showPlanDetails)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {showPlanDetails ? "Masquer les détails" : "Afficher les détails"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = (data.bookPlan?.length || 0) + 1;
                      const newSec: BookPlanSection = {
                        id: `plan-sec-${Date.now()}`,
                        chapterTitle: `Chapitre ${(Math.floor((nextNum - 1) / 2) + 1)} : Développement Stratégique`,
                        sectionTitle: `${Math.floor((nextNum - 1) / 2) + 1}.${((nextNum - 1) % 2) + 1} Nouveau Point Clé`,
                        summary: "Description détaillée du contenu à aborder dans cette nouvelle section.",
                        status: 'pending'
                      };
                      setData(prev => ({
                        ...prev,
                        bookPlan: [...(prev.bookPlan || []), newSec]
                      }));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-[11px] font-bold text-indigo-700 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter section</span>
                  </button>
                </div>
              </div>

              {/* Sections List */}
              {showPlanDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {data.bookPlan.map((section, idx) => {
                    const isBeingGenerated = isGeneratingSequential && sequentialProgress.currentSectionIndex === idx + 1;
                    const isCompleted = section.status === 'completed' || (section.content && section.content.length > 200);

                    return (
                      <div
                        key={section.id || idx}
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                          isBeingGenerated 
                            ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300 shadow-md animate-pulse'
                            : isCompleted
                            ? 'bg-white border-emerald-200/90 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-[70%]">
                            {section.chapterTitle}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isBeingGenerated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black animate-bounce">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>En cours...</span>
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                <span>{section.wordCount || 500} mots</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                En attente
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const updated = (data.bookPlan || []).filter((_, i) => i !== idx);
                                setData(prev => ({ ...prev, bookPlan: updated }));
                              }}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                              title="Supprimer la section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title input */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Titre de la section :</label>
                          <input
                            type="text"
                            value={section.sectionTitle}
                            onChange={(e) => {
                              const updated = [...(data.bookPlan || [])];
                              updated[idx].sectionTitle = e.target.value;
                              setData(prev => ({ ...prev, bookPlan: updated }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Summary input */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Sujet spécifique à traiter :</label>
                          <textarea
                            rows={2}
                            value={section.summary}
                            onChange={(e) => {
                              const updated = [...(data.bookPlan || [])];
                              updated[idx].summary = e.target.value;
                              setData(prev => ({ ...prev, bookPlan: updated }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 leading-relaxed outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Action individual section */}
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRegenerateSingleSection(idx)}
                            disabled={isGeneratingSequential}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{isCompleted ? "Régénérer cette section" : "Rédiger cette section seule"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* BARRE DE PROGRESSION EN TEMPS RÉEL PENDANT LA GÉNÉRATION SÉQUENTIELLE     */}
          {/* ========================================================================= */}
          {isGeneratingSequential && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-indigo-500/40 shadow-xl space-y-3.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/40 animate-spin">
                    <Loader2 className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>Rédaction Séquentielle IA en Cours</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/40 text-indigo-200 text-[10px] font-mono font-bold">
                        {sequentialProgress.percent}%
                      </span>
                    </h4>
                    <p className="text-[11px] text-indigo-200/80 font-medium">
                      {sequentialProgress.message || "Génération séquentielle en cours..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono font-bold text-indigo-200">
                  <span>Section {sequentialProgress.currentSectionIndex} sur {sequentialProgress.totalSections}</span>
                  <span>•</span>
                  <span>{sequentialProgress.totalWords} mots rédigés</span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(5, sequentialProgress.percent)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-300/80 pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prompt expert actif : 500+ mots par section, sans phrases génériques répétitives</span>
                </span>
                <span className="text-amber-300 font-bold">
                  🔗 Mémoire des 200 derniers mots transmise pour la continuité
                </span>
              </div>
            </div>
          )}

          {/* Chapters Manager & Live Content Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        {"Contenu Rédactionnel (Titres ##, listes -, citations >)"}
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        {data.chapters[selectedChapIndex].content?.split(/\s+/).filter(Boolean).length || 0} mots
                      </span>
                    </div>
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
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-slate-600 mb-1">Aucun chapitre rédigé pour l'instant</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Générez d'abord le plan détaillé (Étape A), puis lancez la rédaction séquentielle IA (Étape B) pour rédiger l'ouvrage section par section.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartSequentialGeneration()}
                    disabled={isGeneratingSequential || isGeneratingPlan}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Lancer la rédaction séquentielle
                  </button>
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
