import React, { useState } from 'react';
import { 
  Calculator, 
  Briefcase, 
  Receipt, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Award,
  Zap
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface LandingRoiCalculatorProps {
  onSelectService: (service: 'cv' | 'facture') => void;
  onGoToAuth: (mode?: 'login' | 'signup') => void;
}

export const LandingRoiCalculator: React.FC<LandingRoiCalculatorProps> = ({
  onSelectService,
  onGoToAuth,
}) => {
  const { formatPrice } = useLocale();
  const [activeTab, setActiveTab] = useState<'candidate' | 'business'>('candidate');

  // État Candidat
  const [candidateAppsCount, setCandidateAppsCount] = useState<number>(20);
  const [targetSalary, setTargetSalary] = useState<number>(650000); // 650k FCFA

  // État Entreprise
  const [invoicesPerMonth, setInvoicesPerMonth] = useState<number>(15);
  const [hourlyValue, setHourlyValue] = useState<number>(15000); // 15k FCFA / h

  // Calculs Candidats
  // Taux de réponse moyen CV classique non optimisé : ~10-15%
  // Taux de réponse avec CV ATS Dokya (Score 98%+) : ~55-70%
  const callbacksWithoutDokya = Math.max(1, Math.round(candidateAppsCount * 0.12));
  const callbacksWithDokya = Math.max(2, Math.round(candidateAppsCount * 0.65));
  const interviewGainPercent = Math.round(((callbacksWithDokya - callbacksWithoutDokya) / callbacksWithoutDokya) * 100);

  // Calculs Entreprise
  // Temps pour rédiger un devis/facture manuel Word/Excel avec vérification OHADA : 45 min
  // Temps avec Dokya (moteur automatisé, TVA 18%, mentions légales) : 2 min
  // Gain de temps : 43 min par document
  const minutesSavedPerDoc = 43;
  const totalMinutesSaved = invoicesPerMonth * minutesSavedPerDoc;
  const totalHoursSaved = Math.round((totalMinutesSaved / 60) * 10) / 10;
  const financialValueSaved = Math.round(totalHoursSaved * hourlyValue);

  return (
    <section id="calculateur-impact" className="py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden">
      {/* Glows d'ambiance */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* Titre */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider shadow-xs">
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulateur d'Impact Réel &amp; ROI</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Calculez Vos Gains Concrets avec Dokya
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
            Que vous cherchiez un emploi à forte valeur ou dirigiez une entreprise, découvrez l'impact mesurable de nos solutions certifiées.
          </p>
        </div>

        {/* Sélecteur de profil (Segmented Control Anti-Pill) */}
        <div className="flex justify-center">
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('candidate')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'candidate'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Candidat &amp; Recherche d'Emploi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Entrepreneur &amp; PME (OHADA)</span>
            </button>
          </div>
        </div>

        {/* Contenu Interactif selon l'Onglet */}
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          {activeTab === 'candidate' ? (
            /* ========================================================================= */
            /* CALCULATEUR CANDIDAT                                                      */
            /* ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Sliders Candidat */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-400" />
                    <span>Optimisation de Votre Taux de Réponse aux Recruteurs</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    75% des CV sont rejetés sans être lus par les filtres ATS. Nos modèles vectoriels garantissent un score &gt; 98%.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Nombre de candidatures envoyées par mois :</span>
                    <span className="font-mono text-indigo-400 text-sm">{candidateAppsCount} candidatures</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={candidateAppsCount}
                    onChange={(e) => setCandidateAppsCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5 envois</span>
                    <span>30 envois</span>
                    <span>60 envois</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Salaire mensuel cible recherché :</span>
                    <span className="font-mono text-cyan-400 text-sm">{formatPrice(targetSalary)}</span>
                  </div>
                  <input
                    type="range"
                    min="200000"
                    max="2500000"
                    step="50000"
                    value={targetSalary}
                    onChange={(e) => setTargetSalary(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatPrice(200000)}</span>
                    <span>{formatPrice(1200000)}</span>
                    <span>{formatPrice(2500000)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Sans Dokya (Word / Canva)</div>
                    <div className="text-lg font-mono font-black text-rose-400 mt-1">{callbacksWithoutDokya} entretiens</div>
                    <div className="text-[10px] text-slate-500">Taux de rejet estimé à 88%</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40">
                    <div className="text-[10px] text-indigo-300 font-bold uppercase">Avec CV ATS Dokya</div>
                    <div className="text-lg font-mono font-black text-emerald-400 mt-1">{callbacksWithDokya} entretiens</div>
                    <div className="text-[10px] text-emerald-400">Taux de passage garanti 98%+</div>
                  </div>
                </div>
              </div>

              {/* Résultat Candidat */}
              <div className="lg:col-span-5">
                <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/80 via-slate-950 to-slate-950 border-2 border-indigo-500/50 space-y-6 text-center shadow-xl">
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Multiplicateur d'Opportunités
                  </div>

                  <div className="space-y-1">
                    <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-300">
                      +{interviewGainPercent}%
                    </div>
                    <div className="text-xs text-slate-400">
                      d'invitations en entretien d'embauche
                    </div>
                  </div>

                  <div className="space-y-2 text-left text-xs border-t border-slate-800 pt-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Parsing sans erreur sur Workday, Taleo, Greenhouse</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Phrases d'impact réécrites avec verbes d'action chiffrés</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Simulateur d'entretien RH pour vous entraîner</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectService('cv')}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-amber-300" />
                    <span>Créer mon CV ATS Optimisé (Dès 1 000 F)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* CALCULATEUR ENTREPRISE                                                    */
            /* ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Sliders Entreprise */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    <span>Gain de Temps &amp; Sérénité Fiscale OHADA</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Fini les calculs manuels de TVA 18%, les erreurs d'arrêté en toutes lettres et les litiges fiscaux.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Nombre de devis &amp; factures émis par mois :</span>
                    <span className="font-mono text-emerald-400 text-sm">{invoicesPerMonth} documents</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="80"
                    step="2"
                    value={invoicesPerMonth}
                    onChange={(e) => setInvoicesPerMonth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>3 docs</span>
                    <span>40 docs</span>
                    <span>80 docs</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Valeur horaire estimée de votre temps :</span>
                    <span className="font-mono text-cyan-400 text-sm">{formatPrice(hourlyValue)} / heure</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="50000"
                    step="2500"
                    value={hourlyValue}
                    onChange={(e) => setHourlyValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatPrice(5000)}</span>
                    <span>{formatPrice(25000)}</span>
                    <span>{formatPrice(50000)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Chaque facture Dokya génère automatiquement le calcul TVA 18%, le NINEA, le Registre de Commerce et l'arrêté de la somme en toutes lettres.
                  </span>
                </div>
              </div>

              {/* Résultat Entreprise */}
              <div className="lg:col-span-5">
                <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/80 via-slate-950 to-slate-950 border-2 border-emerald-500/50 space-y-6 text-center shadow-xl">
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Économie Mensuelle Estimée
                  </div>

                  <div className="space-y-1">
                    <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400">
                      {totalHoursSaved}h
                    </div>
                    <div className="text-xs text-slate-400">
                      de travail administratif économisées chaque mois
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200">
                    Valeur financière réinvestie dans vos ventes : <br />
                    <strong className="text-base text-white font-mono font-black">{formatPrice(financialValueSaved)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectService('facture')}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-emerald-200" />
                    <span>Créer une Facture Pro Conforme OHADA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </section>
  );
};
