import React from 'react';
import { CVFormData, CoverLetterType, LetterTone } from '../types';
import { 
  Mail, Building2, User, Phone, MapPin, Sparkles, 
  Target, Send, GraduationCap, RotateCcw, UserCheck, 
  Wand2, FileText, CheckCircle2, MessageSquare, Zap, Loader2, ArrowRight
} from 'lucide-react';

interface LetterEditorFormProps {
  formData: CVFormData;
  onChange: (updated: CVFormData) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onOpenWizard?: () => void;
  onPreview?: () => void;
  onChangeTemplateRequest?: () => void;
}

const LETTER_TYPES = [
  {
    id: 'offre' as CoverLetterType,
    title: "Réponse à une offre",
    badge: "Offre d'emploi",
    desc: "Postuler à une annonce ou un appel à candidatures précis",
    icon: Target,
    borderActive: "border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500"
  },
  {
    id: 'spontanee' as CoverLetterType,
    title: "Candidature spontanée",
    badge: "Spontanée",
    desc: "Proposer directement vos compétences à une entreprise ciblée",
    icon: Send,
    borderActive: "border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500"
  },
  {
    id: 'stage' as CoverLetterType,
    title: "Stage / Alternance",
    badge: "Étudiant & Stage",
    desc: "Valoriser votre parcours académique, projet d'études et motivation",
    icon: GraduationCap,
    borderActive: "border-amber-600 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500"
  },
  {
    id: 'reconversion' as CoverLetterType,
    title: "Reconversion pro",
    badge: "Compétences transférables",
    desc: "Mettre en avant votre nouvelle trajectoire et vos atouts",
    icon: RotateCcw,
    borderActive: "border-purple-600 bg-purple-50/80 text-purple-900 ring-2 ring-purple-500"
  },
  {
    id: 'recommandation' as CoverLetterType,
    title: "Recommandation / Réseau",
    badge: "Parrainage",
    desc: "Mentionner un contact clé ou une recommandation d'un collaborateur",
    icon: UserCheck,
    borderActive: "border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500"
  }
];

const TONES = [
  { id: 'Convaincante' as LetterTone, label: 'Convaincante & Percutante', icon: '⚡' },
  { id: 'Formelle' as LetterTone, label: 'Formelle & Classique', icon: '💼' },
  { id: 'Dynamique' as LetterTone, label: 'Dynamique & Proactive', icon: '🚀' },
  { id: 'Chaleureuse' as LetterTone, label: 'Chaleureuse & Humaine', icon: '❤️' },
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

  const activeType = formData.letterType || 'spontanee';
  const activeTone = formData.letterTone || 'Convaincante';

  const updatePersonalInfo = (field: string, val: string) => {
    onChange({
      ...formData,
      personalInfo: {
        ...personalInfo,
        [field]: val
      }
    });
  };

  const handleFillSample = () => {
    onChange({
      ...formData,
      targetCompany: 'Wave Sénégal',
      letterType: 'offre',
      letterTone: 'Convaincante',
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
      highlightsSummary: "5 ans d'expérience en développement web & mobile (React, Node.js, Next.js). Expertise éprouvée en intégration d'APIs de paiement et microservices bancaires. Motivation forte pour contribuer à l'inclusion financière en Afrique de l'Ouest.",
      letterInstructions: "Candidature pour le poste de Développeur Full-Stack Senior chez Wave Sénégal. Mettre en valeur mes 5 ans d'expérience dans les fintechs, ma maîtrise des architectures microservices et de React/Node.js, ainsi que ma disponibilité immédiate à Dakar."
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800 text-xs">
      
      {/* Selected Template Badge Banner */}
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 ring-2 ring-white/30" />
          <span className="text-xs font-bold text-slate-400">Modèle sélectionné :</span>
          <span className="text-xs font-black text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
            {formData.letterType ? `Format ${formData.letterType.toUpperCase()}` : 'Moderne & Épurée'}
          </span>
          <span className="text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
            Standard UEMOA & International
          </span>
        </div>

        {onChangeTemplateRequest && (
          <button
            type="button"
            onClick={onChangeTemplateRequest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 self-end sm:self-auto"
          >
            <span>← Changer de modèle</span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
              Rédaction Assistée IA
            </span>
            <span className="text-[10px] font-bold text-slate-400">1 000 FCFA</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Formulaire de Lettre de Motivation</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="text-xs font-black text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200"
              title="Voir l'aperçu de la lettre en pleine page"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Voir la lettre plein écran</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFillSample}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer border border-indigo-200/60"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Exemple rapide</span>
          </button>
        </div>
      </div>

      {/* 1. TYPE DE CANDIDATURE */}
      <div className="space-y-2">
        <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
          1. Format de Candidature
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {LETTER_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = activeType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onChange({ ...formData, letterType: type.id })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? type.borderActive + ' shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{type.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{type.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ENTREPRISE CIBLE & POSTE VISÉ */}
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
        <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>2. Cible & Poste Visé</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Entreprise Cible *
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: Wave Sénégal, Sonatel, Orange..."
                value={formData.targetCompany || ''}
                onChange={(e) => onChange({ ...formData, targetCompany: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Intitulé du Poste Visé *
            </label>
            <div className="relative">
              <Target className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: Développeur Full-Stack, Comptable..."
                value={personalInfo.targetJob}
                onChange={(e) => updatePersonalInfo('targetJob', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. VOS COORDONNÉES PERSONNELLES */}
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
        <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>3. Vos Coordonnées (En-tête de lettre)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Prénom *</label>
            <input
              type="text"
              placeholder="Moussa"
              value={personalInfo.firstName}
              onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom *</label>
            <input
              type="text"
              placeholder="Diop"
              value={personalInfo.lastName}
              onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              placeholder="moussa.diop@email.sn"
              value={personalInfo.email}
              onChange={(e) => updatePersonalInfo('email', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Téléphone *</label>
            <input
              type="tel"
              placeholder="+221 77 123 45 67"
              value={personalInfo.phone}
              onChange={(e) => updatePersonalInfo('phone', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Ville</label>
            <input
              type="text"
              placeholder="Dakar"
              value={personalInfo.city}
              onChange={(e) => updatePersonalInfo('city', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              placeholder="Almadies, Dakar"
              value={personalInfo.address}
              onChange={(e) => updatePersonalInfo('address', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. CONTEXTE & CONSIGNES PARTICULIÈRES */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>4. Contexte & Consignes particulières pour la lettre</span>
          </label>
          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            Sur-mesure IA
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Personnalisez la rédaction de l'IA selon vos besoins exacts et vos points forts.
        </p>
        <textarea
          rows={5}
          placeholder="Expliquez ici précisément à quoi sert votre lettre et ce que l'IA doit mettre en valeur (ex: Réponse à une offre, candidature spontanée, demande de stage, reconversion, insister sur vos réalisations clés, indiquer votre disponibilité immédiate, etc.)."
          value={formData.letterInstructions ?? formData.highlightsSummary ?? ''}
          onChange={(e) => onChange({ 
            ...formData, 
            letterInstructions: e.target.value,
            highlightsSummary: e.target.value 
          })}
          className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed placeholder:text-slate-400"
        />
      </div>

      {/* 5. TON DE RÉDACTION */}
      <div className="space-y-2">
        <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
          5. Ton de Rédaction
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TONES.map((t) => {
            const isSelected = activeTone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ ...formData, letterTone: t.id })}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm mb-0.5">{t.icon}</div>
                <div className="text-[11px] truncate">{t.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Génération IA en cours avec Gemini...</span>
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
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-blue-200"
          >
            <span>Voir l'aperçu</span>
          </button>
        )}

        {onOpenWizard && (
          <button
            type="button"
            onClick={onOpenWizard}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <span>Télécharger (1 000 F)</span>
          </button>
        )}
      </div>
      </div>

    </div>
  );
};
