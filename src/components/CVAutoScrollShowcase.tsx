import React from 'react';
import { 
  CheckCircle2, 
  Eye, 
  Briefcase, 
  GraduationCap, 
  Star, 
  Zap, 
  ArrowRight,
  TrendingUp,
  Shield,
  FileText
} from 'lucide-react';

export interface CVShowcaseItem {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: string;
  atsScore: number;
  templateStyle: string;
  badgeColor: string;
  accentGradient: string;
  skills: string[];
  summary: string;
}

const showcaseCVs: CVShowcaseItem[] = [
  {
    id: 'cv-1',
    name: 'Mamadou Ndiaye',
    title: 'Ingénieur Logiciel Full-Stack & DevOps',
    location: 'Dakar, Sénégal',
    experience: '6 ans d\'expérience',
    atsScore: 99,
    templateStyle: 'Moderne Tech',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentGradient: 'from-indigo-600 to-blue-600',
    skills: ['TypeScript', 'Next.js', 'Docker', 'Wave API', 'AWS'],
    summary: 'Spécialiste en architecture SaaS résiliente et intégration de systèmes de paiement mobile money.'
  },
  {
    id: 'cv-2',
    name: 'Aïssatou Ba',
    title: 'Responsable Marketing Digital & Growth',
    location: 'Dakar, Sénégal',
    experience: '4 ans d\'expérience',
    atsScore: 97,
    templateStyle: 'Exécutif Pro',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    accentGradient: 'from-purple-600 to-indigo-600',
    skills: ['Google Ads', 'Meta Ads', 'SEO/SEA', 'Analytics', 'CRM Hubspot'],
    summary: 'Pilote la stratégie d\'acquisition digitale et l\'optimisation des taux de conversion e-commerce.'
  },
  {
    id: 'cv-3',
    name: 'Cheikh Tidiane Sow',
    title: 'Chef de Projet BTP & Génie Civil',
    location: 'Thiès, Sénégal',
    experience: '8 ans d\'expérience',
    atsScore: 98,
    templateStyle: 'Structure Ingénieur',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentGradient: 'from-emerald-600 to-teal-600',
    skills: ['AutoCAD', 'MS Project', 'Gestion de chantier', 'Normes ISO'],
    summary: 'Gestion globale de chantiers d\'infrastructures publiques et privées à fort budget.'
  },
  {
    id: 'cv-4',
    name: 'Mariama Cissé',
    title: 'Directrice Ressources Humaines',
    location: 'Dakar, Sénégal',
    experience: '10 ans d\'expérience',
    atsScore: 99,
    templateStyle: 'Élégant Prestige',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    accentGradient: 'from-amber-500 to-orange-500',
    skills: ['Recrutement ATS', 'GPEC', 'Droit du travail', 'Rémunération'],
    summary: 'Expertise avérée en structuration RH, fidélisation des talents et conformité sociale.'
  },
  {
    id: 'cv-5',
    name: 'Papa Ousmane Yade',
    title: 'Analyste Financier & Contrôleur de Gestion',
    location: 'Saint-Louis, Sénégal',
    experience: '5 ans d\'expérience',
    atsScore: 96,
    templateStyle: 'Corporate Finance',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    accentGradient: 'from-sky-600 to-blue-700',
    skills: ['Modélisation Excel', 'SAP', 'Audit Financier', 'Power BI'],
    summary: 'Analyse de la rentabilité financière, établissement de budgets prévisionnels et reporting exécutif.'
  },
  {
    id: 'cv-6',
    name: 'Khadija Diallo',
    title: 'UX/UI Product Designer',
    location: 'Dakar, Sénégal',
    experience: '3 ans d\'expérience',
    atsScore: 95,
    templateStyle: 'Créatif Studio',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    accentGradient: 'from-rose-500 to-pink-600',
    skills: ['Figma', 'Design System', 'User Research', 'Prototypage'],
    summary: 'Conception d\'interfaces web et mobiles centrées sur l\'utilisateur avec un souci du détail élevé.'
  },
  {
    id: 'cv-7',
    name: 'Babacar Kane',
    title: 'Responsable Logistique & Supply Chain',
    location: 'Port Autonome de Dakar',
    experience: '7 ans d\'expérience',
    atsScore: 98,
    templateStyle: 'Opérationnel Pro',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    accentGradient: 'from-teal-600 to-emerald-600',
    skills: ['Douane & Transit', 'WMS', 'Gestion des stocks', 'Achats'],
    summary: 'Optimisation des flux d\'approvisionnement maritimes et terrestres en Afrique de l\'Ouest.'
  },
  {
    id: 'cv-8',
    name: 'Aminata Faye',
    title: 'Juriste d\'Affaires & Conformité',
    location: 'Dakar, Sénégal',
    experience: '5 ans d\'expérience',
    atsScore: 99,
    templateStyle: 'Droit & RSE',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    accentGradient: 'from-slate-700 to-slate-900',
    skills: ['Droit OHADA', 'Contrats commerciaux', 'RGPD/CDP', 'Contentieux'],
    summary: 'Rédaction et négociation de contrats complexes conformes au droit des affaires africain.'
  }
];

interface CVAutoScrollShowcaseProps {
  onSelectCV?: (cv: CVShowcaseItem) => void;
}

export function CVAutoScrollShowcase({ onSelectCV }: CVAutoScrollShowcaseProps) {
  // We duplicate the list to make seamless continuous loops
  const row1 = [...showcaseCVs, ...showcaseCVs];
  const row2 = [...showcaseCVs.slice().reverse(), ...showcaseCVs.slice().reverse()];

  return (
    <section id="modeles" className="py-20 relative overflow-hidden bg-slate-100/70 border-y border-slate-200">
      
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 mb-14 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-xs">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span>Exemples réels de CV générés au Sénégal</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Des modèles de CV professionnels conçus pour{' '}
          <span className="text-indigo-600">
            décrocher des entretiens
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Découvrez en temps réel les exemples de CV créés par nos utilisateurs à Dakar, Thiès et dans toute la sous-région. Chaque document est optimisé pour maximiser le passage des filtres ATS.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold pt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Défilement interactif • Cliquez sur un modèle pour l'adapter à votre profil</span>
        </div>
      </div>

      {/* Marquee Row 1 (Scrolls Left) */}
      <div className="relative w-full overflow-hidden mb-6 py-2">
        {/* Left and Right Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-r from-slate-100 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-l from-slate-100 to-transparent z-20 pointer-events-none" />

        <div className="animate-marquee-left flex gap-6">
          {row1.map((item, index) => (
            <CVShowcaseCard key={`row1-${item.id}-${index}`} item={item} onSelectCV={onSelectCV} />
          ))}
        </div>
      </div>

      {/* Marquee Row 2 (Scrolls Right) */}
      <div className="relative w-full overflow-hidden py-2">
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-r from-slate-100 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-l from-slate-100 to-transparent z-20 pointer-events-none" />

        <div className="animate-marquee-right flex gap-6">
          {row2.map((item, index) => (
            <CVShowcaseCard key={`row2-${item.id}-${index}`} item={item} onSelectCV={onSelectCV} />
          ))}
        </div>
      </div>

      {/* Bottom Key Metrics Bar */}
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-around gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center justify-center gap-1">
              <span>98%</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Taux de passage ATS</div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block" />
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">2 Min</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Temps moyen de création</div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block" />
          <div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">500 FCFA</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Tarif accessible Wave/OM</div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block" />
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              <span>100% Conforme</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Normes Recruteurs Sénégal</div>
          </div>
        </div>
      </div>

    </section>
  );
}

// Single CV Card Component in the Marquee
interface CVShowcaseCardProps {
  key?: string;
  item: CVShowcaseItem;
  onSelectCV?: (cv: CVShowcaseItem) => void;
}

function CVShowcaseCard({ item, onSelectCV }: CVShowcaseCardProps) {
  return (
    <div 
      onClick={() => onSelectCV && onSelectCV(item)}
      className="w-[320px] sm:w-[360px] shrink-0 bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg group cursor-pointer relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top Banner accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${item.accentGradient}`} />

      {/* Header Info */}
      <div className="space-y-3 pt-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Initials Avatar */}
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.accentGradient} text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0`}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate max-w-[170px]">
                {item.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">
                {item.location}
              </p>
            </div>
          </div>

          {/* ATS Score Pill */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
              <span>ATS {item.atsScore}%</span>
            </span>
            <span className="text-[9px] text-slate-400 font-semibold mt-1">Score Maximal</span>
          </div>
        </div>

        {/* Target Job Title & Style Badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[190px]">
            {item.title}
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
            {item.templateStyle}
          </span>
        </div>

        {/* Summary snippet */}
        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          "{item.summary}"
        </p>

        {/* Skills Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.skills.map((skill, i) => (
            <span key={i} className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA on Hover */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-indigo-600 font-bold transition-colors">
        <span className="flex items-center gap-1 text-[11px]">
          <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
          <span>{item.experience}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-indigo-600 font-black group-hover:translate-x-1 transition-transform">
          <span>Utiliser ce modèle</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>

    </div>
  );
}
