import React from 'react';
import { CVFormData, LetterCategory, CoverLetterType, LetterTone } from '../types';
import { 
  Mail, Building2, User, Phone, MapPin, Sparkles, 
  Target, Send, GraduationCap, RotateCcw, UserCheck, 
  Wand2, FileText, CheckCircle2, MessageSquare, Zap, Loader2, ArrowRight,
  FileCheck, TrendingUp, ShieldCheck, Scale, Clock, Briefcase, Paperclip, Calendar
} from 'lucide-react';
import { AIFormValidationBanner } from './AIFormValidationBanner';
import { validateLetterForm } from '../lib/formValidationUtils';

interface LetterEditorFormProps {
  formData: CVFormData;
  onChange: (updated: CVFormData) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onOpenWizard?: () => void;
  onPreview?: () => void;
  onChangeTemplateRequest?: () => void;
}

interface CategoryOption {
  id: LetterCategory;
  title: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeBorder: string;
  types: {
    id: CoverLetterType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultSubject?: string;
  }[];
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'candidature',
    title: "Candidature & Carrière",
    badge: "Recrutement & Emploi",
    desc: "Motivation, Stage, Démission, Recommandation",
    icon: Briefcase,
    accentColor: "indigo",
    activeBorder: "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500",
    types: [
      {
        id: 'motivation',
        label: "Lettre de Motivation",
        description: "Postuler à un emploi classique",
        icon: Mail,
        defaultSubject: "Candidature au poste de"
      },
      {
        id: 'stage',
        label: "Demande de Stage",
        description: "Stage académique ou alternance",
        icon: GraduationCap,
        defaultSubject: "Demande de stage au sein de"
      },
      {
        id: 'demission',
        label: "Lettre de Démission",
        description: "Notification officielle de départ",
        icon: RotateCcw,
        defaultSubject: "Notification de démission de mes fonctions"
      },
      {
        id: 'recommandation',
        label: "Recommandation / Réseau",
        description: "Appui d'un parrain ou contact clé",
        icon: UserCheck,
        defaultSubject: "Recommandation professionnelle pour"
      },
      {
        id: 'offre',
        label: "Réponse à une Offre",
        description: "Candidature ciblée suite à annonce",
        icon: Target,
        defaultSubject: "Candidature suite à votre offre de"
      },
      {
        id: 'spontanee',
        label: "Candidature Spontanée",
        description: "Proposer directement ses compétences",
        icon: Send,
        defaultSubject: "Candidature spontanée"
      }
    ]
  },
  {
    id: 'administration',
    title: "Administration & Formalités",
    badge: "Officiel & Légal",
    desc: "Demande d'explication, Demande de congé, Visa, Procuration, Résiliation",
    icon: FileCheck,
    accentColor: "blue",
    activeBorder: "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500",
    types: [
      {
        id: 'demande_explication',
        label: "Demande d'explication",
        description: "Réponse officielle et juridique",
        icon: Scale,
        defaultSubject: "Réponse à votre demande d'explication du"
      },
      {
        id: 'demande_conge',
        label: "Demande de Congé",
        description: "Congé annuel, maternité, exceptionnel",
        icon: Clock,
        defaultSubject: "Demande de congés payés annuels"
      },
      {
        id: 'visa',
        label: "Demande de Visa",
        description: "Attestation consulaire & voyage",
        icon: ShieldCheck,
        defaultSubject: "Demande d'attestation consulaire / Visa"
      },
      {
        id: 'procuration',
        label: "Procuration Officielle",
        description: "Mandat de représentation légale",
        icon: UserCheck,
        defaultSubject: "Lettre de procuration et délégation de pouvoir"
      },
      {
        id: 'resiliation',
        label: "Résiliation de Contrat",
        description: "Bail, contrat, assurance, abonnement",
        icon: RotateCcw,
        defaultSubject: "Résiliation de contrat"
      }
    ]
  },
  {
    id: 'business',
    title: "Business & Commercial",
    badge: "B2B & Ventes",
    desc: "Proposition commerciale, Relance de paiement, Partenariat",
    icon: TrendingUp,
    accentColor: "emerald",
    activeBorder: "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500",
    types: [
      {
        id: 'proposition_commerciale',
        label: "Proposition Commerciale",
        description: "Devis d'accompagnement & offre",
        icon: FileText,
        defaultSubject: "Proposition commerciale d'accompagnement"
      },
      {
        id: 'relance_paiement',
        label: "Relance de Paiement",
        description: "Rappel facture impayée (amiable / ferme)",
        icon: Clock,
        defaultSubject: "Relance pour règlement de la facture N°"
      },
      {
        id: 'partenariat',
        label: "Demande de Partenariat",
        description: "Alliance stratégique ou synergie B2B",
        icon: Send,
        defaultSubject: "Proposition de partenariat stratégique"
      }
    ]
  },
  {
    id: 'sur_mesure',
    title: "Sur-Mesure / Autre",
    badge: "100% Libre",
    desc: "Saisie totalement libre du sujet et du contexte",
    icon: Wand2,
    accentColor: "amber",
    activeBorder: "border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500",
    types: [
      {
        id: 'sur_mesure',
        label: "Lettre Sur-Mesure",
        description: "Rédiger n'importe quel sujet personnalisé",
        icon: Wand2,
        defaultSubject: "Objet :"
      }
    ]
  }
];

const SUGGESTED_INSTRUCTIONS = [
  { label: "+ Traitement urgent", snippet: "Mentionner le caractère urgent de ce traitement avec une réponse souhaitée dans les meilleurs délais." },
  { label: "+ Demande d'entretien / RDV", snippet: "Solliciter expressément un entretien ou rendez-vous d'échange dans les prochains jours." },
  { label: "+ Mentionner les pièces jointes", snippet: "Faire expressément référence aux pièces jointes et justificatifs annexés à ce pli." },
  { label: "+ Référence au contrat / dossier", snippet: "Faire mention explicite du numéro de contrat / dossier de référence en objet et en corps de texte." }
];

const TONES: { id: LetterTone; label: string; icon: string; desc: string }[] = [
  { id: 'Convaincante', label: 'Persuasive & Percutante', icon: '⚡', desc: 'Ton captivant et orienté impact' },
  { id: 'Formelle', label: 'Formelle & Classique', icon: '💼', desc: 'Respect rigoureux des usages protocolaires' },
  { id: 'Dynamique', label: 'Dynamique & Proactive', icon: '🚀', desc: 'Énergie, force de proposition et agilité' },
  { id: 'Chaleureuse', label: 'Chaleureuse & Humaine', icon: '🤝', desc: 'Empathie, proximité et courtoisie' },
];

export const LetterEditorForm: React.FC<LetterEditorFormProps> = ({
  formData,
  onChange,
  onGenerate,
  isLoading,
  onOpenWizard,
  onPreview,
  onChangeTemplateRequest
}) => {
  const personalInfo = formData?.personalInfo || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal',
    targetJob: ''
  };

  // Current category & type
  const activeCategory: LetterCategory = formData.letterCategory || (
    formData.letterType === 'demande_explication' || formData.letterType === 'demande_conge' || formData.letterType === 'visa' || formData.letterType === 'procuration' || formData.letterType === 'resiliation'
      ? 'administration'
      : formData.letterType === 'proposition_commerciale' || formData.letterType === 'relance_paiement' || formData.letterType === 'partenariat'
      ? 'business'
      : formData.letterType === 'sur_mesure'
      ? 'sur_mesure'
      : 'candidature'
  );

  const selectedCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  const activeType: CoverLetterType = formData.letterType || selectedCategoryObj.types[0]?.id || 'motivation';
  const activeTone: LetterTone = formData.letterTone || 'Convaincante';

  const isCandidature = activeCategory === 'candidature';

  const updatePersonalInfo = (field: string, val: string) => {
    onChange({
      ...formData,
      personalInfo: {
        ...personalInfo,
        [field]: val
      }
    });
  };

  const handleSelectCategory = (catId: LetterCategory) => {
    const targetCat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
    const defaultType = targetCat.types[0]?.id || 'motivation';
    const defaultSubj = targetCat.types[0]?.defaultSubject || '';

    onChange({
      ...formData,
      letterCategory: catId,
      letterType: defaultType,
      letterSubject: catId === 'candidature' ? formData.letterSubject : (formData.letterSubject || defaultSubj)
    });
  };

  const handleSelectType = (typeId: CoverLetterType, defaultSubj?: string) => {
    onChange({
      ...formData,
      letterType: typeId,
      letterSubject: (!formData.letterSubject || formData.letterSubject === 'Objet :') && defaultSubj ? defaultSubj : formData.letterSubject
    });
  };

  // Badge instruction click helper
  const handleInsertInstruction = (snippet: string) => {
    const current = (formData.letterInstructions || formData.highlightsSummary || '').trim();
    if (current.includes(snippet)) return; // already added

    const updated = current ? `${current}\n- ${snippet}` : `- ${snippet}`;
    onChange({
      ...formData,
      letterInstructions: updated,
      highlightsSummary: updated
    });
  };

  // Quick sample tailored to active category
  const handleFillSample = () => {
    if (activeCategory === 'candidature') {
      onChange({
        ...formData,
        letterCategory: 'candidature',
        letterType: 'motivation',
        targetCompany: 'Wave Sénégal',
        letterTone: 'Convaincante',
        letterSubject: 'Candidature au poste de Développeur Full-Stack Senior',
        personalInfo: {
          firstName: 'Moussa',
          lastName: 'Diop',
          email: 'moussa.diop@example.sn',
          phone: '+221 77 123 45 67',
          city: 'Dakar',
          country: 'Sénégal',
          targetJob: 'Développeur Full-Stack Senior',
          address: 'Almadies, Dakar'
        },
        highlightsSummary: "5 ans d'expérience en développement web & mobile (React, Node.js, Next.js). Expertise éprouvée en intégration d'APIs de paiement et microservices bancaires.",
        letterInstructions: "Candidature pour le poste de Développeur Full-Stack Senior chez Wave Sénégal. Mettre en valeur mes 5 ans d'expérience dans les fintechs, ma maîtrise des architectures microservices et de React/Node.js, ainsi que ma disponibilité immédiate à Dakar."
      });
    } else if (activeCategory === 'administration') {
      onChange({
        ...formData,
        letterCategory: 'administration',
        letterType: 'demande_conge',
        targetCompany: 'Direction des Ressources Humaines - Société Générale Sénégal',
        letterSubject: "Demande de congés payés annuels (Période du 15 au 30 Novembre 2026)",
        letterTone: 'Formelle',
        personalInfo: {
          firstName: 'Fatou',
          lastName: 'Sow',
          email: 'fatou.sow@societegenerale.sn',
          phone: '+221 78 456 78 90',
          city: 'Dakar',
          country: 'Sénégal',
          targetJob: 'Analyste Financière',
          address: 'Plateau, Dakar'
        },
        highlightsSummary: "Sollicite un congé de 15 jours pour convenances personnelles après validation préalable de mon responsable hiérarchique.",
        letterInstructions: "Demande de congé annuel de 15 jours ouvrables. Préciser que tous les dossiers en cours ont été entièrement transmis à mon binôme pour assurer la continuité opérationnelle du service sans interruption."
      });
    } else if (activeCategory === 'business') {
      onChange({
        ...formData,
        letterCategory: 'business',
        letterType: 'proposition_commerciale',
        targetCompany: 'Groupe Sedima Sénégal (À l\'attention de la Direction Commerciale)',
        letterSubject: "Proposition d'accompagnement stratégique et déploiement de solutions digitales",
        letterTone: 'Convaincante',
        personalInfo: {
          firstName: 'Ibrahima',
          lastName: 'Ndiaye',
          email: 'ibrahima.ndiaye@tech-innov.sn',
          phone: '+221 70 888 99 00',
          city: 'Dakar',
          country: 'Sénégal',
          targetJob: 'Directeur Conseil & Solutions',
          address: 'Mermoz, Dakar'
        },
        highlightsSummary: "Offre d'accompagnement clé en main pour optimiser la supply chain et automatiser la facturation B2B.",
        letterInstructions: "Présenter les atouts de notre solution SaaS, nos références avec plus de 20 entreprises en zone UEMOA et proposer un atelier de démonstration sans engagement de 30 minutes la semaine prochaine."
      });
    } else {
      onChange({
        ...formData,
        letterCategory: 'sur_mesure',
        letterType: 'sur_mesure',
        targetCompany: 'Société Immobilière du Cap-Vert (SICAP)',
        letterSubject: "Demande de renouvellement de bail commercial et révision des charges",
        letterTone: 'Formelle',
        personalInfo: {
          firstName: 'Aissatou',
          lastName: 'Kane',
          email: 'aissatou.kane@cabinet-kane.sn',
          phone: '+221 76 333 22 11',
          city: 'Dakar',
          country: 'Sénégal',
          targetJob: 'Gérante de Cabinet',
          address: 'Point E, Dakar'
        },
        highlightsSummary: "Locataire fidèle depuis 5 ans dans vos locaux, demande de reconduction du contrat pour 3 ans supplémentaires.",
        letterInstructions: "Demande officielle de renouvellement de contrat de bail commercial. Souligner le paiement ponctuel et irréprochable de tous les loyers depuis 5 ans et solliciter une régularisation détaillée des charges locatives communes."
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden text-slate-800 text-xs">
      
      {/* Selected Template Badge Banner */}
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-400/30 animate-pulse" />
          <span className="text-xs font-bold text-slate-400">Catégorie active :</span>
          <span className="text-xs font-black text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 shadow-inner">
            {selectedCategoryObj.title}
          </span>
          <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
            Format Officiel A4 & Téléchargement HD
          </span>
        </div>

        {onChangeTemplateRequest && (
          <button
            type="button"
            onClick={onChangeTemplateRequest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 self-end sm:self-auto"
          >
            <span>← Galerie de modèles</span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-7 space-y-7">
        {/* Real-Time Form Validation Banner */}
        <AIFormValidationBanner
          report={validateLetterForm(formData)}
          onEnrichAI={onGenerate}
          enrichButtonLabel="Rédiger & Générer la lettre complète avec l'IA"
          isGenerating={isLoading}
        />

        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-200">
                Générateur IA Universel
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                1 000 FCFA
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Mail className="w-6 h-6 text-indigo-600 shrink-0" />
              <span>Générateur Universel de Lettres IA</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rédigez tout type de lettre officielle, professionnelle, administrative, commerciale ou sur-mesure conforme aux normes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 active:scale-95"
                title="Consulter le document en plein écran"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voir la lettre plein écran</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-amber-200/80 active:scale-95"
              title="Pré-remplir un exemple pertinent pour cette catégorie"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Exemple rapide</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. SÉLECTEUR DE CATÉGORIES & FORMAT DE LETTRE DYNAMIQUE                   */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
              <span>Catégorie de Lettre & Format</span>
            </label>
            <span className="text-[11px] text-slate-400 font-semibold">
              Choisissez votre domaine
            </span>
          </div>

          {/* Dynamic 4 Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full relative group ${
                    isSelected
                      ? cat.activeBorder + ' shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-200/80 text-indigo-950 font-black' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.badge}
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-900 leading-tight">
                      {cat.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {cat.desc}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-700">
                      <span>Sélectionné</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-types selector for the active category */}
          {selectedCategoryObj.types.length > 1 && (
            <div className="pt-2">
              <p className="text-[11px] font-bold text-slate-600 mb-2">
                Type précis de document ({selectedCategoryObj.title}) :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedCategoryObj.types.map((subType) => {
                  const SubIcon = subType.icon;
                  const isTypeActive = activeType === subType.id;
                  return (
                    <button
                      key={subType.id}
                      type="button"
                      onClick={() => handleSelectType(subType.id, subType.defaultSubject)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isTypeActive
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <SubIcon className={`w-4 h-4 shrink-0 ${isTypeActive ? 'text-white' : 'text-indigo-600'}`} />
                      <div className="min-w-0">
                        <div className="font-black text-xs truncate">{subType.label}</div>
                        <div className={`text-[10px] truncate ${isTypeActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {subType.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. ADAPTATION DYNAMIQUE : DESTINATAIRE ET OBJET                           */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">2</span>
            <span>
              {isCandidature ? "2. Entreprise Cible & Poste Visé" : "2. Destinataire & Objet de la Lettre"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: Recipient / Company */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                {isCandidature 
                  ? "Entreprise / Organisation Cible *" 
                  : "Destinataire (ex: Direction, Client, Propriétaire) *"
                }
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    isCandidature 
                      ? "Ex: Wave Sénégal, Sonatel, Orange, Ministère..." 
                      : "Ex: Direction Générale, Client ABC, Propriétaire du logement..."
                  }
                  value={formData.targetCompany || ''}
                  onChange={(e) => onChange({ ...formData, targetCompany: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Field 2: Subject / Target Job */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                {isCandidature 
                  ? "Intitulé du Poste Visé *" 
                  : "Objet de la lettre *"
                }
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {isCandidature ? (
                  <input
                    type="text"
                    placeholder="Ex: Développeur Full-Stack, Comptable, Chef de Projet..."
                    value={personalInfo.targetJob}
                    onChange={(e) => updatePersonalInfo('targetJob', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-xs"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Demande de congé annuel du..., Réponse à demande d'explication..."
                    value={formData.letterSubject || ''}
                    onChange={(e) => onChange({ 
                      ...formData, 
                      letterSubject: e.target.value,
                      personalInfo: { ...personalInfo, targetJob: e.target.value } 
                    })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-xs"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. COORDONNÉES DE L'EXPÉDITEUR (EN-TÊTE OFFICIEL)                         */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">3</span>
            <span>3. Coordonnées de l'Expéditeur (En-tête officiel)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                placeholder="Moussa"
                value={personalInfo.firstName}
                onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                placeholder="Diop"
                value={personalInfo.lastName}
                onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                placeholder="moussa.diop@email.sn"
                value={personalInfo.email}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                placeholder="+221 77 123 45 67"
                value={personalInfo.phone}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Ville</label>
              <input
                type="text"
                placeholder="Dakar"
                value={personalInfo.city}
                onChange={(e) => updatePersonalInfo('city', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                placeholder="Almadies, Dakar"
                value={personalInfo.address}
                onChange={(e) => updatePersonalInfo('address', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. CONTEXTE ET CONSIGNES INTELLIGENTES (AVEC BADGES CLIQUABLES)          */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">4</span>
              <span>4. Contexte & Consignes Particulières pour la Lettre</span>
            </label>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Assistance IA Sur-Mesure
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Détaillez vos arguments, dates clés ou circonstances. Cliquez sur les badges ci-dessous pour insérer des instructions types en un clic :
          </p>

          {/* CLICKABLE BADGES FOR SMART INSTRUCTIONS */}
          <div className="flex items-center gap-2 flex-wrap">
            {SUGGESTED_INSTRUCTIONS.map((badge, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertInstruction(badge.snippet)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                title={`Insérer : ${badge.snippet}`}
              >
                <span>{badge.label}</span>
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            placeholder={
              isCandidature
                ? "Expliquez ici précisément à quoi sert votre lettre et ce que l'IA doit mettre en valeur (ex: insister sur vos réalisations clés, indiquer votre disponibilité immédiate, etc.)."
                : "Expliquez ici précisément le contexte (dates, faits, historique du dossier, références de contrat, montant ou accord préalable...) que l'IA doit intégrer de manière rigoureuse dans la lettre."
            }
            value={formData.letterInstructions ?? formData.highlightsSummary ?? ''}
            onChange={(e) => onChange({ 
              ...formData, 
              letterInstructions: e.target.value,
              highlightsSummary: e.target.value 
            })}
            className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed transition-all shadow-xs"
          />
        </div>

        {/* ========================================================================= */}
        {/* 5. TON DE RÉDACTION                                                       */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">5</span>
            <span>5. Ton de Rédaction de l'IA</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TONES.map((t) => {
              const isSelected = activeTone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ ...formData, letterTone: t.id })}
                  className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 ring-2 ring-indigo-500/50 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="font-black text-xs text-slate-900 leading-tight">{t.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUBMIT & CALL TO ACTIONS                                                  */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-75 disabled:cursor-wait"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rédaction IA en cours avec Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Générer & Voir ma Lettre en plein écran</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-200/80 active:scale-95"
            >
              <span>Voir l'aperçu</span>
            </button>
          )}

          {onOpenWizard && (
            <button
              type="button"
              onClick={onOpenWizard}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <span>Débloquer (1 000 F)</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
