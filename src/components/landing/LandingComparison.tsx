import React from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';

interface LandingComparisonProps {
  onSelectService: (service: 'cv' | 'facture') => void;
}

const COMPARISON_ROWS = [
  {
    criterion: 'Compatibilité ATS Moteurs Internationaux',
    subtext: 'Validation auprès de Workday, Taleo, Greenhouse sans blocage graphique',
    dokya: true,
    dokyaNote: 'Score 99%+',
    word: 'Moyen',
    wordNote: 'Mise en page souvent brisée',
    canva: false,
    canvaNote: 'Éliminé par les robots (tableaux opaques)'
  },
  {
    criterion: 'Conformité Comptable & Fiscale OHADA / UEMOA',
    subtext: 'Mentions NINEA, Registre du Commerce, TVA 18% & arrêté en toutes lettres',
    dokya: true,
    dokyaNote: '100% Automatisé',
    word: false,
    wordNote: 'Saisie manuelle risquée',
    canva: false,
    canvaNote: 'Non conforme fiscalement'
  },
  {
    criterion: 'Double Export Natif PDF Haute Définition + Word (.docx)',
    subtext: 'Téléchargez simultanément le PDF prêt à l\'envoi et le fichier éditable',
    dokya: true,
    dokyaNote: 'Inclus sans surcoût',
    word: true,
    wordNote: 'Word uniquement',
    canva: false,
    canvaNote: 'Export Word payant / imparfait'
  },
  {
    criterion: 'Règlement Mobile Money Direct (Wave, Orange, MTN)',
    subtext: 'Paiement sans carte bancaire avec activation immédiate en 3 secondes',
    dokya: true,
    dokyaNote: 'Money Fusion 100% instantané',
    word: false,
    wordNote: 'Abonnement carte obligatoire',
    canva: false,
    canvaNote: 'Carte bancaire internationale'
  },
  {
    criterion: 'Intelligence Artificielle Spécialisée Métiers & Droit',
    subtext: 'Reformulation percutante des réalisations et calculs fiscaux automatiques',
    dokya: true,
    dokyaNote: 'IA Gemini intégrée',
    word: false,
    wordNote: 'Pages blanches sans conseil',
    canva: false,
    canvaNote: 'IA générique sans contexte pro'
  },
  {
    criterion: 'Tarifs Flexibles Dès 1 000 FCFA sans Engagement',
    subtext: 'Paiement à l\'acte ou pass mensuel sans prélèvement dissimulé',
    dokya: true,
    dokyaNote: 'Limpide dès 1 000 F',
    word: false,
    wordNote: 'Licence annuelle chère',
    canva: false,
    canvaNote: 'Abonnement mensuel récurrent'
  }
];

export const LandingComparison: React.FC<LandingComparisonProps> = ({ onSelectService }) => {
  return (
    <section id="comparatif" className="w-full py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* Titre & sous-titre */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Pourquoi Choisir Dokya ?</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Tableau Comparatif : Dokya vs Outils Traditionnels
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Pourquoi des milliers de professionnels et d'entrepreneurs abandonnent les modèles bricolés sur Word ou Canva au profit de la précision Dokya.
          </p>
        </div>

        {/* Table responsive */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="p-5 sm:p-6 text-xs font-black uppercase tracking-wider text-slate-400 w-2/5">
                  Fonctionnalités &amp; Garanties
                </th>
                <th className="p-5 sm:p-6 text-xs font-black uppercase tracking-wider text-white bg-indigo-950/40 border-x border-indigo-500/30 text-center w-1/5">
                  <div className="flex items-center justify-center gap-1.5 text-indigo-300">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Dokya Platform</span>
                  </div>
                </th>
                <th className="p-5 sm:p-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-1/5">
                  Modèles Word Classiques
                </th>
                <th className="p-5 sm:p-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-1/5">
                  Canva / Outils Graphiques
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  
                  {/* Critère */}
                  <td className="p-5 sm:p-6 space-y-1">
                    <div className="font-bold text-white text-xs sm:text-sm">
                      {row.criterion}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {row.subtext}
                    </div>
                  </td>

                  {/* Dokya (Mise en valeur) */}
                  <td className="p-5 sm:p-6 bg-indigo-950/20 border-x border-indigo-500/30 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <span className="text-[11px] font-black text-emerald-400 mt-1">
                        {row.dokyaNote}
                      </span>
                    </div>
                  </td>

                  {/* Word */}
                  <td className="p-5 sm:p-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {row.word === true ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : row.word === false ? (
                        <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-400">Partiel</span>
                      )}
                      <span className="text-[10px] text-slate-400 mt-1">
                        {row.wordNote}
                      </span>
                    </div>
                  </td>

                  {/* Canva */}
                  <td className="p-5 sm:p-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {row.canva === true ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 mt-1">
                        {row.canvaNote}
                      </span>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA en dessous du tableau */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => onSelectService('cv')}
            className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <span>Créer mon CV ATS Garanti</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => onSelectService('facture')}
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <span>Créer ma Facture OHADA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
