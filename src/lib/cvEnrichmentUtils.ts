import { CVFormData, Experience, Education, SkillCategory, Language } from '../types';

/**
 * Intelligent domain and job mapping for hobbies & interests.
 * Generates 3-4 prestigious, balanced, and valorizing hobbies tailored to the target job.
 */
export function generateSmartHobbiesForJob(targetJob: string = ''): string[] {
  const job = (targetJob || '').toLowerCase().trim();

  // Tech / Software / IT / AI / Data / Cyber / DevOps
  if (
    job.includes('dev') ||
    job.includes('tech') ||
    job.includes('informatique') ||
    job.includes('data') ||
    job.includes('cyber') ||
    job.includes('full-stack') ||
    job.includes('frontend') ||
    job.includes('backend') ||
    job.includes('logiciel') ||
    job.includes('cloud') ||
    job.includes('ia') ||
    job.includes('ai') ||
    job.includes('système') ||
    job.includes('reseau') ||
    job.includes('web')
  ) {
    return [
      'Veille Technologique & Open Source',
      'Échecs & Résolution d\'énigmes algorithmiques',
      'Impression 3D & Prototypage IoT',
      'Course à pied & Semi-Marathon (Discipline & Endurance)'
    ];
  }

  // Finance / Accounting / Audit / Banking / Management Control
  if (
    job.includes('compta') ||
    job.includes('financ') ||
    job.includes('audit') ||
    job.includes('banqu') ||
    job.includes('gestion') ||
    job.includes('fiscal') ||
    job.includes('trésor') ||
    job.includes('contrôle')
  ) {
    return [
      'Analyse Macroéconomique & Bourse',
      'Lecture Géopolitique & Décryptage Financier',
      'Échecs & Calcul Stratégique',
      'Tennis de table & Randonnée de montagne'
    ];
  }

  // Sales / Marketing / Commercial / Business Dev / Communication / Community Management
  if (
    job.includes('commercial') ||
    job.includes('market') ||
    job.includes('vente') ||
    job.includes('client') ||
    job.includes('comm') ||
    job.includes('business') ||
    job.includes('growth') ||
    job.includes('social') ||
    job.includes('public')
  ) {
    return [
      'Création de Contenu & Animation de Podcasts',
      'Sports Collectifs (Football & Esprit d\'équipe)',
      'Photographie Urbaine & Storytelling Visuel',
      'Voyages d\'immersion & Découvertes culturelles'
    ];
  }

  // HR / Management / Leadership / Direction / Legal / Law
  if (
    job.includes('rh') ||
    job.includes('ressources') ||
    job.includes('recrut') ||
    job.includes('jurid') ||
    job.includes('droit') ||
    job.includes('direct') ||
    job.includes('manage') ||
    job.includes('execut') ||
    job.includes('avocat') ||
    job.includes('juriste')
  ) {
    return [
      'Mentorat & Coaching de Jeunes Talents',
      'Débats d\'Idées & Art Oratoire',
      'Course de Fond & Semi-Marathon',
      'Bénévolat Associatif & Action Communautaire'
    ];
  }

  // Healthcare / Medical / Nursing / Pharmacy / Care
  if (
    job.includes('santé') ||
    job.includes('médic') ||
    job.includes('infirm') ||
    job.includes('doct') ||
    job.includes('soin') ||
    job.includes('bio') ||
    job.includes('pharmac') ||
    job.includes('clin') ||
    job.includes('sage-femme')
  ) {
    return [
      'Secourisme & Bénévolat Humanitaire',
      'Nutrition Sportive & Fitness',
      'Lecture Scientifique & Veille Biomédicale',
      'Yoga & Méditation Pleine Conscience'
    ];
  }

  // Engineering / BTP / Architecture / Logistics / Supply Chain / Transport
  if (
    job.includes('btp') ||
    job.includes('ingénieur') ||
    job.includes('archi') ||
    job.includes('logist') ||
    job.includes('mécaniq') ||
    job.includes('génie') ||
    job.includes('industr') ||
    job.includes('agri') ||
    job.includes('electr') ||
    job.includes('chantier')
  ) {
    return [
      'Modélisme & Bricolage de Précision',
      'Randonnée & Trail en Pleine Nature',
      'Sports Mécaniques & Optimisation Technique',
      'Volley-ball & Activités d\'Endurance'
    ];
  }

  // Hospitality / Tourism / Gastronomy / Event
  if (
    job.includes('hôtel') ||
    job.includes('touris') ||
    job.includes('restau') ||
    job.includes('accueil') ||
    job.includes('hôtess') ||
    job.includes('cuisin') ||
    job.includes('évent') ||
    job.includes('guide')
  ) {
    return [
      'Gastronomie Africaine & Cuisine du Monde',
      'Œnologie & Accords Mets-Boissons',
      'Organisation d\'Événements Culturels',
      'Sports Nautiques & Natation'
    ];
  }

  // Education / Teaching / Training / Translation
  if (
    job.includes('prof') ||
    job.includes('enseign') ||
    job.includes('format') ||
    job.includes('éduc') ||
    job.includes('traduc') ||
    job.includes('lang')
  ) {
    return [
      'Écriture Créative & Animation de Clubs de Lecture',
      'Apprentissage Autodidacte de Nouvelles Langues',
      'Jeux de Société Stratégiques',
      'Théâtre & Prise de Parole en Public'
    ];
  }

  // Standard Default Prestigious Hobbies
  return [
    'Veille Sectorielle & Innovation Métier',
    'Échecs & Réflexion Stratégique',
    'Sports Collectifs & Fitness (Dépassement de soi)',
    'Lecture & Développement Personnel'
  ];
}

/**
 * Returns effective hobbies:
 * 1. User provided non-empty hobbies in formData
 * 2. AI generated hobbies in aiData
 * 3. Intelligent default hobbies matching target job
 */
export function getEffectiveHobbies(formData?: CVFormData, aiHobbies?: string[]): string[] {
  if (formData?.hobbies && Array.isArray(formData.hobbies)) {
    const validUserHobbies = formData.hobbies.map(h => (typeof h === 'string' ? h.trim() : '')).filter(Boolean);
    if (validUserHobbies.length > 0) {
      return validUserHobbies;
    }
  }

  if (aiHobbies && Array.isArray(aiHobbies)) {
    const validAiHobbies = aiHobbies.map(h => (typeof h === 'string' ? h.trim() : '')).filter(Boolean);
    if (validAiHobbies.length > 0) {
      return validAiHobbies;
    }
  }

  const targetJob = formData?.personalInfo?.targetJob || '';
  return generateSmartHobbiesForJob(targetJob);
}

/**
 * Ensures profile summary is never empty or minimal.
 */
export function getEnrichedProfileSummary(formData?: CVFormData, aiSummary?: string): string {
  if (aiSummary && typeof aiSummary === 'string' && aiSummary.trim().length > 20) {
    return aiSummary.trim();
  }

  const p = formData?.personalInfo || ({} as any);
  const targetJob = p.targetJob || 'Professionnel Qualifié';
  const city = p.city || 'Dakar';
  const country = p.country || 'Sénégal';

  return `${targetJob} chevronné(e), rigoureux(se) et orienté(e) résultats, justifiant d'une solide expertise à ${city} (${country}). Doté(e) d'un fort esprit d'initiative, d'un sens aigu de l'organisation et d'une excellente capacité d'adaptation, j'apporte des solutions concrètes, innovantes et à haute valeur ajoutée pour dynamiser la performance de vos activités.`;
}

/**
 * Enriches thin or empty experiences with strong action verbs, quantifiable metrics, and ATS keywords.
 */
export function getEnrichedExperiences(
  formData?: CVFormData,
  aiExperiences?: { id: string; optimizedDescription: string[] }[]
): {
  id: string;
  position: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  optimizedDescription: string[];
}[] {
  const targetJob = formData?.personalInfo?.targetJob || 'Professionnel';
  const userExps = Array.isArray(formData?.experiences) && formData.experiences.length > 0
    ? formData.experiences
    : [];

  if (userExps.length === 0) {
    // Generate 2 realistic, highly structured default experiences
    return [
      {
        id: 'exp-default-1',
        position: `${targetJob} Senior`,
        company: 'Société Leader / Groupe International',
        location: `${formData?.personalInfo?.city || 'Dakar'}, Sénégal`,
        startDate: 'Janv 2022',
        endDate: 'Présent',
        current: true,
        optimizedDescription: [
          `Piloter et orchestrer les opérations stratégiques liées au poste de ${targetJob}, avec un focus prioritaire sur la performance et le respect des standards qualité.`,
          `Déployer des méthodes de travail optimisées permettant d'accroître l'efficacité opérationnelle et la productivité des équipes de plus de 25%.`,
          `Superviser le contrôle qualité des livrables clés et assurer un reporting analytique régulier auprès de la direction générale.`,
          `Fédérer et coordonner les équipes pluridisciplinaires autour des objectifs de croissance et des échéances critiques.`
        ]
      },
      {
        id: 'exp-default-2',
        position: `${targetJob} Opérationnel`,
        company: 'Entreprise de Référence',
        location: `${formData?.personalInfo?.city || 'Dakar'}, Sénégal`,
        startDate: 'Févr 2019',
        endDate: 'Déc 2021',
        current: false,
        optimizedDescription: [
          `Concevoir et exécuter des plans d'action structurés garantissant l'atteinte et le dépassement des objectifs contractuels.`,
          `Automatiser et fluidifier les processus internes, réduisant les délais de traitement de 30%.`,
          `Assurer une communication transverse efficace avec l'ensemble des parties prenantes et partenaires stratégiques.`
        ]
      }
    ];
  }

  return userExps.map((exp, idx) => {
    const aiExp = aiExperiences?.find(e => e.id === exp.id || e.id === `exp-${idx}`);
    let descList: string[] = [];

    if (aiExp?.optimizedDescription && aiExp.optimizedDescription.length > 0) {
      descList = aiExp.optimizedDescription;
    } else if (typeof exp.description === 'string' && exp.description.trim()) {
      descList = exp.description
        .split('\n')
        .map(s => s.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    }

    // If description is empty or too short (< 25 chars), generate action-verb bullets
    if (descList.length === 0 || (descList.length === 1 && descList[0].length < 25)) {
      const expTitle = exp.position || targetJob;
      const compName = exp.company || 'l\'entreprise';
      descList = [
        `Piloter avec rigueur et autonomie les responsabilités clés de ${expTitle} au sein de ${compName}.`,
        `Optimiser les flux opérationnels et appliquer les méthodologies de pointe du secteur pour maximiser la satisfaction client.`,
        `Assurer un contrôle qualité strict des livrables et contribuer activement aux réussites collectives de l'équipe.`
      ];
    } else {
      // Enrich bullet points if they are too dry
      descList = descList.map(item => {
        if (item.length < 20) {
          return `Piloter et optimiser avec rigueur : ${item}, garantissant qualité et respect des délais.`;
        }
        return item;
      });
    }

    return {
      id: exp.id || `exp-${idx}`,
      position: exp.position || targetJob,
      company: exp.company || 'Entreprise',
      location: exp.location || `${formData?.personalInfo?.city || 'Dakar'}, Sénégal`,
      startDate: exp.startDate || '2021',
      endDate: exp.endDate || (exp.current ? 'Présent' : '2023'),
      current: exp.current,
      optimizedDescription: descList
    };
  });
}

/**
 * Enriches skills if user provided empty or single minimal category.
 */
export function getEnrichedSkills(formData?: CVFormData, aiKeywords?: string[]): SkillCategory[] {
  const userSkills = formData?.skills || [];
  const hasValidSkills = userSkills.some(cat => cat.skills && cat.skills.length > 0);

  if (hasValidSkills) {
    return userSkills;
  }

  const targetJob = (formData?.personalInfo?.targetJob || '').toLowerCase();

  if (targetJob.includes('dev') || targetJob.includes('tech') || targetJob.includes('web') || targetJob.includes('logiciel')) {
    return [
      { category: 'Compétences Techniques & Langages', skills: ['React / Next.js', 'Node.js / Express', 'TypeScript', 'PostgreSQL / SQL', 'REST & GraphQL APIs', 'Docker / CI/CD'] },
      { category: 'Méthodologies & Outils', skills: ['Architecture Logicielle', 'Méthode Agile / Scrum', 'Git / GitHub Workflow', 'Tests Unitaires & CI', 'Performance & Sécurité'] },
      { category: 'Savoir-Être Professionnel', skills: ['Résolution de problèmes complexes', 'Rigueur & Esprit analytique', 'Communication technique', 'Autonomie & Proactivité'] }
    ];
  }

  if (targetJob.includes('compta') || targetJob.includes('financ') || targetJob.includes('audit') || targetJob.includes('gestion')) {
    return [
      { category: 'Expertise Comptable & Financière', skills: ['Système OHADA Révisé', 'Établissement des états financiers', 'Contrôle de gestion', 'Déclarations fiscales UEMOA', 'Audit & Conformité'] },
      { category: 'Logiciels & Outils Métier', skills: ['Sage SAARI / Paie', 'Excel Avancé (TCD, Macros)', 'Power BI', 'ERP & Logiciels Comptables', 'Reporting Budgétaire'] },
      { category: 'Qualités Professionnelles', skills: ['Rigueur absolue', 'Sens de la confidentialité', 'Esprit d\'analyse critique', 'Organisation & Respect des délais'] }
    ];
  }

  if (targetJob.includes('commercial') || targetJob.includes('market') || targetJob.includes('vente') || targetJob.includes('client')) {
    return [
      { category: 'Développement Commercial & Vente', skills: ['Prospection B2B & B2C', 'Négociation stratégique', 'Gestion de portefeuille grands comptes', 'Closing & Entonnoir de conversion'] },
      { category: 'Marketing & Digital', skills: ['CRM (HubSpot, Salesforce)', 'Marketing digital & Réseaux sociaux', 'Analyse des KPI de vente', 'Campagnes multicanales'] },
      { category: 'Compétences Relationnelles', skills: ['Aisance relationnelle & Négociation', 'Orientation résultats & Chiffre', 'Écoute active', 'Persévérance & Dynamisme'] }
    ];
  }

  if (targetJob.includes('rh') || targetJob.includes('ressources') || targetJob.includes('recrut') || targetJob.includes('jurid')) {
    return [
      { category: 'Gestion des RH & Recrutement', skills: ['Sourcing & Entretiens de sélection', 'Gestion administrative du personnel', 'Code du Travail Sénégalais & UEMOA', 'Gestion Prévisionnelle des Emplois (GPEC)'] },
      { category: 'Outils & Systèmes RH', skills: ['SIRH & Logiciels de Paie', 'Tableaux de bord RH', 'Évaluation de la performance', 'Plan de formation continue'] },
      { category: 'Soft Skills', skills: ['Intelligence relationnelle', 'Discrétion & Éthique professionnelle', 'Gestion des conflits', 'Capacité d\'écoute et d\'arbitrage'] }
    ];
  }

  // General default high-value skills
  return [
    { category: 'Compétences Opérationnelles', skills: ['Pilotage de projets', 'Optimisation des processus', 'Contrôle qualité & Conformité', 'Reporting d\'activité direction'] },
    { category: 'Outils Numériques & Bureautique', skills: ['Suite Microsoft Office / Google Workspace', 'Outils collaboratifs (Slack, Notion, Trello)', 'Gestion documentaire dématérialisée'] },
    { category: 'Aptitudes Comportementales', skills: ['Sens de l\'organisation', 'Leadership & Travail d\'équipe', 'Adaptabilité rapide', 'Orientation résultats'] }
  ];
}

/**
 * Enriches education if user provided empty list.
 */
export function getEnrichedEducation(formData?: CVFormData): Education[] {
  const userEdu = formData?.education || [];
  if (userEdu.length > 0 && userEdu.some(e => e.degree && e.institution)) {
    return userEdu;
  }

  const targetJob = formData?.personalInfo?.targetJob || 'Professionnel';
  return [
    {
      id: 'edu-default-1',
      degree: `Master / Diplôme Supérieur en ${targetJob}`,
      institution: 'Université / Grande École Supérieure de Commerce & Technologie',
      fieldOfStudy: 'Management, Technique & Stratégie',
      location: `${formData?.personalInfo?.city || 'Dakar'}, Sénégal`,
      startDate: '2019',
      endDate: '2021',
      current: false
    },
    {
      id: 'edu-default-2',
      degree: `Licence Professionnelle`,
      institution: 'Institut Supérieur Polytechnique',
      fieldOfStudy: 'Fondamentaux & Méthodologie',
      location: `${formData?.personalInfo?.city || 'Dakar'}, Sénégal`,
      startDate: '2016',
      endDate: '2019',
      current: false
    }
  ];
}

/**
 * Real-time CV completeness detector.
 * Identifies thin or missing areas to trigger proactive AI enrichment advice.
 */
export function detectCVCompleteness(formData: CVFormData): {
  score: number;
  isThin: boolean;
  suggestions: string[];
  missingSections: string[];
} {
  let score = 0;
  const missingSections: string[] = [];
  const suggestions: string[] = [];

  const p = formData?.personalInfo || ({} as any);

  if (p.firstName && p.lastName) score += 20;
  else missingSections.push('Nom et Prénom');

  if (p.targetJob) score += 20;
  else {
    missingSections.push('Poste visé');
    suggestions.push('Indiquez le titre exact du poste visé pour adapter le score ATS.');
  }

  if (p.email && p.phone) score += 15;
  else missingSections.push('Coordonnées de contact (Email / Téléphone)');

  const userExps = formData.experiences || [];
  if (userExps.length > 0) {
    const hasDescriptions = userExps.some(e => (e.description || '').trim().length > 30);
    if (hasDescriptions) {
      score += 20;
    } else {
      score += 10;
      suggestions.push('Vos descriptions d\'expériences sont courtes : l\'IA complétera automatiquement des réalisations percutantes.');
    }
  } else {
    missingSections.push('Expériences professionnelles');
    suggestions.push('Aucune expérience saisie : l\'IA générera des missions types pour le poste visé.');
  }

  const userSkills = formData.skills || [];
  const totalSkillsCount = userSkills.reduce((acc, cat) => acc + (cat.skills ? cat.skills.length : 0), 0);
  if (totalSkillsCount >= 3) {
    score += 15;
  } else {
    missingSections.push('Compétences clés');
    suggestions.push('Compétences limitées : l\'IA ajoutera les compétences les plus recherchées par les recruteurs.');
  }

  const userHobbies = formData.hobbies || [];
  if (userHobbies.length > 0 && userHobbies.some(h => h.trim())) {
    score += 10;
  } else {
    suggestions.push('Centres d\'intérêt non renseignés : l\'IA générera 3-4 loisirs valorisants et stratégiques.');
  }

  const isThin = score < 70;

  return {
    score,
    isThin,
    suggestions,
    missingSections
  };
}
