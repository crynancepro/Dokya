import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { FormValidationReport } from '../lib/formValidationUtils';

interface AIFormValidationBannerProps {
  report: FormValidationReport;
  onEnrichAI?: () => void;
  enrichButtonLabel?: string;
  isGenerating?: boolean;
}

export const AIFormValidationBanner: React.FC<AIFormValidationBannerProps> = ({
  report,
  onEnrichAI,
  enrichButtonLabel = 'Compléter & Enrichir avec l\'IA',
  isGenerating = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 text-white';
    if (score >= 50) return 'bg-blue-500 text-white';
    return 'bg-amber-500 text-white';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div id="ai-form-validation-banner" className={`rounded-xl border p-4 transition-all duration-300 ${report.badgeBg} shadow-xs mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Score & Status */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${getScoreColor(report.score)}`}>
            {report.score}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${report.badgeColor}`}>
                {report.statusLabel}
              </span>
              {report.status === 'optimal' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {report.status === 'thin'
                ? "Champs incomplets détectés — L'IA enrichira automatiquement les sections vides pour un rendu parfait."
                : "Validation en temps réel : Votre document est prêt pour une génération optimale."}
            </p>
          </div>
        </div>

        {/* Right Side: Action Button & Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onEnrichAI && (
            <button
              type="button"
              onClick={onEnrichAI}
              disabled={isGenerating}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer text-center"
            >
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">{isGenerating ? 'Optimisation...' : 'Enrichir avec l\'IA'}</span>
              <span className="hidden sm:inline">{isGenerating ? 'Optimisation en cours...' : enrichButtonLabel}</span>
            </button>
          )}

          {(report.suggestions.length > 0 || report.missingCrucialFields.length > 0) && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white/90 hover:bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Voir les conseils d'enrichissement"
            >
              <span>{isExpanded ? 'Masquer' : 'Conseils'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(report.score)}`}
          style={{ width: `${Math.max(5, report.score)}%` }}
        />
      </div>

      {/* Collapsible Suggestions Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs text-slate-700">
          {report.missingCrucialFields.length > 0 && (
            <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 block font-semibold">Champs recommandés manquants :</strong>
                <span className="text-slate-600">{report.missingCrucialFields.join(' • ')}</span>
              </div>
            </div>
          )}

          {report.suggestions.length > 0 && (
            <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Recommandations d'optimisation intelligente :</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                {report.suggestions.map((sug, idx) => (
                  <li key={idx}>{sug}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic pt-1">
            <Info className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>{report.aiEnrichmentMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
