import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Download, FileText, Sparkles, X, Trophy, ArrowRight } from 'lucide-react';

export interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  documentTitle?: string;
  onDownloadAction?: (format: 'pdf' | 'docx') => void;
  onViewDocumentAction?: () => void;
  actionButtonLabel?: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  title = "Félicitations ! Votre document est débloqué 🎉",
  subtitle = "Votre document est désormais validé, accessible en lecture complète et disponible au téléchargement illimité.",
  documentTitle,
  onDownloadAction,
  onViewDocumentAction,
  actionButtonLabel = "Accéder à mon document"
}) => {
  // Lancer l'animation de confettis/fleurs dès l'ouverture de la modale
  useEffect(() => {
    if (!isOpen) return;

    try {
      // Premier tir central explosif
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']
      });

      // Deuxième cascade de fleurs/confettis depuis les deux côtés
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.7 },
          colors: ['#10b981', '#6366f1', '#fbbf24', '#f43f5e']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.7 },
          colors: ['#10b981', '#6366f1', '#fbbf24', '#f43f5e']
        });
      }, 250);

      return () => clearTimeout(timer);
    } catch (_e) {}
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* En-tête décoratif festif */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-emerald-600 p-6 text-white text-center relative overflow-hidden">
          {/* Cercles de fond discrets */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

          {/* Bouton fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icône de trophée animée */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transform hover:scale-105 transition-all">
            <Trophy className="w-8 h-8 text-amber-300 drop-shadow-sm" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-indigo-100 max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 space-y-5">
          {/* Badge document si spécifié */}
          {documentTitle && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Document Débloqué</p>
                <p className="text-sm font-black text-slate-900 truncate">{documentTitle}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                Débloqué
              </span>
            </div>
          )}

          {/* Avantages débloqués */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-emerald-900">Lecture Complète</p>
                <p className="text-[11px] text-emerald-700">Floutage levé, visibilité 100% nette</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2">
              <Download className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-indigo-900">Téléchargement Illimité</p>
                <p className="text-[11px] text-indigo-700">PDF Haute Définition & Word .docx</p>
              </div>
            </div>
          </div>

          {/* Actions de téléchargement ou consultation */}
          <div className="space-y-2 pt-1">
            {onDownloadAction ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onDownloadAction('pdf');
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger en PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDownloadAction('docx');
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
                >
                  <FileText className="w-4 h-4" />
                  <span>Télécharger en Word (.docx)</span>
                </button>
              </div>
            ) : null}

            {onViewDocumentAction && (
              <button
                type="button"
                onClick={() => {
                  onViewDocumentAction();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
              >
                <span>{actionButtonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              Fermer la fenêtre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
