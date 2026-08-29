import React, { useState, useEffect } from 'react';
import { 
  InterviewPrepData, InterviewQuestionItem 
} from '../types';
import { 
  ArrowLeft, Copy, Check, Sparkles, Clock, Target, 
  HelpCircle, AlertTriangle, ShieldCheck, Star, Lightbulb, MessageSquare, 
  UserCheck, ChevronDown, ChevronUp, CheckCircle2, Flame, Award, BookOpen,
  LayoutDashboard, BookmarkCheck
} from 'lucide-react';

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
  const [pitchTab, setPitchTab] = useState<'full' | 'timed'>('full');
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(true);

  const questions = data?.questions || [];
  const pitch = data?.pitch2Min;

  // Auto-save notification
  useEffect(() => {
    if (onSaveToProfile && data) {
      onSaveToProfile(data);
    }
  }, [data]);

  const categories = [
    { id: 'all', label: 'Toutes les questions', count: questions.length },
    { id: 'motivation', label: 'Motivation & Projet', count: questions.filter(q => q.category === 'motivation').length },
    { id: 'technique', label: 'Compétences Métier', count: questions.filter(q => q.category === 'technique').length },
    { id: 'comportementale', label: 'Soft Skills (STAR)', count: questions.filter(q => q.category === 'comportementale').length },
    { id: 'situationnelle', label: 'Mises en Situation', count: questions.filter(q => q.category === 'situationnelle').length },
    { id: 'piege', label: 'Questions Pièges', count: questions.filter(q => q.category === 'piege').length }
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
    const textToCopy = `Question : ${q.question}\n\nIntention du recruteur : ${q.recruiterIntent}\n\nRéponse modèle (Méthode STAR) :\n${q.suggestedAnswer}\n\nPoints forts à placer : ${q.keyStrengthsToHighlight?.join(', ') || 'N/A'}\nPiège à éviter : ${q.pitfallsToAvoid}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuestionId(q.id);
    setTimeout(() => setCopiedQuestionId(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-3 sm:px-6 pb-20 animate-in fade-in duration-300 font-sans">
      
      {/* ========================================================================= */}
      {/* FIXED / STICKY TOP NAVIGATION BAR                                         */}
      {/* ========================================================================= */}
      <div className="sticky top-16 z-30 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 px-4 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              id="btn-back-dashboard-from-prep"
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700/70 shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>← Retour à Mon Espace</span>
            </button>
          )}

          {onBackToCV && (
            <button
              id="btn-back-cv-from-prep"
              type="button"
              onClick={onBackToCV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 hover:text-indigo-200 text-xs font-bold transition-all cursor-pointer border border-indigo-500/30"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voir mon CV</span>
            </button>
          )}
        </div>

        {/* Real-time saving status badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Enregistré dans votre Espace Client</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER FICHE : DESIGN BLOC-NOTES MODERNE & ÉPURÉ                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Coaching & Préparation d'Entretien RH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
              {data.candidateName || 'Fiche Candidat'}
            </h1>
            <p className="text-sm font-semibold text-indigo-300 flex flex-wrap items-center gap-2">
              <span>Poste visé : <strong className="text-white">{data.targetJob}</strong></span>
              {data.targetCompany && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">Entreprise : {data.targetCompany}</span>
                </>
              )}
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 font-mono block">
              Consultable 24/7 sur Dokya AI
            </span>
            <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center gap-1 mt-1">
              <BookmarkCheck className="w-3.5 h-3.5" />
              Synchronisé avec votre profil
            </span>
          </div>
        </div>

        {/* Quick 3-point Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pitch Chrono</p>
              <p className="text-sm font-bold text-white">2 Minutes (120s)</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black text-sm shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Questions & Pièges</p>
              <p className="text-sm font-bold text-white">{questions.length} Questions Décryptées</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Structure Rép.</p>
              <p className="text-sm font-bold text-white">Méthode STAR</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : PITCH DE PRÉSENTATION CHRONO (2 MIN)                          */}
      {/* ========================================================================= */}
      {pitch && (
        <section id="section-pitch-chrono" className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-sm">
                1
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Pitch de Présentation Chrono (2 min)
                </h2>
                <p className="text-xs text-slate-400">
                  La réponse idéale pour l'incontournable « Parlez-moi de vous ».
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPitchTab('full')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    pitchTab === 'full' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Texte Continu
                </button>
                <button
                  type="button"
                  onClick={() => setPitchTab('timed')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    pitchTab === 'timed' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Découpage (3 temps)
                </button>
              </div>

              <button
                id="btn-copy-pitch-text"
                type="button"
                onClick={handleCopyPitch}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 cursor-pointer active:scale-95"
                title="Copier le texte complet du pitch"
              >
                {copiedPitch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le texte</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {pitchTab === 'full' ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Rythme oral fluide recommandé (120 à 130 mots/minute)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                  ~120 secondes
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-normal whitespace-pre-line">
                {pitch.fullText}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Temps 1 */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-400">0 - 30s : Accroche</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                    Identité & Force
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {pitch.hook}
                </p>
              </div>

              {/* Temps 2 */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-400">30 - 90s : Parcours</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                    Réalisations clés
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {pitch.careerHighlights}
                </p>
              </div>

              {/* Temps 3 */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">90 - 120s : Projection</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                    Valeur ajoutée
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {pitch.valueProposition}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 : QUESTIONS FRÉQUENTES DU RECRUTEUR (RÉPONSES & ERREURS)        */}
      {/* ========================================================================= */}
      <section id="section-questions-recruteur" className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="border-b border-slate-800/80 pb-4 space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black text-sm">
              2
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Questions Fréquentes du Recruteur
              </h2>
              <p className="text-xs text-slate-400">
                Avec la réponse idéale suggérée (méthode STAR) et l'erreur critique à éviter.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
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
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900/70 text-[10px]">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Questions Cards List */}
        <div className="space-y-4 pt-1">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            const isCopied = copiedQuestionId === q.id;

            return (
              <div
                key={q.id || idx}
                className={`border rounded-2xl transition-all duration-200 ${
                  isExpanded 
                    ? 'bg-slate-950/90 border-indigo-500/50 shadow-lg' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Title Header */}
                <div
                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        Question {idx + 1}
                      </span>
                      {q.categoryLabel && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {q.categoryLabel}
                        </span>
                      )}
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
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copier cette question et sa réponse"
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

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 animate-in fade-in">
                    
                    {/* Recruiter Intent */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ce que le recruteur évalue réellement :</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {q.recruiterIntent}
                      </p>
                    </div>

                    {/* Suggested STAR Answer */}
                    <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Réponse Idéale Suggérée (Méthode STAR) :</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Impact max</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                        {q.suggestedAnswer}
                      </p>
                    </div>

                    {/* Strengths & Pitfalls in 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Key Points to Highlight */}
                      <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                          <Star className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Points forts à valoriser :</span>
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

                      {/* Pitfall / Error to Avoid */}
                      <div className="bg-slate-900/60 border border-rose-500/20 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Erreur critique à éviter :</span>
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
      {/* SECTION 3 : QUESTIONS STRATÉGIQUES À POSER AU RECRUTEUR                   */}
      {/* ========================================================================= */}
      {data.suggestedQuestionsToAskRecruiter && data.suggestedQuestionsToAskRecruiter.length > 0 && (
        <section id="section-questions-au-recruteur" className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Questions Stratégiques à Poser au Recruteur
                </h2>
                <p className="text-xs text-slate-400">
                  À formuler quand le recruteur vous demande « Avez-vous des questions pour nous ? ».
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.suggestedQuestionsToAskRecruiter.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 hover:border-slate-700 transition-colors"
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
      {/* SECTION 4 : CONSEILS DE POSTURE & COMMUNICATION NON-VERBALE (ASTUCES RH)   */}
      {/* ========================================================================= */}
      {data.behavioralTips && data.behavioralTips.length > 0 && (
        <section id="section-posture-non-verbale" className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm">
                4
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Conseils de Posture & Communication Non-Verbale
                </h2>
                <p className="text-xs text-slate-400">
                  Astuces RH essentielles pour asseoir votre charisme, votre voix et votre assurance.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.behavioralTips.map((tip, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom return link */}
      <div className="text-center pt-4">
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Revenir à Mon Espace Client Dokya AI</span>
          </button>
        )}
      </div>

    </div>
  );
};
