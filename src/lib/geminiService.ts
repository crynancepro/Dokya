import { GoogleGenAI, Type } from '@google/genai';
import { CVFormData, InterviewPrepData, InterviewQuestionItem, BookPlanSection, EbookChapter, EbookTOCItem } from '../types';
import { generateContextualEbookProposals, buildPollinationsImageUrl } from '../data/sampleEbookData';

/**
 * Get the Gemini API key from Vite / Next / Process environment variables
 */
export function getGeminiApiKey(): string {
  // Vite client env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const viteKey =
      (import.meta as any).env.VITE_GEMINI_API_KEY ||
      (import.meta as any).env.VITE_GOOGLE_API_KEY ||
      (import.meta as any).env.VITE_AI_KEY;
    if (viteKey && typeof viteKey === 'string' && viteKey.trim()) {
      return viteKey.trim();
    }
  }

  // Node / Next.js env (if accessible)
  if (typeof process !== 'undefined' && process.env) {
    const procKey =
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (procKey && typeof procKey === 'string' && procKey.trim()) {
      return procKey.trim();
    }
  }

  return '';
}

/**
 * Generates rich fallback CV & Letter data if Gemini API key is missing or calls fail.
 */
export function generateFallbackCVData(formData: CVFormData) {
  const p = formData?.personalInfo || ({} as any);
  const firstName = p.firstName || 'Candidat';
  const lastName = p.lastName || '';
  const targetJob = p.targetJob || 'Professionnel';
  const city = p.city || 'Dakar';
  const country = p.country || 'Sénégal';
  const company = formData?.targetCompany || 'l\'Entreprise';
  const userInstructions = (formData?.letterInstructions || formData?.highlightsSummary || '').trim();

  const userExps = Array.isArray(formData?.experiences) ? formData.experiences : [];
  const experiences = userExps.length > 0
    ? userExps.map((exp: any, idx: number) => {
        let descList: string[] = [];
        if (typeof exp.description === 'string' && exp.description.trim()) {
          descList = exp.description.split('\n').map((s: string) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
        }
        if (descList.length === 0) {
          descList = [
            `Piloter et orchestrer les opérations stratégiques liées au poste de ${exp.position || targetJob} chez ${exp.company || 'l\'entreprise'}.`,
            `Déployer des méthodes de travail optimisées pour accroître l'efficacité opérationnelle et la satisfaction client.`,
            `Superviser le contrôle qualité des livrables et assurer un reporting analytique régulier auprès de la direction.`,
            `Fédérer les équipes pluridisciplinaires autour des objectifs de performance et respecter les échéances critiques.`
          ];
        } else {
          descList = descList.map((item: string) => {
            if (item.length < 25) {
              return `Piloter et optimiser avec rigueur : ${item}, garantissant qualité et respect des délais.`;
            }
            return item;
          });
        }
        return {
          id: exp.id || `exp-${idx}`,
          optimizedDescription: descList
        };
      })
    : [{
        id: 'exp-default-1',
        optimizedDescription: [
          `Piloter et coordonner les projets stratégiques en tant que ${targetJob}, avec un focus constant sur la performance opérationnelle.`,
          `Déployer les meilleures pratiques du secteur et moderniser les flux de travail pour maximiser la productivité.`,
          `Garantir un haut niveau de conformité, d'excellence technique et d'optimisation des ressources disponibles.`,
          `Assurer une communication transverse fluide avec l'ensemble des parties prenantes internes et externes.`
        ]
      }];

  // Category-aware letter fallback
  const category = formData?.letterCategory || 'candidature';
  const customSubject = formData?.letterSubject?.trim();
  let coverLetter: any;

  if (category === 'administration') {
    coverLetter = {
      subject: customSubject || `Demande administrative officielle - ${formData.letterType ? formData.letterType.replace('_', ' ') : 'Formalités'}`,
      greeting: `Madame, Monsieur le Responsable des Services Administratifs,`,
      opening: `Par la présente, je sollicite respectueusement votre bienveillance concernant la démarche officielle citée en objet. Établi(e) à ${city} (${country}), je souhaite vous exposer les motifs et éléments circonstanciés justifiant cette requête auprès de vos services.`,
      bodyParagraphs: [
        userInstructions
          ? `Conformément aux dispositions en vigueur et aux consignes particulières portées à votre connaissance (${userInstructions}), j'ai réuni l'ensemble des éléments justificatifs attestant de la régularité et du bien-fondé de ma situation. Mon sens du devoir et mon attachement au respect scrupuleux des procédures administratives guident cette démarche.`
          : `Conformément aux règlements et dispositions administratives en vigueur à ${city}, j'ai réuni toutes les informations requises pour permettre un examen diligent et transparent de mon dossier. Mon dossier est constitué avec rigueur afin de respecter scrupuleusement les exigences légales et réglementaires applicables.`,
        `Soucieux(se) d'une collaboration fluide avec vos services, je me tiens à votre entière disposition pour apporter toute précision ou document complémentaire qui vous paraîtrait utile à l'instruction de cette formalité.`
      ],
      callToAction: `Comptant sur votre compréhension et sur la bienveillance de votre instruction, je sollicite un retour officiel ou une confirmation de traitement dans les meilleurs délais.`,
      closing: `Dans l'attente d'une suite favorable à ma requête, je vous prie d'agréer, Madame, Monsieur le Responsable, l'expression de ma considération distinguée et de mon profond respect.`
    };
  } else if (category === 'business') {
    coverLetter = {
      subject: customSubject || `Proposition commerciale et partenariat d'accompagnement - ${company}`,
      greeting: `Madame, Monsieur le Directeur,`,
      opening: `Dans le cadre du développement stratégique et de la modernisation continue de vos activités au sein de ${company}, nous avons l'honneur de vous soumettre notre proposition de collaboration sur-mesure, conçue pour répondre avec précision à vos impératifs de rentabilité et d'efficience opérationnelle.`,
      bodyParagraphs: [
        userInstructions
          ? `En tenant compte des priorités spécifiques de votre organisation (${userInstructions}), notre approche conjugue rigueur méthodologique, solutions agiles et accompagnement de proximité. Nous avons modélisé une offre clé en main permettant de sécuriser vos processus tout en maximisant votre retour sur investissement.`
          : `Forts d'une solide expertise sectorielle et d'un ancrage affirmé à ${city} et dans la zone UEMOA, nous déployons des méthodologies éprouvées et des outils innovants au service des entreprises les plus exigeantes. Notre vision privilégie la création de valeur durable, la performance mesurable et l'excellence du service.`,
        `Faire le choix d'un partenariat avec notre structure, c'est garantir à vos équipes une expertise reconnue, un pilotage rigoureux des livrables et une réactivité constante face à vos enjeux d'affaires.`
      ],
      callToAction: `Nous serions ravis de convenir d'un rendez-vous d'échange ou d'une séance de démonstration personnalisée dans vos locaux ou par visioconférence selon vos disponibilités.`,
      closing: `Dans l'attente de ce prochain échange, nous vous prions d'agréer, Madame, Monsieur le Directeur, l'expression de nos salutations professionnelles et distinguées.`
    };
  } else if (category === 'sur_mesure') {
    coverLetter = {
      subject: customSubject || `Courrier officiel à l'attention de ${company}`,
      greeting: `Madame, Monsieur,`,
      opening: `Je me permets de vous adresser la présente correspondance officielle afin de porter à votre attention la situation détaillée ci-après, requérant un traitement attentif de votre part.`,
      bodyParagraphs: [
        userInstructions
          ? `Comme précisé dans les éléments de contexte (${userInstructions}), cette démarche s'inscrit dans une volonté claire de conciliation, de clarté et de respect des engagements mutuels. Chaque point a été analysé avec rigueur pour assurer une parfaite transparence.`
          : `Résidant à ${city} (${country}), je souhaite vous faire part des faits et considérations justifiant cette démarche formelle. Ma volonté constante est d'assurer un dialogue constructif, équitable et conforme aux règles régissant nos relations.`,
        `Je reste particulièrement attentif(ve) aux mesures qui seront prises pour répondre favorablement à cette demande et garantir la préservation de nos intérêts réciproques.`
      ],
      callToAction: `Espérant un examen attentif et une réponse favorable de votre part, je me tiens à votre entière disposition pour tout complément d'information.`,
      closing: `Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées et respectueuses.`
    };
  } else {
    // Candidature & Carrière
    coverLetter = {
      subject: customSubject || `Candidature${targetJob ? ` au poste de ${targetJob}` : ''}${company ? ` - ${company}` : ''}`,
      greeting: `Madame, Monsieur le Responsable des Recrutements,`,
      opening: `C'est avec un vif intérêt et un réel enthousiasme que je vous soumets ma candidature pour le poste de ${targetJob} au sein de votre prestigieuse organisation ${company}. Reconnu pour son dynamisme, son exigence d'excellence et son impact structurant à ${city} et dans la sous-région, votre établissement incarne une référence au sein de laquelle je souhaite activement investir mon expertise et mon leadership.`,
      bodyParagraphs: [
        userInstructions
          ? `Fort d'un parcours riche et directement aligné avec vos attentes prioritaires (${userInstructions}), j'ai développé une solide maîtrise des méthodologies indispensables à la réussite de cette mission. Mon esprit d'analyse, mon pragmatisme et ma rigueur d'exécution m'ont permis de mener à bien des chantiers d'envergure, de résoudre des problématiques complexes et d'atteindre avec régularité des objectifs chiffrés exigeants.`
          : `Fort d'un parcours probant et diversifié, j'ai consolidé une expertise pointue dans les outils techniques, la gestion de projet et l'optimisation des processus. Mon approche orientée résultats m'a permis de piloter des initiatives stratégiques, de fluidifier les collaborations transverses et de garantir un haut niveau de performance conforme aux standards internationaux.`,
        `Intégrer ${company} représente une opportunité stimulante de conjuguer mon savoir-faire à vos ambitions d'expansion. Parfaitement imprégné des réalités économiques et des exigences du marché à ${city}, je suis convaincu que mon sens de l'initiative, mon engagement et ma force de proposition constitueront un accélérateur de valeur durable pour vos équipes.`
      ],
      callToAction: `Persuadé de la forte convergence entre vos besoins et mon profil, je serais très honoré de vous rencontrer lors d'un entretien afin d'échanger plus en détail sur ma vision du poste et mes contributions futures.`,
      closing: `Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur le Responsable des Recrutements, l'expression de mes salutations les plus respectueuses et distinguées.`
    };
  }

  return {
    profileSummary: `${targetJob} chevronné(e), rigoureux(se) et orienté(e) résultats, justifiant d'une solide expertise à ${city} (${country}). Doté(e) d'un fort esprit d'initiative, d'un sens aigu de l'organisation et d'une excellente capacité d'adaptation, j'apporte des solutions concrètes, innovantes et à haute valeur ajoutée pour dynamiser la performance de vos activités.`,
    experiences,
    suggestedKeywords: [
      'Pilotage stratégique',
      'Gestion de projet',
      'Optimisation des processus',
      'Leadership d\'équipe',
      'Rigueur & Analyse',
      'Communication transverse',
      'Orientation résultats',
      'Résolution de problèmes',
      'Négociation & Relation client',
      'Transformation digitale'
    ],
    coverLetter,
    interviewTips: [
      `Structurez votre présentation initiale de 2 minutes en mettant en avant 2 à 3 accomplissements chiffrés majeurs pour le poste de ${targetJob}.`,
      `Démontrez votre maîtrise fine des enjeux économiques de ${company} sur le marché de ${city} et en zone UEMOA.`,
      `Adoptez la méthode STAR (Situation, Tâche, Action, Résultat) pour illustrer concrètement vos compétences comportementales et techniques.`
    ]
  };
}

/**
 * Generates rich fallback Interview Preparation Data
 */
export function generateFallbackInterviewPrep(formData: CVFormData): InterviewPrepData {
  const p = formData?.personalInfo || ({} as any);
  const candidateName = `${p.firstName || 'Candidat'} ${p.lastName || ''}`.trim();
  const targetJob = p.targetJob || 'Professionnel';
  const company = formData?.targetCompany || 'l\'Entreprise recruteuse';
  const city = p.city || 'Dakar';
  const country = p.country || 'Sénégal';

  const userExps = Array.isArray(formData?.experiences) ? formData.experiences : [];
  const primaryExp = userExps[0] || { position: targetJob, company: 'Organisation précédente' };

  return {
    id: `PREP-${Date.now()}`,
    candidateName: candidateName || 'Candidat Pro',
    targetJob,
    targetCompany: company,
    city,
    country,
    createdAt: new Date().toISOString(),
    pitch2Min: {
      hook: `Bonjour, je m'appelle ${candidateName}. Je suis ${targetJob} passionné(e) par la création de valeur et l'excellence opérationnelle, avec une trajectoire professionnelle forgée au cœur d'environnements exigeants à ${city}.`,
      careerHighlights: `Au cours de mes expériences récentes, notamment en tant que ${primaryExp.position || targetJob}, j'ai eu l'opportunité de piloter des projets structurants, d'optimiser les flux de travail et de collaborer avec des équipes pluridisciplinaires pour dépasser les objectifs fixés. Mon profil allie rigueur technique, sens du relationnel et capacité d'adaptation rapide.`,
      valueProposition: `Aujourd'hui, je souhaite rejoindre ${company} car votre vision et vos défis de développement résonnent pleinement avec mes compétences. Je suis prêt(e) à mettre mon énergie, mon sens de l'initiative et mon engagement immédiat au service de votre réussite.`,
      fullText: `« Bonjour, je m'appelle ${candidateName}. Je suis ${targetJob} orienté(e) résultats avec une expertise reconnue à ${city}. Au cours de mon parcours, j'ai notamment piloté des missions stratégiques chez ${primaryExp.company || 'mes précédents employeurs'}, où j'ai développé une grande capacité à structurer les opérations, fédérer les parties prenantes et délivrer des résultats concrets sous contrainte. Ce qui me motive à rejoindre ${company} aujourd'hui, c'est votre ambition et l'opportunité d'apporter ma rigueur, ma réactivité et mon esprit d'équipe pour accélérer vos performances. Je serais ravi(e) d'échanger avec vous sur la manière dont mes compétences répondent précisément à vos priorités actuelles. »`
    },
    questions: [
      {
        id: 'q-1',
        category: 'motivation',
        categoryLabel: 'Motivation & Adéquation',
        question: `Pouvez-vous vous présenter en 2 minutes et nous expliquer pourquoi vous postulez au poste de ${targetJob} chez ${company} ?`,
        recruiterIntent: `Le recruteur évalue votre esprit de synthèse, votre élocution, votre clarté mentale et si vous avez réellement fait des recherches sur ${company}.`,
        suggestedAnswer: `« J'ai articulé mon parcours autour de 3 piliers : la maîtrise technique de mon métier de ${targetJob}, le sens du service orienté résultats, et la capacité à collaborer efficacement en équipe. J'ai choisi de postuler chez ${company} parce que votre positionnement sur le marché et vos projets récents correspondent exactement au cadre d'excellence dans lequel je souhaite m'investir durablement. »`,
        keyStrengthsToHighlight: ['Capacité de synthèse', 'Clarté de la vision', 'Intérêt documenté pour l\'entreprise'],
        pitfallsToAvoid: `Ne récitez pas votre CV de manière chronologique linéaire; insistez sur la valeur ajoutée et le lien direct avec les besoins du recruteur.`
      },
      {
        id: 'q-2',
        category: 'technique',
        categoryLabel: 'Compétence Métier & Méthodologie',
        question: `Quelles sont, selon vous, les 3 compétences techniques indispensables pour réussir en tant que ${targetJob} et comment les appliquez-vous au quotidien ?`,
        recruiterIntent: `Vérifier la profondeur de votre maîtrise métier, votre capacité à structurer vos process et votre niveau d'autonomie opérationnelle.`,
        suggestedAnswer: `« Premièrement, l'analyse rigoureuse des besoins et la planification méticuleuse. Deuxièmement, l'utilisation maîtrisée des outils et méthodologies de pointe du secteur. Troisièmement, le suivi de performance avec des indicateurs chiffrés fiables. Par exemple, lors de ma précédente mission, cette approche m'a permis de réduire les délais de traitement et d'accroître la qualité de service. »`,
        keyStrengthsToHighlight: ['Maîtrise technique pointue', 'Rigueur méthodologique', 'Gestion des priorités'],
        pitfallsToAvoid: `Évitez les réponses vagues; donnez des exemples concrets d'outils, de frameworks ou de livrables précis.`
      },
      {
        id: 'q-3',
        category: 'comportementale',
        categoryLabel: 'Soft Skills & Gestion de la Pression',
        question: `Racontez-moi une situation où vous avez fait face à un imprévu majeur ou un délai très serré. Comment avez-vous réagi ?`,
        recruiterIntent: `Évaluer votre résilience émotionnelle, votre calme sous pression, vos compétences en résolution de problèmes et votre flexibilité.`,
        suggestedAnswer: `« [Méthode STAR] Situation : Nous devions finaliser un livrable stratégique avec un délai raccourci de moitié suite à une demande urgente. Tâche : Réorganiser les priorités sans dégrader le niveau de qualité. Action : J'ai rapidement découpé le projet en étapes critiques, délégué les composantes secondaires et instauré un point d'étape quotidien de 10 minutes. Résultat : Le livrable a été remis dans les temps avec les félicitations de la hiérarchie. »`,
        keyStrengthsToHighlight: ['Sang-froid', 'Priorisation rapide', 'Esprit d\'équipe et communication claire'],
        pitfallsToAvoid: `Ne cherchez pas à rejeter la faute sur des collègues ou un supérieur; assumez la responsabilité et valorisez la solution constructive.`
      },
      {
        id: 'q-4',
        category: 'situationnelle',
        categoryLabel: 'Collaboration & Résolution de Conflits',
        question: `Comment gérez-vous un désaccord avec un collègue ou un responsable sur la méthode à suivre ?`,
        recruiterIntent: `Tester votre maturité professionnelle, votre intelligence relationnelle, votre écoute active et votre sens de l'intérêt collectif.`,
        suggestedAnswer: `« Je privilégie toujours l'échange direct et factuel dans un esprit constructif. Je commence par écouter attentivement le point de vue de mon interlocuteur pour comprendre ses motivations sous-jacentes. Ensuite, nous comparons nos approches au regard des objectifs globaux du projet. Si nécessaire, nous testons une solution pilote ou sollicitons un arbitrage neutre, tout en restant 100% engagé une fois la décision finale prise. »`,
        keyStrengthsToHighlight: ['Écoute active', 'Maturité relationnelle', 'Orientation vers l\'intérêt général'],
        pitfallsToAvoid: `Ne prétendez jamais que vous n'avez jamais eu de désaccord; cela sonne faux. Montrez plutôt votre capacité à dialoguer posément.`
      },
      {
        id: 'q-5',
        category: 'piege',
        categoryLabel: 'Question Délicate / Projection',
        question: `Quel est votre principal axe d'amélioration (ou point faible) et que faites-vous concrètement pour progresser ?`,
        recruiterIntent: `Mesurer votre lucidité, votre humilité et votre volonté d'apprentissage continu.`,
        suggestedAnswer: `« Par souci du détail et exigence de qualité, j'avais parfois tendance à vouloir tout superviser par moi-même. J'ai pris conscience que cela pouvait ralentir certains processus. J'ai donc développé l'art de déléguer davantage, en mettant en place des points de contrôle structurés et des modèles partagés, ce qui a considérablement renforcé l'autonomie collective de mon équipe. »`,
        keyStrengthsToHighlight: ['Auto-critique constructive', 'Proactivité d\'apprentissage', 'Capacité de prise de recul'],
        pitfallsToAvoid: `Bannissez les faux défauts clichés ("je suis trop perfectionniste") ou les défauts rédhibitoires ("j'arrive souvent en retard"). Choisissez un point réel avec son plan d'action d'amélioration.`
      },
      {
        id: 'q-6',
        category: 'leadership',
        categoryLabel: 'Vision & Projection à 3 Ans',
        question: `Où vous voyez-vous dans 3 à 5 ans et comment ce poste chez ${company} s'inscrit-il dans votre plan de carrière ?`,
        recruiterIntent: `Vérifier votre stabilité, votre ambition mesurée et la cohérence de votre projet professionnel avec les perspectives offertes par l'entreprise.`,
        suggestedAnswer: `« Dans les 3 prochaines années, mon objectif est de devenir une référence incontournable sur le périmètre de ${targetJob} au sein de ${company}, en maîtrisant tous les rouages et en apportant des gains d'efficacité mesurables. À terme, j'aspire à prendre des responsabilités de coordination plus larges ou à mentorer de nouveaux collaborateurs. »`,
        keyStrengthsToHighlight: ['Stabilité et fidélité', 'Ambition saine', 'Volonté d\'impact durable'],
        pitfallsToAvoid: `Évitez de donner l'impression que le poste n'est qu'un simple tremplin éphémère ou, à l'inverse, que vous n'avez aucune ambition d'évolution.`
      }
    ],
    behavioralTips: [
      `Maintenez un contact visuel bienveillant et assuré avec tous les interlocuteurs présents dans la salle ou en visioconférence.`,
      `Prenez 2 à 3 secondes de silence avant de répondre aux questions complexes : cela montre que vous réfléchissez avec calme et structure.`,
      `Adoptez une posture droite et ouverte : mains posées sur la table, épaules détendues et sourire naturel à l'accueil.`,
      `Exprimez-vous avec un débit mesuré et une voix claire en articulant vos idées avec des connecteurs logiques (Premièrement, De plus, Enfin).`,
      `Montrez une énergie positive : les recruteurs recrutent avant tout une personnalité agréable avec qui il fait bon collaborer au quotidien.`
    ],
    suggestedQuestionsToAskRecruiter: [
      `« Quels sont les 3 défis prioritaires que le/la futur(e) titulaire de ce poste devra relever au cours des 6 premiers mois ? »`,
      `« Comment décririez-vous la culture de travail et la dynamique au sein de l'équipe que je vais intégrer ? »`,
      `« Quels sont les critères clés sur lesquels vous mesurerez le succès de cette mission à la fin de la période d'essai ? »`,
      `« Quelles sont les prochaines étapes du processus de recrutement et sous quel délai puis-je espérer votre retour ? »`
    ],
    strengthsSummary: [
      `Expertise ciblée pour le métier de ${targetJob}`,
      `Aisance relationnelle et dynamisme communicatif`,
      `Capacité d'analyse et sens aigu de la rigueur`,
      `Adaptabilité éprouvée aux contextes à forte exigence`
    ]
  };
}

/**
 * Clean & sanitize user input for Gemini Prompt
 */
function sanitizeForPrompt(data: any): any {
  if (!data) return {};
  const cleaned: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') {
      cleaned[key] = val.trim();
    } else if (Array.isArray(val)) {
      cleaned[key] = val.map(item => typeof item === 'object' ? sanitizeForPrompt(item) : item);
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = sanitizeForPrompt(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}


/**
 * Generate optimized CV, Cover Letter and ATS keywords directly using @google/genai SDK or server proxy
 */
export async function generateCVWithGemini(formData: CVFormData): Promise<{ success: boolean; data: any; error?: string }> {
  if (!formData || !formData.personalInfo) {
    return { success: false, error: 'Données de formulaire invalides ou manquantes.', data: null };
  }

  // 1. First attempt via the Server-Side API endpoint (Recommended & most robust with multi-model failover)
  try {
    const serverRes = await fetch('/api/gemini/generate-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (serverRes.ok) {
      const result = await serverRes.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
    }
  } catch (_serverErr) {
    console.info('[Gemini Client] Serveur indisponible, tentative locale ou fallback...');
  }

  const apiKey = getGeminiApiKey();

  // If no Gemini key is provided, use high-fidelity structured generation
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    console.info('[Gemini Client] Génération intelligente avec modèle structurel activée.');
    return {
      success: true,
      data: generateFallbackCVData(formData)
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const cleanData = sanitizeForPrompt(formData);
    const mode = cleanData.generationMode || 'full_pack';
    const isCvOnly = mode === 'cv_only';
    const isLetterOnly = mode === 'letter_only';

    let systemPrompt = '';
    let userPrompt = '';

    if (isCvOnly) {
      systemPrompt = `Tu es un Directeur RH d'élite et expert ATS de référence spécialisé dans l'optimisation de CV au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'optimiser, d'enrichir et de sublimer le contenu du CV d'un candidat pour maximiser son impact auprès des recruteurs les plus exigeants et obtenir un score ATS parfait (> 95%).

CONSIGNES STRICTES D'ENRICHISSEMENT & DE QUALITÉ :
1. **Interdiction de recopie brute** : Ne te contente JAMAIS de recopier passivement le texte brut de l'utilisateur. Sublime, professionnalise et étoffe chaque section.
2. **Accroche / Profil Professionnel percutant (3-4 lignes denses)** : Rédige une synthèse de profil captivante, percutante et orientée valeur ajoutée pour le poste visé (${cleanData.personalInfo.targetJob || 'Poste visé'}). Mets en valeur son positionnement, ses points forts distinctifs, son niveau d'expertise et son dynamisme.
3. **Expériences Professionnelles enrichies (Verbes d'action puissants)** :
   - Pour CHAQUE expérience, génère 3 à 5 puces percutantes.
   - Commence IMPÉRATIVEMENT chaque puce par un verbe d'action fort (ex: Piloter, Déployer, Structurer, Coordonner, Optimiser, Négocier, Automatiser, Harmoniser, Fédérer, Analyser, Superviser, Accroître).
   - Intègre des réalisations concrètes, des livrables clés et des métriques chiffrées estimées adaptées au marché professionnel ouest-africain.
4. **Mots-clés ATS & Compétences Stratégiques** : Génère 8 à 12 mots-clés stratégiques indispensables pour franchir les filtres ATS et prouver une solide maîtrise métier.
5. **Conseils d'Entretien RH** : Fournis 3 conseils tactiques concrets pour performer lors des entretiens d'embauche.

Format JSON requis.`;

      userPrompt = `Données du candidat :
- Candidat : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Poste visé : ${cleanData.personalInfo.targetJob}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Secteur cible : ${cleanData.targetSector || 'Non spécifié'}

Expériences :
${JSON.stringify(cleanData.experiences, null, 2)}

Formations :
${JSON.stringify(cleanData.education, null, 2)}

Compétences :
${JSON.stringify(cleanData.skills, null, 2)}

Langues :
${JSON.stringify(cleanData.languages, null, 2)}

Génère la version enrichie, professionnelle et optimisée ATS au format JSON.`;
    } else if (isLetterOnly) {
      const letterCategory = cleanData.letterCategory || 'candidature';
      const letterType = cleanData.letterType || 'motivation';
      const targetJobOrSubject = cleanData.letterSubject || cleanData.personalInfo.targetJob || 'Lettre officielle';
      const recipient = cleanData.targetCompany || 'Destinataire officiel';
      const tone = cleanData.letterTone || 'Convaincante';
      const instructions = cleanData.letterInstructions || cleanData.highlightsSummary || '';

      systemPrompt = `Tu es un expert en correspondance et rédaction officielle, administrative, commerciale et de candidature au Sénégal et en zone francophone (UEMOA/CEMAC).
Ta mission est de rédiger une lettre officielle complète, hautement soignée, élégante et conforme aux normes en vigueur, occupant toute la feuille A4 (au moins 250 à 350 mots).

Catégorie exacte : ${letterCategory.toUpperCase()} | Type de lettre : ${letterType} | Ton : ${tone}

CONSIGNES STRICTES DE RÉDACTION :
1. **Objet clair et professionnel** : Formuler un objet précis, formel et percutant conforme aux standards administratifs et commerciaux (${targetJobOrSubject}).
2. **Salutation formelle adaptée** : Utiliser la formule d'appel protocolaire exacte (ex: 'Madame, Monsieur le Directeur,', 'Monsieur le Président,', 'Madame, Monsieur le Responsable des Recrutements,').
3. **Corps de texte développé en 4 paragraphes distincts (250-350 mots)** :
   - **Paragraphe 1 (Accroche / Contexte)** : Exposer clairement le motif de la lettre, l'objet de la démarche ou l'intérêt pour ${recipient}.
   - **Paragraphe 2 (Développement / Arguments / Faits / Compétences)** : Développer de manière rigoureuse les arguments, faits circonstanciés, justificatifs ou compétences avec clarté et précision.
   - **Paragraphe 3 (Synergie / Modalités / Démarche constructive)** : Exposer la valeur ajoutée, les modalités d'exécution, le respect des règles ou la proposition de collaboration mutuelle.
   - **Paragraphe 4 (Conclusion / Demande formelle)** : Formuler expressément la demande d'entretien, de validation, de rendez-vous ou de suite favorable.
4. **Formule de politesse (Closing)** : Formule de courtoisie officielle, solennelle et respectueuse selon les usages formels en vigueur.
5. **Intégration impérative des consignes utilisateur** : ${instructions ? `Intègre scrupuleusement ces consignes : "${instructions}".` : `Assure une formulation irréprochable.`}

Format JSON requis.`;

      userPrompt = `Paramètres de la lettre :
- Catégorie : ${letterCategory}
- Type précis : ${letterType}
- Expéditeur : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Coordonnées : ${cleanData.personalInfo.phone || ''} | ${cleanData.personalInfo.email || ''} | ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Destinataire : ${recipient}
- Objet visé : ${targetJobOrSubject}
- Ton demandé : ${tone}
- Consignes particulières / Contexte : ${instructions || 'Lettre officielle soignée et percutante'}

Expériences & Compétences complémentaires :
${JSON.stringify(cleanData.experiences, null, 2)}
${JSON.stringify(cleanData.skills, null, 2)}

Génère la lettre idéale au format JSON.`;
    } else {
      // Full Pack Mode
      systemPrompt = `Tu es un Directeur RH et expert ATS de référence au Sénégal et en zone UEMOA.
Ta mission est de générer un Pack Carrière Complet enrichi (CV sublimé avec verbes d'action puissants + Synthèse captivante + Lettre de motivation stratégique d'au moins 300 mots + Mots-clés + Conseils d'entretien).

CONSIGNES STRICTES :
1. **Accroche de CV percutante** : 3-4 lignes denses valorisant le profil pour ${cleanData.personalInfo.targetJob || 'Poste visé'}.
2. **Expériences Professionnelles (Verbes d'action)** : Ne jamais recopier passivement. Rédige 3 à 5 puces par expérience commençant par des verbes d'action puissants (Piloter, Déployer, Structurer, Coordonner, Optimiser, Négocier, Automatiser), orientées résultats et métriques.
3. **Lettre de Motivation Sur-Mesure A4** : Au moins 300 mots, 4 paragraphes distincts (VOUS / MOI / NOUS / CONCLUSION).
4. **Mots-clés ATS & Conseils d'Entretien** : 8 à 12 mots-clés stratégiques et 3 conseils d'entretien probants.

Format de sortie : JSON structuré.`;

      userPrompt = `Données complètes :
- Candidat : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Poste visé : ${cleanData.personalInfo.targetJob}
- Entreprise cible : ${cleanData.targetCompany || 'Entreprise de référence'}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Points forts / consignes : ${cleanData.letterInstructions || cleanData.highlightsSummary || 'Rigueur et dynamisme'}

Expériences :
${JSON.stringify(cleanData.experiences, null, 2)}

Formations :
${JSON.stringify(cleanData.education, null, 2)}

Compétences :
${JSON.stringify(cleanData.skills, null, 2)}

Génère la réponse en JSON.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profileSummary: {
              type: Type.STRING,
              description: 'Profil professionnel ou accroche.',
            },
            experiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  optimizedDescription: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Liste de puces percutantes.',
                  },
                },
                required: ['id', 'optimizedDescription'],
              },
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            coverLetter: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                greeting: { type: Type.STRING },
                opening: { type: Type.STRING },
                bodyParagraphs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                callToAction: { type: Type.STRING },
                closing: { type: Type.STRING },
              },
              required: ['subject', 'greeting', 'opening', 'bodyParagraphs', 'callToAction', 'closing'],
            },
            interviewTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const responseText = response.text || '{}';
    let jsonResult: any = {};
    try {
      jsonResult = JSON.parse(responseText);
    } catch {
      jsonResult = {};
    }

    // Ensure non-null attributes
    if (!jsonResult.experiences) jsonResult.experiences = [];
    if (!jsonResult.suggestedKeywords) jsonResult.suggestedKeywords = [];
    if (!jsonResult.profileSummary) jsonResult.profileSummary = '';
    if (!jsonResult.interviewTips) jsonResult.interviewTips = [];
    if (!jsonResult.coverLetter) {
      const fallback = generateFallbackCVData(formData);
      jsonResult.coverLetter = fallback.coverLetter;
    }

    return { success: true, data: jsonResult };
  } catch (err: any) {
    console.warn('[Gemini Client SDK] Appel échoué, activation du fallback de secours :', err?.message);
    return {
      success: true,
      data: generateFallbackCVData(formData)
    };
  }
}

/**
 * Generate customized RH Interview Preparation sheet (Pitch 2min, 5-8 questions, STAR answers, pitfalls)
 */
export async function generateInterviewPrepWithGemini(
  formData: CVFormData,
  aiData?: any
): Promise<{ success: boolean; data: InterviewPrepData; error?: string }> {
  if (!formData || !formData.personalInfo) {
    return {
      success: false,
      error: 'Données du formulaire invalides.',
      data: generateFallbackInterviewPrep(formData)
    };
  }

  // 1. Try server-side API proxy first (secure & resilient)
  try {
    const serverRes = await fetch('/api/generate-interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, aiData })
    });

    if (serverRes.ok) {
      const result = await serverRes.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
    }
  } catch (err: any) {
    console.warn('[Interview Prep API Notice] Endpoint serveur non joignable, tentative directe via SDK...', err?.message);
  }

  // 2. Direct SDK fallback
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: true,
      data: generateFallbackInterviewPrep(formData)
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const cleanData = sanitizeForPrompt(formData);
    const p = cleanData.personalInfo || {};
    const candidateName = `${p.firstName || 'Candidat'} ${p.lastName || ''}`.trim();
    const targetJob = p.targetJob || 'Professionnel';
    const targetCompany = cleanData.targetCompany || 'l\'Entreprise recruteuse';
    const city = p.city || 'Dakar';
    const country = p.country || 'Sénégal';

    const systemPrompt = `Tu es un Directeur des Ressources Humaines (DRH) d'élite, coach en prise de parole professionnelle et expert du recrutement au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'analyser en profondeur le profil et le CV du candidat pour lui générer une FICHE DE PRÉPARATION D'ENTRETIEN RH ULTRA-PERSONNALISÉE ET STRATÉGIQUE.

Structure requise :
1. Pitch 2 minutes (Hook 0-30s, Highlights 30-90s, Value Proposition 90-120s, Full Text).
2. 6 à 8 questions RH ciblées (Techniques, Comportementales STAR, Motivation, Pièges) avec intention du recruteur, réponse modèle STAR, points forts clés et pièges à éviter.
3. 4-5 conseils comportementaux & posture.
4. 4-5 questions intelligentes à poser au recruteur.
5. 4 points forts majeurs.`;

    const userPrompt = `Candidat : ${candidateName}, Poste visé : ${targetJob}, Entreprise : ${targetCompany}, Ville : ${city} (${country})
Expériences : ${JSON.stringify(cleanData.experiences || [], null, 2)}
Formations : ${JSON.stringify(cleanData.education || [], null, 2)}
Compétences : ${JSON.stringify(cleanData.skills || [], null, 2)}
Génère la fiche de préparation d'entretien au format JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pitch2Min: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                careerHighlights: { type: Type.STRING },
                valueProposition: { type: Type.STRING },
                fullText: { type: Type.STRING }
              },
              required: ['hook', 'careerHighlights', 'valueProposition', 'fullText']
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING },
                  categoryLabel: { type: Type.STRING },
                  question: { type: Type.STRING },
                  recruiterIntent: { type: Type.STRING },
                  suggestedAnswer: { type: Type.STRING },
                  keyStrengthsToHighlight: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  pitfallsToAvoid: { type: Type.STRING }
                },
                required: ['id', 'category', 'question', 'recruiterIntent', 'suggestedAnswer', 'keyStrengthsToHighlight', 'pitfallsToAvoid']
              }
            },
            behavioralTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestedQuestionsToAskRecruiter: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            strengthsSummary: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['pitch2Min', 'questions', 'behavioralTips', 'suggestedQuestionsToAskRecruiter']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      success: true,
      data: {
        id: `PREP-${Date.now()}`,
        candidateName,
        targetJob,
        targetCompany,
        city,
        country,
        createdAt: new Date().toISOString(),
        ...parsed
      }
    };
  } catch (sdkErr: any) {
    console.warn('[Gemini Interview Prep Client SDK] Échec, fallback intelligent :', sdkErr?.message);
    return {
      success: true,
      data: generateFallbackInterviewPrep(formData)
    };
  }
}

/**
 * Generate or optimize business documents (Devis / Facture)
 */
export async function generateBusinessDocWithGemini(params: {
  docType: 'devis' | 'facture' | 'pack_business';
  issuer: any;
  client: any;
  items: any[];
}) {
  const { docType, issuer, client, items } = params;
  const isQuote = docType === 'devis';
  const apiKey = getGeminiApiKey();

  // Fallback defaults
  const fallbackItems = Array.isArray(items) && items.length > 0 ? items.map((it: any) => ({
    ...it,
    description: it.description ? it.description.trim().replace(/^[a-z]/, (c: string) => c.toUpperCase()) : 'Prestation de service professionnel',
    total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 50000)
  })) : [
    { id: '1', description: 'Prestation et livrables conformes au cahier des charges', quantity: 1, unitPrice: 150000, total: 150000 }
  ];

  const fallbackNotes = isQuote 
    ? "Offre valable 30 jours à compter de la date d'émission. Acompte de 50% à la commande, solde à la livraison finale."
    : "Paiement exigible sous 15 jours par virement bancaire, Wave ou Orange Money. Tout retard donnera lieu à des pénalités légales.";

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    return {
      success: true,
      items: fallbackItems,
      notes: fallbackNotes
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Tu es un expert en gestion commerciale et facturation pour les entreprises et indépendants au Sénégal (zone UEMOA).
Optimise et professionnalise les lignes de prestations d'un ${isQuote ? 'Devis' : 'Facture'} émis par "${issuer?.companyName || 'Prestataire'}" à destination de "${client?.companyName || client?.name || 'Client'}".

Prestations :
${JSON.stringify(items || [], null, 2)}

Instructions :
1. Reformule chaque description de prestation pour qu'elle soit claire, vendeuse, précise et professionnelle.
2. Conserve les quantités et prix unitaires.
3. Rédige une clause de conditions commerciales adaptée au Sénégal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                },
                required: ['description', 'quantity', 'unitPrice', 'total'],
              },
            },
            notes: { type: Type.STRING },
          },
          required: ['items', 'notes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      success: true,
      items: parsed.items || fallbackItems,
      notes: parsed.notes || fallbackNotes
    };
  } catch (err: any) {
    console.warn('[Gemini Business Doc] Fallback activé :', err?.message);
    return {
      success: true,
      items: fallbackItems,
      notes: fallbackNotes
    };
  }
}

/**
 * Generate 4 distinct, professional Ebook Cover and Back Cover proposals with total style diversity
 */
export async function generateEbookCoversWithGemini(data: {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  targetAudience?: string;
  tone?: string;
  summaryOrPrompt?: string;
  customPrompt?: string;
}) {
  const apiKey = getGeminiApiKey();
  const lang = data.language || 'Français';
  const genre = data.genre || 'Business & Entrepreneuriat';
  const author = data.author || 'Auteur';
  const title = data.title || 'Livre Numérique';
  const subtitle = data.subtitle || 'Guide Pratique';

  // Generate high-fidelity contextual proposals across 4 distinct artistic styles
  const contextual = generateContextualEbookProposals({
    title,
    subtitle,
    author,
    genre,
    language: lang,
    targetAudience: data.targetAudience,
    summaryOrPrompt: data.summaryOrPrompt,
    customPrompt: data.customPrompt
  });

  const fallbackFrontProposals = contextual.frontProposals;
  const fallbackBackProposals = contextual.backProposals;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    return {
      success: true,
      frontProposals: fallbackFrontProposals,
      backProposals: fallbackBackProposals
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Tu es un directeur artistique et éditeur professionnel d'ebooks de premier plan (Amazon KDP, Fnac, IngramSpark, Apple Books).
Langue de rédaction demandée : ${lang}.
Sujet du livre : "${title}" (${subtitle || ''}).
Auteur : "${author}".
Genre : "${genre}".
Public cible : "${data.targetAudience || 'Grand public & Professionnels'}".
Ton souhaité : "${data.tone || 'Inspirant & Pédagogique'}".
Description / Instructions personnalisées : "${data.summaryOrPrompt || ''} ${data.customPrompt || ''}".

MISSION :
Génère UNE SEULE proposition de Première de Couverture (frontProposal) et UNE SEULE proposition de Quatrième de Couverture (dos / backProposal) de très haute qualité professionnelle, ultra-rapide et parfaitement adaptée au contexte du livre.

EXIGENCE D'ADAPTATION ARTISTIQUE STRICTE SELON LE SUJET :
- Si c'est un livre pour enfant / conte : style dessin animé féerique, coloré et chaleureux ("illustration", type Pixar/Aquarelle).
- Si c'est un roman / romance / thriller : style cinématique et émotionnel ("photorealistic" ou clair-obscur).
- Si c'est un livre de finance / business / argent / crypto : style prestige luxe avec touches dorées ("photorealistic" ou "minimalist").
- Si c'est un manga / shonen : style anime illustration dynamique avec effets d'énergie.
- Si c'est un essai / développement personnel : style éditorial pur et impactant.

Le champ "imagePrompt" DOIT être en anglais descriptif précis pour le générateur d'image (ex: "cinematic photorealistic book cover visual representing ...", 8k masterpiece).
Tout le texte affiché (tagline, badge, résumé synopsis, bio auteur, citation, points clés) DOIT être intégralement rédigé en ${lang}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frontProposal: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                author: { type: Type.STRING },
                genreBadge: { type: Type.STRING },
                tagline: { type: Type.STRING },
                paletteName: { type: Type.STRING },
                bgGradient: { type: Type.STRING },
                textColor: { type: Type.STRING },
                subtitleColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                fontFamily: { type: Type.STRING },
                layoutVariant: { type: Type.STRING },
                artStyle: { type: Type.STRING },
                artStyleLabel: { type: Type.STRING },
                coverArtEmojiOrIcon: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ['title', 'author', 'paletteName', 'bgGradient', 'textColor', 'accentColor', 'layoutVariant', 'imagePrompt'],
            },
            backProposal: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                synopsis: { type: Type.STRING },
                authorBio: { type: Type.STRING },
                keyTakeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                quoteOrCallToAction: { type: Type.STRING },
                isbnNumber: { type: Type.STRING },
                barcodeDigits: { type: Type.STRING },
                bgGradient: { type: Type.STRING },
                textColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                layoutVariant: { type: Type.STRING },
                artStyle: { type: Type.STRING },
                artStyleLabel: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ['synopsis', 'authorBio', 'keyTakeaways', 'quoteOrCallToAction', 'bgGradient', 'textColor', 'accentColor', 'layoutVariant'],
            },
          },
          required: ['frontProposal', 'backProposal'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    
    // Merge Gemini output with dynamic thematic image URLs
    const baseSeed = Math.abs(title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 100) + Math.floor(Math.random() * 50);

    const fallbackFront = fallbackFrontProposals[0];
    const rawFront = parsed.frontProposal || (Array.isArray(parsed.frontProposals) ? parsed.frontProposals[0] : fallbackFront);
    const frontPrompt = rawFront.imagePrompt || fallbackFront?.imagePrompt || `cinematic book cover of ${title}, 8k artwork`;

    const singleFront = {
      ...fallbackFront,
      ...rawFront,
      id: rawFront.id || `front-${Date.now()}-1`,
      imagePrompt: frontPrompt,
      artImageUrl: buildPollinationsImageUrl(frontPrompt, baseSeed + 101),
      artStyle: rawFront.artStyle || fallbackFront?.artStyle || 'photorealistic',
      artStyleLabel: rawFront.artStyleLabel || fallbackFront?.artStyleLabel || '📸 Édition Haute Définition',
      artTexture: fallbackFront?.artTexture || 'gold_foil'
    };

    const fallbackBack = fallbackBackProposals[0];
    const rawBack = parsed.backProposal || (Array.isArray(parsed.backProposals) ? parsed.backProposals[0] : fallbackBack);
    const backPrompt = rawBack.imagePrompt || frontPrompt || `cinematic book cover back for ${title}, 8k artwork`;

    const singleBack = {
      ...fallbackBack,
      ...rawBack,
      id: rawBack.id || `back-${Date.now()}-1`,
      imagePrompt: backPrompt,
      artImageUrl: buildPollinationsImageUrl(backPrompt, baseSeed + 101),
      artStyle: rawBack.artStyle || fallbackBack?.artStyle || 'photorealistic',
      artStyleLabel: rawBack.artStyleLabel || fallbackBack?.artStyleLabel || '📸 Fermeture Officielle',
      artTexture: fallbackBack?.artTexture || 'gold_foil'
    };

    return {
      success: true,
      frontProposals: [singleFront],
      backProposals: [singleBack]
    };
  } catch (err: any) {
    console.warn('[Gemini Ebook Covers] Fallback activé :', err?.message);
    return {
      success: true,
      frontProposals: fallbackFrontProposals,
      backProposals: fallbackBackProposals
    };
  }
}

/**
 * Extracts the last N words from a text to provide seamless narrative continuity
 */
export function getLastNWords(text: string, count: number = 200): string {
  if (!text || typeof text !== 'string') return '';
  // Clean markdown noise slightly for cleaner narrative bridge
  const cleaned = text.replace(/#+\s+/g, '').replace(/[>*_`]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= count) return words.join(' ');
  return words.slice(-count).join(' ');
}

export interface BookPlanParams {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  targetAudience?: string;
  tone?: string;
  userSynopsisOrIdeas?: string;
  summaryOrPrompt?: string;
  chapterCount?: number;
  targetPageCount?: number;
}

/**
 * ÉTAPE A : Génère la structure globale du livre (Plan détaillé / Sommaire)
 * sous forme d'un tableau JSON d'objets : [{ chapterTitle, sectionTitle, summary }]
 */
export async function generateBookPlanWithGemini(params: BookPlanParams): Promise<{
  success: boolean;
  plan: BookPlanSection[];
}> {
  const apiKey = getGeminiApiKey();
  const lang = params.language || 'Français';
  const genre = params.genre || 'Business & Entrepreneuriat';
  const author = params.author || 'Auteur';
  const title = params.title || 'Livre Numérique';
  const totalTargetPages = Math.max(4, params.targetPageCount || 10);
  const targetInteriorPages = Math.max(1, totalTargetPages - 3);
  const targetChapterCount = params.chapterCount || Math.min(8, Math.max(3, Math.round(targetInteriorPages / 2)));
  const userIdeas = (params.userSynopsisOrIdeas || params.summaryOrPrompt || '').trim();

  // If no valid API key, return rich contextual plan based on genre & user ideas
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    const defaultSections: BookPlanSection[] = [
      {
        id: 'plan-sec-1',
        chapterTitle: `Chapitre 1 : Les Fondements & Diagnostic Stratégique`,
        sectionTitle: `1.1 Cadrage général et réalités du terrain`,
        summary: `Analyser le contexte actuel, identifier les blocages majeurs et poser le cadre méthodologique pour aborder ${title} avec clarté.`
      },
      {
        id: 'plan-sec-2',
        chapterTitle: `Chapitre 1 : Les Fondements & Diagnostic Stratégique`,
        sectionTitle: `1.2 Déconstruction des croyances limitantes`,
        summary: `Examiner les erreurs fréquentes commises par les praticiens et présenter une nouvelle grille de lecture sans complaisance.`
      },
      {
        id: 'plan-sec-3',
        chapterTitle: `Chapitre 2 : Méthodologie & Cadre Opérationnel`,
        sectionTitle: `2.1 Architecture du système et leviers prioritaires`,
        summary: `Décortiquer les principes d'action, les étapes de mise en œuvre concrètes et les mécanismes d'accélération étape par étape.`
      },
      {
        id: 'plan-sec-4',
        chapterTitle: `Chapitre 2 : Méthodologie & Cadre Opérationnel`,
        sectionTitle: `2.2 Outils, protocoles et gestion des imprévus`,
        summary: `Définir les protocoles de validation, les indicateurs clés de performance et les ajustements tactiques en temps réel.`
      },
      {
        id: 'plan-sec-5',
        chapterTitle: `Chapitre 3 : Passage à l'Échelle & Vision Pérenne`,
        sectionTitle: `3.1 Études de cas approfondies et retours d'expérience`,
        summary: `Illustrer par des exemples réels, des réussites documentées et des trajectoires d'excellence inspirantes.`
      },
      {
        id: 'plan-sec-6',
        chapterTitle: `Chapitre 3 : Passage à l'Échelle & Vision Pérenne`,
        sectionTitle: `3.2 Feuille de route personnelle et plan d'action`,
        summary: `Fournir un plan d'action opérationnel sur 30, 60 et 90 jours pour consolider les acquis et maximiser l'impact à long terme.`
      }
    ];

    return {
      success: true,
      plan: defaultSections
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Tu es un éditeur littéraire chevronné et directeur de collection (Amazon KDP, auto-édition d'excellence).
Conçois le plan détaillé et exhaustif (sommaire complet des sections) du livre suivant :

DÉTAILS DU LIVRE :
- Titre : "${title}"
- Sous-titre : "${params.subtitle || ''}"
- Auteur : "${author}"
- Genre : "${genre}"
- Langue obligatoire : "${lang}"
- Public cible : "${params.targetAudience || 'Professionnels & Grand public'}"
- Style & Tonalité : "${params.tone || 'Inspirant, rigoureux et immersif'}"
- Synopsis / Idées et directives de l'auteur : "${userIdeas || 'Livre complet, captivant et orienté impact.'}"
- Volume calibré : ${totalTargetPages} pages au total (soit environ ${targetChapterCount} chapitres).

MISSION STRICTE :
Génère la structure globale du livre sous forme d'un tableau JSON d'objets :
[{ chapterTitle, sectionTitle, summary }]

EXIGENCES POUR LE PLAN :
1. Crée entre ${Math.max(4, targetChapterCount)} et ${Math.min(12, targetChapterCount * 2)} sections ordonnées de façon logique et progressive.
2. "chapterTitle" : Intitulé clair du grand chapitre (ex: "Chapitre 1 : Les Origines du Paradigme").
3. "sectionTitle" : Intitulé précis et dynamique de la section (ex: "1.1 Anatomie des freins invisibles").
4. "summary" : Résumé très détaillé et spécifique des notions, arguments clés, études ou développements narratifs à traiter dans cette section précise. Ce résumé doit être riche (3 à 5 phrases) pour guider parfaitement la rédaction séquentielle sans ambiguïté.
5. AUCUNE répétition ni phrase générique creuse. Chaque section doit avoir un angle unique et substantiel.
6. Tout le contenu (titres, sections, résumés) DOIT être rédigé intégralement en ${lang}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapterTitle: { type: Type.STRING },
              sectionTitle: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ['chapterTitle', 'sectionTitle', 'summary']
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formattedPlan: BookPlanSection[] = parsed.map((item, idx) => ({
        id: `plan-sec-${idx + 1}`,
        chapterTitle: item.chapterTitle || `Chapitre ${Math.floor(idx / 2) + 1}`,
        sectionTitle: item.sectionTitle || `Section ${idx + 1}`,
        summary: item.summary || 'Développement approfondi des concepts clés.',
        status: 'pending'
      }));

      return {
        success: true,
        plan: formattedPlan
      };
    }

    throw new Error("Plan JSON invalide retourné par le modèle.");
  } catch (err: any) {
    console.warn('[Gemini Book Plan] Fallback activé :', err?.message);
    return {
      success: true,
      plan: [
        {
          id: 'plan-sec-1',
          chapterTitle: `Chapitre 1 : Les Fondements & Diagnostic`,
          sectionTitle: `1.1 Cadrage & Réalités du Terrain`,
          summary: `Analyse approfondie du contexte, identification des opportunités majeures et mise en place des fondations stratégiques de ${title}.`
        },
        {
          id: 'plan-sec-2',
          chapterTitle: `Chapitre 1 : Les Fondements & Diagnostic`,
          sectionTitle: `1.2 Déconstruction des Freins Invisibles`,
          summary: `Examen des erreurs fréquentes et mise en lumière des leviers d'action indispensables pour franchir un cap.`
        },
        {
          id: 'plan-sec-3',
          chapterTitle: `Chapitre 2 : Méthodes & Déploiement Opérationnel`,
          sectionTitle: `2.1 Architecture du Système d'Action`,
          summary: `Guide méthodique pas à pas détaillant chaque étape concrète pour mettre en pratique les principes fondamentaux.`
        },
        {
          id: 'plan-sec-4',
          chapterTitle: `Chapitre 2 : Méthodes & Déploiement Opérationnel`,
          sectionTitle: `2.2 Protocoles d'Exécution & Études de Cas`,
          summary: `Analyses d'exemples réels, gestion des aléas et optimisation continue pour des résultats tangibles.`
        },
        {
          id: 'plan-sec-5',
          chapterTitle: `Chapitre 3 : Consolidation & Perspectives d'Avenir`,
          sectionTitle: `3.1 Feuille de Route Stratégique`,
          summary: `Plan d'action structuré pour pérenniser les acquis, éviter les rechutes et maximiser l'impact à long terme.`
        }
      ]
    };
  }
}

/**
 * ÉTAPE B : Génère une section individuelle avec le SYSTEM PROMPT strict
 * et la mémoire des 200 derniers mots de la section précédente pour une continuité fluide.
 */
export async function generateBookSectionWithGemini(params: {
  section: BookPlanSection;
  bookInfo: {
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    tone?: string;
    targetAudience?: string;
  };
  previousSectionLastWords?: string;
  sectionIndex: number;
  totalSections: number;
}): Promise<{
  content: string;
  wordCount: number;
}> {
  const apiKey = getGeminiApiKey();
  const { section, bookInfo, previousSectionLastWords, sectionIndex, totalSections } = params;
  const lang = bookInfo.language || 'Français';

  // Fallback generation if no key or fallback needed
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    const sampleContent = `### ${section.sectionTitle}

L'investigation rigoureuse de ce sujet démontre que la réussite repose sur une articulation précise entre la clarté conceptuelle et l'exécution méthodique. Loin des théories abstraites ou des poncifs habituels, ce volet s'attache à décortiquer les mécanismes concrets qui transforment une intention louable en un résultat mesurable et reproductible.

Dans le prolongement des réflexions engagées, il apparaît manifeste que les acteurs les plus performants adoptent une posture proactive. Au lieu de subir les aléas de leur environnement, ils construisent des systèmes résilients capables d'absorber les chocs tout en capitalisant sur chaque opportunité émergente. Cette approche exige une discipline constante et le refus systématique des raccourcis illusoires.

Pour appréhender pleinement les enjeux propres à **${section.sectionTitle}**, il convient d'analyser trois dimensions opérationnelles incontournables :

1. **La granularité de l'analyse** : Examiner chaque paramètre avec minutie afin de déceler les points de friction avant qu'ils ne deviennent bloquants.
2. **L'alignement des ressources** : Allouer le temps, l'énergie et les compétences là où l'effet de levier est maximal.
3. **Le principe de rétroaction dynamique** : Recueillir des données fiables sur le terrain pour réajuster continuellement la trajectoire.

Plusieurs retours d'expérience concrets confirment cette dynamique. À titre d'illustration, lorsqu'une méthodologie structurée est mise en œuvre de manière cohérente, les gains d'efficacité dépassent fréquemment les prévisions initiales. La clé réside dans la constance du geste et la capacité à maintenir une vision stratégique claire malgré le tumulte du quotidien.

En conclusion de cette étape, retenez que chaque décision doit s'inscrire dans une logique d'ensemble. En consolidant ces bases méthodologiques, vous préparez le terrain pour les étapes ultérieures qui viendront renforcer et pérenniser votre dispositif.`;

    const wordCount = sampleContent.split(/\s+/).filter(w => w.length > 0).length;
    return { content: sampleContent, wordCount };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // SYSTEM PROMPT EXACTEMENT CONFORME AUX DIRECTIVES UTILISATEUR :
    const prompt = `Tu es un écrivain professionnel expert. Rédige le contenu complet de la section suivante : ${section.sectionTitle}.
Sujet spécifique à traiter : ${section.summary}.

CONTEXTE DU LIVRE :
- Titre : "${bookInfo.title}"
- Sous-titre : "${bookInfo.subtitle || ''}"
- Chapitre de rattachement : "${section.chapterTitle}"
- Auteur : "${bookInfo.author}"
- Genre : "${bookInfo.genre}"
- Langue de rédaction obligatoire : "${lang}"
- Progression : Section ${sectionIndex + 1} sur ${totalSections}
${previousSectionLastWords && previousSectionLastWords.trim() ? `
DERNIERS MOTS DE LA SECTION PRÉCÉDENTE (pour assurer une liaison narrative fluide et une transition naturelle sans rupture ni répétition) :
« ... ${previousSectionLastWords.trim()} »` : ''}

RÈGLES STRICTES :
- Ne réutilise PAS de phrases d'introduction génériques ou de citations répétitives.
- Entre directement dans le vif du sujet avec un contenu riche, détaillé et fluide.
- Adapte le ton au genre du livre (si fiction : narration/dialogues ; si non-fiction : explications/exemples).
- Longueur minimale de cette section : 500 mots.
- Rédige directement le texte de la section en Markdown soigné (avec sous-titres ### pertinents, paragraphes denses et étoffés, listes numérotées ou à puces si adapté, et illustrations concrètes).
- N'inclus PAS de formules méta (pas de "Voici la section", pas de "Dans cette section", pas de salutations). Démarre immédiatement au cœur du propos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.7
      }
    });

    const generatedText = (response.text || '').trim();
    if (!generatedText) {
      throw new Error("Contenu vide retourné par l'IA");
    }

    const wordCount = generatedText.split(/\s+/).filter(w => w.length > 0).length;
    return {
      content: generatedText,
      wordCount
    };
  } catch (err: any) {
    console.warn(`[Gemini Section ${section.sectionTitle}] Erreur génération, fallback actif :`, err?.message);
    const fallbackText = `### ${section.sectionTitle}

L'analyse approfondie de **${section.summary}** démontre l'importance capitale d'une méthode rigoureuse et ancrée dans le réel. Chaque développement doit s'appuyer sur des données probantes et une articulation logique sans faille.

En abordant ce volet avec discernement, nous constatons que les principes d'action les plus solides reposent sur la constance et l'élimination des superflu. Les praticiens expérimentés s'accordent sur la nécessité d'une structure claire et d'une exécution soignée à chaque étape du processus.

1. **Premier levier fondamental** : Poser des bases inébranlables par l'analyse critique des faits observés.
2. **Deuxième levier d'action** : Structurer la mise en œuvre selon des jalons progressifs et vérifiables.
3. **Troisième levier de pérennité** : Évaluer l'impact et ajuster continuellement les paramètres opérationnels.

En poursuivant cette démarche, les résultats se consolident de manière durable et offrent une assise solide pour l'ensemble des chapitres à venir.`;
    const wordCount = fallbackText.split(/\s+/).filter(w => w.length > 0).length;
    return {
      content: fallbackText,
      wordCount
    };
  }
}

/**
 * Helper: Regroupe les sections générées par grand chapitre et génère chapters & tableOfContents
 */
export function assembleChaptersFromSections(
  sections: BookPlanSection[],
  bookInfo: { title: string; author: string; targetPageCount?: number }
): {
  chapters: EbookChapter[];
  tableOfContents: EbookTOCItem[];
} {
  const chapterMap = new Map<string, BookPlanSection[]>();

  sections.forEach(sec => {
    const chTitle = sec.chapterTitle || 'Chapitre Principal';
    if (!chapterMap.has(chTitle)) {
      chapterMap.set(chTitle, []);
    }
    chapterMap.get(chTitle)!.push(sec);
  });

  const chapters: EbookChapter[] = [];
  const tableOfContents: EbookTOCItem[] = [];

  let chapIndex = 1;
  chapterMap.forEach((secList, chTitle) => {
    // Combine section contents with clean markdown headings
    const combinedContent = secList
      .map(s => {
        const secHeading = s.sectionTitle.startsWith('#') ? s.sectionTitle : `## ${s.sectionTitle}`;
        return `${secHeading}\n\n${s.content || s.summary}`;
      })
      .join('\n\n---\n\n');

    const totalWords = secList.reduce((acc, s) => acc + (s.wordCount || 300), 0);
    const readingTime = Math.max(3, Math.round(totalWords / 180));

    // Extract takeaways
    const keyTakeaways = secList.slice(0, 3).map(s => `Maîtriser les enjeux clés de : ${s.sectionTitle}`);

    chapters.push({
      id: `chap-${chapIndex}`,
      chapterNumber: chapIndex,
      title: chTitle,
      subtitle: secList[0]?.summary || `Étude approfondie et cadre pratique du ${chTitle}`,
      content: combinedContent,
      keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : [`Assimiler les concepts prioritaires du ${chTitle}`],
      readingTimeMinutes: readingTime
    });

    tableOfContents.push({
      id: `toc-${chapIndex}`,
      chapterNumber: chapIndex,
      title: chTitle,
      summary: secList[0]?.summary || `Vue d'ensemble et plan d'action du ${chTitle}`
    });

    chapIndex++;
  });

  return { chapters, tableOfContents };
}

export interface SequentialBookGenerationProgress {
  step: 'planning' | 'section_start' | 'section_complete' | 'completed' | 'error';
  currentSectionIndex: number;
  totalSections: number;
  currentSectionTitle: string;
  currentChapterTitle: string;
  percent: number;
  message: string;
  plan: BookPlanSection[];
  completedSections: BookPlanSection[];
  totalWordsGenerated: number;
}

/**
 * ORCHESTRATEUR PRINCIPAL SÉQUENTIEL (FLUX EN 2 ÉTAPES)
 * Étape A : Génération ou récupération du Plan Détaillé [{ chapterTitle, sectionTitle, summary }]
 * Étape B : Boucle séquentielle pour chaque section avec envoi du summary + 200 derniers mots précédents
 */
export async function generateFullBookSequentially(params: {
  data: BookPlanParams & { existingPlan?: BookPlanSection[] };
  onProgress?: (progress: SequentialBookGenerationProgress) => void;
}): Promise<{
  success: boolean;
  plan: BookPlanSection[];
  chapters: EbookChapter[];
  tableOfContents: EbookTOCItem[];
  totalWordsGenerated: number;
}> {
  const { data, onProgress } = params;

  // ÉTAPE A : Établissement du Plan
  let plan: BookPlanSection[] = [];
  if (data.existingPlan && data.existingPlan.length > 0) {
    plan = data.existingPlan;
  } else {
    onProgress?.({
      step: 'planning',
      currentSectionIndex: 0,
      totalSections: 0,
      currentSectionTitle: '',
      currentChapterTitle: '',
      percent: 5,
      message: `Conception du plan détaillé et structuration du sommaire...`,
      plan: [],
      completedSections: [],
      totalWordsGenerated: 0
    });

    const planRes = await generateBookPlanWithGemini(data);
    plan = planRes.plan;
  }

  const totalSections = plan.length;
  const completedSections: BookPlanSection[] = [];
  let totalWordsGenerated = 0;
  let previousSectionLastWords = '';

  // ÉTAPE B : Boucle séquentielle pour générer chaque section une par une
  for (let i = 0; i < totalSections; i++) {
    const currentSection = plan[i];
    const progressPercent = Math.round(10 + ((i) / totalSections) * 85);

    onProgress?.({
      step: 'section_start',
      currentSectionIndex: i + 1,
      totalSections,
      currentSectionTitle: currentSection.sectionTitle,
      currentChapterTitle: currentSection.chapterTitle,
      percent: progressPercent,
      message: `Génération de la section ${i + 1} sur ${totalSections} : « ${currentSection.sectionTitle} »...`,
      plan,
      completedSections: [...completedSections],
      totalWordsGenerated
    });

    // Appel API pour cette section spécifique
    const secResult = await generateBookSectionWithGemini({
      section: currentSection,
      bookInfo: {
        title: data.title,
        subtitle: data.subtitle,
        author: data.author,
        genre: data.genre,
        language: data.language,
        tone: data.tone,
        targetAudience: data.targetAudience
      },
      previousSectionLastWords,
      sectionIndex: i,
      totalSections
    });

    const finishedSection: BookPlanSection = {
      ...currentSection,
      content: secResult.content,
      wordCount: secResult.wordCount,
      status: 'completed'
    };

    completedSections.push(finishedSection);
    totalWordsGenerated += secResult.wordCount;

    // Récupération des 200 derniers mots pour la section suivante
    previousSectionLastWords = getLastNWords(secResult.content, 200);

    onProgress?.({
      step: 'section_complete',
      currentSectionIndex: i + 1,
      totalSections,
      currentSectionTitle: currentSection.sectionTitle,
      currentChapterTitle: currentSection.chapterTitle,
      percent: Math.round(10 + ((i + 1) / totalSections) * 85),
      message: `Section ${i + 1}/${totalSections} rédigée avec succès (${secResult.wordCount} mots).`,
      plan,
      completedSections: [...completedSections],
      totalWordsGenerated
    });
  }

  // Assemblage final des chapitres et du sommaire
  const { chapters, tableOfContents } = assembleChaptersFromSections(completedSections, {
    title: data.title,
    author: data.author,
    targetPageCount: data.targetPageCount
  });

  onProgress?.({
    step: 'completed',
    currentSectionIndex: totalSections,
    totalSections,
    currentSectionTitle: '',
    currentChapterTitle: '',
    percent: 100,
    message: `Livre rédigé intégralement avec succès ! (${totalWordsGenerated} mots au total sur ${totalSections} sections).`,
    plan: completedSections,
    completedSections,
    totalWordsGenerated
  });

  return {
    success: true,
    plan: completedSections,
    chapters,
    tableOfContents,
    totalWordsGenerated
  };
}

/**
 * Wrapper de compatibilité pour les appels existants
 * Redirige vers la nouvelle génération séquentielle
 */
export async function generateEbookContentWithGemini(data: {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  targetAudience?: string;
  tone?: string;
  summaryOrPrompt?: string;
  userSynopsisOrIdeas?: string;
  chapterCount?: number;
  targetPageCount?: number;
  existingPlan?: BookPlanSection[];
  onProgress?: (progress: SequentialBookGenerationProgress) => void;
}) {
  const result = await generateFullBookSequentially({
    data: {
      ...data,
      userSynopsisOrIdeas: data.userSynopsisOrIdeas || data.summaryOrPrompt
    },
    onProgress: data.onProgress
  });

  return {
    success: result.success,
    tableOfContents: result.tableOfContents,
    chapters: result.chapters,
    plan: result.plan,
    totalWordsGenerated: result.totalWordsGenerated
  };
}
