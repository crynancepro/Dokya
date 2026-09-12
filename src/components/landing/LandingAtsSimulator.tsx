import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  ArrowRight, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Briefcase, 
  Receipt 
} from 'lucide-react';

interface LandingAtsSimulatorProps {
  onStartDoc: (type: 'cv' | 'facture') => void;
}

const CAREER_EXAMPLES = [
  {
    role: 'Chef de Projet / Opérations',
    before: {
      text: 'J\'étais responsable de plusieurs projets dans l\'équipe. J\'ai géré des réunions avec les clients et vérifié les délais.',
      score: 41,
      flaws: ['Formulation passive sans métriques', 'Absence de mots-clés ATS techniques', 'Structure rejetée par Workday']
    },
    after: {
      text: 'Pilotage d’un portefeuille de 6 projets stratégiques (budget 45M FCFA), réduction des délais de livraison de 28% et hausse de la satisfaction client à 96%.',
      score: 99,
      fixes: ['Verbes d’action quantifiés (budget, %)', 'Mots-clés méthode Agile / Scrum parsés', 'Format sémantique 100% lisible par robots']
    }
  },
  {
    role: 'Comptable & Finance',
    before: {
      text: 'Saisie comptable des pièces et déclarations fiscales mensuelles. Suivi des factures impayées.',
      score: 38,
      flaws: ['Description générique basique', 'Pas de mention des référentiels SYSCOHADA', 'Taux de rejet ATS estimé à 72%']
    },
    after: {
      text: 'Tenue intégrale de la comptabilité générale sous référentiel SYSCOHADA Révisé. Clôture mensuelle à J+4, optimisation de la trésorerie et recouvrement de 18M FCFA d\'arriérés.',
      score: 98,
      fixes: ['Mots-clés SYSCOHADA & Fiscalité intégrés', 'Impact chiffré sur la trésorerie', 'Reconnu par les recruteurs régionaux & internationaux']
    }
  },
  {
    role: 'Développeur / Ingénieur IT',
    before: {
      text: 'Développement de fonctionnalités web en React et Node.js. Correction de bugs dans le code.',
      score: 45,
      flaws: ['Manque d’indicateurs d’échelle', 'Absence de stack DevOps & API standards', 'Parsing difficile sans hiérarchie claire']
    },
    after: {
      text: 'Conception et déploiement d’une architecture microservices React / Node.js traitant 15 000 requêtes/min. Réduction du temps de latence de 40% et CI/CD automatisé.',
      score: 100,
      fixes: ['Métriques de charge & volumétrie claires', 'Mots-clés cloud & CI/CD parsables', 'Score ATS maximal sur Greenhouse & Taleo']
    }
  },
  {
    role: 'Commercial & Développement B2B',
    before: {
      text: 'Prospection téléphonique et relance des prospects pour vendre nos services. Participation aux salons.',
      score: 35,
      flaws: ['Aucun chiffre d’affaires ni objectif atteint', 'Faible pertinence pour les recruteurs de direction', 'Score de pertinence algorithmique faible']
    },
    after: {
      text: 'Acquisition de 34 nouveaux comptes B2B stratégiques générant 85M FCFA de CA additionnel (132% de l’objectif annuel). Négociation de contrats cadres grands comptes.',
      score: 99,
      fixes: ['Objectif surperformé quantifié (132%)', 'Vocabulaire commercial d’élite B2B', 'Hiérarchie immédiatement valorisée par l’IA']
    }
  }
];

export const LandingAtsSimulator: React.FC<LandingAtsSimulatorProps> = ({ onStartDoc }) => {
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  const currentExample = CAREER_EXAMPLES[selectedExampleIndex];

  return (
    <section className="w-full py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden bg-slate-900/40">
      
      {/* Halos d'ambiance */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/15 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* Header de section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs font-black uppercase tracking-wider text-indigo-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simulateur en Direct • L'Impact de l'IA Dokya</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Voyez la différence entre un CV rejeté et un CV retenu
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            75% des candidatures sont éliminées par les logiciels ATS avant même d'arriver sous les yeux d'un humain. 
            Découvrez comment le moteur Dokya réécrit et structure vos compétences pour garantir un score de passage supérieur à 98%.
          </p>

          {/* Sélecteur de métier interactif */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {CAREER_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedExampleIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedExampleIndex === idx
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105 border border-indigo-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                <Briefcase className="w-3 h-3 text-amber-300" />
                <span>{ex.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comparatif Avant / Après */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch">
          
          {/* CARTE AVANT (CV Classique rejeté) */}
          <div className="rounded-3xl bg-slate-900 border border-rose-500/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Rédaction Standard (Word / Canva)</h4>
                    <p className="text-[11px] text-rose-400">Éliminé par les filtres automatiques</p>
                  </div>
                </div>

                {/* Score ATS Faible */}
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                    {currentExample.before.score}%
                  </span>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Score ATS</span>
                </div>
              </div>

              {/* Texte de l'expérience */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs sm:text-sm italic leading-relaxed">
                "{currentExample.before.text}"
              </div>

              {/* Défauts identifiés */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Analyse des bloqueurs de recrutement :
                </span>
                <ul className="space-y-1.5 text-xs text-rose-300">
                  {currentExample.before.flaws.map((flaw, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{flaw}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Résultat :</span>
              <strong className="text-rose-400">Candidature archivée sans entretien</strong>
            </div>
          </div>

          {/* CARTE APRÈS (Dokya AI ATS Conforme) */}
          <div className="rounded-3xl bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-900 border-2 border-emerald-500/60 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
            
            {/* Ruban d'excellence */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-600 text-slate-950 px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
              <ShieldCheck className="w-3 h-3" />
              <span>Conforme Workday &amp; Taleo</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Reformulation Intelligente Dokya</h4>
                    <p className="text-[11px] text-emerald-400">Prêt pour les recruteurs internationaux</p>
                  </div>
                </div>

                {/* Score ATS Élevé */}
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {currentExample.after.score}%
                  </span>
                  <span className="text-[9px] text-emerald-400 block uppercase font-bold">Score ATS</span>
                </div>
              </div>

              {/* Texte de l'expérience reformulée */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-white text-xs sm:text-sm font-medium leading-relaxed shadow-inner">
                "{currentExample.after.text}"
              </div>

              {/* Améliorations concrètes */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Optimisations appliquées automatiquement :
                </span>
                <ul className="space-y-1.5 text-xs text-emerald-300">
                  {currentExample.after.fixes.map((fix, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Probabilité d'entretien : <strong>Multipliée par 4.2x</strong></span>
              </div>
              
              <button
                type="button"
                onClick={() => onStartDoc('cv')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Créer mon CV</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
