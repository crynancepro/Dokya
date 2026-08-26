import React, { useState, useEffect } from 'react';
import { CVFormData, Experience, Education, Language, CoverLetterType, GenerationMode, TemplateStyle } from '../types';
import { ALL_CV_TEMPLATES } from '../data/cvTemplatesList';
import { 
  User, Briefcase, GraduationCap, Award, Sparkles, 
  Plus, Trash2, ChevronRight, ChevronLeft, Check, 
  Settings, Globe, FileText, Mail, Building2, 
  UserCheck, RotateCcw, Target, Send,
  Upload, Camera, X, MapPin, Phone, Linkedin, 
  Wand2, Info, ArrowRight, ArrowLeft, Star
} from 'lucide-react';

interface StepFormProps {
  formData: CVFormData;
  onChange: (updated: CVFormData) => void;
  onSubmit: () => void;
  isLoading: boolean;
  hideModeSelector?: boolean;
  forceMode?: GenerationMode;
  onPreview?: () => void;
  onChangeTemplateRequest?: () => void;
}

const JOB_SUGGESTIONS = [
  "Développeur Full-Stack",
  "Responsable Commercial",
  "Comptable & Gestionnaire",
  "Chef de Projet Digital",
  "Assistant RH & Recrutement",
  "Community Manager",
  "Chargé de Clientèle"
];

export const StepForm: React.FC<StepFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isLoading,
  hideModeSelector = false,
  forceMode,
  onPreview,
  onChangeTemplateRequest
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'no_photo' | 'photo'>('all');
  const activeMode: GenerationMode = forceMode || formData.generationMode || 'cv_only';
  const activeLetterType: CoverLetterType = formData.letterType || 'spontanee';

  // Find active template metadata
  const selectedTemplateMeta = ALL_CV_TEMPLATES.find(t => t.id === formData.templateStyle) || ALL_CV_TEMPLATES[0];
  const personalInfo = formData?.personalInfo || { 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    address: '', 
    city: 'Dakar', 
    country: 'Sénégal', 
    targetJob: '', 
    linkedin: '', 
    portfolio: '', 
    photoUrl: '' 
  };

  // Keyboard shortcut F5: Save / Next Step
  useEffect(() => {
    const handleF5Key = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (currentStep < 5) {
          setCurrentStep(prev => prev + 1);
        } else {
          onSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleF5Key);
    return () => window.removeEventListener('keydown', handleF5Key);
  }, [currentStep, onSubmit]);

  // Mode Switcher Handler
  const handleModeChange = (mode: GenerationMode) => {
    onChange({
      ...formData,
      generationMode: mode
    });
  };

  // Letter Type Handler
  const handleLetterTypeChange = (type: CoverLetterType) => {
    onChange({
      ...formData,
      letterType: type
    });
  };

  // Updates for personal info
  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...formData,
      personalInfo: {
        ...(formData?.personalInfo || {}),
        [field]: value
      }
    });
  };

  // Photo Upload Handler (Base64 conversion)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La photo ne doit pas dépasser 5 Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonalInfo('photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    updatePersonalInfo('photoUrl', '');
  };

  // Quick fill sample data
  const handleFillSample = () => {
    onChange({
      ...formData,
      personalInfo: {
        firstName: 'Moussa',
        lastName: 'Diop',
        email: 'moussa.diop@example.sn',
        phone: '+221 77 123 45 67',
        city: 'Dakar',
        country: 'Sénégal',
        targetJob: 'Développeur Full-Stack Senior',
        address: 'Almadies, Dakar',
        linkedin: 'linkedin.com/in/moussa-diop',
        portfolio: 'github.com/moussa-dev',
        photoUrl: personalInfo.photoUrl || ''
      },
      targetCompany: 'Wave Sénégal',
      highlightsSummary: "5 ans d'expérience en conception d'applications web et mobiles (React, Node.js, Next.js). Passionné par l'écosystème FinTech en Afrique de l'Ouest.",
      experiences: formData.experiences.length > 0 ? formData.experiences : [
        {
          id: 'exp-sample-1',
          company: 'Sonatel',
          position: 'Ingénieur Logiciel Full-Stack',
          location: 'Dakar, Sénégal',
          startDate: 'Janv 2022',
          endDate: 'Présent',
          current: true,
          description: 'Développement de microservices bancaires, réduction de 40% du temps de réponse des APIs, collaboration avec 12 ingénieurs en méthode Agile.'
        }
      ],
      education: formData.education.length > 0 ? formData.education : [
        {
          id: 'edu-sample-1',
          institution: 'ESP Dakar (École Supérieure Polytechnique)',
          degree: 'Master en Informatique & Systèmes Distribués',
          fieldOfStudy: 'Génie Logiciel',
          location: 'Dakar, Sénégal',
          startDate: '2019',
          endDate: '2021',
          current: false
        }
      ]
    });
  };

  // Reset form
  const handleResetPersonalInfo = () => {
    if (window.confirm("Effacer les informations personnelles saisies ?")) {
      onChange({
        ...formData,
        personalInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: 'Dakar',
          country: 'Sénégal',
          targetJob: '',
          linkedin: '',
          portfolio: '',
          photoUrl: ''
        },
        targetCompany: ''
      });
    }
  };

  // Experiences handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      location: 'Dakar, Sénégal',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    };
    onChange({
      ...formData,
      experiences: [...formData.experiences, newExp]
    });
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    onChange({
      ...formData,
      experiences: formData.experiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...formData,
      experiences: formData.experiences.filter((exp) => exp.id !== id)
    });
  };

  // Education handlers
  const addEducation = () => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      location: 'Dakar, Sénégal',
      startDate: '',
      endDate: '',
      current: false
    };
    onChange({
      ...formData,
      education: [...formData.education, newEdu]
    });
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    onChange({
      ...formData,
      education: formData.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: string) => {
    onChange({
      ...formData,
      education: formData.education.filter((edu) => edu.id !== id)
    });
  };

  // Skills handlers
  const updateSkillCategoryName = (index: number, name: string) => {
    const newSkills = [...formData.skills];
    newSkills[index].category = name;
    onChange({ ...formData, skills: newSkills });
  };

  const updateSkillsString = (index: number, rawString: string) => {
    const newSkills = [...formData.skills];
    newSkills[index].skills = rawString.split(',').map((s) => s.trim()).filter(Boolean);
    onChange({ ...formData, skills: newSkills });
  };

  const addSkillCategory = () => {
    onChange({
      ...formData,
      skills: [...formData.skills, { category: 'Nouvelle Catégorie', skills: [] }]
    });
  };

  const removeSkillCategory = (index: number) => {
    onChange({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
  };

  // Languages handlers
  const addLanguage = () => {
    const newLang: Language = { name: '', level: 'Intermédiaire' };
    onChange({ ...formData, languages: [...formData.languages, newLang] });
  };

  const updateLanguage = (index: number, field: keyof Language, value: string) => {
    const newLangs = [...formData.languages];
    newLangs[index] = { ...newLangs[index], [field]: value };
    onChange({ ...formData, languages: newLangs });
  };

  const removeLanguage = (index: number) => {
    onChange({
      ...formData,
      languages: formData.languages.filter((_, i) => i !== index)
    });
  };

  const steps = [
    { number: 1, title: 'Infos Personnelles', icon: User, desc: 'Identité & Contact' },
    { number: 2, title: 'Expériences', icon: Briefcase, desc: 'Parcours pro' },
    { number: 3, title: 'Formations', icon: GraduationCap, desc: 'Diplômes' },
    { number: 4, title: 'Compétences', icon: Award, desc: 'Hard & Soft skills' },
    { number: 5, title: 'Style & IA', icon: Settings, desc: 'Modèles & Génération' },
  ];

  const letterTypesList = [
    {
      id: 'offre' as CoverLetterType,
      title: "Réponse à une offre",
      badge: "Offre d'emploi",
      desc: "Postuler à une annonce précise",
      icon: Target,
      color: "border-indigo-200 bg-indigo-50/50 text-indigo-700"
    },
    {
      id: 'spontanee' as CoverLetterType,
      title: "Candidature spontanée",
      badge: "Spontanée",
      desc: "Proposer directement vos services",
      icon: Send,
      color: "border-emerald-200 bg-emerald-50/50 text-emerald-700"
    },
    {
      id: 'stage' as CoverLetterType,
      title: "Stage / Alternance",
      badge: "Étudiant & Stage",
      desc: "Valoriser votre formation et motivation",
      icon: GraduationCap,
      color: "border-amber-200 bg-amber-50/50 text-amber-700"
    },
    {
      id: 'reconversion' as CoverLetterType,
      title: "Reconversion pro",
      badge: "Compétences transférables",
      desc: "Changement de secteur ou métier",
      icon: RotateCcw,
      color: "border-purple-200 bg-purple-50/50 text-purple-700"
    },
    {
      id: 'recommandation' as CoverLetterType,
      title: "Recommandation / Réseau",
      badge: "Parrainage",
      desc: "Mentionner un contact clé",
      icon: UserCheck,
      color: "border-blue-200 bg-blue-50/50 text-blue-700"
    }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden space-y-0">
      
      {/* ========================================================= */}
      {/* 1. TOP HERO BANNER & GENERATION MODE SELECTOR             */}
      {/* ========================================================= */}
      {!hideModeSelector && (
        <div className="p-5 sm:p-7 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-black text-indigo-300 bg-indigo-950/90 px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Assistant IA Candidature
                </span>
                <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-block">
                  • Normes Sénégal & UEMOA
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" />
                  <span>Paiement Wave & OM</span>
                </span>
              </div>
            </div>

            <div className="max-w-2xl">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Que souhaitez-vous créer aujourd'hui ?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Sélectionnez votre format pour adapter l'assistant et synchroniser vos documents.
              </p>
            </div>

            {/* 2 MODE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              
              {/* Option 1: CV Uniquement */}
              <button
                type="button"
                onClick={() => handleModeChange('cv_only')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  activeMode === 'cv_only'
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-300 text-white shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-400'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeMode === 'cv_only' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800 text-indigo-300 group-hover:bg-slate-700'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      activeMode === 'cv_only' ? 'bg-white text-indigo-900 font-extrabold' : 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/50'
                    }`}>
                      1 000 FCFA
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold mt-0.5">50 Modèles</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                    <span>1. CV Pro ATS</span>
                    {activeMode === 'cv_only' && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-200/90 mt-1 leading-relaxed">
                    Formulaire concentré sur votre CV. Export instantané en PDF HD & Word.
                  </p>
                </div>
              </button>

              {/* Option 2: Lettre Seule */}
              <button
                type="button"
                onClick={() => handleModeChange('letter_only')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  activeMode === 'letter_only'
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-300 text-white shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-400'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeMode === 'letter_only' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800 text-blue-300 group-hover:bg-slate-700'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      activeMode === 'letter_only' ? 'bg-white text-indigo-900 font-extrabold' : 'bg-blue-950/90 text-blue-300 border border-blue-700/50'
                    }`}>
                      1 000 FCFA
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold mt-0.5">5 Styles IA</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                    <span>2. Lettre de Motivation</span>
                    {activeMode === 'letter_only' && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-200/90 mt-1 leading-relaxed">
                    Rédaction IA ciblée (Réponse offre, Spontanée, Stage, Reconversion).
                  </p>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CASE 1: STANDALONE LETTER ONLY FORM                       */}
      {/* ========================================================= */}
      {activeMode === 'letter_only' ? (
        <div className="p-6 sm:p-8 space-y-8 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-100 inline-block mb-1.5">
                Mode Rapide • Lettre de Motivation
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-indigo-600" />
                <span>Générateur de Lettre de Motivation</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Remplir exemple</span>
            </button>
          </div>

          {/* Type of letter cards */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
              1. Type de candidature & Objectif
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {letterTypesList.map((type) => {
                const Icon = type.icon;
                const isSelected = activeLetterType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleLetterTypeChange(type.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{type.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coordonnées & Identité */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                <span>2. Vos Coordonnées</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Champs nécessaires pour l'en-tête</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prénom *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Moussa"
                    value={personalInfo.firstName}
                    onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Diop"
                    value={personalInfo.lastName}
                    onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="moussa.diop@email.sn"
                    value={personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+221 77 123 45 67"
                    value={personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cible & Ton */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>3. Cible de la Lettre & Ton</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Poste visé *</label>
                <input
                  type="text"
                  placeholder="ex: Responsable Commercial / Développeur Web"
                  value={personalInfo.targetJob}
                  onChange={(e) => updatePersonalInfo('targetJob', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entreprise Cible *</label>
                <input
                  type="text"
                  placeholder="ex: Sonatel, Wave, Orange, Baobab..."
                  value={formData.targetCompany || ''}
                  onChange={(e) => onChange({ ...formData, targetCompany: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ton de rédaction</label>
                <select
                  value={formData.letterTone || 'Convaincante'}
                  onChange={(e) => onChange({ ...formData, letterTone: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer"
                >
                  <option value="Convaincante">Convaincante & Percutante (Recommandé)</option>
                  <option value="Formelle">Formelle & Institutionnelle</option>
                  <option value="Dynamique">Dynamique & Proactive</option>
                  <option value="Chaleureuse">Chaleureuse & Humaine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ville de résidence</label>
                <input
                  type="text"
                  placeholder="Dakar, Thiès..."
                  value={personalInfo.city}
                  onChange={(e) => updatePersonalInfo('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  4. Contexte & Consignes particulières pour la lettre
                </label>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Sur-mesure IA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Précisez le contexte de votre candidature et les points clés que l'IA doit mettre en valeur.
              </p>
              <textarea
                rows={4}
                placeholder="Expliquez ici précisément à quoi sert votre lettre et ce que l'IA doit mettre en valeur (ex: Réponse à une offre, candidature spontanée, demande de stage, reconversion, insister sur vos réalisations clés, indiquer votre disponibilité immédiate, etc.)."
                value={formData.letterInstructions ?? formData.highlightsSummary ?? ''}
                onChange={(e) => onChange({ 
                  ...formData, 
                  letterInstructions: e.target.value,
                  highlightsSummary: e.target.value 
                })}
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-sans leading-relaxed placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Action Submit */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Génération de votre lettre par l'IA Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  <span>Générer ma Lettre de Motivation (1 000 FCFA)</span>
                </>
              )}
            </button>
          </div>

        </div>
      ) : (
        /* ========================================================= */
        /* CASE 2: FULL CV + LETTER FORM WIZARD                      */
        /* ========================================================= */
        <div>
          
          {/* ========================================================= */}
          {/* SELECTED TEMPLATE BADGE & GALLERY RETURN BAR             */}
          {/* ========================================================= */}
          <div className="bg-slate-950 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/30" 
                  style={{ backgroundColor: selectedTemplateMeta?.accentColor || formData.themeColor || '#4f46e5' }}
                />
                <span className="text-xs font-bold text-slate-400">
                  Modèle sélectionné :
                </span>
                <span className="text-xs font-black text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span>{selectedTemplateMeta?.label || formData.templateStyle}</span>
                  <span className="text-[10px] text-indigo-400 font-bold hidden sm:inline">({selectedTemplateMeta?.category})</span>
                </span>
              </div>

              {selectedTemplateMeta?.hasPhoto ? (
                <span className="text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span>Avec Photo</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>100% Parsing ATS</span>
                </span>
              )}
            </div>

            {onChangeTemplateRequest && (
              <button
                type="button"
                onClick={onChangeTemplateRequest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 self-end sm:self-auto"
                title="Revenir à la galerie pour choisir un autre modèle"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Changer de modèle</span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* STEPPER BAR NAVIGATION & QUICK ACTIONS                     */}
          {/* ========================================================= */}
          <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto flex-1 max-w-3xl gap-2">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;

                return (
                  <React.Fragment key={step.number}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.number)}
                      className={`flex flex-col sm:flex-row items-center gap-2 group cursor-pointer transition-all ${
                        isCurrent 
                          ? 'text-indigo-700 font-bold' 
                          : isCompleted 
                          ? 'text-indigo-600' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-100 scale-105'
                            : isCompleted
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-white border border-slate-200 text-slate-500 group-hover:border-slate-300'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                      </div>
                      
                      <div className="text-left hidden lg:block">
                        <div className="text-xs font-bold leading-tight">{step.title}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{step.desc}</div>
                      </div>
                    </button>

                    {idx < steps.length - 1 && (
                      <div className={`hidden sm:block flex-1 h-0.5 rounded-full mx-1 ${
                        currentStep > idx + 1 ? 'bg-indigo-500' : 'bg-slate-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
                title="Afficher le CV sur sa page de visualisation dédiée"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voir mon CV plein écran</span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* STEP CONTENT CONTAINER                                    */}
          {/* ========================================================= */}
          <div className="p-5 sm:p-8">
            
            {/* Step Subheader with helper buttons */}
            <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-indigo-100">
                    Étape {currentStep} sur {steps.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                    • Progression sauvegardée automatiquement
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {steps[currentStep - 1].title}
                </h2>
              </div>

              {currentStep === 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-100 shadow-2xs"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Exemple rapide</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPersonalInfo}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    title="Effacer les informations saisies"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Effacer</span>
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* STEP 1: INFOS PERSONNELLES (REDESIGNED MODERN SAAS STYLE) */}
            {/* ========================================================= */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* 1. Identité Principale */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Identité & Titre Professionnel</h3>
                        <p className="text-[11px] text-slate-500">Ces informations figureront en en-tête de votre candidature.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Prénom <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Moussa"
                          value={personalInfo.firstName}
                          onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nom de famille <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Diop"
                          value={personalInfo.lastName}
                          onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Poste Visé with Quick Suggestions */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Poste ou Métier visé <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Recommandé pour cibler l'algorithme ATS</span>
                    </div>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ex: Développeur Full-Stack Senior, Responsable Commercial..."
                        value={personalInfo.targetJob}
                        onChange={(e) => updatePersonalInfo('targetJob', e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Suggestions :</span>
                      {JOB_SUGGESTIONS.slice(0, 4).map((job, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => updatePersonalInfo('targetJob', job)}
                          className="text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                        >
                          + {job}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Coordonnées & Contact */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Coordonnées de Contact</h3>
                        <p className="text-[11px] text-slate-500">Pour permettre aux recruteurs de vous contacter immédiatement.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Adresse Email <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="moussa.diop@email.sn"
                          value={personalInfo.email}
                          onChange={(e) => updatePersonalInfo('email', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Numéro de Téléphone <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="+221 77 123 45 67"
                          value={personalInfo.phone}
                          onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ville & Pays
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Dakar, Sénégal"
                          value={personalInfo.city}
                          onChange={(e) => updatePersonalInfo('city', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Entreprise Cible <span className="text-[10px] font-normal text-slate-400">(pour la lettre)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Sonatel, Wave, Orange..."
                          value={formData.targetCompany || ''}
                          onChange={(e) => onChange({ ...formData, targetCompany: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Photo de Profil (Optionnel) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">Photo de Profil Professionnelle</h3>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Modèles 11 à 20
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Optionnel • Format JPG, PNG ou WEBP (Max 5 Mo).</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/60 p-4 rounded-2xl border border-dashed border-slate-200">
                    <div className="shrink-0">
                      {personalInfo.photoUrl ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md relative group">
                          <img 
                            src={personalInfo.photoUrl} 
                            alt="Photo de profil" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-400 shadow-xs">
                          <Camera className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {personalInfo.photoUrl ? 'Photo importée avec succès' : 'Ajouter un portrait professionnel'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Pour les modèles avec encart photo (Cadre, Design Moderne, Exécutif, etc.).
                        </p>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{personalInfo.photoUrl ? 'Changer la photo' : 'Importer une photo...'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            className="hidden" 
                          />
                        </label>
                        {personalInfo.photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-2 rounded-xl hover:bg-rose-50 transition-all"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Liens & Réseaux Professionnels */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Liens Professionnels (Optionnel)</h3>
                        <p className="text-[11px] text-slate-500">Valorisez votre profil LinkedIn, GitHub ou portfolio en ligne.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Lien LinkedIn</label>
                      <div className="relative">
                        <Linkedin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="linkedin.com/in/mon-profil"
                          value={personalInfo.linkedin || ''}
                          onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Portfolio / Site Web / GitHub</label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="mon-portfolio.sn"
                          value={personalInfo.portfolio || ''}
                          onChange={(e) => updatePersonalInfo('portfolio', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: EXPERIENCES                                       */}
            {/* ========================================================= */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                    <p className="text-xs text-slate-700">
                      Ajoutez vos expériences professionnelles. L'IA Gemini reformulera chaque tâche avec des verbes d'action percutants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une expérience</span>
                  </button>
                </div>

                {formData.experiences.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                    <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">Aucune expérience ajoutée</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Cliquez ci-dessous pour ajouter votre premier poste.</p>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      + Ajouter une expérience
                    </button>
                  </div>
                )}

                {formData.experiences.map((exp, index) => (
                  <div key={exp.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3.5 shadow-xs relative group">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <span>Expérience #{index + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="Supprimer cette expérience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Poste occupé *</label>
                        <input
                          type="text"
                          placeholder="ex: Développeur Web"
                          value={exp.position}
                          onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Entreprise *</label>
                        <input
                          type="text"
                          placeholder="ex: Sonatel"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Période (Début)</label>
                        <input
                          type="text"
                          placeholder="ex: Janv 2022"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Période (Fin)</label>
                        <input
                          type="text"
                          placeholder="ex: Présent ou Déc 2023"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Missions, responsabilités & résultats clés
                      </label>
                      <textarea
                        rows={2}
                        placeholder="ex: Développé des APIs REST, géré la base de données, augmenté le trafic web de 30%..."
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 3: FORMATIONS                                        */}
            {/* ========================================================= */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
                    <p className="text-xs text-slate-700">
                      Indiquez vos diplômes, certifications universitaires ou formations professionnelles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une formation</span>
                  </button>
                </div>

                {formData.education.map((edu, index) => (
                  <div key={edu.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3.5 shadow-xs relative group">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <span>Formation #{index + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEducation(edu.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="Supprimer cette formation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Diplôme / Titre *</label>
                        <input
                          type="text"
                          placeholder="ex: Licence Informatique"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Établissement / Université *</label>
                        <input
                          type="text"
                          placeholder="ex: ESP Dakar / UCAD / BEM"
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Spécialité / Domaine</label>
                        <input
                          type="text"
                          placeholder="ex: Génie Logiciel"
                          value={edu.fieldOfStudy}
                          onChange={(e) => updateEducation(edu.id, 'fieldOfStudy', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Années</label>
                        <input
                          type="text"
                          placeholder="ex: 2020 - 2023"
                          value={edu.startDate}
                          onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 4: COMPETENCES & LANGUES                             */}
            {/* ========================================================= */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* Compétences */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Compétences Techniques & Métier</h3>
                      <p className="text-[11px] text-slate-500">Organisez vos compétences par catégorie clé.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSkillCategory}
                      className="text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter Catégorie</span>
                    </button>
                  </div>

                  {formData.skills.map((cat, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={cat.category}
                          onChange={(e) => updateSkillCategoryName(idx, e.target.value)}
                          className="font-bold text-xs bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none text-slate-900"
                        />
                        {formData.skills.length > 1 && (
                          <button type="button" onClick={() => removeSkillCategory(idx)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Séparez les compétences par des virgules (ex: React, Node.js, Vente B2B)"
                        value={cat.skills.join(', ')}
                        onChange={(e) => updateSkillsString(idx, e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-800"
                      />
                    </div>
                  ))}
                </div>

                {/* Langues */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Langues Maîtrisées</h3>
                      <p className="text-[11px] text-slate-500">Ajoutez votre niveau pour chaque langue parlée.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter Langue</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {formData.languages.map((lang, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          placeholder="ex: Français, Wolof, Anglais"
                          value={lang.name}
                          onChange={(e) => updateLanguage(idx, 'name', e.target.value)}
                          className="w-1/2 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none font-semibold text-slate-800"
                        />
                        <select
                          value={lang.level}
                          onChange={(e) => updateLanguage(idx, 'level', e.target.value as any)}
                          className="w-1/2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none font-semibold text-slate-800 cursor-pointer"
                        >
                          <option value="Débutant">Débutant</option>
                          <option value="Intermédiaire">Intermédiaire</option>
                          <option value="Avancé">Avancé</option>
                          <option value="Courant">Courant</option>
                          <option value="Bilingue / Maternelle">Bilingue / Maternelle</option>
                        </select>
                        {formData.languages.length > 1 && (
                          <button type="button" onClick={() => removeLanguage(idx)} className="text-slate-400 hover:text-rose-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 5: STYLE & OPTIONS IA                                */}
            {/* ========================================================= */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in">
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                        Catalogue des 20 Modèles Professionnels
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choisissez parmi nos 10 modèles ATS épurés ou 10 modèles premium avec photo.
                      </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setTemplateFilter('all')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          templateFilter === 'all'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tous (50)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateFilter('no_photo')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          templateFilter === 'no_photo'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sans Photo (30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateFilter('photo')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          templateFilter === 'photo'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📸 Avec Photo (20)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-[460px] overflow-y-auto pr-1 p-0.5 custom-scrollbar">
                    {ALL_CV_TEMPLATES
                    .filter((st) => {
                      if (templateFilter === 'no_photo') return !st.hasPhoto;
                      if (templateFilter === 'photo') return st.hasPhoto;
                      return true;
                    })
                    .map((st) => {
                      const isSelected = formData.templateStyle === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => onChange({ ...formData, templateStyle: st.id as any })}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full group ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500 shadow-sm font-semibold'
                              : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs truncate group-hover:text-indigo-600 transition-colors">{st.label}</span>
                              {st.hasPhoto ? (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded shrink-0">
                                  📸
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded shrink-0">
                                  ATS
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{st.desc}</div>
                          </div>
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-semibold text-slate-400 truncate">{st.category}</span>
                            {isSelected && (
                              <span className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-0.5">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ready to generate card */}
                <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800">
                  <div>
                    <h4 className="font-bold text-base text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      {activeMode === 'cv_only' ? 'Prêt pour la génération de votre CV ATS !' : 'Prêt pour la génération CV + Lettre !'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {activeMode === 'cv_only'
                        ? "Gemini va restructurer, reformuler et mettre en page votre CV selon les standards de recrutement."
                        : "Gemini va optimiser votre CV et rédiger votre lettre de motivation sur-mesure."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-900/50 transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Génération par l'IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>{activeMode === 'cv_only' ? 'Générer mon CV (1 000 FCFA)' : 'Générer Pack Duo (1 399 FCFA)'}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* STEP CONTROLS (PREVIOUS / NEXT)                           */}
            {/* ========================================================= */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="bg-indigo-600 text-white font-black py-3 px-6 rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-200 ml-auto"
                >
                  <span>Continuer</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isLoading}
                  className="bg-indigo-600 text-white font-black py-3 px-7 rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-200 disabled:opacity-50 ml-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Générer avec l'IA</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
