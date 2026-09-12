import React, { useState } from 'react';
import { 
  FileCheck, 
  Sparkles, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Briefcase, 
  Receipt, 
  Layers, 
  FileEdit, 
  Share2 
} from 'lucide-react';

interface LandingStepsProps {
  onSelectService: (service: 'cv' | 'facture') => void;
}

export const LandingSteps: React.FC<LandingStepsProps> = ({ onSelectService }) => {
  const [activeAudience, setActiveAudience] = useState<'cv' | 'facture'>('cv');

  const cvSteps = [
    {
      step: '01',
      title: 'Sélectionnez votre modèle ATS certifié',
      desc: 'Choisissez parmi plus de 50 gabarits A4 conçus selon les protocoles de parsing des logiciels de recrutement (Workday, Taleo, Greenhouse).',
      icon: Layers,
      color: 'from-indigo-500 to-indigo-600',
      badge: 'Score Parsing 99%',
      detail: 'Mise en page vectorielle sans tableau bloquant, hiérarchie typographique conforme aux robots ATS.'
    },
    {
      step: '02',
      title: 'Remplissez avec l\'aide de l\'IA intelligente',
      desc: 'Notre moteur IA reformule instantanément vos missions en réalisations chiffrées avec des verbes d\'action à fort impact.',
      icon: Sparkles,
      color: 'from-violet-500 to-purple-600',
      badge: 'Reformulation IA',
      detail: 'Génération automatique de compétences clés adaptées au poste ciblé et lettres de motivation sur-mesure.'
    },
    {
      step: '03',
      title: 'Exportez instantanément en PDF HD & Word',
      desc: 'Téléchargez votre document en PDF vectoriel haute définition pour vos candidatures, et en format Word (.docx) entièrement éditable.',
      icon: Download,
      color: 'from-cyan-500 to-blue-600',
      badge: 'Double Export PDF + Word',
      detail: 'Téléchargements illimités, archivage sécurisé dans votre cloud personnel et modification ultérieure sans frais.'
    }
  ];

  const factureSteps = [
    {
      step: '01',
      title: 'Choisissez votre maquette OHADA & fiscalité',
      desc: 'Facture pro, devis proforma commercial, facture d\'acompte ou situation BTP : toutes les mentions légales requises sont déjà configurées.',
      icon: Receipt,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Standard UEMOA / OHADA',
      detail: 'Champs automatisés pour NINEA, Registre de Commerce (RC), adresse fiscale et coordonnées bancaires.'
    },
    {
      step: '02',
      title: 'Saisissez vos lignes et laissez Dokya calculer',
      desc: 'Calculs instantanés du montant HT, de la TVA légale à 18%, des remises, acomptes et conversion automatique de la somme en toutes lettres.',
      icon: FileEdit,
      color: 'from-teal-500 to-emerald-600',
      badge: 'Arrêté en lettres auto',
      detail: 'Gagnez du temps : transformez un devis accepté en facture définitive en un seul clic sans ressaisie.'
    },
    {
      step: '03',
      title: 'Encaissez par Mobile Money & téléchargez',
      desc: 'Intégrez vos identifiants Wave, Orange Money ou virement bancaire. Exportez votre facture en PDF professionnel certifié.',
      icon: Share2,
      color: 'from-cyan-500 to-emerald-600',
      badge: 'Wave, OM, MTN & Banque',
      detail: 'Reçu officiel, envoi direct par WhatsApp ou email et archivage comptable 10 ans.'
    }
  ];

  const steps = activeAudience === 'cv' ? cvSteps : factureSteps;

  return (
    <section className="w-full py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden">
      {/* Glow d'ambiance */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-700 ${
        activeAudience === 'cv' ? 'bg-indigo-600' : 'bg-emerald-600'
      }`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* En-tête de section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
            <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Processus Fluide &amp; Sans Effort</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Comment ça marche en 3 étapes simples
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Que vous prépariez une candidature décisive ou émettiez une facture pour votre entreprise, Dokya vous guide en quelques clics du modèle vierge au document parfait.
          </p>

          {/* Toggle CV vs Facturation */}
          <div className="pt-2 flex justify-center">
            <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => setActiveAudience('cv')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeAudience === 'cv'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4 text-amber-300" />
                <span>Pour votre Carrière (CV ATS)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAudience('facture')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeAudience === 'facture'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-102'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-200" />
                <span>Pour votre Entreprise (Factures OHADA)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grille des 3 étapes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xl relative group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              >
                {/* Numéro flottant en filigrane */}
                <span className="absolute top-4 right-6 font-mono text-5xl sm:text-6xl font-black text-slate-800/40 select-none group-hover:text-slate-800/80 transition-colors">
                  {item.step}
                </span>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-lg`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2 relative z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{item.detail}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action directe en bas de section */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => onSelectService(activeAudience)}
            className={`px-7 py-3.5 rounded-2xl font-black text-xs sm:text-sm inline-flex items-center gap-2.5 text-white shadow-xl transition-all hover:scale-105 cursor-pointer active:scale-95 ${
              activeAudience === 'cv'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 shadow-indigo-600/30'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <span>
              {activeAudience === 'cv' ? 'Commencer mon CV ATS maintenant' : 'Créer ma première Facture OHADA'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
