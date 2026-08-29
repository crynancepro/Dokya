import React from 'react';
import { Sparkles, ArrowRight, X, CheckCircle2, Target, HelpCircle, ShieldCheck, UserCheck } from 'lucide-react';

interface InterviewPrepOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  candidateName?: string;
  targetJob?: string;
  targetCompany?: string;
  isLoading?: boolean;
}

export const InterviewPrepOfferModal: React.FC<InterviewPrepOfferModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  candidateName,
  targetJob = 'votre poste cible',
  targetCompany,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="modal-interview-prep-offer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-interview-offer"
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Option Post-Génération IA RH</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Préparez votre Entretien d'Embauche ! 🎯
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed">
            Félicitations pour votre nouveau CV ! L'IA peut analyser vos expériences pour le poste de{' '}
            <strong className="text-indigo-300 font-semibold">{targetJob}</strong> {targetCompany ? `chez ${targetCompany}` : ''} et générer immédiatement votre coaching sur-mesure :
          </p>
        </div>

        {/* Value Points */}
        <div className="space-y-2.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-start gap-3 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Pitch de 2 minutes chronométré</strong> pour capter l'attention dès l'ouverture ("Parlez-moi de vous").
            </span>
          </div>
          <div className="flex items-start gap-3 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">5 à 8 questions RH clés & pièges</strong> avec réponses modèles rédigées selon la <strong className="text-amber-300">méthode STAR</strong>.
            </span>
          </div>
          <div className="flex items-start gap-3 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Questions stratégiques à poser au recruteur</strong> et conseils de posture non-verbale.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            id="btn-accept-interview-prep"
            type="button"
            onClick={onAccept}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyse RH du profil en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>🚀 Générer ma Fiche d'Entretien</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            id="btn-decline-interview-prep"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer text-center"
          >
            Non merci, continuer vers mon CV
          </button>
        </div>
      </div>
    </div>
  );
};
