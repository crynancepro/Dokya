import React from 'react';
import { Lightbulb, CheckCircle2, Award, Users, ShieldAlert } from 'lucide-react';

interface InterviewTipsProps {
  tips?: string[];
  targetJob?: string;
}

export const InterviewTips: React.FC<InterviewTipsProps> = ({ tips, targetJob }) => {
  const defaultTips = [
    "Préparez votre présentation personnelle de 2 minutes (Elevator Pitch) axée sur vos réalisations concrètes et votre connaissance du marché sénégalais.",
    "Renseignez-vous sur les projets récents et les défis technologiques/commerciaux de l'entreprise visée.",
    "Adoptez une posture professionnelle et courtoise, valorisant à la fois la compétence technique et le respect des codes culturels professionnels locaux (Teranga, écoute active).",
    "Préparez 2 ou 3 questions pertinentes à poser au recruteur à la fin de l'entretien concernant les perspectives d'évolution et l'équipe."
  ];

  const activeTips = tips && tips.length > 0 ? tips : defaultTips;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700 space-y-4">
      <div className="flex items-center gap-2.5 text-indigo-400">
        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Lightbulb className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-white">Conseils Réussite d'Entretien au Sénégal</h3>
          <p className="text-xs text-slate-300">
            Recommandations IA pour décrocher le poste de {targetJob || 'professionnel'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {activeTips.map((tip, idx) => (
          <div key={idx} className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
