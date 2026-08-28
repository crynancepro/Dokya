import React, { useState } from 'react';
import { 
  InterviewPrepData, InterviewQuestionItem, InterviewQuestionCategory 
} from '../types';
import { 
  ArrowLeft, Download, Copy, Check, Sparkles, Clock, Target, 
  HelpCircle, AlertTriangle, ShieldCheck, Star, Lightbulb, MessageSquare, 
  UserCheck, ChevronDown, ChevronUp, Share2, Printer, BookmarkCheck,
  CheckCircle2, Flame, Award, BookOpen, Layers
} from 'lucide-react';
import { downloadElementAsPDF } from '../lib/pdfUtils';

interface InterviewPrepViewProps {
  data: InterviewPrepData;
  onBackToDashboard?: () => void;
  onBackToCV?: () => void;
  onSaveToProfile?: (data: InterviewPrepData) => void;
}

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({
  data,
  onBackToDashboard,
  onBackToCV,
  onSaveToProfile
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(data?.questions?.[0]?.id || null);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [pitchTab, setPitchTab] = useState<'full' | 'timed'>('full');

  const questions = data?.questions || [];
  const pitch = data?.pitch2Min;

  const categories = [
    { id: 'all', label: 'Toutes les questions', count: questions.length },
    { id: 'motivation', label: 'Motivation & Projet', count: questions.filter(q => q.category === 'motivation').length },
    { id: 'technique', label: 'Compétences Métier', count: questions.filter(q => q.category === 'technique').length },
    { id: 'comportementale', label: 'Soft Skills (STAR)', count: questions.filter(q => q.category === 'comportementale').length },
    { id: 'situationnelle', label: 'Mises en Situation', count: questions.filter(q => q.category === 'situationnelle').length },
    { id: 'piege', label: 'Questions Pièges / Délicates', count: questions.filter(q => q.category === 'piege').length },
    { id: 'leadership', label: 'Vision & Leadership', count: questions.filter(q => q.category === 'leadership').length }
  ].filter(c => c.id === 'all' || c.count > 0);

  const filteredQuestions = activeCategoryFilter === 'all'
    ? questions
    : questions.filter(q => q.category === activeCategoryFilter);

  const handleCopyPitch = () => {
    if (!pitch?.fullText) return;
    navigator.clipboard.writeText(pitch.fullText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const handleCopyQuestion = (q: InterviewQuestionItem) => {
    const textToCopy = `Question : ${q.question}\n\nIntention du recruteur : ${q.recruiterIntent}\n\nRéponse modèle (Méthode STAR) :\n${q.suggestedAnswer}\n\nPoints forts à placer : ${q.keyStrengthsToHighlight?.join(', ')}\nPiège à éviter : ${q.pitfallsToAvoid}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuestionId(q.id);
    setTimeout(() => setCopiedQuestionId(null), 2500);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const fileName = `Fiche_Entretien_RH_${(data.candidateName || 'Candidat').replace(/\s+/g, '_')}_${(data.targetJob || 'Job').replace(/\s+/g, '_')}.pdf`;
      await downloadElementAsPDF('interview-prep-document', fileName);
    } catch (e) {
      console.error('Erreur téléchargement PDF entretien:', e);
      window.print();
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleSave = () => {
    if (onSaveToProfile) {
      onSaveToProfile(data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 pb-16 animate-in fade-in duration-300">
      
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              id="btn-back-dashboard-from-prep"
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Tableau de Bord</span>
            </button>
          )}

          {onBackToCV && (
            <button
              id="btn-back-cv-from-prep"
              type="button"
              onClick={onBackToCV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-500/30"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Voir mon CV</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSaveToProfile && (
            <button
              id="btn-save-prep-profile"
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enregistrer dans mon Espace</span>
                </>
              )}
            </button>
          )}

          <button
            id="btn-download-prep-pdf"
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloadingPDF ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Génération PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger la Fiche (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Printable Document Wrapper */}
      <div 
        id="interview-prep-document"
        className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-8 shadow-xl text-slate-100"
      >
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fiche Stratégique de Préparation d'Entretien RH</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Généré le {new Date(data.createdAt || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {data.candidateName || 'Candidat Pro'}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-indigo-300 flex flex-wrap items-center gap-2">
              <span>Poste : {data.targetJob}</span>
              {data.targetCompany && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">Entreprise : {data.targetCompany}</span>
                </>
              )}
              {data.city && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{data.city} {data.country ? `(${data.country})` : ''}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Pitch Chrono</span>
              </div>
              <p className="text-sm font-black text-white mt-1">2 Minutes</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Questions RH</span>
              </div>
              <p className="text-sm font-black text-white mt-1">{questions.length} Clés & Pièges</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Target className="w-3.5 h-3.5" />
                <span>Méthodologie</span>
              </div>
              <p className="text-sm font-black text-white mt-1">Modèle STAR</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Format</span>
              </div>
              <p className="text-sm font-black text-white mt-1">Directeur RH</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1 : PITCH DE PRÉSENTATION DE 2 MINUTES                            */}
        {/* ========================================================================= */}
        {pitch && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Pitch de Présentation de 2 Minutes
                  </h2>
                  <p className="text-xs text-slate-400">
                    L'Accroche décisive pour répondre avec éclat à l'incontournable « Parlez-moi de vous ».
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPitchTab('full')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      pitchTab === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Texte Complet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPitchTab('timed')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      pitchTab === 'timed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Découpage Chrono (3 temps)
                  </button>
                </div>

                <button
                  id="btn-copy-pitch-text"
                  type="button"
                  onClick={handleCopyPitch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  {copiedPitch ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le Pitch</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {pitchTab === 'full' ? (
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-800/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-bold border-b border-indigo-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Texte fluide prêt pour la déclamation orale (Rythme naturel : 120-130 mots/min)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    ~120 sec
                  </span>
                </div>
                <blockquote className="text-sm sm:text-base text-slate-200 leading-relaxed italic whitespace-pre-line font-medium">
                  {pitch.fullText}
                </blockquote>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 0-30s */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-400">Temps 1 (0-30s)</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                      Accroche & Identité
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {pitch.hook}
                  </p>
                </div>

                {/* 30-90s */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-400">Temps 2 (30-90s)</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                      Parcours & Réalisations
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {pitch.careerHighlights}
                  </p>
                </div>

                {/* 90-120s */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-400">Temps 3 (90-120s)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                      Valeur & Projection
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {pitch.valueProposition}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2 : QUESTIONS RH & RÉPONSES MODÈLES (STAR)                        */}
        {/* ========================================================================= */}
        <section className="space-y-5 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Questions d'Entretien RH & Réponses Modèles
                </h2>
                <p className="text-xs text-slate-400">
                  Les questions les plus probables pour {data.targetJob}, décryptées avec méthode STAR.
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategoryFilter === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                }`}
              >
                <span>{cat.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Questions Accordion / List */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isExpanded = expandedQuestionId === q.id;
              const isCopied = copiedQuestionId === q.id;

              const getCategoryBadge = (cat: string) => {
                switch (cat) {
                  case 'motivation':
                    return { label: 'Motivation', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
                  case 'technique':
                    return { label: 'Technique Métier', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
                  case 'comportementale':
                    return { label: 'Soft Skills / STAR', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
                  case 'situationnelle':
                    return { label: 'Situationnelle', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
                  case 'piege':
                    return { label: 'Question Piège', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
                  case 'leadership':
                    return { label: 'Vision & Leadership', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
                  default:
                    return { label: q.categoryLabel || 'RH', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
                }
              };

              const badge = getCategoryBadge(q.category);

              return (
                <div
                  key={q.id || idx}
                  className={`border rounded-2xl transition-all ${
                    isExpanded 
                      ? 'bg-slate-800/90 border-indigo-500/40 shadow-lg' 
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Header / Clickable Toggle */}
                  <div
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          Q{idx + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                        {q.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyQuestion(q);
                        }}
                        className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Copier la réponse modèle"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-700/40 space-y-4 animate-in fade-in">
                      
                      {/* Recruiter Intent */}
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5 space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold">
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Ce que le recruteur évalue réellement :</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {q.recruiterIntent}
                        </p>
                      </div>

                      {/* Suggested STAR Answer */}
                      <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900/70 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Réponse Modèle Recommandée (Méthode STAR) :</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Structure d'impact</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                          {q.suggestedAnswer}
                        </p>
                      </div>

                      {/* Strengths & Pitfalls in 2 columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Key Strengths */}
                        <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                            <Star className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Points forts à placer impérativement :</span>
                          </div>
                          <ul className="space-y-1">
                            {q.keyStrengthsToHighlight?.map((st, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-slate-300">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span>{st}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pitfalls to Avoid */}
                        <div className="bg-slate-900/50 border border-rose-500/20 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Piège critique à éviter :</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            {q.pitfallsToAvoid}
                          </p>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3 : QUESTIONS INTELLIGENTES À POSER AU RECRUTEUR                  */}
        {/* ========================================================================= */}
        {data.suggestedQuestionsToAskRecruiter && data.suggestedQuestionsToAskRecruiter.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Questions Stratégiques à Poser au Recruteur
                </h2>
                <p className="text-xs text-slate-400">
                  À dégainer quand le recruteur vous demande « Avez-vous des questions pour nous ? » (Prouve votre maturité).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.suggestedQuestionsToAskRecruiter.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4 : CONSEILS COMPORTEMENTAUX & POSTURE D'IMPACT                    */}
        {/* ========================================================================= */}
        {data.behavioralTips && data.behavioralTips.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Conseils de Posture & Communication Non-Verbale
                </h2>
                <p className="text-xs text-slate-400">
                  La forme compte pour 55% dans l'évaluation du recruteur.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.behavioralTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5 : SYNTHÈSE DES ATOUTS MAJEURS DÉTECTÉS                          */}
        {/* ========================================================================= */}
        {data.strengthsSummary && data.strengthsSummary.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Synthèse de vos atouts majeurs détectés par l'IA RH :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.strengthsSummary.map((str, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
                >
                  ✨ {str}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>Plateforme Dokya Pro • Coaching & Optimisation RH IA</span>
          <span>Prêt pour l'entretien d'embauche 🎯</span>
        </div>

      </div>

    </div>
  );
};
