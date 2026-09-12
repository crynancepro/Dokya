import React, { useState } from 'react';
import { 
  Star, 
  Quote, 
  CheckCircle2, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  MapPin, 
  TrendingUp, 
  Users 
} from 'lucide-react';

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  companyOrLoc: string;
  category: 'candidat' | 'entreprise';
  avatarInitials: string;
  avatarBg: string;
  rating: number;
  date: string;
  headline: string;
  content: string;
  verifiedDoc: string;
  outcomeBadge: string;
}

const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: '1',
    name: 'Aissatou Diallo',
    role: 'Responsable Contrôle de Gestion',
    companyOrLoc: 'Dakar, Sénégal',
    category: 'candidat',
    avatarInitials: 'AD',
    avatarBg: 'bg-indigo-600',
    rating: 5,
    date: 'Il y a 3 jours',
    headline: 'CV présélectionné chez une multinationale en 48 heures',
    content: 'J\'avais postulé pendant 6 mois sans aucune réponse. En refaisant mon CV avec le modèle ATS de Dokya et l\'assistance IA, j\'ai compris que mes anciens CVs sur Canva étaient bloqués par Workday. Première candidature envoyée, premier entretien décroché !',
    verifiedDoc: 'CV Cadre Exécutif ATS',
    outcomeBadge: 'Embauche confirmée'
  },
  {
    id: '2',
    name: 'Mamadou Konaté',
    role: 'Gérant de SARL & Prestataire BTP',
    companyOrLoc: 'Abidjan, Côte d\'Ivoire',
    category: 'entreprise',
    avatarInitials: 'MK',
    avatarBg: 'bg-emerald-600',
    rating: 5,
    date: 'Il y a 1 semaine',
    headline: 'Factures 100% aux normes OHADA et règlements Wave immédiats',
    content: 'Auparavant, mon comptable passait des heures à corriger nos devis et factures sous Excel. Avec Dokya, le NINEA, le RC, la TVA à 18% et l\'arrêté en lettres sont automatiques. Mes clients paient directement via Wave et Orange Money.',
    verifiedDoc: 'Factures BTP & Situations',
    outcomeBadge: 'Gain de 6h / semaine'
  },
  {
    id: '3',
    name: 'Serge Ngouana',
    role: 'Lead Developer Cloud & DevOps',
    companyOrLoc: 'Douala, Cameroun & Télétravail',
    category: 'candidat',
    avatarInitials: 'SN',
    avatarBg: 'bg-cyan-600',
    rating: 5,
    date: 'Il y a 2 semaines',
    headline: 'Double export PDF + Word absolument parfait pour les recruteurs US',
    content: 'Le parsing ATS est bluffant : 100% des mots-clés de mon stack technique ont été détectés lors de mon test. Et pouvoir télécharger le Word (.docx) en plus du PDF est un énorme atout que Canva ou les autres générateurs ne proposent pas.',
    verifiedDoc: 'CV Tech & Ingénierie ATS',
    outcomeBadge: 'Contrat international'
  },
  {
    id: '4',
    name: 'Fatou Bamba',
    role: 'Fondatrice Agence Digitale',
    companyOrLoc: 'Bamako & Dakar',
    category: 'entreprise',
    avatarInitials: 'FB',
    avatarBg: 'bg-teal-600',
    rating: 5,
    date: 'Il y a 5 jours',
    headline: 'La conversion devis en facture en 1 clic nous fait gagner un temps précieux',
    content: 'Nos clients valident nos devis proforma en quelques minutes. Un clic pour transformer en facture d\'acompte, un reçu officiel généré, c\'est ultra pro et cela rassure énormément nos partenaires institutionnels.',
    verifiedDoc: 'Devis & Factures Proforma',
    outcomeBadge: 'Zéro litige client'
  },
  {
    id: '5',
    name: 'Koffi Mensah',
    role: 'Chef de Projet Énergie & Mines',
    companyOrLoc: 'Lomé, Togo',
    category: 'candidat',
    avatarInitials: 'KM',
    avatarBg: 'bg-purple-600',
    rating: 5,
    date: 'Il y a 1 semaine',
    headline: 'Le simulateur d\'entretien et la lettre IA font une vraie différence',
    content: 'Le pack VIP Carrière à 2 500 FCFA est largement rentabilisé. La lettre de motivation générée était percutante, personnalisée selon l\'offre, et le simulateur m\'a préparé aux questions pièges des RH.',
    verifiedDoc: 'Pass VIP Carrière',
    outcomeBadge: 'Score ATS 99%'
  },
  {
    id: '6',
    name: 'Dr. Cheikh Tall',
    role: 'Consultant Senior & Formateur',
    companyOrLoc: 'Dakar & Paris',
    category: 'entreprise',
    avatarInitials: 'CT',
    avatarBg: 'bg-blue-600',
    rating: 5,
    date: 'Il y a 3 jours',
    headline: 'Je recommande Dokya à tous mes étudiants et confrères',
    content: 'Une suite bureautique pensée sur-mesure pour notre zone économique et alignée sur les standards mondiaux. La passerelle GeniusPay avec Wave et Orange Money est d\'une fluidité exemplaire.',
    verifiedDoc: 'Pass Business Annuel',
    outcomeBadge: 'Recommandé 100%'
  }
];

export const LandingTestimonials: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'candidat' | 'entreprise'>('all');

  const filteredList = TESTIMONIALS_DATA.filter(item => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  return (
    <section id="avis" className="w-full py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden bg-slate-950">
      
      {/* Glows d'ambiance */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-emerald-600/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* En-tête de section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Retours d'Expérience &amp; Réussites</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Adopté par plus de 15 000 professionnels et PME
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Découvrez comment Dokya accélère les carrières vers l'international et sécurise la facturation légale au Sénégal et dans toute l'Afrique.
          </p>

          {/* Filtres d'avis */}
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tous les témoignages ({TESTIMONIALS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('candidat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'candidat'
                  ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Briefcase className="w-3 h-3 text-amber-300" />
              <span>Candidats &amp; CV ATS</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('entreprise')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'entreprise'
                  ? 'bg-emerald-600 text-white border border-emerald-400/40 shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Building2 className="w-3 h-3 text-emerald-300" />
              <span>Entreprises &amp; Factures</span>
            </button>
          </div>
        </div>

        {/* Barre des 4 métriques de confiance clés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">15 000+</div>
            <div className="text-[11px] text-slate-400">Documents générés</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">99.2%</div>
            <div className="text-[11px] text-slate-400">Taux de parsing ATS validé</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
              <span>4.9</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-slate-400">Avis clients certifiés (1 200+)</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">&lt; 3 min</div>
            <div className="text-[11px] text-slate-400">Temps moyen de création</div>
          </div>
        </div>

        {/* Grille des avis clients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative group"
            >
              <div className="space-y-4">
                
                {/* En-tête avis avec note & badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t.outcomeBadge}
                  </span>
                </div>

                {/* Titre & Contenu */}
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                    "{t.headline}"
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    {t.content}
                  </p>
                </div>
              </div>

              {/* Auteur & Profil */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${t.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow`}>
                    {t.avatarInitials}
                  </div>
                  <div>
                    <div className="font-bold text-white leading-tight flex items-center gap-1.5">
                      <span>{t.name}</span>
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      {t.role}
                    </div>
                    <div className="text-[9.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{t.companyOrLoc}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
